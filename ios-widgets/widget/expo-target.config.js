/**
 * `@bacons/apple-targets` config for the WidgetKit extension that hosts all
 * three home-screen widgets (contribution graph, project time, prayer) --
 * one Xcode target/WidgetBundle, per Apple's convention (see the widget
 * skill doc's `WidgetBundle` pattern), not three separate extensions.
 *
 * `entitlements` is left empty deliberately: `widget` is one of the
 * extension types `@bacons/apple-targets` auto-syncs App Groups for
 * (`appGroupsByDefault: true`), so this target inherits whatever
 * `ios.entitlements["com.apple.security.application-groups"]` app.json
 * declares -- currently `group.com.walonfoundation.tracker`, which must
 * stay in sync with `IOS_APP_GROUP` in `src/widgets/ios-sync.ts` and
 * `appGroupIdentifier` in `SharedModels.swift`. If either drifts, widgets
 * silently read an empty/different UserDefaults suite instead of failing
 * loudly -- see the App Groups gotchas in the upstream docs.
 *
 * @type {import('@bacons/apple-targets/app.plugin').ConfigFunction}
 */
module.exports = (config) => ({
  type: "widget",
  name: "TrackerWidgets",
  // containerBackground(for: .widget), used by every widget view here, is
  // an iOS 17+ API (see the widget skill doc's "containerBackground is
  // required on iOS 17+" gotcha) -- pin the extension's deployment target
  // there explicitly rather than inheriting the plugin's 18.0 default,
  // since nothing else in these widgets needs anything newer.
  deploymentTarget: "17.0",
  colors: {
    // Matches the app's Material You seed color (`#208AEF`, see app.json's
    // Android adaptive-icon background) so the widgets' accent tint reads
    // as the same app on both platforms.
    $accent: "#208AEF",
  },
});
