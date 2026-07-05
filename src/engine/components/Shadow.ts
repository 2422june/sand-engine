import { Component } from "../core/Component";

/**
 * Soft blob shadow drawn under a sprite.
 *
 * Data + a small `render` helper (the scene draws it before the sprite). The
 * shadow is a radial-gradient ellipse offset from the entity's position, giving
 * a cheap "grounded" look without a real light-projection pass.
 */
export class Shadow extends Component {
  offsetX: number;
  offsetY: number;
  radiusX: number;
  radiusY: number;
  /** RGB triplet, e.g. "0,0,0". Alpha is applied separately. */
  color: string;
  alpha: number;

  constructor(options?: {
    offsetX?: number;
    offsetY?: number;
    radiusX?: number;
    radiusY?: number;
    color?: string;
    alpha?: number;
  }) {
    super();
    this.offsetX = options?.offsetX ?? 0;
    this.offsetY = options?.offsetY ?? 18;
    this.radiusX = options?.radiusX ?? 26;
    this.radiusY = options?.radiusY ?? 10;
    this.color = options?.color ?? "0,0,0";
    this.alpha = options?.alpha ?? 0.35;
  }

  render(ctx: CanvasRenderingContext2D, centerX: number, centerY: number): void {
    const cx = centerX + this.offsetX;
    const cy = centerY + this.offsetY;

    ctx.save();
    ctx.globalAlpha = this.alpha;
    // Draw a circular gradient scaled into an ellipse.
    ctx.translate(cx, cy);
    ctx.scale(1, this.radiusY / this.radiusX);
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.radiusX);
    gradient.addColorStop(0, `rgba(${this.color},1)`);
    gradient.addColorStop(1, `rgba(${this.color},0)`);
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, this.radiusX, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
