import { UIElement } from "./UIElement";

export type ColumnOptions = {
  padding?: number;
  gap?: number;
  /** Fallback row height for children with no real height (e.g. Label). */
  minRowHeight?: number;
};

/**
 * Vertical layout container.
 *
 * A transparent, non-interactive element that auto-positions its children top
 * to bottom using local coordinates (see {@link UIElement} hierarchy). Children
 * keep their own widths; the column just assigns each child's `x`/`y` and grows
 * its own `height` to fit. Re-flows every frame, so adding/removing children or
 * toggling `visible` reshuffles automatically.
 */
export class Column extends UIElement {
  padding: number;
  gap: number;
  minRowHeight: number;

  constructor(x: number, y: number, width: number, options?: ColumnOptions) {
    super(x, y, width, 0);
    this.enabled = false;
    this.padding = options?.padding ?? 0;
    this.gap = options?.gap ?? 8;
    this.minRowHeight = options?.minRowHeight ?? 18;
  }

  /** Position visible children in a vertical stack and resize to fit. */
  reflow(): void {
    let y = this.padding;
    let placed = 0;
    for (const child of this.children) {
      if (!child.visible) {
        continue;
      }
      if (placed > 0) {
        y += this.gap;
      }
      child.x = this.padding;
      child.y = y;
      y += Math.max(child.height, this.minRowHeight);
      placed += 1;
    }
    this.height = y + this.padding;
  }

  override update(deltaTime: number): void {
    super.update(deltaTime);
    this.reflow();
  }

  override render(_ctx: CanvasRenderingContext2D): void {
    // Layout-only: nothing to draw.
  }
}
