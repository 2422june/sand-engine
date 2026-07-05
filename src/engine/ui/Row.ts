import { UIElement } from "./UIElement";

export type RowOptions = {
  padding?: number;
  gap?: number;
  /** Fallback column width for children with no real width (e.g. Label). */
  minColWidth?: number;
};

/**
 * Horizontal layout container — the {@link Column} counterpart.
 *
 * Transparent and non-interactive; auto-positions its children left to right
 * using local coordinates and sizes its own `width`/`height` to fit. Re-flows
 * every frame so adding/removing children or toggling `visible` reshuffles.
 */
export class Row extends UIElement {
  padding: number;
  gap: number;
  minColWidth: number;

  constructor(x: number, y: number, options?: RowOptions) {
    super(x, y, 0, 0);
    this.enabled = false;
    this.padding = options?.padding ?? 0;
    this.gap = options?.gap ?? 8;
    this.minColWidth = options?.minColWidth ?? 0;
  }

  /** Position visible children in a horizontal row and resize to fit. */
  reflow(): void {
    let x = this.padding;
    let tallest = 0;
    let placed = 0;
    for (const child of this.children) {
      if (!child.visible) {
        continue;
      }
      if (placed > 0) {
        x += this.gap;
      }
      child.x = x;
      child.y = this.padding;
      x += Math.max(child.width, this.minColWidth);
      tallest = Math.max(tallest, child.height);
      placed += 1;
    }
    this.width = x + this.padding;
    this.height = tallest + this.padding * 2;
  }

  override update(deltaTime: number): void {
    super.update(deltaTime);
    this.reflow();
  }

  override render(_ctx: CanvasRenderingContext2D): void {
    // Layout-only: nothing to draw.
  }
}
