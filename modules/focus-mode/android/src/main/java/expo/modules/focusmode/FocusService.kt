@file:Suppress("DEPRECATION") // PhoneStateListener, for Android 11 and below.

package expo.modules.focusmode

import android.Manifest
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.content.pm.ServiceInfo
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.provider.Settings
import android.telecom.TelecomManager
import android.telephony.PhoneStateListener
import android.telephony.TelephonyCallback
import android.telephony.TelephonyManager
import java.text.DateFormat
import java.util.Date
import java.util.concurrent.Executors

/**
 * The one foreground service behind a focus session. It owns everything
 * that must keep working after the app process's JavaScript stops: Do Not
 * Disturb, block detection, call tracking, and the end tone.
 */
class FocusService : Service() {
  private val handler = Handler(Looper.getMainLooper())
  private lateinit var prefs: FocusPrefs
  private var alwaysAllowed: Set<String> = emptySet()
  private var foregroundPackage: String? = null
  private var lastEventQueryMs = 0L
  private var lastBlockMs = 0L
  private var ending = false
  private var telephonyCallback: Any? = null

  private val tick = object : Runnable {
    override fun run() {
      onTick()
      if (!ending) handler.postDelayed(this, TICK_MS)
    }
  }

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onCreate() {
    super.onCreate()
    prefs = FocusPrefs(this)
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    if (intent?.action == ACTION_STOP) {
      finish()
      return START_NOT_STICKY
    }
    // A null intent is a sticky restart after the process died: resume from prefs.
    if (!prefs.active || System.currentTimeMillis() >= effectiveEndMs() && !prefs.inCall()) {
      finish()
      return START_NOT_STICKY
    }

    startInForeground()
    running = true
    ending = false
    alwaysAllowed = resolveAlwaysAllowed()
    foregroundPackage = null
    lastEventQueryMs = System.currentTimeMillis()
    Dnd.apply(this, prefs)
    registerCallTracking()
    handler.removeCallbacks(tick)
    handler.post(tick)
    return START_STICKY
  }

  override fun onDestroy() {
    handler.removeCallbacks(tick)
    unregisterCallTracking()
    Dnd.restore(this, prefs)
    running = false
    super.onDestroy()
  }

  private fun onTick() {
    val now = System.currentTimeMillis()
    prefs.heartbeatMs = now
    if (now >= effectiveEndMs() && !prefs.inCall()) {
      playEndTone()
      ending = true
      // Let the tone play before the service goes away.
      handler.postDelayed({ finish() }, TONE_GRACE_MS)
      return
    }
    checkForeground(now)
  }

  /** The planned end pushed back by the calls taken since focus started. */
  private fun effectiveEndMs(): Long {
    val now = System.currentTimeMillis()
    val paused = prefs.callsSince(prefs.startedAtMs, now).sumOf { (start, end) ->
      maxOf(0L, end - maxOf(start, prefs.startedAtMs))
    }
    return prefs.endsAtMs + paused
  }

  // Block detection.

  private fun checkForeground(now: Long) {
    if (!hasUsageAccess(this)) return
    val usm = getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
    val events = usm.queryEvents(lastEventQueryMs - EVENT_OVERLAP_MS, now)
    val event = UsageEvents.Event()
    while (events.hasNextEvent()) {
      events.getNextEvent(event)
      if (event.eventType == ACTIVITY_RESUMED) foregroundPackage = event.packageName
    }
    lastEventQueryMs = now

    val current = foregroundPackage ?: return
    if (isAllowed(current) || now - lastBlockMs < BLOCK_DEBOUNCE_MS) return
    lastBlockMs = now
    openBlockScreen()
    blockListener?.invoke(current)
  }

  private fun isAllowed(packageName: String): Boolean =
    packageName in alwaysAllowed || packageName in prefs.allowedPackages

  private fun openBlockScreen() {
    val url = prefs.blockedUrl.ifEmpty { return }
    val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
      .setPackage(packageName)
      .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
    try {
      // Allowed from the background because the app holds the overlay permission.
      startActivity(intent)
    } catch (e: Exception) {
      // Without the overlay permission Android refuses; blocking degrades.
    }
  }

