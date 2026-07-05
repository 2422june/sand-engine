/**
 * Global mouse/pointer input source.
 *
 * Mirrors {@link Keyboard}: it owns the DOM listeners and tracks the three
 * input phases so components/scenes can ask about every phase:
 * - held: a button is currently down (누르는 동안)
 * - pressed this frame: a button went down on this frame (누르자 마자)
 * - released this frame: a button came up on this frame (눌렀다 뗐을 때)
 *
 * Pointer position is reported in canvas coordinate space (0..canvas.width,
 * 0..canvas.height), scaled from the element's on-screen size, so scenes can
 * hit-test directly against what they draw.
 *
 * Frame-edge state is valid for a single frame and is cleared by `endFrame()`,
 * which the game loop calls once per frame.
 */
export class Mouse {
  private static _instance: Mouse | null = null;

  private readonly held = new Set<number>();
  private readonly pressedThisFrame = new Set<number>();
  private readonly releasedThisFrame = new Set<number>();

  private _x = 0;
  private _y = 0;
  private inside = false;
  private canvas: HTMLCanvasElement | null = null;

  static get instance(): Mouse {
    if (!Mouse._instance) {
      Mouse._instance = new Mouse();
    }
    return Mouse._instance;
  }

  /** Wire the listeners to a specific canvas so coordinates map to its space. */
  attach(canvas: HTMLCanvasElement): void {
    if (this.canvas === canvas || typeof window === "undefined") {
      return;
    }
    this.canvas = canvas;

    const updatePos = (event: MouseEvent): void => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = rect.width === 0 ? 1 : canvas.width / rect.width;
      const scaleY = rect.height === 0 ? 1 : canvas.height / rect.height;
      this._x = (event.clientX - rect.left) * scaleX;
      this._y = (event.clientY - rect.top) * scaleY;
    };

    canvas.addEventListener("mousemove", (event) => {
      updatePos(event);
      this.inside = true;
    });

    canvas.addEventListener("mousedown", (event) => {
      updatePos(event);
      if (!this.held.has(event.button)) {
        this.pressedThisFrame.add(event.button);
      }
      this.held.add(event.button);
    });

    // Buttons can be released outside the canvas, so listen on window for up.
    window.addEventListener("mouseup", (event) => {
      if (this.held.has(event.button)) {
        this.releasedThisFrame.add(event.button);
      }
      this.held.delete(event.button);
    });

    canvas.addEventListener("mouseleave", () => {
      this.inside = false;
    });

    // --- Touch: map single-finger taps onto the left mouse button so board
    // games (chess/checkers) are playable on mobile with no game changes. ---
    const updateTouch = (touch: Touch): void => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = rect.width === 0 ? 1 : canvas.width / rect.width;
      const scaleY = rect.height === 0 ? 1 : canvas.height / rect.height;
      this._x = (touch.clientX - rect.left) * scaleX;
      this._y = (touch.clientY - rect.top) * scaleY;
    };

    canvas.addEventListener(
      "touchstart",
      (event) => {
        if (event.touches.length === 0) return;
        event.preventDefault(); // suppress scroll + the synthetic mouse event
        updateTouch(event.touches[0]);
        this.inside = true;
        if (!this.held.has(0)) {
          this.pressedThisFrame.add(0);
        }
        this.held.add(0);
      },
      { passive: false },
    );

    canvas.addEventListener(
      "touchmove",
      (event) => {
        if (event.touches.length === 0) return;
        event.preventDefault();
        updateTouch(event.touches[0]);
      },
      { passive: false },
    );

    const endTouch = (event: TouchEvent): void => {
      if (this.held.has(0)) {
        this.releasedThisFrame.add(0);
      }
      this.held.delete(0);
      this.inside = false;
      if (event.changedTouches.length) {
        updateTouch(event.changedTouches[0]);
      }
    };
    canvas.addEventListener("touchend", endTouch);
    canvas.addEventListener("touchcancel", endTouch);

    // Dropping focus should not leave buttons stuck down.
    window.addEventListener("blur", () => {
      this.held.clear();
    });
  }

  /** Pointer x in canvas space. */
  get x(): number {
    return this._x;
  }

  /** Pointer y in canvas space. */
  get y(): number {
    return this._y;
  }

  /** True while the pointer is over the canvas. */
  get isOver(): boolean {
    return this.inside;
  }

  /** True while the button is down (default: left button). */
  isDown(button = 0): boolean {
    return this.held.has(button);
  }

  /** True only on the frame the button went down (default: left button). */
  wasPressed(button = 0): boolean {
    return this.pressedThisFrame.has(button);
  }

  /** True only on the frame the button came up (default: left button). */
  wasReleased(button = 0): boolean {
    return this.releasedThisFrame.has(button);
  }

  /** True if the point (px,py) lies inside the given rectangle. */
  static hit(px: number, py: number, x: number, y: number, w: number, h: number): boolean {
    return px >= x && px <= x + w && py >= y && py <= y + h;
  }

  /** Roll over the per-frame edge state. Call once at the end of each frame. */
  endFrame(): void {
    this.pressedThisFrame.clear();
    this.releasedThisFrame.clear();
  }
}
