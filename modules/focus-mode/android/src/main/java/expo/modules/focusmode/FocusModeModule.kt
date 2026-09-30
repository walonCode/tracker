package expo.modules.focusmode

import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record

class StartFocusOptions : Record {
  @Field
  val title: String = ""

  @Field
  val endsAtMs: Double = 0.0

  @Field
  val allowedPackages: List<String> = emptyList()

  @Field
  val blockedUrl: String = ""
}

class FocusModeModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  private val prefs by lazy { FocusPrefs(context) }

  override fun definition() = ModuleDefinition {
    Name("FocusMode")

    Events("onBlocked")

    OnCreate {
      FocusService.blockListener = { packageName ->
        sendEvent("onBlocked", mapOf("packageName" to packageName))
      }
    }

    OnDestroy {
      FocusService.blockListener = null
    }

    // Permission checks and openers.

    Function("hasDndAccess") { Dnd.hasAccess(context) }

    Function("openDndSettings") {
      openSettings(Intent(Settings.ACTION_NOTIFICATION_POLICY_ACCESS_SETTINGS))
    }

    Function("hasUsageAccess") { FocusService.hasUsageAccess(context) }

    Function("openUsageSettings") {
      val withPackage = Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS, packageUri())
      if (!openSettings(withPackage)) openSettings(Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS))
    }

    Function("hasOverlayPermission") { Settings.canDrawOverlays(context) }

    Function("openOverlaySettings") {
      openSettings(Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, packageUri()))
    }

    Function("isIgnoringBatteryOptimizations") {
      val pm = context.getSystemService(Context.POWER_SERVICE) as PowerManager
      pm.isIgnoringBatteryOptimizations(context.packageName)
    }

    Function("requestIgnoreBatteryOptimizations") {
      val request = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, packageUri())
      if (!openSettings(request)) openSettings(Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS))
    }

    Function("hasPhoneStatePermission") {
      context.checkSelfPermission(android.Manifest.permission.READ_PHONE_STATE) == PackageManager.PERMISSION_GRANTED
    }

    // Apps with a launcher entry, found through the manifest's <queries>.

    AsyncFunction("listLaunchableApps") {
      val pm = context.packageManager
      val launcher = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER)
      @Suppress("DEPRECATION")
      pm.queryIntentActivities(launcher, 0)
        .map { it.activityInfo.packageName to it.loadLabel(pm).toString() }
        .filter { (packageName, _) -> packageName != context.packageName }
        .distinctBy { (packageName, _) -> packageName }
        .sortedBy { (_, label) -> label.lowercase() }
        .map { (packageName, label) -> mapOf("packageName" to packageName, "label" to label) }
    }

    // Focus.

    Function("startFocus") { options: StartFocusOptions ->
      prefs.title = options.title
      prefs.endsAtMs = options.endsAtMs.toLong()
      prefs.startedAtMs = System.currentTimeMillis()
      prefs.allowedPackages = options.allowedPackages.toSet()
      prefs.blockedUrl = options.blockedUrl
      prefs.pruneCalls(System.currentTimeMillis() - CALL_RETENTION_MS)
      prefs.active = true
      val intent = Intent(context, FocusService::class.java)
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        context.startForegroundService(intent)
      } else {
        context.startService(intent)
      }
    }

    Function("stopFocus") {
      prefs.active = false
      if (FocusService.running) {
        context.startService(Intent(context, FocusService::class.java).setAction(FocusService.ACTION_STOP))
      }
      // Covers a service that already died: never leave DND on.
      if (!FocusService.running) Dnd.restore(context, prefs)
    }

    Function("getCallIntervals") { sinceMs: Double ->
      prefs.callsSince(sinceMs.toLong(), System.currentTimeMillis()).map { (start, end) ->
        mapOf("startMs" to start.toDouble(), "endMs" to end.toDouble())
      }
    }

    Function("getStatus") {
      mapOf(
        "running" to FocusService.running,
        "heartbeatMs" to prefs.heartbeatMs.toDouble(),
        "dndOn" to prefs.dndApplied,
      )
    }

    // App start: DND applied by a focus whose service is gone (crash, reboot) is restored.
    Function("reconcile") {
      if (!FocusService.running) {
        Dnd.restore(context, prefs)
        prefs.active = false
      }
    }
  }

  companion object {
    private const val CALL_RETENTION_MS = 24L * 60 * 60 * 1000
  }

  private fun packageUri(): Uri = Uri.parse("package:${context.packageName}")

  /** Opens a system settings screen; false when no activity handles it. */
  private fun openSettings(intent: Intent): Boolean {
    val activity = appContext.currentActivity
    return try {
      if (activity != null) {
        activity.startActivity(intent)
      } else {
        context.startActivity(intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
      }
      true
    } catch (e: Exception) {
      false
    }
  }
}
