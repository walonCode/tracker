import { StyleSheet, Text, View } from "react-native";

import { DOMAIN_KEYS, DOMAIN_PALETTE } from "@/theme/domain-palette";
import type { MaterialColors } from "@/theme/material-colors";

export interface OnboardingPageContent {
  key: string;
  title: string;
  body: string;
  render: (colors: MaterialColors) => React.ReactNode;
}

/** Big rounded glyph tile, reused across pages with different content — the visual anchor of each page. */
function GlyphTile({
  children,
  backgroundColor,
}: {
  children: React.ReactNode;
  backgroundColor: string;
}) {
  return <View style={[styles.glyphTile, { backgroundColor }]}>{children}</View>;
}

function WelcomeArt({ colors }: { colors: MaterialColors }) {
  return (
    <GlyphTile backgroundColor={colors.primaryContainer}>
      <View style={styles.checkStroke}>
        <View style={[styles.checkShort, { backgroundColor: colors.onPrimaryContainer }]} />
        <View style={[styles.checkLong, { backgroundColor: colors.onPrimaryContainer }]} />
      </View>
    </GlyphTile>
  );
}

function DomainsArt() {
  return (
    <View style={styles.domainGrid}>
      {DOMAIN_KEYS.map((key) => {
        const entry = DOMAIN_PALETTE[key];
        return (
          <View key={key} style={styles.domainChip}>
            <View style={[styles.domainDot, { backgroundColor: entry.color }]} />
            <Text style={[styles.domainLabel, { color: entry.color }]}>{entry.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

function GraphArt({ colors }: { colors: MaterialColors }) {
  // A small hand-picked intensity pattern — not real data, just a
  // recognizable echo of the Today screen's contribution graph so this
  // page reads as "this is what that grid means" rather than a generic
  // decoration.
  const pattern = [0.15, 0.9, 0.4, 1, 0.6, 0, 0.75, 0.3, 1, 0.5, 0.2, 0.85];
  return (
    <GlyphTile backgroundColor={colors.surfaceContainerHigh}>
      <View style={styles.graphGrid}>
        {pattern.map((intensity, i) => (
          <View
            key={i}
            style={[
              styles.graphCell,
              {
                backgroundColor: colors.primary,
                opacity: intensity === 0 ? 1 : intensity,
              },
              intensity === 0 && { backgroundColor: colors.surfaceVariant, opacity: 1 },
            ]}
          />
        ))}
      </View>
    </GlyphTile>
  );
}

function ReadyArt({ colors }: { colors: MaterialColors }) {
  return (
    <GlyphTile backgroundColor={colors.primary}>
      <View style={styles.checkStroke}>
        <View style={[styles.checkShort, { backgroundColor: colors.onPrimary }]} />
        <View style={[styles.checkLong, { backgroundColor: colors.onPrimary }]} />
      </View>
    </GlyphTile>
  );
}

export const ONBOARDING_PAGES: OnboardingPageContent[] = [
  {
    key: "welcome",
    title: "One place for everything you track",
    body: "Habits, prayer, spending, projects, and anything else worth keeping up with — Tracker replaces the pile of separate apps with one flexible system.",
    render: (colors) => <WelcomeArt colors={colors} />,
  },
  {
    key: "domains",
    title: "Trackers you define, grouped your way",
    body: "Every tracker lives in one of five domains, and you decide what's daily and what's occasional. Log a number, a duration, a note, or a simple yes/no — whatever fits.",
    render: () => <DomainsArt />,
  },
  {
    key: "graph",
    title: "See your consistency at a glance",
    body: "A GitHub-style graph shows how you're doing over time. The five daily prayers get their own view too — fard completion sets the brightness, sunnah shows as a separate dot, so neither one hides the other.",
    render: (colors) => <GraphArt colors={colors} />,
  },
  {
    key: "ready",
    title: "Ready when you are",
    body: "Start with today's checklist, or create your first tracker from the Create button. You can always come back and add more later.",
    render: (colors) => <ReadyArt colors={colors} />,
  },
];

const styles = StyleSheet.create({
  glyphTile: {
    width: 180,
    height: 180,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  checkStroke: {
    width: 72,
    height: 72,
  },
  checkShort: {
    position: "absolute",
    width: 14,
    height: 34,
    borderRadius: 7,
    left: 8,
    top: 30,
    transform: [{ rotate: "45deg" }],
  },
  checkLong: {
    position: "absolute",
    width: 14,
    height: 58,
    borderRadius: 7,
    left: 30,
    top: 6,
    transform: [{ rotate: "-45deg" }],
  },
  domainGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 8,
  },
  domainChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(127,127,127,0.12)",
  },
  domainDot: { width: 10, height: 10, borderRadius: 5 },
  domainLabel: { fontSize: 13, fontWeight: "700" },
  graphGrid: {
    width: 132,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  graphCell: {
    width: 26,
    height: 26,
    borderRadius: 6,
  },
});
