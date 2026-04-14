package com.iris.phone

import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log

class IrisNotificationListenerService : NotificationListenerService() {

  companion object {
    private const val TAG = "IrisNotifListener"
    @Volatile var isConnected: Boolean = false
      private set

    @JvmStatic
    fun emitToModule(sbn: StatusBarNotification, eventType: String) {
      NotificationListenerModule.pushNotification(sbn, eventType)
    }
  }

  override fun onListenerConnected() {
    super.onListenerConnected()
    isConnected = true
    Log.i(TAG, "onListenerConnected")
    NotificationListenerModule.onListenerConnected()
  }

  override fun onListenerDisconnected() {
    super.onListenerDisconnected()
    isConnected = false
    Log.i(TAG, "onListenerDisconnected")
  }

  override fun onNotificationPosted(sbn: StatusBarNotification?) {
    if (sbn == null) return
    if (sbn.packageName == packageName) return
    try {
      emitToModule(sbn, "posted")
    } catch (t: Throwable) {
      Log.w(TAG, "emit failed: ${t.message}")
    }
  }

  override fun onNotificationRemoved(sbn: StatusBarNotification?) {
    if (sbn == null) return
    if (sbn.packageName == packageName) return
    try {
      emitToModule(sbn, "removed")
    } catch (t: Throwable) {
      Log.w(TAG, "emit remove failed: ${t.message}")
    }
  }
}
