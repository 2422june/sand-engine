import { UIElement } from "./UIElement";

export type ProgressBarStyle = {
  backgroundColor?: string;
  fillColor?: string;
  borderColor?: string;
  borderWidth?: number;
};

/**
 * Non-interactive progress / gauge bar (HP, energy, load, ...).
 *
 * Set `value` / `max` (or call {@link setValue}); it draws a background and a
 * proportional fill clamped to `[0, max]`.
 */
export class ProgressBar extends UIElement {
  value: number;
  max: number;
  style: Required<ProgressBarStyle>;

  constructor(
    x: number,
    y: number,
    width: number,
    height: number,
    max: number,
    value = max,
    style?: ProgressBarStyle,
  ) {
    super(x, y, width, height);
    this.enabled = false;
    this.max = max;
    this.value = value;
    this.style = {
      backgroundColor: style?.backgroundColor ?? "#1a2233",
      fillColor: style?.fillColor ?? "#5ad19b",
      borderColor: style?.borderColor ?? "#2b3a55",
      borderWidth: style?.borderWidth ?? 1,
    };
  }

  setValue(value: number): void {
    this.value = value;
  }

  /** Fill fraction in [0, 1]. */
  get ratio(): number {
    if (this.max <= 0) {
      return 0;
    }
    return Math.max(0, Math.min(1, this.value / this.max));
  }

  override render(ctx: CanvasRenderingContext2D): void {
    const x = this.worldX;
    const y = this.worldY;

    ctx.save();
    ctx.fillStyle = this.style.backgroundColor;
    ctx.fillRect(x, y, this.width, this.height);

    ctx.fillStyle = this.style.fillColor;
    ctx.fillRect(x, y, this.width * this.ratio, this.height);

    if (this.style.borderWidth > 0) {
      ctx.lineWidth = this.style.borderWidth;
      ctx.strokeStyle = this.style.borderColor;
      ctx.strokeRect(x, y, this.width, this.height);
    }
    ctx.restore();
  }
}
