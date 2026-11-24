package com.alxndrjhn.anchorplus.share

import android.content.ContentResolver
import android.content.Context
import android.media.MediaMetadataRetriever
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.provider.OpenableColumns
import android.webkit.MimeTypeMap
import com.alxndrjhn.anchorplus.photos.JpegConverter
import java.io.File
import java.io.IOException
import java.io.InterruptedIOException
import java.util.UUID
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

/** Everything but the copying happens on the main thread. */
class ShareIntake(context: Context, shared: SharedIntent, private val onChange: (Map<String, Any?>) -> Unit) {

    enum class Skip { unsupported, tooBig, unreadable, overLimit }

    private class Item(val id: String, val uri: Uri, val kind: String, var name: String, var mime: String) {
        var file: String? = null
        var durationMs: Long? = null

        fun toMap(): Map<String, Any?> = mapOf(
            "id" to id,
            "kind" to kind,
            "name" to name,
            "file" to file,
            "mime" to mime,
            "durationMs" to durationMs,
        )
    }

    val id: String = UUID.randomUUID().toString()
    val staging = File(ShareFolderPlugin.staging(context), id)
    private val title = shared.subject
    private val text = shared.text
    private val resolver: ContentResolver = context.contentResolver
    private val ownPackage = context.packageName
    private val packages = context.packageManager
    private val items = mutableListOf<Item>()
    private val skipped = mutableMapOf<Skip, Int>()
    private val worker: ExecutorService = Executors.newSingleThreadExecutor()
    private val mainThread = Handler(Looper.getMainLooper())

    /** Events wait until the sheet has read the share. */
    private var isLoaded = false

    init {
        for (uri in shared.uris) {
            val name = nameOf(uri)
            val kind = kindOf(uri, name, shared.type)
            when {
                // Any kind is taken, so a refused file is one Anchor can't read.
                kind == null -> skip(Skip.unreadable)
                items.size >= MAX_FILES -> skip(Skip.overLimit)
                else -> items.add(Item("${items.size}", uri, kind.first, name, kind.second))
            }
        }
        if (items.isNotEmpty()) staging.mkdirs()
        for (item in items.toList()) {
            val uri = item.uri
            val kind = item.kind
            val mime = item.mime
            val name = item.name
            worker.execute { copy(item, uri, kind, mime, name) }
        }
    }

    fun load(): Map<String, Any?> {
        isLoaded = true
        return mapOf(
            "id" to id,
            "staging" to staging.absolutePath,
            "title" to title,
            "text" to text,
            "files" to items.map { it.toMap() },
            "skipped" to skipped.mapKeys { it.key.name },
        )
    }

    fun discard() {
        worker.shutdownNow()
        Thread { staging.deleteRecursively() }.start()
    }

    fun finish() {
        worker.shutdownNow()
    }

    private fun skip(reason: Skip) {
        skipped[reason] = (skipped[reason] ?: 0) + 1
    }

    /**
     * The kind and the type the server takes: a picture, a recording, or any
     * other file. Null for what a share must not read.
     */
    private fun kindOf(uri: Uri, name: String, sharedType: String?): Pair<String, String>? {
        if (!isForeign(uri)) return null
        val type = (resolver.getType(uri) ?: typeFromName(name) ?: sharedType)
            ?.substringBefore(';')?.trim()?.lowercase()
            ?.takeIf { it.isNotEmpty() && it != "*/*" }
            ?: "application/octet-stream"
        if (type.startsWith("image/")) return "picture" to type
        AUDIO_TYPES[type]?.let { return "audio" to it }
        return "file" to type
    }

    /**
     * False for Anchor's own files, which a share must not read, except what
     * Anchor itself handed out to share: share_plus's provider serves only its
     * own cache folder, so a scan's PDF shared back into Anchor+ is fine.
     */
    private fun isForeign(uri: Uri): Boolean {
        if (uri.scheme != ContentResolver.SCHEME_CONTENT) return false
        val authority = uri.authority ?: return false
        if (authority == "$ownPackage$SHARE_PLUS_AUTHORITY") return true
        return packages.resolveContentProvider(authority, 0)?.packageName != ownPackage
    }

