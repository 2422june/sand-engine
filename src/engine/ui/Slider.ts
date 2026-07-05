import { UIElement } from "./UIElement";

export type SliderChange = (value: number) => void;

export type SliderStyle = {
  trackColor?: string;
  fillColor?: string;
  thumbColor?: string;
  thumbRadius?: number;
};

/**
 * Draggable value slider.
 *
 * Press sets the value from the pointer, then every `onPointerHold` while the
 * button stays down keeps updating it (drag) — this exercises the {@link UI}
 * hub's hold phase, not just click. Fires `onChange` whenever the value moves.
 */
export class Slider extends UIElement {
  min: number;
  max: number;
  value: number;
  style: Required<SliderStyle>;

  private changeAction: SliderChange | null = null;

  constructor(
    x: number,
    y: number,
    width: number,
    height: number,
    min: number,
    max: number,
    value = min,
    style?: SliderStyle,
  ) {
    super(x, y, width, height);
    this.min = min;
    this.max = max;
    this.value = Math.max(min, Math.min(max, value));
    this.style = {
      trackColor: style?.trackColor ?? "#1a2233",
      fillColor: style?.fillColor ?? "#5a7fc0",
      thumbColor: style?.thumbColor ?? "#eaf1ff",
      thumbRadius: style?.thumbRadius ?? height / 2 + 2,
    };
  }

  onChange(action: SliderChange): this {
    this.changeAction = action;
    return this;
  }

  /** Fill fraction in [0, 1]. */
  get ratio(): number {
    if (this.max <= this.min) {
      return 0;
    }
    return (this.value - this.min) / (this.max - this.min);
  }

  private setFromPointer(px: number): void {
    const ratio = Math.max(0, Math.min(1, (px - this.worldX) / this.width));
    const next = this.min + ratio * (this.max - this.min);
    if (next !== this.value) {
      this.value = next;
      this.changeAction?.(this.value);
    }
  }

  override onPointerDown(px: number): void {
    this.setFromPointer(px);
  }

  override onPointerHold(px: number): void {
    this.setFromPointer(px);
  }

  override render(ctx: CanvasRenderingContext2D): void {
    const x = this.worldX;
    const y = this.worldY;
    const midY = y + this.height / 2;

    ctx.save();
    ctx.fillStyle = this.style.trackColor;
    ctx.fillRect(x, y, this.width, this.height);

    ctx.fillStyle = this.style.fillColor;
    ctx.fillRect(x, y, this.width * this.ratio, this.height);

    ctx.beginPath();
    ctx.fillStyle = this.style.thumbColor;
    ctx.arc(x + this.width * this.ratio, midY, this.style.thumbRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
