import { AndroidConfig, withAndroidManifest, type ConfigPlugin } from "expo/config-plugins";

// Manifest entries for modules/focus-mode: permissions, the foreground
// service, and the launcher <queries> that let listLaunchableApps work
// without QUERY_ALL_PACKAGES.

const PERMISSIONS = [
  "android.permission.FOREGROUND_SERVICE",
  "android.permission.FOREGROUND_SERVICE_SPECIAL_USE",
  "android.permission.POST_NOTIFICATIONS",
  "android.permission.ACCESS_NOTIFICATION_POLICY",
  "android.permission.PACKAGE_USAGE_STATS",
  "android.permission.SYSTEM_ALERT_WINDOW",
  "android.permission.READ_PHONE_STATE",
  "android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS",
];

const SERVICE_NAME = "expo.modules.focusmode.FocusService";
const SPECIAL_USE_PURPOSE = "blocks distracting apps during a user-started focus session";

type Manifest = AndroidConfig.Manifest.AndroidManifest["manifest"];
type Attributes = Record<string, string>;
type Element = { $?: Attributes; [child: string]: unknown };

function addPermissions(manifest: Manifest) {
  const existing = (manifest["uses-permission"] ??= []);
  for (const name of PERMISSIONS) {
    if (existing.some((p) => p.$["android:name"] === name)) continue;
    // Usage access is granted in Settings, not at install; tell lint that is intended.
    const $: Attributes = { "android:name": name };
    if (name.endsWith("PACKAGE_USAGE_STATS")) $["tools:ignore"] = "ProtectedPermissions";
    existing.push({ $ } as (typeof existing)[number]);
  }
  manifest.$["xmlns:tools"] ??= "http://schemas.android.com/tools";
}

function addLauncherQuery(manifest: Manifest) {
  const root = manifest as unknown as { queries?: Element[] };
  const queries = (root.queries ??= [{}]);
  const query = queries[0] as { intent?: Element[] };
  const intents = (query.intent ??= []);
  const hasLauncher = intents.some((intent) =>
    JSON.stringify(intent).includes("android.intent.category.LAUNCHER"),
  );
  if (hasLauncher) return;
  intents.push({
    action: [{ $: { "android:name": "android.intent.action.MAIN" } }],
    category: [{ $: { "android:name": "android.intent.category.LAUNCHER" } }],
  });
}

function addService(manifest: Manifest) {
  const application = AndroidConfig.Manifest.getMainApplicationOrThrow({ manifest });
  const services = ((application as unknown as { service?: Element[] }).service ??= []);
  if (services.some((s) => s.$?.["android:name"] === SERVICE_NAME)) return;
  services.push({
    $: {
      "android:name": SERVICE_NAME,
      "android:exported": "false",
      "android:foregroundServiceType": "specialUse",
    },
    property: [
      {
        $: {
          "android:name": "android.app.PROPERTY_SPECIAL_USE_FGS_SUBTYPE",
          "android:value": SPECIAL_USE_PURPOSE,
        },
      },
    ],
  });
}

const withFocusMode: ConfigPlugin = (config) =>
  withAndroidManifest(config, (mod) => {
    const manifest = mod.modResults.manifest;
    addPermissions(manifest);
    addLauncherQuery(manifest);
    addService(manifest);
    return mod;
  });

export default withFocusMode;
