import { Keyboard } from "./Keyboard";

/** One on-screen button: its label and the virtual key it drives. */
type PadButton = { key: string; label: string; className?: string };

/**
 * On-screen touch gamepad. Renders a D-pad plus action buttons and translates
 * presses into {@link Keyboard} virtual keys, so every keyboard-driven game
 * (tetris, crossy, mindhack, …) becomes playable on mobile with no changes.
 *
 * Board games that use the pointer (chess/checkers) already work through the
 * canvas touch handling in {@link Mouse}; this pad is orthogonal to that.
 *
 * By default it only shows on coarse/touch pointers, but `forceVisible` can be
 * set for testing on desktop.
 */
export class TouchControls {
  private readonly root: HTMLElement;
  private readonly keyboard = Keyboard.instance;

  constructor(parent: HTMLElement, forceVisible = false) {
    this.root = document.createElement("div");
    this.root.className = "touch-controls";

    const touchCapable =
      typeof window !== "undefined" &&
      ("ontouchstart" in window || (navigator.maxTouchPoints ?? 0) > 0);
    if (!touchCapable && !forceVisible) {
      this.root.classList.add("touch-controls--hidden");
    }

    // Left: directional D-pad.
    const dpad = document.createElement("div");
    dpad.className = "touch-dpad";
    dpad.append(
      this.spacer(),
      this.button({ key: "ArrowUp", label: "▲" }),
      this.spacer(),
      this.button({ key: "ArrowLeft", label: "◀" }),
      this.button({ key: "ArrowDown", label: "▼" }),
      this.button({ key: "ArrowRight", label: "▶" }),
    );

    // Right: action buttons shared across games.
    const actions = document.createElement("div");
    actions.className = "touch-actions";
    actions.append(
      this.button({ key: " ", label: "A", className: "touch-btn--a" }), // hard drop / primary
      this.button({ key: "Enter", label: "↵", className: "touch-btn--b" }), // confirm / restart
    );

    this.root.append(dpad, actions);
    parent.append(this.root);

    // Global safety net: releasing anywhere clears keys that might be stuck.
    window.addEventListener("pointerup", this.releaseAll);
    window.addEventListener("pointercancel", this.releaseAll);
  }

  private readonly held = new Map<HTMLElement, string>();

  private button(def: PadButton): HTMLButtonElement {
    const el = document.createElement("button");
    el.type = "button";
    el.className = `touch-btn ${def.className ?? ""}`.trim();
    el.textContent = def.label;

    const press = (event: PointerEvent): void => {
      event.preventDefault();
      el.setPointerCapture?.(event.pointerId);
      el.classList.add("is-active");
      this.held.set(el, def.key);
      this.keyboard.virtualDown(def.key);
    };
    const release = (event: PointerEvent): void => {
      event.preventDefault();
      el.classList.remove("is-active");
      if (this.held.delete(el)) {
        this.keyboard.virtualUp(def.key);
      }
    };

    el.addEventListener("pointerdown", press);
    el.addEventListener("pointerup", release);
    el.addEventListener("pointercancel", release);
    el.addEventListener("pointerleave", release);
    // Stop the button from also emitting a click / focus scroll.
    el.addEventListener("contextmenu", (e) => e.preventDefault());
    return el;
  }

  private spacer(): HTMLSpanElement {
    const s = document.createElement("span");
    s.className = "touch-spacer";
    return s;
  }

  private readonly releaseAll = (): void => {
    for (const [el, key] of this.held) {
      el.classList.remove("is-active");
      this.keyboard.virtualUp(key);
    }
    this.held.clear();
  };
}
