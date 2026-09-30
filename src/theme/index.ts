import { useColorScheme } from "react-native";
import { MD3DarkTheme, MD3LightTheme, type MD3Theme } from "react-native-paper";

export type AppTheme = MD3Theme;

// Colors from docs/focus-app-full-flow.html: surface, two text levels, a
// hairline, the primary, and one tonal container used for the Next card,
// selected chips, tonal buttons, and badges.

const lightTheme: AppTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: "#4a5bd0",
    onPrimary: "#ffffff",
    primaryContainer: "#e1e3ff",
    onPrimaryContainer: "#1a2270",
    secondaryContainer: "#e1e3ff",
    onSecondaryContainer: "#1a2270",
    background: "#fdfbff",
    surface: "#fdfbff",
    onSurface: "#1b1b1f",
    onBackground: "#1b1b1f",
    surfaceVariant: "#e6e5eb",
    onSurfaceVariant: "#5f5f66",
    outline: "#5f5f66",
    outlineVariant: "#d9d8de",
    elevation: {
      ...MD3LightTheme.colors.elevation,
      level1: "#f5f3fa",
      level2: "#f0eef7",
      level3: "#eceaf4",
    },
  },
};

const darkTheme: AppTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: "#b9c3ff",
    onPrimary: "#0b1461",
    primaryContainer: "#2f3a8f",
    onPrimaryContainer: "#dfe0ff",
    secondaryContainer: "#2f3a8f",
    onSecondaryContainer: "#dfe0ff",
    background: "#1b1b1f",
    surface: "#1b1b1f",
    onSurface: "#e4e2e6",
    onBackground: "#e4e2e6",
    surfaceVariant: "#2c2c32",
    onSurfaceVariant: "#a9a8ae",
    outline: "#a9a8ae",
    outlineVariant: "#3a3a40",
    elevation: {
      ...MD3DarkTheme.colors.elevation,
      level1: "#222228",
      level2: "#26262d",
      level3: "#2a2a31",
    },
  },
};

/** Material 3 theme that follows the system light/dark setting live. */
export function useAppTheme(): AppTheme {
  return useColorScheme() === "dark" ? darkTheme : lightTheme;
}
