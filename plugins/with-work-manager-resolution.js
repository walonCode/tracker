const { withProjectBuildGradle } = require("expo/config-plugins");

/**
 * `expo-widgets` and `react-native-android-widget` each pull in a
 * different version of `androidx.work` (WorkManager) transitively --
 * 2.8.1 vs 2.7.1 -- which Gradle's `checkDebugDuplicateClasses` task
 * rejects outright ("Duplicate class androidx.work.OneTimeWorkRequestKt
 * found in modules work-runtime-2.8.1.aar ... and
 * work-runtime-ktx-2.7.1.aar"). Neither library is ours to patch, so this
 * forces every module in the project onto one resolved version instead,
 * the standard Gradle fix for this exact class of conflict. `android/` is
 * regenerated on every prebuild (see CLAUDE.md), so this has to be a config
 * plugin edit, not a hand-edit of the generated `build.gradle`.
 */
const WORK_MANAGER_VERSION = "2.8.1";

module.exports = function withWorkManagerResolution(config) {
  return withProjectBuildGradle(config, (config) => {
    if (config.modResults.language !== "groovy") {
      throw new Error("withWorkManagerResolution expects a Groovy build.gradle");
    }

    const marker = "// @generated: withWorkManagerResolution";
    if (config.modResults.contents.includes(marker)) {
      return config;
    }

    const resolutionBlock = `
allprojects {
  configurations.all {
    resolutionStrategy {
      ${marker}
      force 'androidx.work:work-runtime:${WORK_MANAGER_VERSION}'
      force 'androidx.work:work-runtime-ktx:${WORK_MANAGER_VERSION}'
    }
  }
}
`;

    config.modResults.contents += resolutionBlock;
    return config;
  });
};