    private fun nameOf(uri: Uri): String {
        val name = try {
            resolver.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null)?.use {
                if (it.moveToFirst()) it.getString(0) else null
            }
        } catch (_: Exception) {
            null
        }
        return (name ?: uri.lastPathSegment ?: "")
            .substringAfterLast('/')
            .filter { !it.isISOControl() }
            .trim()
            .take(MAX_NAME)
    }

    private fun typeFromName(name: String): String? =
        MimeTypeMap.getSingleton().getMimeTypeFromExtension(name.substringAfterLast('.', "").lowercase())

    private class Copied(val file: String, val mime: String, val name: String, val durationMs: Long?)

    /** Runs on the worker; [item] itself is only touched on the main thread. */
    private fun copy(item: Item, uri: Uri, kind: String, mime: String, name: String) {
        var copied: Copied? = null
        val reason = try {
            val raw = File(staging, "${item.id}.part")
            copyCapped(uri, raw)
            copied = when (kind) {
                "picture" -> picture(item.id, raw, name)
                "audio" -> audio(item.id, raw, mime, name)
                else -> file(item.id, raw, mime, name)
            }
            null
        } catch (_: TooBig) {
            Skip.tooBig
        } catch (_: InterruptedIOException) {
            return
        } catch (_: Exception) {
            Skip.unreadable
        } catch (_: OutOfMemoryError) {
            Skip.unreadable
        }
        mainThread.post {
            if (copied != null) {
                item.file = copied.file
                item.mime = copied.mime
                item.name = copied.name
                item.durationMs = copied.durationMs
                if (isLoaded) onChange(mapOf("event" to "fileReady") + item.toMap())
            } else if (reason != null) {
                items.remove(item)
                skip(reason)
                if (isLoaded) onChange(mapOf("event" to "fileSkipped", "id" to item.id, "reason" to reason.name))
            }
        }
    }

    private class TooBig : IOException()

    /** A provider's size can be wrong or missing. */
    private fun copyCapped(uri: Uri, target: File) {
        val input = resolver.openInputStream(uri) ?: throw IOException("No stream")
        input.use { source ->
            target.outputStream().use { out ->
                val buffer = ByteArray(64 * 1024)
                var total = 0L
                while (true) {
                    if (Thread.currentThread().isInterrupted) throw InterruptedIOException()
                    val read = source.read(buffer)
                    if (read < 0) break
                    total += read
                    if (total > MAX_BYTES) {
                        target.delete()
                        throw TooBig()
                    }
                    out.write(buffer, 0, read)
                }
            }
        }
    }

    private fun picture(id: String, raw: File, name: String): Copied {
        val type = imageTypeOf(raw)
        if (type != null) {
            val file = rename(raw, "$id.${IMAGE_EXTENSIONS.getValue(type)}")
            return Copied(file.name, type, name.ifEmpty { file.name }, null)
        }
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.P) throw IOException("Can't convert")
        val jpeg = File(staging, "$id.jpg")
        try {
            JpegConverter.convert(raw, jpeg)
        } finally {
            raw.delete()
        }
        if (jpeg.length() > MAX_BYTES) {
            jpeg.delete()
            throw TooBig()
        }
        return Copied(jpeg.name, "image/jpeg", withExtension(name, "jpg"), null)
    }

    private fun audio(id: String, raw: File, mime: String, name: String): Copied {
        val file = rename(raw, "$id.${AUDIO_EXTENSIONS.getValue(mime)}")
        val durationMs = try {
            MediaMetadataRetriever().run {
                try {
                    setDataSource(file.absolutePath)
                    extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION)?.toLongOrNull()
                } finally {
                    release()
                }
            }
        } catch (_: Exception) {
            null
        }
        return Copied(file.name, mime, name.ifEmpty { file.name }, durationMs)
    }

    private fun file(id: String, raw: File, mime: String, name: String): Copied {
        val extension = name.substringAfterLast('.', "").filter { it.isLetterOrDigit() }.take(10)
        val file = rename(raw, if (extension.isEmpty()) "$id.bin" else "$id.$extension")
        return Copied(file.name, mime, name.ifEmpty { file.name }, null)
    }

    private fun rename(raw: File, name: String): File {
        val file = File(staging, name)
        if (!raw.renameTo(file)) throw IOException("Couldn't rename ${raw.name}")
        return file
    }

    private fun withExtension(name: String, extension: String): String {
        val base = name.substringBeforeLast('.', name).ifEmpty { "Picture" }
        return "$base.$extension"
    }

    private fun imageTypeOf(file: File): String? {
        val head = ByteArray(12)
        val read = file.inputStream().use { it.read(head) }
        fun has(bytes: ByteArray, at: Int = 0) =
            read >= at + bytes.size && bytes.indices.all { head[at + it] == bytes[it] }
        return when {
            has(byteArrayOf(0xFF.toByte(), 0xD8.toByte(), 0xFF.toByte())) -> "image/jpeg"
            has(byteArrayOf(0x89.toByte(), 0x50, 0x4E, 0x47)) -> "image/png"
            has("GIF8".toByteArray()) -> "image/gif"
            has("RIFF".toByteArray()) && has("WEBP".toByteArray(), 8) -> "image/webp"
            else -> null
        }
    }

    private companion object {
        const val MAX_FILES = 20
        const val MAX_NAME = 120

        /** share_plus's FileProvider, which serves only cache/share_plus/. */
        const val SHARE_PLUS_AUTHORITY = ".flutter.share_provider"

        /** Must match the server's limit. */
        const val MAX_BYTES = 50L * 1024 * 1024

        val IMAGE_EXTENSIONS = mapOf(
            "image/jpeg" to "jpg",
            "image/png" to "png",
            "image/gif" to "gif",
            "image/webp" to "webp",
        )

        /** Audio types apps share, by the type the server takes. */
        val AUDIO_TYPES = mapOf(
            "audio/mpeg" to "audio/mpeg",
            "audio/mp3" to "audio/mpeg",
            "audio/wav" to "audio/wav",
            "audio/x-wav" to "audio/wav",
            "audio/wave" to "audio/wav",
            "audio/mp4" to "audio/mp4",
            "audio/m4a" to "audio/mp4",
            "audio/x-m4a" to "audio/mp4",
            "audio/ogg" to "audio/ogg",
            "audio/opus" to "audio/ogg",
            "audio/aac" to "audio/aac",
            "audio/webm" to "audio/webm",
        )

        val AUDIO_EXTENSIONS = mapOf(
            "audio/mpeg" to "mp3",
            "audio/wav" to "wav",
            "audio/mp4" to "m4a",
            "audio/ogg" to "ogg",
            "audio/aac" to "aac",
            "audio/webm" to "webm",
        )
    }
}
