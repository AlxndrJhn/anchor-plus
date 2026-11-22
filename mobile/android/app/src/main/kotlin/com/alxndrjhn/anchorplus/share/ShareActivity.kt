package com.alxndrjhn.anchorplus.share

import android.app.Activity
import android.content.Intent
import android.os.Build
import android.os.Bundle
import dev.fluttercommunity.workmanager.WorkmanagerPlugin
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.android.FlutterActivityLaunchConfigs.BackgroundMode
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel
import java.io.File

class ShareActivity : FlutterActivity() {

    private var intake: ShareIntake? = null
    private var channel: MethodChannel? = null
    private var isSaved = false

    override fun onCreate(savedInstanceState: Bundle?) {
        // After the process was killed the share's files are gone.
        val shared = if (savedInstanceState == null) SharedIntent.read(intent) else null
        if (shared != null) {
            dropOldStaging()
            intake = ShareIntake(this, shared) { change ->
                channel?.invokeMethod(change["event"] as String, change - "event")
            }
        }
        super.onCreate(savedInstanceState)
        if (intake == null) finish()
    }

    override fun getDartEntrypointFunctionName() = "shareMain"

    override fun getBackgroundMode() = BackgroundMode.transparent

    // Only the plugins the sheet uses.
    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        flutterEngine.plugins.add(ShareFolderPlugin(listens = false))
        // Queues the upload when the app isn't open to take the share in.
        flutterEngine.plugins.add(WorkmanagerPlugin())
        channel = MethodChannel(flutterEngine.dartExecutor.binaryMessenger, CHANNEL).apply {
            setMethodCallHandler { call, result ->
                val intake = intake ?: return@setMethodCallHandler result.error("no_share", null, null)
                when (call.method) {
                    "load" -> result.success(intake.load())
                    "isAppRunning" -> result.success(ShareFolderPlugin.isAppListening)
                    "close" -> {
                        close(isSaved = call.argument<Boolean>("saved") == true)
                        result.success(null)
                    }
                    "openApp" -> {
                        packageManager.getLaunchIntentForPackage(packageName)?.let {
                            startActivity(it.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
                        }
                        close(isSaved = false)
                        result.success(null)
                    }
                    else -> result.notImplemented()
                }
            }
        }
    }

    override fun onDestroy() {
        if (!isSaved) intake?.discard()
        channel?.setMethodCallHandler(null)
        super.onDestroy()
    }

    private fun close(isSaved: Boolean) {
        this.isSaved = isSaved
        if (isSaved) {
            intake?.finish()
            ShareFolderPlugin.inboxChanged()
        }
        finish()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            overrideActivityTransition(Activity.OVERRIDE_TRANSITION_CLOSE, 0, 0)
        } else {
            @Suppress("DEPRECATION")
            overridePendingTransition(0, 0)
        }
    }

    private fun dropOldStaging() {
        val folder = ShareFolderPlugin.staging(this)
        val cutoff = System.currentTimeMillis() - STALE_AFTER_MS
        Thread {
            folder.listFiles()?.filter { it.lastModified() < cutoff }?.forEach(File::deleteRecursively)
        }.start()
    }

    private companion object {
        const val CHANNEL = "anchor/share_sheet"
        const val STALE_AFTER_MS = 60 * 60 * 1000L
    }
}
