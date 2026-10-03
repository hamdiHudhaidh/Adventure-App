import type { Adventure, AdventureStep, Reward, StepProgress } from "./data/types";

export type StepState = "done" | "available" | "locked";

export function completedSet(progress: StepProgress[], adventureId: string, partyId: string) {
  return new Set(progress.filter((p) => p.adventureId === adventureId && p.partyId === partyId).map((p) => p.stepId));
}

export function stepState(step: AdventureStep, done: Set<string>): StepState {
  if (done.has(step.id)) return "done";
  return step.prerequisites.every((id) => done.has(id)) ? "available" : "locked";
}

/** Would making `stepId` depend on `prereqId` create a cycle? */
export function wouldCycle(steps: AdventureStep[], stepId: string, prereqId: string) {
  if (stepId === prereqId) return true;
  const byId = new Map(steps.map((s) => [s.id, s]));
  const stack = [prereqId];
  const seen = new Set<string>();
  while (stack.length) {
    const id = stack.pop()!;
    if (id === stepId) return true;
    if (seen.has(id)) continue;
    seen.add(id);
    stack.push(...(byId.get(id)?.prerequisites ?? []));
  }
  return false;
}

/** Steps in dependency order (stable for the editor order). */
export function topoOrder(steps: AdventureStep[]) {
  const out: AdventureStep[] = [];
  const placed = new Set<string>();
  let guard = 0;
  while (out.length < steps.length && guard++ < steps.length + 1) {
    for (const s of steps) {
      if (placed.has(s.id)) continue;
      if (s.prerequisites.every((p) => placed.has(p) || !steps.some((x) => x.id === p))) {
        out.push(s);
        placed.add(s.id);
      }
    }
  }
  return out.length === steps.length ? out : steps;
}

export function totalRewards(adventure: Adventure, done: Set<string>) {
  const items: Reward[] = [];
  let xp = 0;
  for (const s of adventure.steps) {
    if (!done.has(s.id)) continue;
    for (const r of s.rewards) {
      if (r.kind === "xp") xp += r.amount;
      else items.push(r);
    }
  }
  return { xp, items };
}

export function rewardText(r: Reward) {
  if (r.kind === "xp") return `+${r.amount} XP`;
  if (r.kind === "badge") return `Badge · ${r.label}`;
  return r.amount > 1 ? `${r.label} ×${r.amount}` : r.label;
}
