import SwiftUI
import WidgetKit

/// One WidgetKit extension target hosting all three home-screen widgets
/// (per Apple's `WidgetBundle` convention -- a single extension process can
/// export multiple `Widget`s), mirroring the three widgets
/// `react-native-android-widget` registers on Android (see app.json's
/// `react-native-android-widget` plugin config): `ContributionGraph`,
/// `ProjectTime`, `Prayer`.
@main
struct TrackerWidgetsBundle: WidgetBundle {
    var body: some Widget {
        ContributionGraphWidget()
        ProjectTimeWidget()
        PrayerWidget()
    }
}
