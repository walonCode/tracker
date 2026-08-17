import { Host, Icon } from "@expo/ui";
import { useEffect, useRef } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from "react-native-reanimated";

import type { MaterialColors } from "@/theme/material-colors";

const RELIGION_COLOR = "#00695C";

// `Icon.select` with a synchronous `require()` for the android slot, not
// `import('*.xml')` — the dynamic-import form depends on `@expo/ui`'s babel
// plugin rewriting it, which wasn't firing in practice (icons silently
// rendered blank, no error). `require()` sidesteps that and is resolved
// eagerly by Metro like any other asset. This also restores real SF Symbol
// icons on iOS, which the earlier Android-only static-import version had
// dropped entirely.
const PRAYER_ICONS = {
  fajr: Icon.select({ ios: "sunrise", android: require("@expo/material-symbols/wb_twilight.xml") }),
  dhuhr: Icon.select({ ios: "sun.max", android: require("@expo/material-symbols/wb_sunny.xml") }),
  asr: Icon.select({ ios: "cloud.sun", android: require("@expo/material-symbols/clear_day.xml") }),
  maghrib: Icon.select({ ios: "sunset", android: require("@expo/material-symbols/wb_shade.xml") }),
  isha: Icon.select({ ios: "moon.stars", android: require("@expo/material-symbols/bedtime.xml") }),
} as const;

export type PrayerIconKey = keyof typeof PRAYER_ICONS;

export interface PrayerRowProps {
  prayerKey: PrayerIconKey;
  /** Cosmetic heading only (e.g. "Fajr") — never used for field association. */
  heading: string;
  fardValue: boolean;
  onFardChange: (next: boolean) => void;
  sunnahValue: boolean;
  onSunnahChange: (next: boolean) => void;
  colors: MaterialColors;
}

/**
 * One fixed row of the prayer-log form: an icon + heading, plus two
 * tappable Fard/Sunnah pills (rather than generic `Switch` toggles — bigger
 * touch targets, and the fill color itself communicates fard/sunnah's
 * different weight: solid Religion-teal for fard, a lighter tint for
 * sunnah, echoing the contribution graph's "fard drives brightness, sunnah
 * is a lighter secondary signal" rule at the row level).
 */
export function PrayerRow({
  prayerKey,
  heading,
  fardValue,
  onFardChange,
  sunnahValue,
  onSunnahChange,
  colors,
}: PrayerRowProps) {
  return (
    <View style={[styles.card, { backgroundColor: colors.surfaceContainerLow }]}>
      <View style={styles.headingRow}>
        <View style={[styles.iconCircle, { backgroundColor: `${RELIGION_COLOR}1F` }]}>
          <Host matchContents>
            <Icon name={PRAYER_ICONS[prayerKey]} size={20} color={RELIGION_COLOR} />
          </Host>
        </View>
        <Text style={[styles.heading, { color: colors.onSurface }]}>{heading}</Text>
      </View>
      <View style={styles.pillRow}>
        <TogglePill
          label="Fard"
          active={fardValue}
          onPress={() => onFardChange(!fardValue)}
          activeBackground={RELIGION_COLOR}
          activeColor="#FFFFFF"
          colors={colors}
        />
        <TogglePill
          label="Sunnah"
          active={sunnahValue}
          onPress={() => onSunnahChange(!sunnahValue)}
          activeBackground={`${RELIGION_COLOR}26`}
          activeColor={RELIGION_COLOR}
          colors={colors}
        />
      </View>
    </View>
  );
}

interface TogglePillProps {
  label: string;
  active: boolean;
  onPress: () => void;
  activeBackground: string;
  activeColor: string;
  colors: MaterialColors;
}

function TogglePill({ label, active, onPress, activeBackground, activeColor, colors }: TogglePillProps) {
  const scale = useSharedValue(1);
  const mountedRef = useRef(false);

  useEffect(() => {
    // Skip the pop on first mount — a row that loads already-checked (e.g.
    // reopening the modal after logging some prayers) shouldn't animate,
    // only a toggle the user actually just performed should.
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    if (active) {
      scale.value = withSequence(withSpring(1.08, { damping: 8 }), withSpring(1, { damping: 10 }));
    }
  }, [active, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: active }} style={styles.pillPressable}>
      <Animated.View
        style={[
          styles.pill,
          animatedStyle,
          {
            backgroundColor: active ? activeBackground : colors.surfaceContainerHighest,
            borderColor: active ? "transparent" : colors.outlineVariant,
          },
        ]}
      >
        <Text style={[styles.pillLabel, { color: active ? activeColor : colors.onSurfaceVariant }]}>
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 14,
    gap: 12,
  },
  headingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  heading: {
    fontSize: 16,
    fontWeight: "700",
  },
  pillRow: {
    flexDirection: "row",
    gap: 8,
  },
  pillPressable: { flex: 1 },
  pill: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  pillLabel: {
    fontSize: 14,
    fontWeight: "700",
  },
});
