import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { PaperProvider } from "react-native-paper";

import { DatabaseProvider } from "@/db/DatabaseProvider";
import { useAppTheme } from "@/theme";

export default function RootLayout() {
  const theme = useAppTheme();

  return (
    <PaperProvider theme={theme}>
      <StatusBar style={theme.dark ? "light" : "dark"} />
      <DatabaseProvider>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: theme.colors.background },
          }}
        />
      </DatabaseProvider>
    </PaperProvider>
  );
}
