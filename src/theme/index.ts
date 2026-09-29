import { useColorScheme } from "react-native";
import { MD3DarkTheme, MD3LightTheme, type MD3Theme } from "react-native-paper";

export type AppTheme = MD3Theme;

const lightTheme: AppTheme = {
  ...MD3LightTheme,
  colors: { ...MD3LightTheme.colors, primary: "#4a5bd0" },
};

const darkTheme: AppTheme = {
  ...MD3DarkTheme,
  colors: { ...MD3DarkTheme.colors, primary: "#b9c3ff" },
};

/** Material 3 theme that follows the system light/dark setting live. */
export function useAppTheme(): AppTheme {
  return useColorScheme() === "dark" ? darkTheme : lightTheme;
}
