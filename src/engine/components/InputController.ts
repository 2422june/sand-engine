import { Component } from "../core/Component";
import { Keyboard } from "../input/Keyboard";

/** A single key, or a set of keys treated as "any of these". */
export type KeyBinding = string | string[];

export type InputAction = () => void;

type Binding = {
  keys: string[];
  action: InputAction;
};

function toKeys(binding: KeyBinding): string[] {
  return Array.isArray(binding) ? binding : [binding];
}

/**
 * Per-entity input dispatcher.
 *
 * Reads from the global {@link Keyboard} and splits input into phases so that
 * game code can react to exactly the moment it cares about:
 * - `onPress`   : fires once when the key goes down          (누르자 마자)
 * - `onHold`    : fires every frame while the key is held    (누르는 동안)
 * - `onRelease` : fires once when the key comes up           (눌렀다 뗐을 때)
 * - `onCombo`   : fires when several keys are down together  (동시에 눌러서)
 *
 * It also exposes query helpers (`isHeld`, `wasPressed`, ...) so other
 * components can ask "which key is being pressed?" directly. Actual movement
 * lives in {@link Actor}, not here.
 */
export class InputController extends Component {
  private readonly keyboard = Keyboard.instance;

  private readonly pressBindings: Binding[] = [];
  private readonly holdBindings: Binding[] = [];
  private readonly releaseBindings: Binding[] = [];
  private readonly comboBindings: Binding[] = [];

  /** Fire once when any of the given keys goes down. */
  onPress(key: KeyBinding, action: InputAction): this {
    this.pressBindings.push({ keys: toKeys(key), action });
    return this;
  }

  /** Fire every frame while any of the given keys is held. */
  onHold(key: KeyBinding, action: InputAction): this {
    this.holdBindings.push({ keys: toKeys(key), action });
    return this;
  }

  /** Fire once when any of the given keys comes up. */
  onRelease(key: KeyBinding, action: InputAction): this {
    this.releaseBindings.push({ keys: toKeys(key), action });
    return this;
  }

  /** Fire when all of the given keys are held at once (simultaneous combo). */
  onCombo(keys: string[], action: InputAction): this {
    this.comboBindings.push({ keys, action });
    return this;
  }

  // --- Query helpers: "어떤 키 입력인지 판단" ---------------------------------

  isHeld(key: string): boolean {
    return this.keyboard.isHeld(key);
  }

  wasPressed(key: string): boolean {
    return this.keyboard.wasPressed(key);
  }

  wasReleased(key: string): boolean {
    return this.keyboard.wasReleased(key);
  }

  isComboHeld(keys: string[]): boolean {
    return this.keyboard.isComboHeld(keys);
  }

  /** Read a -1 / 0 / +1 axis from two key groups (used by {@link Actor}). */
  getAxis(negative: string[], positive: string[]): number {
    const isNegative = negative.some((key) => this.keyboard.isHeld(key));
    const isPositive = positive.some((key) => this.keyboard.isHeld(key));
    return Number(isPositive) - Number(isNegative);
  }

  override update(): void {
    for (const binding of this.pressBindings) {
      if (binding.keys.some((key) => this.keyboard.wasPressed(key))) {
        binding.action();
      }
    }

    for (const binding of this.holdBindings) {
      if (binding.keys.some((key) => this.keyboard.isHeld(key))) {
        binding.action();
      }
    }

    for (const binding of this.releaseBindings) {
      if (binding.keys.some((key) => this.keyboard.wasReleased(key))) {
        binding.action();
      }
    }

    for (const binding of this.comboBindings) {
      if (this.keyboard.wasComboPressed(binding.keys)) {
        binding.action();
      }
    }
  }
}
