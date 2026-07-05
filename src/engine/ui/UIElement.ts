/**
 * Base class for every UI widget.
 *
 * A UIElement is a rectangle that knows how to hit-test a pointer and draw
 * itself. It does NOT listen to input directly — the {@link UI} hub receives
 * pointer input, decides which element is the target, and calls the
 * `onPointer*` hooks below. This keeps UI input in one place and fully separate
 * from the game's keyboard `InputController`.
 *
 * Elements form a tree: `x`/`y` are LOCAL coordinates relative to the parent,
 * and `worldX`/`worldY` resolve to absolute canvas coordinates. Add children
 * with {@link addChild} (e.g. put buttons inside a `Panel`) so a whole group
 * can be moved by moving the parent.
 */
export abstract class UIElement {
  /** Position relative to the parent (absolute if there is no parent). */
  x: number;
  y: number;
  width: number;
  height: number;
  visible = true;
  enabled = true;

  /** Can this element receive keyboard focus (Tab navigation)? */
  focusable = false;
  /** Set by the UI hub while this element holds keyboard focus. */
  focused = false;

  parent: UIElement | null = null;
  readonly children: UIElement[] = [];

  constructor(x: number, y: number, width: number, height: number) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
  }

  /** Absolute X in canvas space, walking up the parent chain. */
  get worldX(): number {
    return (this.parent?.worldX ?? 0) + this.x;
  }

  /** Absolute Y in canvas space, walking up the parent chain. */
  get worldY(): number {
    return (this.parent?.worldY ?? 0) + this.y;
  }

  addChild<T extends UIElement>(child: T): T {
    child.parent = this;
    this.children.push(child);
    return child;
  }

  removeChild(child: UIElement): void {
    const index = this.children.indexOf(child);
    if (index !== -1) {
      this.children.splice(index, 1);
      child.parent = null;
    }
  }

  /** AABB hit test in absolute canvas coordinates. */
  contains(px: number, py: number): boolean {
    return (
      px >= this.worldX &&
      px <= this.worldX + this.width &&
      py >= this.worldY &&
      py <= this.worldY + this.height
    );
  }

  /** True when this element can currently receive pointer input. */
  get interactive(): boolean {
    return this.visible && this.enabled;
  }

  // Hooks driven by the UI hub. Coordinates are in absolute canvas space.
  onPointerDown(_px: number, _py: number): void {}
  onPointerHold(_px: number, _py: number): void {}
  /** `inside` is true when the pointer was released over this element. */
  onPointerUp(_px: number, _py: number, _inside: boolean): void {}
  onPointerEnter(): void {}
  onPointerLeave(): void {}

  // Keyboard focus hooks driven by the UI hub.
  onFocus(): void {
    this.focused = true;
  }
  onBlur(): void {
    this.focused = false;
  }
  /** Enter / Space while focused. */
  onActivate(): void {}

  update(_deltaTime: number): void {}
  abstract render(ctx: CanvasRenderingContext2D): void;
}
