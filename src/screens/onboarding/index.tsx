import { useCallback, useRef, useState } from "react";
import { Dimensions, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  interpolate,
  interpolateColor,
  runOnJS,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  Extrapolation,
  type SharedValue,
} from "react-native-reanimated";

import { getDb } from "@/db/client";
import { setAppMeta } from "@/db/repositories";
import { useAppMaterialColors } from "@/theme/material-colors";

import { AuraBlob, ONBOARDING_PAGES, type OnboardingPageContent } from "./pages";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const PAGE_COUNT = ONBOARDING_PAGES.length;

export const ONBOARDING_COMPLETE_KEY = "onboarding_completed";

/**
 * First-run onboarding: a swipeable 4-page intro (see `pages.tsx` for
 * content) that runs once, before the tab shell, then writes
 * `app_meta['onboarding_completed'] = 'true'` (see `src/db/repositories/app-meta.ts`)
 * so it never shows again. Root layout (`src/app/_layout.tsx`) checks that
 * flag and imperatively redirects here — see its own doc comment for why.
 *
 * Motion and color are scroll-driven throughout (via Reanimated's
 * `useAnimatedScrollHandler` + `interpolate`/`interpolateColor` against the
 * live horizontal scroll offset, not per-page discrete state) so swiping
 * feels continuous rather than snapping between fixed states: each page's
 * art/copy fades and scales up as it centers, the dot indicator morphs
 * width and color between pages instead of jumping, and each page carries
 * its own soft color "aura" (`AuraBlob` in `pages.tsx`) behind its art.
 */
export default function OnboardingScreen({ onDone }: { onDone: () => void }) {
  const colors = useAppMaterialColors();
  const [pageIndex, setPageIndex] = useState(0);
  const scrollX = useSharedValue(0);
  const ctaScale = useSharedValue(1);
  const scrollRef = useRef<Animated.ScrollView>(null);

  const isLastPage = pageIndex === PAGE_COUNT - 1;

  const finish = useCallback(async () => {
    const db = await getDb();
    await setAppMeta(db, ONBOARDING_COMPLETE_KEY, "true");
    onDone();
  }, [onDone]);

  const updatePageIndex = useCallback((x: number) => {
    setPageIndex(Math.round(x / SCREEN_WIDTH));
  }, []);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
    onMomentumEnd: (event) => {
      runOnJS(updatePageIndex)(event.contentOffset.x);
    },
  });

  const handleNext = useCallback(() => {
    if (isLastPage) {
      void finish();
      return;
    }
    const nextIndex = pageIndex + 1;
    scrollRef.current?.scrollTo({ x: nextIndex * SCREEN_WIDTH, animated: true });
    setPageIndex(nextIndex);
  }, [isLastPage, finish, pageIndex]);

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

      <Animated.ScrollView
        ref={scrollRef}
        style={styles.pager}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
      >
        {ONBOARDING_PAGES.map((page, index) => (
          <OnboardingPage key={page.key} page={page} index={index} scrollX={scrollX} colors={colors} />
        ))}
      </Animated.ScrollView>

      <View style={styles.footer}>
        <View style={styles.dots}>
          {ONBOARDING_PAGES.map((page, index) => (
            <PageDot key={page.key} page={page} index={index} scrollX={scrollX} inactiveColor={colors.surfaceContainerHighest} />
          ))}
        </View>

        <Pressable
          onPress={handleNext}
          onPressIn={() => (ctaScale.value = withSpring(0.96, { damping: 14 }))}
          onPressOut={() => (ctaScale.value = withSpring(1, { damping: 10 }))}
          accessibilityRole="button"
        >
          <Animated.View
            style={[
              styles.cta,
              { backgroundColor: colors.primary },
              useAnimatedStyle(() => ({ transform: [{ scale: ctaScale.value }] })),
            ]}
          >
            <Text style={[styles.ctaLabel, { color: colors.onPrimary }]}>
              {isLastPage ? "Get Started" : "Next"}
            </Text>
          </Animated.View>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

interface OnboardingPageProps {
  page: OnboardingPageContent;
  index: number;
  scrollX: SharedValue<number>;
  colors: ReturnType<typeof useAppMaterialColors>;
}

function OnboardingPage({ page, index, scrollX, colors }: OnboardingPageProps) {
  const inputRange = [(index - 1) * SCREEN_WIDTH, index * SCREEN_WIDTH, (index + 1) * SCREEN_WIDTH];

  const artStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollX.value, inputRange, [0, 1, 0], Extrapolation.CLAMP),
    transform: [
      { scale: interpolate(scrollX.value, inputRange, [0.75, 1, 0.75], Extrapolation.CLAMP) },
      { translateY: interpolate(scrollX.value, inputRange, [24, 0, 24], Extrapolation.CLAMP) },
    ],
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollX.value, inputRange, [0, 1, 0], Extrapolation.CLAMP),
    transform: [
      { translateY: interpolate(scrollX.value, inputRange, [16, 0, 16], Extrapolation.CLAMP) },
    ],
  }));

  return (
    <View style={[styles.page, { width: SCREEN_WIDTH }]}>
      <Animated.View style={[styles.art, artStyle]}>
        <AuraBlob color={page.accentColor} />
        {page.render(colors)}
      </Animated.View>
      <Animated.View style={textStyle}>
        <Text style={[styles.title, { color: colors.onBackground }]}>{page.title}</Text>
        <Text style={[styles.body, { color: colors.onSurfaceVariant }]}>{page.body}</Text>
      </Animated.View>
    </View>
  );
}

function PageDot({
  page,
  index,
  scrollX,
  inactiveColor,
}: {
  page: OnboardingPageContent;
  index: number;
  scrollX: SharedValue<number>;
  inactiveColor: string;
}) {
  const inputRange = [(index - 1) * SCREEN_WIDTH, index * SCREEN_WIDTH, (index + 1) * SCREEN_WIDTH];

  const dotStyle = useAnimatedStyle(() => ({
    width: interpolate(scrollX.value, inputRange, [8, 22, 8], Extrapolation.CLAMP),
    backgroundColor: interpolateColor(scrollX.value, inputRange, [inactiveColor, page.accentColor, inactiveColor]),
  }));

  return <Animated.View style={[styles.dot, dotStyle]} />;
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
    marginTop: 12,
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
