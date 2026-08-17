import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type {
  WidgetConfigurationScreenProps,
  WidgetInfo,
  WidgetRepresentation,
} from "react-native-android-widget";

import { getDb } from "@/db/client";
import { listProjects, listTrackers, upsertWidgetInstance } from "@/db/repositories";
import { ensureSeeded } from "@/db/seed-once";
import { ContributionGraphWidget } from "@/widgets/contribution-graph-widget";
import { ProjectTimeWidget } from "@/widgets/project-time-widget";
import {
  DEFAULT_CONTRIBUTION_RANGE_DAYS,
  DEFAULT_PROJECT_TIME_RANGE_DAYS,
  fetchContributionGraphWidgetData,
  fetchProjectTimeWidgetData,
  type ContributionGraphWidgetData,
  type ProjectTimeWidgetData,
} from "@/widgets/widget-data";
import type { Project, Tracker, WidgetContentType, WidgetInstanceOptions } from "@/types";

import { ContributionGraphPreview, ProjectTimePreview } from "./widget-preview";

const CONTRIBUTION_RANGE_OPTIONS = [7, 14, 28] as const;
const PROJECT_RANGE_OPTIONS = [7, 30, 90] as const;

/**
 * Registered with `registerWidgetConfigurationScreen` from the root
 * `index.js`. Android's `RNWidgetConfigurationActivity` loads this as a
 * separate root component — it never goes through Expo Router's navigator,
 * even though the file lives under `src/app/` per this repo's route-file
 * convention (a thin re-export, see `src/app/widget-config.tsx`). Props are
 * typed as optional here purely as a defensive fallback in case something
 * (e.g. Expo Router's own static analysis of `src/app/`) ever renders this
 * component outside that flow; `registerWidgetConfigurationScreen` always
 * supplies the full `WidgetConfigurationScreenProps`.
 */
export default function WidgetConfigScreen(
  props: Partial<WidgetConfigurationScreenProps>
) {
  const { widgetInfo, renderWidget, setResult } = props;

  if (!widgetInfo || !renderWidget || !setResult) {
    return (
      <View style={styles.centered}>
        <Text style={styles.fallbackText}>
          This screen is only used by the widget configuration flow.
        </Text>
      </View>
    );
  }

  return (
    <WidgetConfigForm
      widgetInfo={widgetInfo}
      renderWidget={renderWidget}
      setResult={setResult}
    />
  );
}

interface WidgetConfigFormProps {
  widgetInfo: WidgetInfo;
  renderWidget: (widgetComponent: WidgetRepresentation) => void;
  setResult: (result: "ok" | "cancel") => void;
}

/**
 * The native widget's own `name` (see `app.json`) decides the content type —
 * dragging the "Project Time" picker entry onto the home screen must always
 * produce a project-time widget, matching its picker label/preview, so
 * content type isn't a free choice inside this shared form. What IS
 * per-instance configurable is this content type's own options (tracker +
 * range for the graph, project + range for project time), picked below and
 * persisted to `widget_instances` keyed by `widgetInfo.widgetId`.
 */
function contentTypeForWidgetName(widgetName: string): WidgetContentType {
  return widgetName === "ProjectTime" ? "project_time" : "contribution_graph";
}

