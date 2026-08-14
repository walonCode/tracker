/**
 * Fixed domain accent swatches.
 *
 * Unlike `material-colors.ts` (which follows Material You / the device
 * wallpaper and can change per-user, per-device), these colors identify each
 * of the app's 4 fixed domains and must stay stable so a domain is always
 * recognizable by color across screens, charts, and devices.
 */

import type { DomainKey } from "@/types";

export type { DomainKey };

export interface DomainPaletteEntry {
  readonly key: DomainKey;
  readonly label: string;
  /** Fixed accent color for this domain, as a `#RRGGBB` hex string. */
  readonly color: string;
}

export const DOMAIN_KEYS: readonly DomainKey[] = [
  "daily",
  "finance",
  "projects",
  "others",
];

export const DOMAIN_PALETTE: Readonly<Record<DomainKey, DomainPaletteEntry>> =
  {
    daily: { key: "daily", label: "Daily", color: "#2E7D32" },
    finance: { key: "finance", label: "Finance", color: "#F9A825" },
    projects: { key: "projects", label: "Projects", color: "#1565C0" },
    others: { key: "others", label: "Others", color: "#6A1B9A" },
  };
