import SwiftUI
import WidgetKit

// MARK: - Timeline

struct ProjectTimeEntry: TimelineEntry {
    let date: Date
    let data: ProjectTimeWidgetData
}

struct ProjectTimeProvider: TimelineProvider {
    func placeholder(in context: Context) -> ProjectTimeEntry {
        ProjectTimeEntry(date: .now, data: .placeholder)
    }

    func getSnapshot(in context: Context, completion: @escaping (ProjectTimeEntry) -> Void) {
        let data = loadWidgetSnapshot(ProjectTimeWidgetData.self, key: WidgetSnapshotKey.projectTime) ?? .placeholder
        completion(ProjectTimeEntry(date: .now, data: data))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<ProjectTimeEntry>) -> Void) {
        let data = loadWidgetSnapshot(ProjectTimeWidgetData.self, key: WidgetSnapshotKey.projectTime) ?? .placeholder
        let entry = ProjectTimeEntry(date: .now, data: data)

        // See the equivalent comment in `ContributionGraphWidget.swift` --
        // this is a fallback for a missed `ExtensionStorage.reloadWidget()`
        // push, not the primary refresh mechanism.
        let nextRefresh = Calendar.current.date(byAdding: .hour, value: 1, to: .now) ?? .now
        completion(Timeline(entries: [entry], policy: .after(nextRefresh)))
    }
}

// MARK: - View

/// Formats a total the same way regardless of whether it's a whole number
/// of minutes/reps (common case) or has a fractional remainder, and
/// appends the field's unit (e.g. "min") when one is set --
/// `ProjectTimeWidgetRow.unit`/`ProjectTimeWidgetData.unit` mirror the
/// tracker field's `unit` column exactly (see `fetchProjectTimeWidgetData`
/// in `src/widgets/widget-data.ts`), never hardcoded.
private func formattedTotal(_ total: Double, unit: String?) -> String {
    let rounded = total.rounded()
    let numberText = abs(rounded - total) < 0.001
        ? String(Int(rounded))
        : String(format: "%.1f", total)
    guard let unit, !unit.isEmpty else { return numberText }
    return "\(numberText) \(unit)"
}

struct ProjectTimeWidgetView: View {
    let data: ProjectTimeWidgetData
    @Environment(\.widgetFamily) private var family

    private var maxRows: Int { family == .systemSmall ? 0 : 4 }

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(data.rangeLabel.uppercased())
                .font(.caption2)
                .fontWeight(.semibold)
                .foregroundStyle(.secondary)

            Text(formattedTotal(data.total, unit: data.unit))
                .font(.system(size: 30, weight: .bold, design: .rounded))
                .minimumScaleFactor(0.5)
                .lineLimit(1)

            if maxRows > 0, !data.rows.isEmpty {
                Divider()
                VStack(alignment: .leading, spacing: 3) {
                    ForEach(data.rows.prefix(maxRows)) { row in
                        HStack {
                            Text(row.title)
                                .font(.caption)
                                .lineLimit(1)
                            Spacer(minLength: 4)
                            Text(formattedTotal(row.total, unit: row.unit))
                                .font(.caption)
                                .foregroundStyle(.secondary)
                                .lineLimit(1)
                        }
                    }
                }
            }

            Spacer(minLength: 0)
        }
        .padding(12)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .containerBackground(.fill.tertiary, for: .widget)
    }
}

// MARK: - Widget

struct ProjectTimeWidget: Widget {
    let kind = "ProjectTimeWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: ProjectTimeProvider()) { entry in
            ProjectTimeWidgetView(data: entry.data)
        }
        .configurationDisplayName("Project Time")
        .description("Total time logged on your projects, this range.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

#Preview(as: .systemMedium) {
    ProjectTimeWidget()
} timeline: {
    ProjectTimeEntry(date: .now, data: .placeholder)
}
