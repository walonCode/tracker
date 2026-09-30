import { withAppBuildGradle, type ConfigPlugin } from "expo/config-plugins";

// Signs release builds with the upload key when its Gradle properties are
// set (in ~/.gradle/gradle.properties, never in the repo):
//   FOCUS_UPLOAD_STORE_FILE, FOCUS_UPLOAD_STORE_PASSWORD,
//   FOCUS_UPLOAD_KEY_ALIAS, FOCUS_UPLOAD_KEY_PASSWORD
// Without them, release builds keep Expo's default debug signing.

const MARKER = "// withReleaseSigning";

const SIGNING_CONFIG = `
        ${MARKER}
        if (findProperty('FOCUS_UPLOAD_STORE_FILE')) {
            release {
                storeFile file(findProperty('FOCUS_UPLOAD_STORE_FILE'))
                storePassword findProperty('FOCUS_UPLOAD_STORE_PASSWORD')
                keyAlias findProperty('FOCUS_UPLOAD_KEY_ALIAS')
                keyPassword findProperty('FOCUS_UPLOAD_KEY_PASSWORD')
            }
        }`;

const withReleaseSigning: ConfigPlugin = (config) =>
  withAppBuildGradle(config, (mod) => {
    let gradle = mod.modResults.contents;
    if (gradle.includes(MARKER)) return mod;

    // Add the release signing config next to the debug one.
    gradle = gradle.replace(/signingConfigs \{\n/, (match) => `${match}${SIGNING_CONFIG}\n`);

    // In the release build type (not the signing config added above), prefer it over the debug config.
    gradle = gradle.replace(
      /(buildTypes \{[\s\S]*?\brelease \{[\s\S]*?)signingConfig signingConfigs\.debug/,
      "$1signingConfig findProperty('FOCUS_UPLOAD_STORE_FILE') ? signingConfigs.release : signingConfigs.debug",
    );

    mod.modResults.contents = gradle;
    return mod;
  });

export default withReleaseSigning;