function WidgetConfigForm({ widgetInfo, renderWidget, setResult }: WidgetConfigFormProps) {
  const contentType = contentTypeForWidgetName(widgetInfo.widgetName);

  const [loading, setLoading] = useState(true);
  const [trackers, setTrackers] = useState<Tracker[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [trackerId, setTrackerId] = useState<number | undefined>(undefined);
  const [projectId, setProjectId] = useState<number | undefined>(undefined);
  const [rangeDays, setRangeDays] = useState<number>(
    contentType === "project_time"
      ? DEFAULT_PROJECT_TIME_RANGE_DAYS
      : DEFAULT_CONTRIBUTION_RANGE_DAYS
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const db = await getDb();
      await ensureSeeded(db);
      if (contentType === "project_time") {
        const activeProjects = await listProjects(db, { status: "active" });
        if (!cancelled) setProjects(activeProjects);
      } else {
        const dailyTrackers = (await listTrackers(db, {})).filter(
          (t) => t.frequency === "daily"
        );
        if (!cancelled) setTrackers(dailyTrackers);
      }
      if (!cancelled) setLoading(false);
    })().catch(() => {
      if (!cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [contentType]);

  const options: WidgetInstanceOptions = useMemo(() => {
    if (contentType === "project_time") return { projectId, rangeDays };
    return { trackerId, rangeDays };
  }, [contentType, projectId, trackerId, rangeDays]);

  // Live preview: re-fetches on every option change so the card at the top
  // always shows what the widget will actually look like once saved,
  // instead of making the user guess from the option rows alone.
  const [previewData, setPreviewData] = useState<
    ContributionGraphWidgetData | ProjectTimeWidgetData | null
  >(null);

  useEffect(() => {
    if (loading) return;
    let cancelled = false;
    (async () => {
      const data =
        contentType === "project_time"
          ? await fetchProjectTimeWidgetData(options)
          : await fetchContributionGraphWidgetData(options);
      if (!cancelled) setPreviewData(data);
    })().catch(() => {
      // Best-effort: a failed preview fetch just leaves the last-good
      // preview (or none) on screen — never blocks configuring/saving.
    });
    return () => {
      cancelled = true;
    };
  }, [contentType, options, loading]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const db = await getDb();
      await upsertWidgetInstance(db, {
        widgetId: widgetInfo.widgetId,
        contentType,
        options,
      });

      if (contentType === "project_time") {
        const data = await fetchProjectTimeWidgetData(options);
        renderWidget(<ProjectTimeWidget data={data} />);
      } else {
        const data = await fetchContributionGraphWidgetData(options);
        renderWidget(<ContributionGraphWidget data={data} />);
      }

      setResult("ok");
    } catch {
      // This is a small, standalone native-activity screen with no
      // app-wide error UI to route to — leave the widget unconfigured and
      // let the user retry (long-press → configure) rather than silently
      // calling setResult('ok') on a half-saved state.
      setSaving(false);
    }
  }, [widgetInfo.widgetId, contentType, options, renderWidget, setResult]);

  const handleCancel = useCallback(() => {
    setResult("cancel");
  }, [setResult]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  const rangeOptions =
    contentType === "project_time" ? PROJECT_RANGE_OPTIONS : CONTRIBUTION_RANGE_OPTIONS;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>
        {contentType === "project_time"
          ? "Configure Project Time widget"
          : "Configure Contribution Graph widget"}
      </Text>

      <Text style={styles.sectionLabel}>Preview</Text>
      {previewData ? (
        contentType === "project_time" ? (
          <ProjectTimePreview data={previewData as ProjectTimeWidgetData} />
        ) : (
          <ContributionGraphPreview data={previewData as ContributionGraphWidgetData} />
        )
      ) : (
        <View style={[styles.previewPlaceholder]}>
          <ActivityIndicator />
        </View>
      )}

      {contentType === "contribution_graph" ? (
        <>
          <Text style={styles.sectionLabel}>Tracker</Text>
          <OptionRow
            label="All trackers (aggregate)"
            selected={trackerId === undefined}
            onPress={() => setTrackerId(undefined)}
          />
          {trackers.map((tracker) => (
            <OptionRow
              key={tracker.id}
              label={tracker.kind === "prayer" ? `${tracker.name} (fard/sunnah)` : tracker.name}
              selected={trackerId === tracker.id}
              onPress={() => setTrackerId(tracker.id)}
            />
          ))}
        </>
      ) : (
        <>
          <Text style={styles.sectionLabel}>Project</Text>
          <OptionRow
            label="All active projects"
            selected={projectId === undefined}
            onPress={() => setProjectId(undefined)}
          />
          {projects.map((project) => (
            <OptionRow
              key={project.id}
              label={project.title}
              selected={projectId === project.id}
              onPress={() => setProjectId(project.id)}
            />
          ))}
        </>
      )}

      <Text style={styles.sectionLabel}>Range</Text>
      {rangeOptions.map((days) => (
        <OptionRow
          key={days}
          label={`${days} days`}
          selected={rangeDays === days}
          onPress={() => setRangeDays(days)}
        />
      ))}

      <View style={styles.actions}>
        <Pressable
          style={[styles.button, styles.cancelButton]}
          onPress={handleCancel}
          disabled={saving}
        >
          <Text style={[styles.buttonText, styles.cancelButtonText]}>Cancel</Text>
        </Pressable>
        <Pressable
          style={[styles.button, styles.saveButton]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={[styles.buttonText, styles.saveButtonText]}>
            {saving ? "Saving…" : "Save"}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function OptionRow({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.optionRow, selected && styles.optionRowSelected]}
      onPress={onPress}
    >
      <Text style={styles.optionLabel}>{label}</Text>
      {selected ? <Text style={styles.optionCheck}>✓</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#1C1B1F",
  },
  fallbackText: {
    color: "#E6E1E5",
    fontSize: 14,
    textAlign: "center",
  },
  container: {
    padding: 20,
    gap: 4,
    backgroundColor: "#1C1B1F",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#E6E1E5",
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: "#CAC4D0",
    marginTop: 16,
    marginBottom: 4,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  optionRowSelected: {
    backgroundColor: "#332D41",
  },
  optionLabel: {
    fontSize: 14,
    color: "#E6E1E5",
  },
  optionCheck: {
    fontSize: 14,
    color: "#208AEF",
    fontWeight: "700",
  },
  previewPlaceholder: {
    minHeight: 108,
    borderRadius: 16,
    backgroundColor: "#1C1B1F",
    borderWidth: 1,
    borderColor: "#332D41",
    alignItems: "center",
    justifyContent: "center",
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 24,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#332D41",
  },
  saveButton: {
    backgroundColor: "#208AEF",
  },
  buttonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  cancelButtonText: {
    color: "#E6E1E5",
  },
  saveButtonText: {
    color: "#FFFFFF",
  },
});
