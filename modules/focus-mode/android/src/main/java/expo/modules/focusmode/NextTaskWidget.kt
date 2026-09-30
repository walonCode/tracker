package expo.modules.focusmode

import android.app.AlarmManager
import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.widget.RemoteViews
import org.json.JSONArray
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale

/**
 * The 4x1 home-screen widget: today's Next task label and a Start button.
 * JavaScript pushes the first planned label for today and tomorrow, so the
 * widget can switch days at midnight without reading the database.
 */
class NextTaskWidget : AppWidgetProvider() {
  override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) {
    render(context, manager, ids)
    scheduleMidnight(context)
  }

  override fun onReceive(context: Context, intent: Intent) {
    super.onReceive(context, intent)
    if (intent.action == ACTION_MIDNIGHT) refreshAll(context)
  }

  companion object {
    private const val PREFS = "focus_widget"
    private const val KEY_DAYS = "days"
    private const val KEY_START_URL = "start_url"
    private const val ACTION_MIDNIGHT = "expo.modules.focusmode.WIDGET_MIDNIGHT"

    /** Saves `[{ date, label }]` and the Start link, then redraws every widget. */
    fun save(context: Context, daysJson: String, startUrl: String) {
      context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
        .putString(KEY_DAYS, daysJson)
        .putString(KEY_START_URL, startUrl)
        .apply()
      refreshAll(context)
    }

    fun refreshAll(context: Context) {
      val manager = AppWidgetManager.getInstance(context)
      val ids = manager.getAppWidgetIds(ComponentName(context, NextTaskWidget::class.java))
      if (ids.isNotEmpty()) render(context, manager, ids)
      scheduleMidnight(context)
    }

    private fun todayLabel(context: Context): String? {
      val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
      val today = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())
      val days = try {
        JSONArray(prefs.getString(KEY_DAYS, "[]"))
      } catch (e: Exception) {
        JSONArray()
      }
      for (i in 0 until days.length()) {
        val day = days.optJSONObject(i) ?: continue
        if (day.optString("date") == today) return day.optString("label").ifEmpty { null }
      }
      return null
    }

    private fun render(context: Context, manager: AppWidgetManager, ids: IntArray) {
      val label = todayLabel(context)
      val startUrl = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY_START_URL, "") ?: ""
      val views = RemoteViews(context.packageName, R.layout.focus_next_widget)
      views.setTextViewText(R.id.focus_widget_label, label ?: context.getString(R.string.focus_widget_nothing))

      val start = if (label != null && startUrl.isNotEmpty()) {
        Intent(Intent.ACTION_VIEW, Uri.parse(startUrl)).setPackage(context.packageName)
      } else {
        context.packageManager.getLaunchIntentForPackage(context.packageName)
      }
      if (start != null) {
        start.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        val pending = PendingIntent.getActivity(
          context, 0, start, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )
        views.setOnClickPendingIntent(R.id.focus_widget_start, pending)
        views.setOnClickPendingIntent(R.id.focus_widget_label, pending)
      }
      views.setViewVisibility(R.id.focus_widget_start, if (label != null) android.view.View.VISIBLE else android.view.View.GONE)
      manager.updateAppWidget(ids, views)
    }

    /** One inexact alarm at the next local midnight to switch the widget to the new day. */
    private fun scheduleMidnight(context: Context) {
      val midnight = Calendar.getInstance().apply {
        add(Calendar.DAY_OF_YEAR, 1)
        set(Calendar.HOUR_OF_DAY, 0)
        set(Calendar.MINUTE, 0)
        set(Calendar.SECOND, 5)
        set(Calendar.MILLISECOND, 0)
      }
      val intent = Intent(context, NextTaskWidget::class.java).setAction(ACTION_MIDNIGHT)
      val pending = PendingIntent.getBroadcast(
        context, 0, intent, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
      )
      val alarms = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
      alarms.set(AlarmManager.RTC, midnight.timeInMillis, pending)
    }
  }
}
