import { UIElement } from "./UIElement";

/**
 * UI input hub.
 *
 * Owns the pointer listeners for one canvas, tracks pointer state, and routes
 * it to the right {@link UIElement}. Flow each frame:
 * 1. pointer events update position + button edges (between frames)
 * 2. `update()` figures out the hovered / pressed element and fires the
 *    `onPointer*` hooks (down / hold / up / enter / leave)
 * 3. per-frame edges are rolled over at the end of `update()`
 *
 * This is deliberately separate from the game's keyboard `InputController`:
 * UI consumes the pointer, gameplay consumes the keyboard.
 */
export class UI {
  private readonly elements: UIElement[] = [];

  private canvas: HTMLCanvasElement | null = null;
  private bound = false;

  private pointerX = 0;
  private pointerY = 0;
  private down = false;
  private pressedThisFrame = false;
  private releasedThisFrame = false;

  /** Element that received the current press (the one that owns hold/click). */
  private pressed: UIElement | null = null;
  /** Element the pointer is currently over (for enter/leave). */
  private hovered: UIElement | null = null;
  /** Element holding keyboard focus (Tab navigation). */
  private focused: UIElement | null = null;

  add<T extends UIElement>(element: T): T {
    this.elements.push(element);
    return element;
  }

  remove(element: UIElement): void {
    const index = this.elements.indexOf(element);
    if (index !== -1) {
      this.elements.splice(index, 1);
    }
    if (this.pressed === element) {
      this.pressed = null;
    }
    if (this.hovered === element) {
      this.hovered = null;
    }
    if (this.focused === element) {
      this.focused = null;
    }
  }

  /** Attach pointer listeners to a canvas (idempotent). */
  attach(canvas: HTMLCanvasElement): void {
    if (this.bound && this.canvas === canvas) {
      return;
    }
    this.canvas = canvas;

    canvas.addEventListener("pointermove", (event) => {
      this.updatePosition(event);
    });

    canvas.addEventListener("pointerdown", (event) => {
      this.updatePosition(event);
      this.down = true;
      this.pressedThisFrame = true;
    });

    // Listen on window for up so a release outside the canvas still resolves.
    window.addEventListener("pointerup", (event) => {
      this.updatePosition(event);
      this.down = false;
      this.releasedThisFrame = true;
    });

    // UI's own keyboard layer: Tab moves focus, Enter/Space activates. This is
    // deliberately separate from the gameplay Keyboard / InputController.
    window.addEventListener("keydown", (event) => {
      if (event.key === "Tab") {
        event.preventDefault();
        this.moveFocus(event.shiftKey ? -1 : 1);
      } else if (event.key === "Enter" || event.key === " ") {
        if (this.focused) {
          event.preventDefault();
          this.focused.onActivate();
        }
      }
    });

    this.bound = true;
  }

  private updatePosition(event: PointerEvent): void {
    if (!this.canvas) {
      return;
    }
    const rect = this.canvas.getBoundingClientRect();
    // Map client coords into canvas coords (handles CSS scaling).
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    this.pointerX = (event.clientX - rect.left) * scaleX;
    this.pointerY = (event.clientY - rect.top) * scaleY;
  }

  /**
   * Topmost interactive element under the pointer, or null. Walks the tree in
   * draw order so deeper / later elements win (they are drawn on top). Invisible
   * subtrees are skipped entirely.
   */
  private pick(): UIElement | null {
    let hit: UIElement | null = null;
    const visit = (element: UIElement): void => {
      if (!element.visible) {
        return;
      }
      if (element.interactive && element.contains(this.pointerX, this.pointerY)) {
        hit = element;
      }
      for (const child of element.children) {
        visit(child);
      }
    };
    for (const root of this.elements) {
      visit(root);
    }
    return hit;
  }

  /** Focusable, visible elements in tab order (draw order). */
  private focusOrder(): UIElement[] {
    const out: UIElement[] = [];
    const visit = (element: UIElement): void => {
      if (!element.visible) {
        return;
      }
      if (element.focusable && element.interactive) {
        out.push(element);
      }
      for (const child of element.children) {
        visit(child);
      }
    };
    for (const root of this.elements) {
      visit(root);
    }
    return out;
  }

  private setFocus(element: UIElement | null): void {
    if (this.focused === element) {
      return;
    }
    this.focused?.onBlur();
    this.focused = element;
    this.focused?.onFocus();
  }

  /** Move keyboard focus to the next (dir=1) or previous (dir=-1) element. */
  private moveFocus(dir: number): void {
    const order = this.focusOrder();
    if (order.length === 0) {
      return;
    }
    const current = this.focused ? order.indexOf(this.focused) : -1;
    const start = current === -1 ? (dir > 0 ? 0 : order.length - 1) : (current + dir + order.length) % order.length;
    this.setFocus(order[start]);
  }

  update(deltaTime: number): void {
    const target = this.pick();

    // Hover enter / leave.
    if (target !== this.hovered) {
      this.hovered?.onPointerLeave();
      target?.onPointerEnter();
      this.hovered = target;
    }

    // Press: remember which element the press started on.
    if (this.pressedThisFrame && target) {
      this.pressed = target;
      // Clicking a focusable element also gives it keyboard focus.
      if (target.focusable) {
        this.setFocus(target);
      }
      target.onPointerDown(this.pointerX, this.pointerY);
    }

    // Hold: fire while the button stays down on the pressed element.
    if (this.down && this.pressed) {
      this.pressed.onPointerHold(this.pointerX, this.pointerY);
    }

    // Release: resolve on the element that got the press; `inside` decides click.
    if (this.releasedThisFrame && this.pressed) {
      const inside = this.pressed.contains(this.pointerX, this.pointerY);
      this.pressed.onPointerUp(this.pointerX, this.pointerY, inside);
      this.pressed = null;
    }

    for (const root of this.elements) {
      this.updateElement(root, deltaTime);
    }

    // Roll over per-frame pointer edges.
    this.pressedThisFrame = false;
    this.releasedThisFrame = false;
  }

  private updateElement(element: UIElement, deltaTime: number): void {
    element.update(deltaTime);
    for (const child of element.children) {
      this.updateElement(child, deltaTime);
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    // Bind lazily so the scene doesn't need the canvas element up front.
    this.attach(ctx.canvas);
    for (const root of this.elements) {
      this.renderElement(ctx, root);
    }

    // Focus ring on top of everything.
    if (this.focused && this.focused.visible) {
      ctx.save();
      ctx.strokeStyle = "#ffd54f";
      ctx.lineWidth = 2;
      ctx.strokeRect(
        this.focused.worldX - 3,
        this.focused.worldY - 3,
        this.focused.width + 6,
        this.focused.height + 6,
      );
      ctx.restore();
    }
  }

  private renderElement(ctx: CanvasRenderingContext2D, element: UIElement): void {
    if (!element.visible) {
      return;
    }
    // Parent draws first so children layer on top.
    element.render(ctx);
    for (const child of element.children) {
      this.renderElement(ctx, child);
    }
  }
}
