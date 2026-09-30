package expo.modules.focusmode

import android.app.NotificationManager
import android.content.Context
import android.os.Build
import org.json.JSONObject

/**
 * Do Not Disturb during a session: priority only, calls from anyone ring,
 * alarms stay audible (the end tone uses the alarm stream), nothing else.
 * The user's filter and policy are saved first and restored on stop.
 */
object Dnd {
  fun hasAccess(context: Context): Boolean = manager(context).isNotificationPolicyAccessGranted

  fun apply(context: Context, prefs: FocusPrefs) {
    val nm = manager(context)
    if (!nm.isNotificationPolicyAccessGranted) return
    if (!prefs.dndApplied) {
      prefs.savedFilter = nm.currentInterruptionFilter
      prefs.savedPolicy = policyToJson(nm.notificationPolicy)
      prefs.dndApplied = true
    }
    nm.notificationPolicy = NotificationManager.Policy(
      NotificationManager.Policy.PRIORITY_CATEGORY_CALLS or NotificationManager.Policy.PRIORITY_CATEGORY_ALARMS,
      NotificationManager.Policy.PRIORITY_SENDERS_ANY,
      NotificationManager.Policy.PRIORITY_SENDERS_ANY,
    )
    nm.setInterruptionFilter(NotificationManager.INTERRUPTION_FILTER_PRIORITY)
  }

  /** Restores what `apply` saved. Safe to call when nothing was applied. */
  fun restore(context: Context, prefs: FocusPrefs) {
    if (!prefs.dndApplied) return
    val nm = manager(context)
    if (nm.isNotificationPolicyAccessGranted) {
      prefs.savedPolicy?.let { json -> policyFromJson(json)?.let { nm.notificationPolicy = it } }
      val filter = prefs.savedFilter
      nm.setInterruptionFilter(
        if (filter == NotificationManager.INTERRUPTION_FILTER_UNKNOWN) NotificationManager.INTERRUPTION_FILTER_ALL else filter,
      )
    }
    prefs.savedPolicy = null
    prefs.dndApplied = false
  }

  private fun manager(context: Context) =
    context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

  private fun policyToJson(policy: NotificationManager.Policy): String {
    val json = JSONObject()
      .put("categories", policy.priorityCategories)
      .put("calls", policy.priorityCallSenders)
      .put("messages", policy.priorityMessageSenders)
      .put("visual", policy.suppressedVisualEffects)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
      json.put("conversations", policy.priorityConversationSenders)
    }
    return json.toString()
  }

  private fun policyFromJson(text: String): NotificationManager.Policy? =
    try {
      val json = JSONObject(text)
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R && json.has("conversations")) {
        NotificationManager.Policy(
          json.getInt("categories"),
          json.getInt("calls"),
          json.getInt("messages"),
          json.getInt("visual"),
          json.getInt("conversations"),
        )
      } else {
        NotificationManager.Policy(
          json.getInt("categories"),
          json.getInt("calls"),
          json.getInt("messages"),
          json.getInt("visual"),
        )
      }
    } catch (e: Exception) {
      null
    }
}
