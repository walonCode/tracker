import Foundation

// MARK: - Shared App Group

/// Must exactly match `ios.entitlements["com.apple.security.application-groups"]`
/// in `app.json` and `IOS_APP_GROUP` in `src/widgets/ios-sync.ts`. A typo
/// here doesn't fail loudly -- it silently creates a second, unshared
/// `UserDefaults` suite (see the App Groups entitlement gotchas), so every
/// widget below falls back to its `.placeholder` data forever instead of
/// erroring.
let appGroupIdentifier = "group.com.walonfoundation.tracker"

/// The three JSON snapshot keys `src/widgets/ios-sync.ts` writes into the
/// shared `UserDefaults` suite, one per widget kind. Kept as plain string
/// constants (not an enum with associated types) so both this file and the
/// JS module can each hold their own copy in the language that's natural
/// for them -- there's no shared build step between a Swift target and a JS
/// module to generate these from one source of truth.
enum WidgetSnapshotKey {
    static let contributionGraph = "contribution_graph_widget_data"
    static let projectTime = "project_time_widget_data"
    static let prayer = "prayer_widget_data"
}

/// Reads and decodes a JSON snapshot written by `src/widgets/ios-sync.ts`'s
/// `ExtensionStorage#set(key, JSON.stringify(...))` calls. Returns `nil` --
/// never throws -- when the app hasn't synced yet (e.g. the widget was just
/// added, before the main app has run since reinstall) or the stored JSON
/// doesn't decode for any reason; every `TimelineProvider` below treats
/// `nil` as "show the placeholder" rather than crashing the extension
/// process.
func loadWidgetSnapshot<T: Decodable>(_ type: T.Type, key: String) -> T? {
    guard
        let defaults = UserDefaults(suiteName: appGroupIdentifier),
        let raw = defaults.string(forKey: key),
        let data = raw.data(using: .utf8)
    else { return nil }
    return try? JSONDecoder().decode(T.self, from: data)
}

// MARK: - Contribution graph
//
// Mirrors `ContributionGraphWidgetData` / `ContributionGridCell` /
// `DayIntensity` in `src/widgets/widget-data.ts` and
// `src/lib/contribution-graph.ts` field-for-field. `DayIntensity.primary`
// (0...1 fill brightness) and `.secondary` (an independent dot) are kept as
// two separate properties here on purpose -- for the prayer tracker,
// `primary` is driven only by the 5 fard prayers and `secondary` only by
// sunnah completion, and they must never be blended into a single derived
// value on either side of the JSON boundary.

struct DayIntensity: Codable {
    let date: String
    let primary: Double
    var secondary: Bool?
}

struct ContributionGridCell: Codable {
    let date: String
    let intensity: DayIntensity?
    let weekIndex: Int
    let dayOfWeek: Int
}

struct ContributionGraphWidgetData: Codable {
    let title: String
    let weeks: Int
    /// `grid[weekIndex][dayOfWeek]`, oldest week first -- same shape
    /// `buildContributionGrid` in `src/lib/contribution-graph.ts` returns.
    let grid: [[ContributionGridCell]]

    static let placeholder = ContributionGraphWidgetData(
        title: "All trackers",
        weeks: 4,
        grid: []
    )
}

// MARK: - Project time
//
// Mirrors `ProjectTimeWidgetData` / `ProjectTimeWidgetRow` in
// `src/widgets/widget-data.ts`.

struct ProjectTimeWidgetRow: Codable, Identifiable {
    var id: String { title }
    let title: String
    let total: Double
    let unit: String?
}

struct ProjectTimeWidgetData: Codable {
    let rangeLabel: String
    let rangeDays: Int
    let total: Double
    let unit: String?
    let rows: [ProjectTimeWidgetRow]

    static let placeholder = ProjectTimeWidgetData(
        rangeLabel: "this week",
        rangeDays: 7,
        total: 0,
        unit: nil,
        rows: []
    )
}

// MARK: - Prayer
//
// Mirrors `PrayerWidgetData` / `PrayerWidgetRow` in
// `src/widgets/widget-data.ts`. Always "today", never per-instance
// configured -- same as the Android prayer widget.

struct PrayerWidgetRow: Codable, Identifiable {
    var id: String { label }
    let label: String
    let fardDone: Bool
    let sunnahDone: Bool
}

struct PrayerWidgetData: Codable {
    let fardDone: Int
    let sunnahDone: Int
    let total: Int
    let rows: [PrayerWidgetRow]

    static let placeholder = PrayerWidgetData(
        fardDone: 0,
        sunnahDone: 0,
        total: 5,
        rows: [
            PrayerWidgetRow(label: "Fajr", fardDone: false, sunnahDone: false),
            PrayerWidgetRow(label: "Dhuhr", fardDone: false, sunnahDone: false),
            PrayerWidgetRow(label: "Asr", fardDone: false, sunnahDone: false),
            PrayerWidgetRow(label: "Maghrib", fardDone: false, sunnahDone: false),
            PrayerWidgetRow(label: "Isha", fardDone: false, sunnahDone: false),
        ]
    )
}
