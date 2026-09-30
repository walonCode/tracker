import type { ReactNode } from "react";

import { Screen } from "@/components/Screen";
import { ScreenBar } from "@/components/ScreenBar";
import { Action } from "@/components/ui";

interface StepScreenProps {
  title: string;
  subtitle?: string;
  back?: boolean;
  children?: ReactNode;
  actionLabel: string;
  onAction: () => void;
  busy?: boolean;
}

/** Shared frame for the first-run screens: bar, content, one filled action. */
export function StepScreen({ title, subtitle, back = false, children, actionLabel, onAction, busy }: StepScreenProps) {
  return (
    <Screen
      bar={<ScreenBar title={title} subtitle={subtitle} back={back} />}
      footer={
        <Action onPress={onAction} loading={busy}>
          {actionLabel}
        </Action>
      }
    >
      {children}
    </Screen>
  );
}
