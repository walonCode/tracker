import { useColorScheme } from "react-native";

// `MaterialColors` / `UseMaterialColorsOptions` are type-only imports from
// `@expo/ui/jetpack-compose` — erased at compile time, so referencing them
// here does NOT pull the (Android-only) native module into non-Android
// bundles. This keeps the *type* shared across platforms while the runtime
// implementation stays platform-split (see the sibling `.android.ts` file).
import type {
  MaterialColors,
  UseMaterialColorsOptions,
} from "@expo/ui/jetpack-compose";

export type { MaterialColors, UseMaterialColorsOptions };

/**
 * `material-colors.ts` / `material-colors.android.ts` — the single seam
 * where `@expo/ui/jetpack-compose`'s `useMaterialColors()` (Android-only,
 * backed by a native module that reads Material You / the device wallpaper)
 * is wrapped for the rest of the app.
 *
 * This file (the platform-less fallback, also used on iOS and web) exports a
 * static Material 3 baseline palette so plain-RN and Skia consumers get a
 * fully-typed, always-available theme without caring which platform they're
 * on. `material-colors.android.ts` overrides this with the real dynamic
 * palette on Android. When the deferred iOS pass lands, only this file (or
 * a new `material-colors.ios.ts`) needs to change.
 *
 * Static values below approximate the Material 3 baseline (`SchemeTonalSpot`
 * seeded from the M3 default purple) — cosmetic, not pixel-exact, and safe
 * to restyle later.
 */

const LIGHT_BASELINE: MaterialColors = {
  primary: "#6750A4FF",
  onPrimary: "#FFFFFFFF",
  primaryContainer: "#EADDFFFF",
  onPrimaryContainer: "#21005DFF",
  inversePrimary: "#D0BCFFFF",
  secondary: "#625B71FF",
  onSecondary: "#FFFFFFFF",
  secondaryContainer: "#E8DEF8FF",
  onSecondaryContainer: "#1D192BFF",
  tertiary: "#7D5260FF",
  onTertiary: "#FFFFFFFF",
  tertiaryContainer: "#FFD8E4FF",
  onTertiaryContainer: "#31111DFF",
  background: "#FFFBFEFF",
  onBackground: "#1C1B1FFF",
  surface: "#FFFBFEFF",
  onSurface: "#1C1B1FFF",
  surfaceVariant: "#E7E0ECFF",
  onSurfaceVariant: "#49454FFF",
  surfaceTint: "#6750A4FF",
  inverseSurface: "#313033FF",
  inverseOnSurface: "#F4EFF4FF",
  error: "#B3261EFF",
  onError: "#FFFFFFFF",
  errorContainer: "#F9DEDCFF",
  onErrorContainer: "#410E0BFF",
  outline: "#79747EFF",
  outlineVariant: "#CAC4D0FF",
  scrim: "#000000FF",
  surfaceBright: "#FFFBFEFF",
  surfaceDim: "#DED8E1FF",
  surfaceContainer: "#F3EDF7FF",
  surfaceContainerHigh: "#ECE6F0FF",
  surfaceContainerHighest: "#E6E0E9FF",
  surfaceContainerLow: "#F7F2FAFF",
  surfaceContainerLowest: "#FFFFFFFF",
  primaryFixed: "#EADDFFFF",
  primaryFixedDim: "#D0BCFFFF",
  onPrimaryFixed: "#21005DFF",
  onPrimaryFixedVariant: "#4F378BFF",
  secondaryFixed: "#E8DEF8FF",
  secondaryFixedDim: "#CCC2DCFF",
  onSecondaryFixed: "#1D192BFF",
  onSecondaryFixedVariant: "#4A4458FF",
  tertiaryFixed: "#FFD8E4FF",
  tertiaryFixedDim: "#EFB8C8FF",
  onTertiaryFixed: "#31111DFF",
  onTertiaryFixedVariant: "#633B48FF",
};

const DARK_BASELINE: MaterialColors = {
  primary: "#D0BCFFFF",
  onPrimary: "#381E72FF",
  primaryContainer: "#4F378BFF",
  onPrimaryContainer: "#EADDFFFF",
  inversePrimary: "#6750A4FF",
  secondary: "#CCC2DCFF",
  onSecondary: "#332D41FF",
  secondaryContainer: "#4A4458FF",
  onSecondaryContainer: "#E8DEF8FF",
  tertiary: "#EFB8C8FF",
  onTertiary: "#492532FF",
  tertiaryContainer: "#633B48FF",
  onTertiaryContainer: "#FFD8E4FF",
  background: "#1C1B1FFF",
  onBackground: "#E6E1E5FF",
  surface: "#1C1B1FFF",
  onSurface: "#E6E1E5FF",
  surfaceVariant: "#49454FFF",
  onSurfaceVariant: "#CAC4D0FF",
  surfaceTint: "#D0BCFFFF",
  inverseSurface: "#E6E1E5FF",
  inverseOnSurface: "#313033FF",
  error: "#F2B8B5FF",
  onError: "#601410FF",
  errorContainer: "#8C1D18FF",
  onErrorContainer: "#F9DEDCFF",
  outline: "#938F99FF",
  outlineVariant: "#49454FFF",
  scrim: "#000000FF",
  surfaceBright: "#3B383EFF",
  surfaceDim: "#1C1B1FFF",
  surfaceContainer: "#211F26FF",
  surfaceContainerHigh: "#2B2930FF",
  surfaceContainerHighest: "#36343BFF",
  surfaceContainerLow: "#1D1B20FF",
  surfaceContainerLowest: "#0F0D13FF",
  primaryFixed: "#EADDFFFF",
  primaryFixedDim: "#D0BCFFFF",
  onPrimaryFixed: "#21005DFF",
  onPrimaryFixedVariant: "#4F378BFF",
  secondaryFixed: "#E8DEF8FF",
  secondaryFixedDim: "#CCC2DCFF",
  onSecondaryFixed: "#1D192BFF",
  onSecondaryFixedVariant: "#4A4458FF",
  tertiaryFixed: "#FFD8E4FF",
  tertiaryFixedDim: "#EFB8C8FF",
  onTertiaryFixed: "#31111DFF",
  onTertiaryFixedVariant: "#633B48FF",
};

/**
 * Returns the app's Material 3 color palette.
 *
 * On Android (`material-colors.android.ts`) this is backed by the real
 * `useMaterialColors()` from `@expo/ui/jetpack-compose` (Material You /
 * device wallpaper aware). On every other platform this fallback returns a
 * static Material 3 baseline palette that follows the system light/dark
 * appearance, so any consumer — Compose tree, plain RN styling, or Skia
 * canvas fills — can call this one hook regardless of platform.
 */
export function useAppMaterialColors(
  options?: UseMaterialColorsOptions
): MaterialColors {
  const systemScheme = useColorScheme();
  const resolvedScheme: "light" | "dark" =
    options?.colorScheme === "light" || options?.colorScheme === "dark"
      ? options.colorScheme
      : systemScheme === "dark"
        ? "dark"
        : "light";
  return resolvedScheme === "dark" ? DARK_BASELINE : LIGHT_BASELINE;
}
