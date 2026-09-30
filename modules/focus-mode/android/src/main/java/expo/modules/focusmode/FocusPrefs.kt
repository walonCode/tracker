package expo.modules.focusmode

import android.content.Context
import android.content.SharedPreferences
import org.json.JSONArray
import org.json.JSONObject

/**
 * State that must survive the app process dying: the running focus, the
 * interruption filter to restore, and the recorded call intervals.
 * JavaScript may be suspended at any time, so the service writes here and
 * JavaScript reads on resume.
 */
class FocusPrefs(context: Context) {
  private val prefs: SharedPreferences =
    context.applicationContext.getSharedPreferences("focus_mode", Context.MODE_PRIVATE)

  // The running focus.

  var title: String
    get() = prefs.getString(KEY_TITLE, "") ?: ""
    set(value) = prefs.edit().putString(KEY_TITLE, value).apply()

  var endsAtMs: Long
    get() = prefs.getLong(KEY_ENDS_AT, 0L)
    set(value) = prefs.edit().putLong(KEY_ENDS_AT, value).apply()

  var startedAtMs: Long
    get() = prefs.getLong(KEY_STARTED_AT, 0L)
    set(value) = prefs.edit().putLong(KEY_STARTED_AT, value).apply()

  var allowedPackages: Set<String>
    get() = prefs.getStringSet(KEY_ALLOWED, emptySet())?.toSet() ?: emptySet()
    set(value) = prefs.edit().putStringSet(KEY_ALLOWED, value).apply()

  /** Deep link that opens the app's block screen. */
  var blockedUrl: String
    get() = prefs.getString(KEY_BLOCKED_URL, "") ?: ""
    set(value) = prefs.edit().putString(KEY_BLOCKED_URL, value).apply()

  var active: Boolean
    get() = prefs.getBoolean(KEY_ACTIVE, false)
    set(value) = prefs.edit().putBoolean(KEY_ACTIVE, value).apply()

  var heartbeatMs: Long
    get() = prefs.getLong(KEY_HEARTBEAT, 0L)
    set(value) = prefs.edit().putLong(KEY_HEARTBEAT, value).apply()

  // Do Not Disturb, saved before focus changes it.

  // Written with commit() so a crash right after cannot lose what to restore.

  var dndApplied: Boolean
    get() = prefs.getBoolean(KEY_DND_APPLIED, false)
    set(value) {
      prefs.edit().putBoolean(KEY_DND_APPLIED, value).commit()
    }

  var savedFilter: Int
    get() = prefs.getInt(KEY_SAVED_FILTER, 0)
    set(value) {
      prefs.edit().putInt(KEY_SAVED_FILTER, value).commit()
    }

  /** The saved notification policy, as JSON, or null. */
  var savedPolicy: String?
    get() = prefs.getString(KEY_SAVED_POLICY, null)
    set(value) {
      prefs.edit().putString(KEY_SAVED_POLICY, value).commit()
    }

  // Calls: a list of { startMs, endMs } where endMs is absent while the call is ongoing.

  /**
   * Drops calls that ended before `beforeMs`. Recent ones stay: JavaScript
   * reads calls since the session's last resume, which a restarted focus
   * must not lose.
   */
  fun pruneCalls(beforeMs: Long) {
    val calls = readCalls()
    val kept = JSONArray()
    for (i in 0 until calls.length()) {
      val call = calls.optJSONObject(i) ?: continue
      if (!call.has("endMs") || call.optLong("endMs") >= beforeMs) kept.put(call)
    }
    writeCalls(kept)
  }

  fun callStarted(atMs: Long) {
    val calls = readCalls()
    val last = calls.optJSONObject(calls.length() - 1)
    if (last != null && !last.has("endMs")) return
    calls.put(JSONObject().put("startMs", atMs))
    writeCalls(calls)
  }

  fun callEnded(atMs: Long) {
    val calls = readCalls()
    val last = calls.optJSONObject(calls.length() - 1) ?: return
    if (last.has("endMs")) return
    last.put("endMs", atMs)
    writeCalls(calls)
  }

  /** Every call that ended at or after `sinceMs`; an ongoing call ends at `nowMs`. */
  fun callsSince(sinceMs: Long, nowMs: Long): List<Pair<Long, Long>> {
    val calls = readCalls()
    val result = mutableListOf<Pair<Long, Long>>()
    for (i in 0 until calls.length()) {
      val call = calls.optJSONObject(i) ?: continue
      val start = call.optLong("startMs")
      val end = if (call.has("endMs")) call.optLong("endMs") else nowMs
      if (end >= sinceMs) result.add(start to end)
    }
    return result
  }

  fun inCall(): Boolean {
    val calls = readCalls()
    val last = calls.optJSONObject(calls.length() - 1) ?: return false
    return !last.has("endMs")
  }

  private fun readCalls(): JSONArray =
    try {
      JSONArray(prefs.getString(KEY_CALLS, "[]"))
    } catch (e: Exception) {
      JSONArray()
    }

  private fun writeCalls(calls: JSONArray) {
    prefs.edit().putString(KEY_CALLS, calls.toString()).commit()
  }

  companion object {
    private const val KEY_TITLE = "title"
    private const val KEY_ENDS_AT = "ends_at_ms"
    private const val KEY_STARTED_AT = "started_at_ms"
    private const val KEY_ALLOWED = "allowed_packages"
    private const val KEY_BLOCKED_URL = "blocked_url"
    private const val KEY_ACTIVE = "active"
    private const val KEY_HEARTBEAT = "heartbeat_ms"
    private const val KEY_DND_APPLIED = "dnd_applied"
    private const val KEY_SAVED_FILTER = "saved_filter"
    private const val KEY_SAVED_POLICY = "saved_policy"
    private const val KEY_CALLS = "calls"
  }
}
