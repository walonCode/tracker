import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { PaperProvider } from "react-native-paper";

import { DatabaseProvider } from "@/db/DatabaseProvider";
import { useOnboardingRedirect } from "@/features/onboarding/useOnboardingRedirect";
import { useSessionRecovery } from "@/features/session/useSessionRecovery";
import { useAppTheme, type AppTheme } from "@/theme";

function Navigator({ theme }: { theme: AppTheme }) {
  useOnboardingRedirect();
  useSessionRecovery();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.background },
      }}
    />
  );
}

export default function RootLayout() {
  const theme = useAppTheme();

  return (
    <GestureHandlerRootView style={styles.root}>
      <PaperProvider theme={theme}>
        <StatusBar style={theme.dark ? "light" : "dark"} hidden={false} />
        <DatabaseProvider>
          <Navigator theme={theme} />
        </DatabaseProvider>
      </PaperProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
