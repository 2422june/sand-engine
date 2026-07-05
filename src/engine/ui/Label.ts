import { UIElement } from "./UIElement";

export type LabelAlign = "left" | "center" | "right";

export type LabelStyle = {
  color?: string;
  font?: string;
  align?: LabelAlign;
};

/**
 * Non-interactive text element.
 *
 * Displays a single line of text. It never intercepts the pointer (`enabled`
 * is off), so it sits harmlessly above interactive widgets in the {@link UI}.
 */
export class Label extends UIElement {
  text: string;
  style: Required<LabelStyle>;

  constructor(x: number, y: number, text: string, style?: LabelStyle) {
    // Width/height are nominal — a label is not a hit target.
    super(x, y, 0, 0);
    this.enabled = false;
    this.text = text;
    this.style = {
      color: style?.color ?? "#eaf1ff",
      font: style?.font ?? "16px Pretendard, sans-serif",
      align: style?.align ?? "left",
    };
  }

  override render(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.fillStyle = this.style.color;
    ctx.font = this.style.font;
    ctx.textAlign = this.style.align;
    ctx.textBaseline = "top";
    ctx.fillText(this.text, this.worldX, this.worldY);
    ctx.restore();
  }
}
