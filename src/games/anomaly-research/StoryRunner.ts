import { createInitialState, type StoryState } from "./StoryState";
import {
  EXPLORE_EVENTS,
  PASSAGES,
  START_ID,
  type AbilityKey,
  type Choice,
  type Condition,
  type Effect,
  type Passage,
  type StatKey,
} from "./story";

const STAT_MIN = 0;
const STAT_MAX = 100;

/**
 * Executes the `story.ts` passage graph: applies choice effects, resolves
 * `requires` gates, ticks status (bleeding) on every passage enter, and
 * redirects to an ending when hp/정신 cross zero. See Blue Print.md §3.
 *
 * Stage machine (§3): 낭독 → 선택대기 → 결과낭독 → 다음. The runner owns state
 * transitions; `NarrativeScene` owns presentation (typewriter, buttons).
 */
export class StoryRunner {
  readonly state: StoryState;
  private currentId: string;
  private readonly log: string[] = [];

  constructor() {
    this.state = createInitialState();
    this.currentId = START_ID;
    this.enter(START_ID);
  }

  get current(): Passage {
    const passage = PASSAGES[this.currentId];
    if (!passage) {
      throw new Error(`Unknown passage: ${this.currentId}`);
    }
    return passage;
  }

  /** Choices available right now, filtered by `requires` (hub: dynamic). */
  get choices(): Choice[] {
    const passage = this.current;
    if (passage.hub) {
      return this.hubChoices();
    }
    return (passage.choices ?? []).filter((choice) => this.meets(choice.requires));
  }

  get hasChoices(): boolean {
    return this.choices.length > 0;
  }

  get isEnding(): boolean {
    return this.current.ending !== undefined;
  }

  recentLog(count: number): string[] {
    return this.log.slice(-count);
  }

  /** Apply a choice's effects, then transition per its `goto` (or fall back to `next`). */
  choose(choiceId: string): void {
    const choice = this.choices.find((c) => c.id === choiceId);
    if (!choice) {
      return;
    }
    this.log.push(`▸ ${choice.label}`);
    this.applyEffectsAndTransition(choice.effects, this.current.next);
  }

  /** Advance a linear (no-choice) passage, or a drained hub, via its `next`. */
  advance(): void {
    const next = this.current.next;
    if (next) {
      this.enter(next);
    }
  }

  /** Reset to a brand-new run (used by the "다시 시작" button on an ending). */
  restart(): void {
    Object.assign(this.state, createInitialState());
    this.log.length = 0;
    this.currentId = START_ID;
    this.enter(START_ID);
  }

  // ── internals ──────────────────────────────────────────────────────────

  private hubChoices(): Choice[] {
    return EXPLORE_EVENTS.filter((event) => !this.state.visited.has(event.id)).map((event) => ({
      id: event.id,
      label: event.label,
      effects: [{ op: "goto", passage: event.id } as Effect],
    }));
  }

  private applyEffectsAndTransition(effects: Effect[], fallbackNext?: string): void {
    let target: string | undefined;
    for (const effect of effects) {
      if (effect.op === "goto") {
        target = effect.passage;
        continue;
      }
      this.applyEffect(effect);
    }
    const destination = target ?? fallbackNext;
    if (destination) {
      this.enter(destination);
    }
  }

  private enter(id: string): void {
    this.currentId = id;
    this.state.visited.add(id);

    // §4 틱: 노드 onEnter마다 출혈 있으면 hp -= 6.
    if (this.state.status.includes("출혈")) {
      this.modStat("hp", -6);
    }

    for (const effect of this.current.onEnter ?? []) {
      this.applyEffect(effect);
    }

    this.log.push(this.current.text.length > 40 ? `${this.current.text.slice(0, 40)}…` : this.current.text);

    this.resolveEndingRedirect();
  }

  /** hp/정신 thresholds and the report-report(#8 진실) branch at b_report. */
  private resolveEndingRedirect(): void {
    if (this.current.ending) {
      return; // already at an ending passage
    }
    if (this.state.stats.hp <= STAT_MIN) {
      this.currentId = "ending_death";
      this.state.visited.add(this.currentId);
      return;
    }
    if (this.state.stats.정신 <= STAT_MIN) {
      this.currentId = "ending_madness";
      this.state.visited.add(this.currentId);
      return;
    }
    if (this.currentId === "b_report") {
      const hasTruth = ["rep_monster", "rep_greenblood", "rep_map"].every((report) =>
        this.state.reports.includes(report),
      );
      this.currentId = hasTruth ? "ending_truth" : "ending_survive";
      this.state.visited.add(this.currentId);
    }
  }

  private applyEffect(effect: Effect): void {
    switch (effect.op) {
      case "giveItem":
        if (!this.state.inventory.includes(effect.item)) {
          this.state.inventory.push(effect.item);
        }
        break;
      case "consumeItem": {
        const index = this.state.inventory.indexOf(effect.item);
        if (index !== -1) {
          this.state.inventory.splice(index, 1);
        }
        break;
      }
      case "modStat":
        this.modStat(effect.stat, effect.delta);
        break;
      case "applyStatus":
        if (!this.state.status.includes(effect.status)) {
          this.state.status.push(effect.status);
        }
        break;
      case "clearStatus": {
        const index = this.state.status.indexOf(effect.status);
        if (index !== -1) {
          this.state.status.splice(index, 1);
        }
        break;
      }
      case "setFlag":
        this.state.flags[effect.flag] = effect.value;
        break;
      case "incFlag":
        this.state.flags[effect.flag] = (this.state.flags[effect.flag] ?? 0) + (effect.amount ?? 1);
        break;
      case "unlockReport":
        if (!this.state.reports.includes(effect.report)) {
          this.state.reports.push(effect.report);
        }
        break;
      case "revealCharacter": {
        const existing = this.state.characters.find((c) => c.id === effect.id);
        if (existing) {
          existing.name = effect.name;
          existing.role = effect.role;
        } else {
          this.state.characters.push({ id: effect.id, name: effect.name, role: effect.role, condition: "정상" });
        }
        break;
      }
      case "setCondition": {
        const character = this.state.characters.find((c) => c.id === effect.id);
        if (character) {
          character.condition = effect.condition;
        }
        break;
      }
      case "goto":
        // Handled by the caller (applyEffectsAndTransition); no direct state change.
        break;
    }
  }

  private modStat(stat: StatKey | AbilityKey, delta: number): void {
    if (stat === "hp" || stat === "정신") {
      this.state.stats[stat] = Math.max(STAT_MIN, Math.min(STAT_MAX, this.state.stats[stat] + delta));
    } else {
      this.state.abilities[stat] += delta;
    }
  }

  private meets(condition?: Condition): boolean {
    if (!condition) {
      return true;
    }
    switch (condition.op) {
      case "hasItem":
        return this.state.inventory.includes(condition.item);
      case "not":
        return !this.meets(condition.cond);
      case "flagGte":
        return (this.state.flags[condition.flag] ?? 0) >= condition.value;
    }
  }
}
