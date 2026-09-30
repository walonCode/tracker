import { NativeModule, requireOptionalNativeModule } from "expo";

export interface LaunchableApp {
  packageName: string;
  label: string;
}

export interface CallInterval {
  startMs: number;
  endMs: number;
}

export interface FocusStatus {
  /** The foreground service is running in the app process. */
  running: boolean;
  /** Last service tick, epoch ms. */
  heartbeatMs: number;
  /** Focus changed Do Not Disturb and has not restored it yet. */
  dndOn: boolean;
}

export interface StartFocusOptions {
  title: string;
  endsAtMs: number;
  allowedPackages: string[];
  /** Deep link the service opens when it intercepts a blocked app. */
  blockedUrl: string;
}

type FocusModeEvents = {
  onBlocked: (event: { packageName: string }) => void;
};

declare class FocusModeNative extends NativeModule<FocusModeEvents> {
  hasDndAccess(): boolean;
  openDndSettings(): void;
  hasUsageAccess(): boolean;
  openUsageSettings(): void;
  hasOverlayPermission(): boolean;
  openOverlaySettings(): void;
  isIgnoringBatteryOptimizations(): boolean;
  requestIgnoreBatteryOptimizations(): void;
  hasPhoneStatePermission(): boolean;
  listLaunchableApps(): Promise<LaunchableApp[]>;
  startFocus(options: StartFocusOptions): void;
  stopFocus(): void;
  getCallIntervals(sinceMs: number): CallInterval[];
  getStatus(): FocusStatus;
  reconcile(): void;
}

/** The native module, or null where it is not built in (tests, web, iOS). */
export default requireOptionalNativeModule<FocusModeNative>("FocusMode");
