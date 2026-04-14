package com.iris.phone

import android.app.Notification
import android.content.ComponentName
import android.content.Intent
import android.os.Build
import android.provider.Settings
import android.service.notification.StatusBarNotification
import android.text.TextUtils
import android.util.Log
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule

class NotificationListenerModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  companion object {
    private const val TAG = "IrisNotifModule"
    private const val EVENT_NAME = "IrisNotificationPosted"
    private const val EVENT_LISTENER_CONNECTED = "IrisNotificationListenerConnected"

    @Volatile private var instance: NotificationListenerModule? = null

    @JvmStatic
    fun pushNotification(sbn: StatusBarNotification, eventType: String) {
      val mod = instance ?: return
      val map = mod.buildMap(sbn, eventType)
      mod.sendEvent(EVENT_NAME, map)
    }

    @JvmStatic
    fun onListenerConnected() {
      val mod = instance ?: return
      val map = Arguments.createMap()
      map.putBoolean("connected", true)
      mod.sendEvent(EVENT_LISTENER_CONNECTED, map)
    }
  }

  init {
    instance = this
  }

  override fun getName(): String = "IrisNotificationListener"

  @ReactMethod
  fun isPermissionGranted(promise: Promise) {
    try {
      val pkg = reactContext.packageName
      val enabled = Settings.Secure.getString(
        reactContext.contentResolver,
        "enabled_notification_listeners",
      ) ?: ""
      val granted = enabled.split(":").any { entry ->
        val cn = ComponentName.unflattenFromString(entry)
        cn != null && cn.packageName == pkg
      }
      promise.resolve(granted)
    } catch (t: Throwable) {
      promise.reject("ERR_PERM_CHECK", t)
    }
  }

  @ReactMethod
  fun openSettings(promise: Promise) {
    try {
      val intent = Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)
      intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      reactContext.startActivity(intent)
      promise.resolve(null)
    } catch (t: Throwable) {
      promise.reject("ERR_OPEN_SETTINGS", t)
    }
  }

  @ReactMethod
  fun isListenerConnected(promise: Promise) {
    promise.resolve(IrisNotificationListenerService.isConnected)
  }

  @ReactMethod
  fun addListener(eventName: String) {}

  @ReactMethod
  fun removeListeners(count: Int) {}

  private fun sendEvent(name: String, data: WritableMap) {
    try {
      reactContext
        .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
        .emit(name, data)
    } catch (t: Throwable) {
      Log.w(TAG, "sendEvent($name) failed: ${t.message}")
    }
  }

  private fun asString(v: CharSequence?): String? {
    if (v == null) return null
    val s = v.toString()
    return if (s.isEmpty()) null else s
  }

  private fun buildMap(sbn: StatusBarNotification, eventType: String): WritableMap {
    val map = Arguments.createMap()
    map.putString("event_type", eventType)
    map.putString("app_package", sbn.packageName)
    map.putInt("notification_id", sbn.id)
    map.putString("key", sbn.key)
    map.putString("tag", sbn.tag)
    map.putDouble("posted_at_ms", sbn.postTime.toDouble())
    map.putBoolean("is_group", sbn.isGroup)
    map.putBoolean("is_ongoing", sbn.isOngoing)
    map.putBoolean("is_clearable", sbn.isClearable)

    val notif: Notification = sbn.notification
    val extras = notif.extras

    map.putInt("priority", notif.priority)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      map.putString("channel_id", notif.channelId ?: "")
    }
    map.putString("category", notif.category ?: "")
    map.putInt("flags", notif.flags)

    val title = asString(extras.getCharSequence(Notification.EXTRA_TITLE))
      ?: asString(extras.getCharSequence(Notification.EXTRA_TITLE_BIG))
    val text = asString(extras.getCharSequence(Notification.EXTRA_TEXT))
      ?: asString(extras.getCharSequence(Notification.EXTRA_BIG_TEXT))
    val subText = asString(extras.getCharSequence(Notification.EXTRA_SUB_TEXT))
    val summary = asString(extras.getCharSequence(Notification.EXTRA_SUMMARY_TEXT))
    val infoText = asString(extras.getCharSequence(Notification.EXTRA_INFO_TEXT))

    map.putString("title", title ?: "")
    map.putString("body", text ?: "")
    map.putString("subtext", subText ?: "")
    map.putString("summary", summary ?: "")
    map.putString("info_text", infoText ?: "")

    val textLines = extras.getCharSequenceArray(Notification.EXTRA_TEXT_LINES)
    if (textLines != null) {
      val linesArr = Arguments.createArray()
      for (line in textLines) {
        if (line != null) linesArr.pushString(line.toString())
      }
      map.putArray("text_lines", linesArr)
    }

    // Try to resolve a readable app name
    try {
      val pm = reactContext.packageManager
      val ai = pm.getApplicationInfo(sbn.packageName, 0)
      val label = pm.getApplicationLabel(ai)?.toString() ?: sbn.packageName
      map.putString("app_name", label)
    } catch (_: Throwable) {
      map.putString("app_name", sbn.packageName)
    }

    return map
  }
}
