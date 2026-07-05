import { UIElement } from "./UIElement";

export type ButtonAction = () => void;

export type ButtonStyle = {
  color?: string;
  hoverColor?: string;
  activeColor?: string;
  disabledColor?: string;
  textColor?: string;
  font?: string;
};

/**
 * Clickable button.
 *
 * Reacts to the pointer phases the {@link UI} hub feeds it:
 * - `press`   : pointer went down on the button
 * - `hold`    : pointer held down on the button (every frame)
 * - `release` : pointer came up after pressing (over the button or not)
 * - `click`   : pointer released while still over the button
 */
export class Button extends UIElement {
  label: string;
  style: Required<ButtonStyle>;

  private hoverState = false;
  private activeState = false;

  private pressAction: ButtonAction | null = null;
  private holdAction: ButtonAction | null = null;
  private releaseAction: ButtonAction | null = null;
  private clickAction: ButtonAction | null = null;

  constructor(
    x: number,
    y: number,
    width: number,
    height: number,
    label: string,
    style?: ButtonStyle,
  ) {
    super(x, y, width, height);
    this.focusable = true;
    this.label = label;
    this.style = {
      color: style?.color ?? "#2b3a55",
      hoverColor: style?.hoverColor ?? "#38507a",
      activeColor: style?.activeColor ?? "#5a7fc0",
      disabledColor: style?.disabledColor ?? "#1a2233",
      textColor: style?.textColor ?? "#eaf1ff",
      font: style?.font ?? "16px Pretendard, sans-serif",
    };
  }

  onPress(action: ButtonAction): this {
    this.pressAction = action;
    return this;
  }

  onHold(action: ButtonAction): this {
    this.holdAction = action;
    return this;
  }

  onRelease(action: ButtonAction): this {
    this.releaseAction = action;
    return this;
  }

  onClick(action: ButtonAction): this {
    this.clickAction = action;
    return this;
  }

  override onPointerEnter(): void {
    this.hoverState = true;
  }

  override onPointerLeave(): void {
    this.hoverState = false;
  }

  override onPointerDown(): void {
    this.activeState = true;
    this.pressAction?.();
  }

  override onPointerHold(): void {
    this.holdAction?.();
  }

  override onPointerUp(_px: number, _py: number, inside: boolean): void {
    this.activeState = false;
    this.releaseAction?.();
    if (inside) {
      this.clickAction?.();
    }
  }

  override onActivate(): void {
    this.clickAction?.();
  }

  override render(ctx: CanvasRenderingContext2D): void {
    let fill = this.style.color;
    if (!this.enabled) {
      fill = this.style.disabledColor;
    } else if (this.activeState) {
      fill = this.style.activeColor;
    } else if (this.hoverState) {
      fill = this.style.hoverColor;
    }

    const x = this.worldX;
    const y = this.worldY;

    ctx.save();
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, this.width, this.height);

    ctx.fillStyle = this.style.textColor;
    ctx.font = this.style.font;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(this.label, x + this.width / 2, y + this.height / 2);
    ctx.restore();
  }
}
