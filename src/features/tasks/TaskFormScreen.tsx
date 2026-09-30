import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { Button, Dialog, HelperText, IconButton, Portal, Switch, Text, TextInput } from "react-native-paper";
import { TimePickerModal } from "react-native-paper-dates";

import { Screen } from "@/components/Screen";
import { ScreenBar } from "@/components/ScreenBar";
import { Action, ChoiceChip, Label } from "@/components/ui";
import { useDb } from "@/db/DatabaseProvider";
import * as goals from "@/db/repos/goals";
import * as tasks from "@/db/repos/tasks";
import { TASK_UNITS, TIME_LIMITS, type Goal, type TaskUnit, type TimeLimit } from "@/db/types";
import { TEXT_MAX } from "@/domain/goalRules";
import { taskLabel, usesCursor } from "@/domain/labels";
import { AMOUNT_MAX, AMOUNT_MIN, validateTaskTitle } from "@/domain/taskRules";
import { refreshOutputs } from "@/features/refresh";
import { requestReminderPermission } from "@/features/reminders/reminders";
import { useAppTheme } from "@/theme";

import { AmountStepper } from "./AmountStepper";
import { setJustCreated } from "./justCreated";

const WEEKDAY_CHIPS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

interface Form {
  title: string;
  detail: string;
  amount: number;
  unit: TaskUnit;
  cursor: string;
  minutes: TimeLimit;
  repeatDays: number[];
  startTime: string | null;
  forGoal: boolean;
}

const EMPTY: Form = {
  title: "",
  detail: "",
  amount: 1,
  unit: "pages",
  cursor: "1",
  minutes: 30,
  repeatDays: [],
  startTime: null,
  forGoal: false,
};

function parseCursor(text: string): number | null {
  const digits = text.replace(/\D/g, "");
  return digits === "" ? null : Math.max(1, Number(digits));
}

/**
 * Screen 6, New task. `?id=` edits a saved task; `?title=` prefills the
 * title; `?from=plan` hands the new task back to the Plan screen.
 */
