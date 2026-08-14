import { Stack } from "expo-router";

/**
 * Root stack: the tab shell as one screen, plus the two formSheet modal
 * routes (`add`, `prayer-log`) that live above it. The tab shell itself
 * (Today / History / Reports + the floating "+") is defined in
 * `(tabs)/_layout.tsx`.
 */
export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="add"
        options={{
          presentation: "formSheet",
          title: "Add",
          sheetAllowedDetents: [0.5, 1],
          sheetGrabberVisible: true,
        }}
      />
      <Stack.Screen
        name="prayer-log"
        options={{
          presentation: "formSheet",
          title: "Prayer Log",
          sheetAllowedDetents: [0.5, 1],
          sheetGrabberVisible: true,
        }}
      />
    </Stack>
  );
}