  /** This app, the dialer and in-call UI, System UI, the keyboard, the launcher, and permission screens. */
  private fun resolveAlwaysAllowed(): Set<String> {
    val allowed = mutableSetOf(
      packageName,
      "android",
      "com.android.systemui",
      "com.android.server.telecom",
      "com.android.incallui",
      "com.google.android.dialer",
      "com.samsung.android.incallui",
      "com.android.permissioncontroller",
      "com.google.android.permissioncontroller",
      "com.android.settings",
    )
    try {
      (getSystemService(Context.TELECOM_SERVICE) as TelecomManager).defaultDialerPackage?.let { allowed.add(it) }
    } catch (e: Exception) {
    }
    Settings.Secure.getString(contentResolver, Settings.Secure.DEFAULT_INPUT_METHOD)
      ?.substringBefore('/')
      ?.let { allowed.add(it) }
    val home = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME)
    packageManager.resolveActivity(home, PackageManager.MATCH_DEFAULT_ONLY)
      ?.activityInfo?.packageName
      ?.let { allowed.add(it) }
    return allowed
  }

  // Calls: recorded as intervals; JavaScript subtracts them from the session on resume.

  private fun onCallState(state: Int) {
    val now = System.currentTimeMillis()
    if (state == TelephonyManager.CALL_STATE_IDLE) {
      prefs.callEnded(now)
      startInForeground() // The end time moved; refresh the notification.
    } else {
      prefs.callStarted(now)
    }
  }

  private fun registerCallTracking() {
    if (checkSelfPermission(Manifest.permission.READ_PHONE_STATE) != PackageManager.PERMISSION_GRANTED) return
    unregisterCallTracking()
    val tm = getSystemService(Context.TELEPHONY_SERVICE) as TelephonyManager
    try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        val callback = object : TelephonyCallback(), TelephonyCallback.CallStateListener {
          override fun onCallStateChanged(state: Int) = onCallState(state)
        }
        tm.registerTelephonyCallback(Executors.newSingleThreadExecutor(), callback)
        telephonyCallback = callback
      } else {
        @Suppress("DEPRECATION")
        val listener = object : PhoneStateListener() {
          @Deprecated("Deprecated in Java")
          override fun onCallStateChanged(state: Int, phoneNumber: String?) = onCallState(state)
        }
        @Suppress("DEPRECATION")
        tm.listen(listener, PhoneStateListener.LISTEN_CALL_STATE)
        telephonyCallback = listener
      }
    } catch (e: SecurityException) {
      telephonyCallback = null
    }
  }

  private fun unregisterCallTracking() {
    val callback = telephonyCallback ?: return
    val tm = getSystemService(Context.TELEPHONY_SERVICE) as TelephonyManager
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && callback is TelephonyCallback) {
      tm.unregisterTelephonyCallback(callback)
    } else if (callback is PhoneStateListener) {
      @Suppress("DEPRECATION")
      tm.listen(callback, PhoneStateListener.LISTEN_NONE)
    }
    telephonyCallback = null
  }

  // End tone, on the alarm stream so Do Not Disturb does not silence it.

  private fun playEndTone() {
    try {
      val player = MediaPlayer()
      player.setAudioAttributes(
        AudioAttributes.Builder()
          .setUsage(AudioAttributes.USAGE_ALARM)
          .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
          .build(),
      )
      resources.openRawResourceFd(R.raw.focus_end).use { fd ->
        player.setDataSource(fd.fileDescriptor, fd.startOffset, fd.length)
      }
      player.setOnCompletionListener { it.release() }
      player.prepare()
      player.start()
    } catch (e: Exception) {
    }
  }

  // Foreground notification: the task title and the end time, nothing else.

  private fun startInForeground() {
    val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val channel = NotificationChannel(CHANNEL_ID, "Focus session", NotificationManager.IMPORTANCE_LOW)
      channel.setShowBadge(false)
      nm.createNotificationChannel(channel)
    }
    val launch = packageManager.getLaunchIntentForPackage(packageName)
    val contentIntent = launch?.let {
      PendingIntent.getActivity(this, 0, it, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
    }
    val endsAt = DateFormat.getTimeInstance(DateFormat.SHORT).format(Date(effectiveEndMs()))
    val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      Notification.Builder(this, CHANNEL_ID)
    } else {
      @Suppress("DEPRECATION")
      Notification.Builder(this).setPriority(Notification.PRIORITY_LOW)
    }
    val notification = builder
      .setSmallIcon(applicationInfo.icon)
      .setContentTitle(prefs.title)
      .setContentText("Ends at $endsAt")
      .setOngoing(true)
      .setOnlyAlertOnce(true)
      .setContentIntent(contentIntent)
      .build()
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
      startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE)
    } else {
      startForeground(NOTIFICATION_ID, notification)
    }
  }

  private fun finish() {
    ending = true
    handler.removeCallbacks(tick)
    unregisterCallTracking()
    Dnd.restore(this, prefs)
    prefs.active = false
    running = false
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
      stopForeground(STOP_FOREGROUND_REMOVE)
    } else {
      @Suppress("DEPRECATION")
      stopForeground(true)
    }
    stopSelf()
  }

  companion object {
    const val ACTION_STOP = "expo.modules.focusmode.STOP"
    private const val CHANNEL_ID = "focus_session"
    private const val NOTIFICATION_ID = 4711
    private const val TICK_MS = 1000L
    private const val EVENT_OVERLAP_MS = 2000L
    private const val BLOCK_DEBOUNCE_MS = 1500L
    private const val TONE_GRACE_MS = 3000L

    /** `ACTIVITY_RESUMED` (API 29), the same value as the older `MOVE_TO_FOREGROUND`. */
    private const val ACTIVITY_RESUMED = 1

    /** True while the service runs in this process. */
    @Volatile
    var running = false
      private set

    /** Set by the module to forward blocks to JavaScript as `onBlocked`. */
    @Volatile
    var blockListener: ((String) -> Unit)? = null

    @Suppress("DEPRECATION")
    fun hasUsageAccess(context: Context): Boolean {
      val appOps = context.getSystemService(Context.APP_OPS_SERVICE) as android.app.AppOpsManager
      val mode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        appOps.unsafeCheckOpNoThrow(
          android.app.AppOpsManager.OPSTR_GET_USAGE_STATS,
          android.os.Process.myUid(),
          context.packageName,
        )
      } else {
        @Suppress("DEPRECATION")
        appOps.checkOpNoThrow(
          android.app.AppOpsManager.OPSTR_GET_USAGE_STATS,
          android.os.Process.myUid(),
          context.packageName,
        )
      }
      return mode == android.app.AppOpsManager.MODE_ALLOWED
    }
  }
}
