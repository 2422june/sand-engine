import { UIElement } from "./UIElement";

export type ToggleChange = (checked: boolean) => void;

export type ToggleStyle = {
  boxColor?: string;
  checkColor?: string;
  borderColor?: string;
  textColor?: string;
  font?: string;
};

/**
 * On/off checkbox.
 *
 * Clicking flips `checked` and fires `onChange`. Uses the same click flow as
 * {@link Button} (release while still inside), driven by the {@link UI} hub.
 */
export class Toggle extends UIElement {
  label: string;
  checked: boolean;
  style: Required<ToggleStyle>;

  private hoverState = false;
  private changeAction: ToggleChange | null = null;

  constructor(
    x: number,
    y: number,
    size: number,
    label: string,
    checked = false,
    style?: ToggleStyle,
  ) {
    super(x, y, size, size);
    this.focusable = true;
    this.label = label;
    this.checked = checked;
    this.style = {
      boxColor: style?.boxColor ?? "#1a2233",
      checkColor: style?.checkColor ?? "#5ad19b",
      borderColor: style?.borderColor ?? "#2b3a55",
      textColor: style?.textColor ?? "#eaf1ff",
      font: style?.font ?? "16px Pretendard, sans-serif",
    };
  }

  onChange(action: ToggleChange): this {
    this.changeAction = action;
    return this;
  }

  set(checked: boolean): void {
    if (this.checked === checked) {
      return;
    }
    this.checked = checked;
    this.changeAction?.(this.checked);
  }

  override onPointerEnter(): void {
    this.hoverState = true;
  }

  override onPointerLeave(): void {
    this.hoverState = false;
  }

  override onPointerUp(_px: number, _py: number, inside: boolean): void {
    if (inside) {
      this.set(!this.checked);
    }
  }

  override onActivate(): void {
    this.set(!this.checked);
  }

  override render(ctx: CanvasRenderingContext2D): void {
    const x = this.worldX;
    const y = this.worldY;

    ctx.save();
    ctx.fillStyle = this.style.boxColor;
    ctx.fillRect(x, y, this.width, this.height);

    if (this.checked) {
      const pad = this.width * 0.22;
      ctx.fillStyle = this.style.checkColor;
      ctx.fillRect(x + pad, y + pad, this.width - pad * 2, this.height - pad * 2);
    }

    ctx.lineWidth = 1;
    ctx.strokeStyle = this.hoverState ? this.style.checkColor : this.style.borderColor;
    ctx.strokeRect(x, y, this.width, this.height);

    ctx.fillStyle = this.style.textColor;
    ctx.font = this.style.font;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(this.label, x + this.width + 8, y + this.height / 2);
    ctx.restore();
  }
}
