import { UIElement } from "./UIElement";

export type PanelStyle = {
  color?: string;
  borderColor?: string;
  borderWidth?: number;
  opacity?: number;
};

/**
 * Non-interactive rectangular container / background.
 *
 * Purely visual grouping — draw it first and layer labels, bars and buttons on
 * top. It does not clip or own children (the {@link UI} list stays flat), so it
 * simply renders a filled (optionally bordered) rectangle.
 */
export class Panel extends UIElement {
  style: Required<PanelStyle>;

  constructor(x: number, y: number, width: number, height: number, style?: PanelStyle) {
    super(x, y, width, height);
    this.enabled = false;
    this.style = {
      color: style?.color ?? "rgba(9, 17, 28, 0.72)",
      borderColor: style?.borderColor ?? "#2b3a55",
      borderWidth: style?.borderWidth ?? 1,
      opacity: style?.opacity ?? 1,
    };
  }

  override render(ctx: CanvasRenderingContext2D): void {
    const x = this.worldX;
    const y = this.worldY;

    ctx.save();
    ctx.globalAlpha = this.style.opacity;
    ctx.fillStyle = this.style.color;
    ctx.fillRect(x, y, this.width, this.height);

    if (this.style.borderWidth > 0) {
      ctx.lineWidth = this.style.borderWidth;
      ctx.strokeStyle = this.style.borderColor;
      ctx.strokeRect(x, y, this.width, this.height);
    }
    ctx.restore();
  }
}
