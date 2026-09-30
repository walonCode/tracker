// Hands a task created from the plan picker ("Create <name>") back to the
// Plan screen, which adds it to its draft when it regains focus.

let pending: number | null = null;

export function setJustCreated(taskId: number): void {
  pending = taskId;
}

export function takeJustCreated(): number | null {
  const id = pending;
  pending = null;
  return id;
}
