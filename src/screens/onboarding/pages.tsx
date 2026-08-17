import { StyleSheet, Text, View } from "react-native";

import { DOMAIN_KEYS, DOMAIN_PALETTE } from "@/theme/domain-palette";
import type { MaterialColors } from "@/theme/material-colors";

export interface OnboardingPageContent {
  key: string;
  title: string;
  body: string;
  /** Drives the aura blob behind the art and the page dot's active color. */
  accentColor: string;
  render: (colors: MaterialColors) => React.ReactNode;
}

/** Two soft, offset, low-opacity circles behind a page's art — the source of each page's color wash. */
function AuraBlob({ color }: { color: string }) {
  return (
    <View style={styles.auraContainer} pointerEvents="none">
      <View style={[styles.auraCircle, styles.auraBack, { backgroundColor: color }]} />
      <View style={[styles.auraCircle, styles.auraFront, { backgroundColor: color }]} />
    </View>
  );
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

function CheckGlyph({ color }: { color: string }) {
  return (
    <View style={styles.checkStroke}>
      <View style={[styles.checkShort, { backgroundColor: color }]} />
      <View style={[styles.checkLong, { backgroundColor: color }]} />
    </View>
  );
}

function WelcomeArt() {
  return <GlyphTile backgroundColor="#208AEF">{<CheckGlyph color="#FFFFFF" />}</GlyphTile>;
}

function DomainsArt() {
  return (
    <View style={styles.domainGrid}>
      {DOMAIN_KEYS.map((key) => {
        const entry = DOMAIN_PALETTE[key];
        return (
          <View key={key} style={[styles.domainChip, { backgroundColor: `${entry.color}1F` }]}>
            <View style={[styles.domainDot, { backgroundColor: entry.color }]} />
            <Text style={[styles.domainLabel, { color: entry.color }]}>{entry.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

const GRAPH_FILL = "#39D353";
const GRAPH_SECONDARY = "#F5C518";

function GraphArt({ colors }: { colors: MaterialColors }) {
  // A small hand-picked intensity pattern — not real data, just a
  // recognizable echo of the Today screen's contribution graph so this
  // page reads as "this is what that grid means" rather than a generic
  // decoration. Uses the graph's real fill/secondary colors, not a theme
  // color, so it matches what the app actually shows.
  const pattern: [number, boolean?][] = [
    [0.15], [0.9, true], [0.4], [1], [0.6], [0],
    [0.75], [0.3], [1, true], [0.5], [0.2], [0.85],
  ];
  return (
    <GlyphTile backgroundColor="#1C1B1F">
      <View style={styles.graphGrid}>
        {pattern.map(([intensity, secondary], i) => (
          <View
            key={i}
            style={[
              styles.graphCell,
              {
                backgroundColor: intensity === 0 ? colors.surfaceVariant : GRAPH_FILL,
                opacity: intensity === 0 ? 1 : intensity,
              },
            ]}
          >
            {secondary ? <View style={styles.graphDot} /> : null}
          </View>
        ))}
      </View>
    </GlyphTile>
  );
}

function ReadyArt() {
  return <GlyphTile backgroundColor="#F9A825">{<CheckGlyph color="#FFFFFF" />}</GlyphTile>;
}

export const ONBOARDING_PAGES: OnboardingPageContent[] = [
  {
    key: "welcome",
    title: "One place for everything you track",
    body: "Habits, prayer, spending, projects, and anything else worth keeping up with — Tracker replaces the pile of separate apps with one flexible system.",
    accentColor: "#208AEF",
    render: () => <WelcomeArt />,
  },
  {
    key: "domains",
    title: "Trackers you define, grouped your way",
    body: "Every tracker lives in one of five domains, and you decide what's daily and what's occasional. Log a number, a duration, a note, or a simple yes/no — whatever fits.",
    accentColor: "#6750A4",
    render: () => <DomainsArt />,
  },
  {
    key: "graph",
    title: "See your consistency at a glance",
    body: "A GitHub-style graph shows how you're doing over time. The five daily prayers get their own view too — fard completion sets the brightness, sunnah shows as a separate dot, so neither one hides the other.",
    accentColor: GRAPH_FILL,
    render: (colors) => <GraphArt colors={colors} />,
  },
  {
    key: "ready",
    title: "Ready when you are",
    body: "Start with today's checklist, or create your first tracker from the Create button. You can always come back and add more later.",
    accentColor: "#F9A825",
    render: () => <ReadyArt />,
  },
];

const styles = StyleSheet.create({
  auraContainer: {
    position: "absolute",
    width: 260,
    height: 260,
    alignItems: "center",
    justifyContent: "center",
  },
  auraCircle: {
    position: "absolute",
    borderRadius: 999,
    opacity: 0.16,
  },
  auraBack: {
    width: 260,
    height: 260,
    transform: [{ translateX: -20 }, { translateY: 16 }],
  },
  auraFront: {
    width: 200,
    height: 200,
    opacity: 0.14,
    transform: [{ translateX: 30 }, { translateY: -24 }],
  },
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
    alignItems: "flex-end",
    justifyContent: "flex-end",
  },
  graphDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: GRAPH_SECONDARY,
    margin: 2,
  },
});

export { AuraBlob };
