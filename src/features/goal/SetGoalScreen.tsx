import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { HelperText, TextInput } from "react-native-paper";
import { DatePickerInput, enGB, registerTranslation } from "react-native-paper-dates";

import { Hint } from "@/components/ui";
import { useDb } from "@/db/DatabaseProvider";
import * as goals from "@/db/repos/goals";
import { localDate, localTimeToSeconds, today } from "@/domain/dates";
import { TEXT_MAX, validateDueDate, validateTitle } from "@/domain/goalRules";
import { StepScreen } from "@/features/onboarding/StepScreen";
import { setStep, stepRoute } from "@/features/onboarding/steps";

registerTranslation("en-GB", enGB);

interface Errors {
  title?: string | null;
  due?: string | null;
  form?: string | null;
}

/**
 * Screen 1. On first run it advances onboarding to permissions; with
 * `?mode=next` (after a goal is closed) it returns straight to Today.
 */
export function SetGoalScreen() {
  const db = useDb();
  const isNext = useLocalSearchParams<{ mode?: string }>().mode === "next";
  const [title, setTitle] = useState("");
  const [due, setDue] = useState<Date | undefined>(undefined);
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);

  function leave() {
    if (isNext) {
      if (router.canGoBack()) router.back();
      else router.replace("/");
      return;
    }
    setStep(db, "permissions").then(() => router.replace(stepRoute("permissions")));
  }

  // The create screen is unreachable while a goal is active. This also
  // resumes a first run that was killed between saving the goal and
  // advancing the step.
  useEffect(() => {
    goals.getActive(db).then((active) => {
      if (active) leave();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db]);

  async function onContinue() {
    const dueDate = due ? localDate(Math.floor(due.getTime() / 1000)) : null;
    const next: Errors = {
      title: validateTitle(title),
      due: validateDueDate(dueDate, today()),
    };
    setErrors(next);
    if (next.title || next.due || !dueDate) return;

    setBusy(true);
    try {
      await goals.create(db, { title, dueDate });
      leave();
    } catch (e) {
      setBusy(false);
      setErrors({ form: e instanceof Error ? e.message : "The goal could not be saved. Try again." });
    }
  }

  return (
    <StepScreen
      title={isNext ? "Your next goal" : "Your goal"}
      subtitle="One goal at a time"
      back={isNext}
      actionLabel="Continue"
      onAction={onContinue}
      busy={busy}
    >
      <View>
        <TextInput
          mode="outlined"
          label="Goal"
          multiline
          value={title}
          onChangeText={setTitle}
          maxLength={TEXT_MAX}
          error={Boolean(errors.title)}
        />
        {errors.title ? <HelperText type="error">{errors.title}</HelperText> : null}
      </View>
      <View>
        <DatePickerInput
          mode="outlined"
          locale="en-GB"
          label="Due"
          value={due}
          onChange={setDue}
          inputMode="start"
          startWeekOnMonday
          validRange={{ startDate: new Date(localTimeToSeconds(today()) * 1000) }}
          hasError={Boolean(errors.due)}
          hideValidationErrors
        />
        {errors.due ? <HelperText type="error">{errors.due}</HelperText> : null}
      </View>
      {errors.form ? <HelperText type="error">{errors.form}</HelperText> : null}
      <Hint>Pick something you can finish. To set a new goal later, you finish or drop this one first.</Hint>
    </StepScreen>
  );
}
