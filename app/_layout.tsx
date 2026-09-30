import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { PaperProvider } from "react-native-paper";

import { DatabaseProvider, useDb } from "@/db/DatabaseProvider";
import { useOnboardingRedirect } from "@/features/onboarding/useOnboardingRedirect";
import { refreshOutputs } from "@/features/refresh";
import { useReminderTaps } from "@/features/reminders/reminders";
import { useSessionRecovery } from "@/features/session/useSessionRecovery";
import { useAppTheme, type AppTheme } from "@/theme";

function Navigator({ theme }: { theme: AppTheme }) {
  useOnboardingRedirect();
  useSessionRecovery();
  useReminderTaps();
  const db = useDb();
  // App start: rebuild reminders and the widget from the plan.
  useEffect(() => {
    refreshOutputs(db);
  }, [db]);
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
      <KeyboardProvider>
        <PaperProvider theme={theme}>
          <StatusBar style={theme.dark ? "light" : "dark"} hidden={false} />
          <DatabaseProvider>
            <Navigator theme={theme} />
          </DatabaseProvider>
        </PaperProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
