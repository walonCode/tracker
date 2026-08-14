import {
  useMaterialColors,
  type MaterialColors,
  type UseMaterialColorsOptions,
} from "@expo/ui/jetpack-compose";

export type { MaterialColors, UseMaterialColorsOptions };

/**
 * Android implementation of the theme seam described in `material-colors.ts`.
 * Wraps the real `useMaterialColors()` from `@expo/ui/jetpack-compose`
 * (Material You / device-wallpaper aware, Android-only). Metro picks this
 * file automatically on Android for any `@/theme/material-colors` import;
 * every other platform gets the static-baseline fallback in `material-colors.ts`.
 */
export function useAppMaterialColors(
  options?: UseMaterialColorsOptions
): MaterialColors {
  return useMaterialColors(options);
}