export function TaskFormScreen() {
  const db = useDb();
  const theme = useAppTheme();
  const params = useLocalSearchParams<{ id?: string; title?: string; from?: string }>();
  const editId = params.id ? Number(params.id) : null;
  const [form, setForm] = useState<Form>({ ...EMPTY, title: params.title ?? "" });
  const [goal, setGoal] = useState<Goal | null>(null);
  const [goalId, setGoalId] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(editId === null);
  const [titleError, setTitleError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [timeOpen, setTimeOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    goals.getActive(db).then(setGoal);
    if (editId === null) return;
    Promise.all([tasks.get(db, editId), tasks.repeatDays(db, editId)]).then(([task, days]) => {
      if (!task) return;
      setForm({
        title: task.title,
        detail: task.detail ?? "",
        amount: task.amount,
        unit: task.unit,
        cursor: task.cursor === null ? "" : String(task.cursor),
        minutes: task.default_minutes,
        repeatDays: days,
        startTime: task.start_time,
        forGoal: task.goal_id !== null,
      });
      setGoalId(task.goal_id);
      setLoaded(true);
    });
  }, [db, editId]);

  function update(patch: Partial<Form>) {
    setForm((current) => ({ ...current, ...patch }));
  }

  const cursor = usesCursor(form.unit) ? parseCursor(form.cursor) : null;
  const preview = taskLabel({
    title: form.title.trim() || "What",
    amount: form.amount,
    unit: form.unit,
    cursor,
  });

  async function onSave() {
    const error = validateTaskTitle(form.title);
    setTitleError(error);
    if (error) return;

    // Keep the task's own goal when editing; tag a toggled-on task with the active goal.
    const taskGoalId = form.forGoal ? (goalId ?? goal?.id ?? null) : null;
    const input: tasks.TaskInput = {
      title: form.title,
      detail: form.detail,
      amount: form.amount,
      unit: form.unit,
      cursor,
      defaultMinutes: form.minutes,
      goalId: taskGoalId,
      startTime: form.startTime,
      repeatDays: form.repeatDays,
    };

    setBusy(true);
    try {
      if (editId !== null) {
        await tasks.update(db, editId, input);
      } else {
        const created = await tasks.create(db, input);
        if (params.from === "plan") setJustCreated(created.id);
      }
      if (input.startTime) await requestReminderPermission(db).catch(() => {});
      refreshOutputs(db);
      router.back();
    } catch (e) {
      setBusy(false);
      setFormError(e instanceof Error ? e.message : "The task could not be saved. Try again.");
    }
  }

  async function onArchive() {
    if (editId === null) return;
    await tasks.archive(db, editId);
    refreshOutputs(db);
    setArchiveOpen(false);
    router.back();
  }

  const [hours, minutes] = form.startTime ? form.startTime.split(":").map(Number) : [undefined, undefined];

  return (
    <Screen
      bar={
        <ScreenBar
          title={editId === null ? "New task" : "Edit task"}
          onClose={() => router.back()}
          right={
            editId !== null ? (
              <IconButton icon="archive-outline" accessibilityLabel="Archive task" onPress={() => setArchiveOpen(true)} />
            ) : null
          }
        />
      }
      footer={
        <Action onPress={onSave} loading={busy} disabled={!loaded}>
          Save task
        </Action>
      }
    >
      {loaded ? (
        <>
          <View>
            <TextInput
              mode="outlined"
              label="What"
              placeholder="Read Quran"
              value={form.title}
              onChangeText={(title) => update({ title })}
              maxLength={TEXT_MAX}
              error={Boolean(titleError)}
            />
            {titleError ? <HelperText type="error">{titleError}</HelperText> : null}
          </View>

          <Section label="How much">
            <AmountStepper
              label="Amount"
              value={form.amount}
              min={AMOUNT_MIN}
              max={AMOUNT_MAX}
              onChange={(amount) => update({ amount })}
            />
            <View style={styles.chips}>
              {TASK_UNITS.map((unit) => (
                <ChoiceChip key={unit} selected={form.unit === unit} onPress={() => update({ unit })}>
                  {unit}
                </ChoiceChip>
              ))}
            </View>
          </Section>

          {usesCursor(form.unit) ? (
            <Section label="Starts at">
              <TextInput
                mode="outlined"
                dense
                style={styles.cursor}
                label={form.unit === "verses" ? "Verse" : "Page"}
                keyboardType="number-pad"
                value={form.cursor}
                onChangeText={(text) => update({ cursor: text.replace(/\D/g, "") })}
                maxLength={6}
              />
            </Section>
          ) : null}

          <Section label="Time limit">
            <View style={styles.chips}>
              {TIME_LIMITS.map((limit) => (
                <ChoiceChip key={limit} selected={form.minutes === limit} onPress={() => update({ minutes: limit })}>
                  {`${limit} min`}
                </ChoiceChip>
              ))}
            </View>
          </Section>

          <Section label="Repeat on">
            <View style={styles.chips}>
              {WEEKDAY_CHIPS.map((name, day) => {
                const on = form.repeatDays.includes(day);
                return (
                  <ChoiceChip
                    key={name}
                    selected={on}
                    onPress={() =>
                      update({
                        repeatDays: on
                          ? form.repeatDays.filter((d) => d !== day)
                          : [...form.repeatDays, day].sort((a, b) => a - b),
                      })
                    }
                  >
                    {name}
                  </ChoiceChip>
                );
              })}
            </View>
          </Section>

          <Section label="Start time, optional">
            <View style={styles.chips}>
              <ChoiceChip icon="clock-outline" onPress={() => setTimeOpen(true)}>
                {form.startTime ?? "None"}
              </ChoiceChip>
              {form.startTime ? (
                <ChoiceChip icon="close" onPress={() => update({ startTime: null })}>
                  Clear
                </ChoiceChip>
              ) : null}
            </View>
          </Section>

          <TextInput
            mode="outlined"
            label="Details, optional"
            placeholder="squat, lunge, calf raise"
            value={form.detail}
            onChangeText={(detail) => update({ detail })}
            maxLength={TEXT_MAX}
          />

          {goal || goalId !== null ? (
            <View style={styles.toggle}>
              <Text variant="bodyLarge" style={styles.toggleLabel}>
                For this goal
              </Text>
              <Switch value={form.forGoal} onValueChange={(forGoal) => update({ forGoal })} />
            </View>
          ) : null}

          <View style={[styles.preview, { backgroundColor: theme.colors.primaryContainer }]}>
            <Text variant="labelMedium" style={{ color: theme.colors.onPrimaryContainer, opacity: 0.8 }}>
              Shows up as
            </Text>
            <Text variant="bodyLarge" style={{ color: theme.colors.onPrimaryContainer }}>
              {`${preview}, ${form.minutes} min`}
            </Text>
            {form.detail.trim() ? (
              <Text variant="bodyMedium" style={{ color: theme.colors.onPrimaryContainer, opacity: 0.8 }}>
                {form.detail.trim()}
              </Text>
            ) : null}
          </View>
          {formError ? <HelperText type="error">{formError}</HelperText> : null}
        </>
      ) : null}

      <TimePickerModal
        visible={timeOpen}
        locale="en-GB"
        use24HourClock
        hours={hours}
        minutes={minutes}
        onDismiss={() => setTimeOpen(false)}
        onConfirm={({ hours: h, minutes: m }) => {
          setTimeOpen(false);
          update({ startTime: `${pad2(h)}:${pad2(m)}` });
        }}
      />

      <Portal>
        <Dialog visible={archiveOpen} onDismiss={() => setArchiveOpen(false)}>
          <Dialog.Title>Archive this task?</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">It stops repeating and leaves the task list. Its history stays in the log.</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setArchiveOpen(false)}>Cancel</Button>
            <Button onPress={onArchive}>Archive</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </Screen>
  );
}

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Label>{label}</Label>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 8 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" },
  cursor: { width: 140 },
  toggle: { flexDirection: "row", alignItems: "center" },
  toggleLabel: { flex: 1 },
  preview: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, gap: 2 },
});
