import SwiftUI
import WidgetKit

// MARK: - Timeline

struct ContributionGraphEntry: TimelineEntry {
    let date: Date
    let data: ContributionGraphWidgetData
}

struct ContributionGraphProvider: TimelineProvider {
    func placeholder(in context: Context) -> ContributionGraphEntry {
        ContributionGraphEntry(date: .now, data: .placeholder)
    }

    func getSnapshot(in context: Context, completion: @escaping (ContributionGraphEntry) -> Void) {
        let data = loadWidgetSnapshot(ContributionGraphWidgetData.self, key: WidgetSnapshotKey.contributionGraph)
            ?? .placeholder
        completion(ContributionGraphEntry(date: .now, data: data))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<ContributionGraphEntry>) -> Void) {
        let data = loadWidgetSnapshot(ContributionGraphWidgetData.self, key: WidgetSnapshotKey.contributionGraph)
            ?? .placeholder
        let entry = ContributionGraphEntry(date: .now, data: data)

        // `src/widgets/ios-sync.ts` re-pushes this snapshot and calls
        // `ExtensionStorage.reloadWidget()` (-> `WidgetCenter.shared.reloadAllTimelines()`)
        // after relevant writes and on app foreground/background -- this
        // hourly self-refresh is only a fallback for whenever that push is
        // missed (e.g. the app was force-quit before it could sync).
        let nextRefresh = Calendar.current.date(byAdding: .hour, value: 1, to: .now) ?? .now
        completion(Timeline(entries: [entry], policy: .after(nextRefresh)))
    }
}

// MARK: - View

/// Caps how many trailing weeks get rendered regardless of how many the JS
/// side computed (`rangeDays` can go up to 90 days / ~13 weeks, see
/// `MAX_RANGE_DAYS` in `src/widgets/widget-data.ts`) -- a Home Screen widget
/// only has room for a handful of columns no matter the family.
private let maxRenderedWeeks = 16

struct ContributionGraphWidgetView: View {
    let data: ContributionGraphWidgetData

    private var trimmedGrid: [[ContributionGridCell]] {
        Array(data.grid.suffix(maxRenderedWeeks))
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(data.title)
                .font(.caption)
                .fontWeight(.semibold)
                .foregroundStyle(.secondary)
                .lineLimit(1)

            GeometryReader { geometry in
                let columns = max(trimmedGrid.count, 1)
                let spacing: CGFloat = 2
                let cellSize = max(
                    min(
                        (geometry.size.width - CGFloat(columns - 1) * spacing) / CGFloat(columns),
                        (geometry.size.height - 6 * spacing) / 7
                    ),
                    0
                )

                HStack(alignment: .top, spacing: spacing) {
                    ForEach(Array(trimmedGrid.enumerated()), id: \.offset) { _, week in
                        VStack(spacing: spacing) {
                            ForEach(Array(week.enumerated()), id: \.offset) { _, cell in
                                ContributionCellView(cell: cell, size: cellSize)
                            }
                        }
                    }
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topTrailing)
            }
        }
        .padding(12)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .containerBackground(.fill.tertiary, for: .widget)
    }
}

/// One calendar day's cell. Fill *opacity* comes only from `intensity.primary`;
/// the small secondary dot is layered independently on top and never
/// changes the fill color/opacity itself -- this is the one piece of
/// product logic (see `src/lib/contribution-graph.ts`'s module doc comment:
/// "fard drives brightness, sunnah is a secondary indicator, never
/// blended") that has to carry over exactly from the Android widget and the
/// in-app graph.
private struct ContributionCellView: View {
    let cell: ContributionGridCell
    let size: CGFloat

    var body: some View {
        let primary = cell.intensity?.primary ?? 0
        let hasSecondary = cell.intensity?.secondary ?? false
        let opacity = primary <= 0 ? 0.10 : 0.18 + primary * 0.72

        RoundedRectangle(cornerRadius: max(size * 0.22, 2))
            .fill(Color.accentColor.opacity(opacity))
            .frame(width: size, height: size)
            .overlay(alignment: .bottomTrailing) {
                if hasSecondary {
                    Circle()
                        .fill(.white)
                        .frame(width: max(size * 0.3, 3), height: max(size * 0.3, 3))
                        .padding(max(size * 0.08, 1))
                }
            }
    }
}

// MARK: - Widget

struct ContributionGraphWidget: Widget {
    let kind = "ContributionGraphWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: ContributionGraphProvider()) { entry in
            ContributionGraphWidgetView(data: entry.data)
        }
        .configurationDisplayName("Contribution Graph")
        .description("Recent-days activity grid for one tracker or all trackers combined.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

#Preview(as: .systemMedium) {
    ContributionGraphWidget()
} timeline: {
    ContributionGraphEntry(date: .now, data: .placeholder)
}
