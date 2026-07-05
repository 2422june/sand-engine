/**
 * Global keyboard input source.
 *
 * Owns the window event listeners and tracks three kinds of state so that
 * components can ask about every input phase:
 * - held: the key is currently down (누르는 동안)
 * - pressed this frame: the key went down on this frame (누르자 마자)
 * - released this frame: the key came up on this frame (눌렀다 뗐을 때)
 *
 * Frame-edge state (pressed/released) is valid for a single frame and is
 * cleared by `endFrame()`, which the game loop calls once per frame.
 */
export class Keyboard {
  private static _instance: Keyboard | null = null;

  private readonly held = new Set<string>();
  private readonly pressedThisFrame = new Set<string>();
  private readonly releasedThisFrame = new Set<string>();
  private listening = false;

  static get instance(): Keyboard {
    if (!Keyboard._instance) {
      Keyboard._instance = new Keyboard();
      Keyboard._instance.startListening();
    }
    return Keyboard._instance;
  }

  /** Normalize so that "A"/"a" (shift/capslock) map to the same logical key. */
  private static normalize(key: string): string {
    return key.length === 1 ? key.toLowerCase() : key;
  }

  private startListening(): void {
    if (this.listening || typeof window === "undefined") {
      return;
    }

    window.addEventListener("keydown", (event) => {
      const key = Keyboard.normalize(event.key);
      // Ignore auto-repeat: only the first keydown counts as a fresh press.
      if (this.held.has(key)) {
        return;
      }
      this.held.add(key);
      this.pressedThisFrame.add(key);
    });

    window.addEventListener("keyup", (event) => {
      const key = Keyboard.normalize(event.key);
      this.held.delete(key);
      this.releasedThisFrame.add(key);
    });

    // Dropping focus should not leave keys stuck down.
    window.addEventListener("blur", () => {
      this.held.clear();
    });

    this.listening = true;
  }

  /** True while the key is down. */
  isHeld(key: string): boolean {
    return this.held.has(Keyboard.normalize(key));
  }

  /** True only on the frame the key went down. */
  wasPressed(key: string): boolean {
    return this.pressedThisFrame.has(Keyboard.normalize(key));
  }

  /** True only on the frame the key came up. */
  wasReleased(key: string): boolean {
    return this.releasedThisFrame.has(Keyboard.normalize(key));
  }

  /** True while every key in the combo is down at the same time. */
  isComboHeld(keys: string[]): boolean {
    return keys.length > 0 && keys.every((key) => this.isHeld(key));
  }

  /**
   * True on the frame a combo completes: every key is held and at least one of
   * them went down this frame (동시에 눌러서 발동).
   */
  wasComboPressed(keys: string[]): boolean {
    return this.isComboHeld(keys) && keys.some((key) => this.wasPressed(key));
  }

  /** All keys currently down (mainly for debugging / "어떤 키 입력인지" 조회). */
  getHeldKeys(): string[] {
    return [...this.held];
  }

  /** Roll over the per-frame edge state. Call once at the end of each frame. */
  endFrame(): void {
    this.pressedThisFrame.clear();
    this.releasedThisFrame.clear();
  }
}
