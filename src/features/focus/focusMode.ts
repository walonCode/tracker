import * as Linking from "expo-linking";
import { PermissionsAndroid, Platform } from "react-native";

import FocusModeNative, {
  type CallInterval,
  type FocusStatus,
  type LaunchableApp,
  type StartFocusOptions,
} from "../../../modules/focus-mode";

// TypeScript face of modules/focus-mode. Where the native module is not
// built in (tests, web), every call degrades to "off" and sessions run as a
// plain timer.

export type { CallInterval, FocusStatus, LaunchableApp };

const native = FocusModeNative;

export const focusAvailable = native !== null;

/** A service tick older than this means blocking has stopped. */
const HEARTBEAT_STALE_MS = 5_000;

export const hasDndAccess = () => native?.hasDndAccess() ?? false;
export const openDndSettings = () => native?.openDndSettings();
export const hasUsageAccess = () => native?.hasUsageAccess() ?? false;
export const openUsageSettings = () => native?.openUsageSettings();
export const hasOverlayPermission = () => native?.hasOverlayPermission() ?? false;
export const openOverlaySettings = () => native?.openOverlaySettings();
export const isIgnoringBatteryOptimizations = () => native?.isIgnoringBatteryOptimizations() ?? false;
export const requestIgnoreBatteryOptimizations = () => native?.requestIgnoreBatteryOptimizations();
export const hasPhoneStatePermission = () => native?.hasPhoneStatePermission() ?? false;

export async function listLaunchableApps(): Promise<LaunchableApp[]> {
  return native ? native.listLaunchableApps() : [];
}

export function startFocus(options: Omit<StartFocusOptions, "blockedUrl">): void {
  native?.startFocus({ ...options, blockedUrl: Linking.createURL("/blocked") });
}

export function stopFocus(): void {
  native?.stopFocus();
}

export function getCallIntervals(sinceMs: number): CallInterval[] {
  return native?.getCallIntervals(sinceMs) ?? [];
}

export function getStatus(): FocusStatus {
  return native?.getStatus() ?? { running: false, heartbeatMs: 0, dndOn: false };
}

/** Restores Do Not Disturb left on by a focus whose service died. */
export function reconcileFocus(): void {
  native?.reconcile();
}

export function addBlockedListener(listener: (event: { packageName: string }) => void) {
  return native?.addListener("onBlocked", listener) ?? { remove() {} };
}

/** Blocking needs usage access (to see the foreground app) and the overlay permission (to open the block screen). */
export function blockingPermitted(): boolean {
  return hasUsageAccess() && hasOverlayPermission();
}

/** True while the service ticks. A stale heartbeat means a brand killed it. */
export function serviceAlive(nowMs: number): boolean {
  const status = getStatus();
  return status.running && nowMs - status.heartbeatMs < HEARTBEAT_STALE_MS;
}

/**
 * Runtime permissions asked when a session starts: notifications for the
 * service's notification (Android 13+) and phone state for call tracking.
 * Refusing either never blocks the session.
 */
export async function requestSessionPermissions(): Promise<void> {
  if (!native || Platform.OS !== "android") return;
  const wanted = [PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE];
  if (Number(Platform.Version) >= 33) wanted.push(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
  const missing: typeof wanted = [];
  for (const permission of wanted) {
    if (!(await PermissionsAndroid.check(permission))) missing.push(permission);
  }
  if (missing.length > 0) await PermissionsAndroid.requestMultiple(missing);
}
