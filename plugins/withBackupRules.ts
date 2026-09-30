import { AndroidConfig, withAndroidManifest, type ConfigPlugin } from "expo/config-plugins";

// Android Auto Backup for the SQLite database only. The rule files ship as
// resources of modules/focus-mode (res/xml), which merge into the app;
// caches, preferences, and the focus service's state are left out.

const withBackupRules: ConfigPlugin = (config) =>
  withAndroidManifest(config, (mod) => {
    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(mod.modResults);
    application.$["android:allowBackup"] = "true";
    application.$["android:fullBackupContent"] = "@xml/focus_backup_rules";
    application.$["android:dataExtractionRules"] = "@xml/focus_data_extraction_rules";
    return mod;
  });

export default withBackupRules;
