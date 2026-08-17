import { useCallback, useRef, useState } from "react";
import {
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { getDb } from "@/db/client";
import { setAppMeta } from "@/db/repositories";
import { useAppMaterialColors } from "@/theme/material-colors";

import { ONBOARDING_PAGES } from "./pages";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export const ONBOARDING_COMPLETE_KEY = "onboarding_completed";

/**
 * First-run onboarding: a swipeable 4-page intro (see `pages.tsx` for
 * content) that runs once, before the tab shell, then writes
 * `app_meta['onboarding_completed'] = 'true'` (see `src/db/repositories/app-meta.ts`)
 * so it never shows again. Root layout (`src/app/_layout.tsx`) checks that
 * flag and conditionally includes this route as the Stack's first screen —
 * see its own doc comment for why a conditional `<Stack.Screen>` list is
 * the mechanism rather than a runtime redirect.
 */
export default function OnboardingScreen({ onDone }: { onDone: () => void }) {
  const colors = useAppMaterialColors();
  const scrollRef = useRef<ScrollView>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const isLastPage = pageIndex === ONBOARDING_PAGES.length - 1;

  const finish = useCallback(async () => {
    const db = await getDb();
    await setAppMeta(db, ONBOARDING_COMPLETE_KEY, "true");
    onDone();
  }, [onDone]);

  const goToPage = useCallback((index: number) => {
    scrollRef.current?.scrollTo({ x: index * SCREEN_WIDTH, animated: true });
    setPageIndex(index);
  }, []);

  const handleMomentumScrollEnd = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setPageIndex(index);
  }, []);

  const handleNext = useCallback(() => {
    if (isLastPage) {
      void finish();
      return;
    }
    goToPage(pageIndex + 1);
  }, [isLastPage, finish, goToPage, pageIndex]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={styles.topBar}>
        {!isLastPage ? (
          <Pressable onPress={finish} hitSlop={12}>
            <Text style={[styles.skip, { color: colors.onSurfaceVariant }]}>Skip</Text>
          </Pressable>
        ) : (
          <View style={styles.skipPlaceholder} />
        )}
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.pager}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        scrollEventThrottle={16}
      >
        {ONBOARDING_PAGES.map((page) => (
          <View key={page.key} style={[styles.page, { width: SCREEN_WIDTH }]}>
            <View style={styles.art}>{page.render(colors)}</View>
            <Text style={[styles.title, { color: colors.onBackground }]}>{page.title}</Text>
            <Text style={[styles.body, { color: colors.onSurfaceVariant }]}>{page.body}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.dots}>
          {ONBOARDING_PAGES.map((page, index) => (
            <View
              key={page.key}
              style={[
                styles.dot,
                {
                  backgroundColor: index === pageIndex ? colors.primary : colors.surfaceContainerHighest,
                  width: index === pageIndex ? 20 : 8,
                },
              ]}
            />
          ))}
        </View>

        <Pressable
          onPress={handleNext}
          style={[styles.cta, { backgroundColor: colors.primary }]}
          accessibilityRole="button"
        >
          <Text style={[styles.ctaLabel, { color: colors.onPrimary }]}>
            {isLastPage ? "Get Started" : "Next"}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  topBar: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: 20,
    paddingTop: 4,
    height: 40,
  },
  skip: { fontSize: 15, fontWeight: "600" },
  skipPlaceholder: { height: 15 },
  pager: { flex: 1 },
  page: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 28,
  },
  art: { alignItems: "center", justifyContent: "center" },
  title: {
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
    letterSpacing: -0.3,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    maxWidth: 320,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 20,
    paddingTop: 12,
    gap: 20,
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  cta: {
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: "center",
  },
  ctaLabel: {
    fontSize: 16,
    fontWeight: "700",
  },
});
