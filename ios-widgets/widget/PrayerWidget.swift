import SwiftUI
import WidgetKit

// MARK: - Timeline

struct PrayerEntry: TimelineEntry {
    let date: Date
    let data: PrayerWidgetData
}

struct PrayerProvider: TimelineProvider {
    func placeholder(in context: Context) -> PrayerEntry {
        PrayerEntry(date: .now, data: .placeholder)
    }

    func getSnapshot(in context: Context, completion: @escaping (PrayerEntry) -> Void) {
        let data = loadWidgetSnapshot(PrayerWidgetData.self, key: WidgetSnapshotKey.prayer) ?? .placeholder
        completion(PrayerEntry(date: .now, data: data))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<PrayerEntry>) -> Void) {
        let data = loadWidgetSnapshot(PrayerWidgetData.self, key: WidgetSnapshotKey.prayer) ?? .placeholder
        let entry = PrayerEntry(date: .now, data: data)

        // Prayer status changes several times a day at known prayer times,
        // so this fallback self-refresh is shorter than the other two
        // widgets' hourly one -- it's still just a backstop for the
        // JS-driven `ExtensionStorage.reloadWidget()` push (see
        // `src/widgets/ios-sync.ts`), not the primary refresh mechanism.
        let nextRefresh = Calendar.current.date(byAdding: .minute, value: 30, to: .now) ?? .now
        completion(Timeline(entries: [entry], policy: .after(nextRefresh)))
    }
}

// MARK: - View

struct PrayerWidgetView: View {
    let data: PrayerWidgetData

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("\(data.fardDone)/\(data.total) prayers")
                .font(.caption)
                .fontWeight(.semibold)
                .foregroundStyle(.secondary)

            HStack(spacing: 8) {
                ForEach(data.rows) { row in
                    VStack(spacing: 4) {
                        PrayerDotView(fardDone: row.fardDone, sunnahDone: row.sunnahDone)
                        Text(row.label.prefix(1))
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                    }
                    .frame(maxWidth: .infinity)
                }
            }
        }
        .padding(12)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .containerBackground(.fill.tertiary, for: .widget)
    }
}

/// One prayer's dot: solid fill when fard is done, an empty outlined ring
/// otherwise -- with sunnah completion drawn as a small independent dot
/// layered on top. Exactly the Android prayer widget's fard-brightness /
/// sunnah-dot split (see `src/lib/contribution-graph.ts`'s "never blended"
/// rule): sunnah never changes the ring's own fill, it only adds the extra
/// dot.
private struct PrayerDotView: View {
    let fardDone: Bool
    let sunnahDone: Bool

    var body: some View {
        ZStack {
            Circle()
                .fill(fardDone ? Color.accentColor : Color.clear)
                .overlay(
                    Circle().strokeBorder(Color.accentColor.opacity(fardDone ? 0 : 0.4), lineWidth: 1.5)
                )
                .frame(width: 18, height: 18)

            if sunnahDone {
                Circle()
                    .fill(.white)
                    .frame(width: 6, height: 6)
            }
        }
    }
}

// MARK: - Widget

struct PrayerWidget: Widget {
    let kind = "PrayerWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: PrayerProvider()) { entry in
            PrayerWidgetView(data: entry.data)
        }
        .configurationDisplayName("Prayer")
        .description("Today's fard/sunnah status for each of the five daily prayers.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

#Preview(as: .systemSmall) {
    PrayerWidget()
} timeline: {
    PrayerEntry(date: .now, data: .placeholder)
}
