// Single source of "now" for the whole app. Tests replace the source to
// freeze or advance time; app code must never call Date.now() directly.

type ClockSource = () => number; // milliseconds since the Unix epoch

const systemClock: ClockSource = () => Date.now();

let source: ClockSource = systemClock;

/** Current time as integer Unix seconds. */
export function nowSeconds(): number {
  return Math.floor(source() / 1000);
}

/** Replace the clock, e.g. `setClockSource(() => 1_700_000_000_000)`. */
export function setClockSource(next: ClockSource): void {
  source = next;
}

/** Restore the system clock. */
export function resetClockSource(): void {
  source = systemClock;
}
