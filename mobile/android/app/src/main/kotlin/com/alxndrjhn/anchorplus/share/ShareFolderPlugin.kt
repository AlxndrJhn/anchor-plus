package com.alxndrjhn.anchorplus.share

import android.content.Context
import io.flutter.embedding.engine.plugins.FlutterPlugin
import io.flutter.plugin.common.MethodCall
import io.flutter.plugin.common.MethodChannel
import java.io.File

class ShareFolderPlugin(private val listens: Boolean) : FlutterPlugin, MethodChannel.MethodCallHandler {

    private lateinit var channel: MethodChannel
    private lateinit var context: Context

    override fun onAttachedToEngine(binding: FlutterPlugin.FlutterPluginBinding) {
        context = binding.applicationContext
        channel = MethodChannel(binding.binaryMessenger, CHANNEL)
        channel.setMethodCallHandler(this)
        if (listens) listeners.add(channel)
    }

    override fun onDetachedFromEngine(binding: FlutterPlugin.FlutterPluginBinding) {
        channel.setMethodCallHandler(null)
        listeners.remove(channel)
    }

    override fun onMethodCall(call: MethodCall, result: MethodChannel.Result) {
        if (call.method != "folder") return result.notImplemented()
        result.success(root(context).apply { mkdirs() }.absolutePath)
    }

    companion object {
        private const val CHANNEL = "anchor/share"

        /** Touched on the main thread only. */
        private val listeners = mutableSetOf<MethodChannel>()

        fun root(context: Context) = File(context.filesDir, "share")

        fun staging(context: Context) = File(root(context), "staging")

        /** Whether the app's engine is up to import the inbox itself. */
        val isAppListening get() = listeners.isNotEmpty()

        fun inboxChanged() = listeners.forEach { it.invokeMethod("inboxChanged", null) }
    }
}
