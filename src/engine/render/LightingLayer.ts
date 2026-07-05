export type LightSource = {
  x: number;
  y: number;
  radius: number;
  color: string;
  intensity: number;
};

/**
 * 2D lighting overlay.
 *
 * Builds a light-map on an offscreen canvas — start from an ambient darkness,
 * add each light as an additive ("lighter") radial gradient — then composites
 * it onto the scene with `multiply`. Where the map is bright the scene shows
 * through; where it stays near the ambient color the scene is dimmed. Draw it
 * after the world sprites but before the HUD so UI stays fully lit.
 */
export class LightingLayer {
  /** Base brightness of unlit areas (darker = moodier). */
  ambient: string;

  private buffer: HTMLCanvasElement | null = null;
  private bufferCtx: CanvasRenderingContext2D | null = null;

  constructor(ambient = "#4a4a5e") {
    this.ambient = ambient;
  }

  private ensureBuffer(width: number, height: number): CanvasRenderingContext2D | null {
    if (typeof document === "undefined") {
      return null;
    }
    if (!this.buffer) {
      this.buffer = document.createElement("canvas");
      this.bufferCtx = this.buffer.getContext("2d");
    }
    if (this.buffer.width !== width || this.buffer.height !== height) {
      this.buffer.width = width;
      this.buffer.height = height;
    }
    return this.bufferCtx;
  }

  render(ctx: CanvasRenderingContext2D, lights: LightSource[]): void {
    const width = ctx.canvas.width;
    const height = ctx.canvas.height;
    const bctx = this.ensureBuffer(width, height);
    if (!bctx || !this.buffer) {
      return;
    }

    // Ambient darkness base.
    bctx.globalCompositeOperation = "source-over";
    bctx.globalAlpha = 1;
    bctx.fillStyle = this.ambient;
    bctx.fillRect(0, 0, width, height);

    // Add lights additively so overlaps brighten.
    bctx.globalCompositeOperation = "lighter";
    for (const light of lights) {
      if (light.intensity <= 0 || light.radius <= 0) {
        continue;
      }
      bctx.globalAlpha = Math.max(0, Math.min(1, light.intensity));
      const gradient = bctx.createRadialGradient(light.x, light.y, 0, light.x, light.y, light.radius);
      gradient.addColorStop(0, light.color);
      gradient.addColorStop(1, "rgba(0,0,0,0)");
      bctx.fillStyle = gradient;
      bctx.beginPath();
      bctx.arc(light.x, light.y, light.radius, 0, Math.PI * 2);
      bctx.fill();
    }
    bctx.globalAlpha = 1;
    bctx.globalCompositeOperation = "source-over";

    // Multiply the light-map onto the scene.
    ctx.save();
    ctx.globalCompositeOperation = "multiply";
    ctx.drawImage(this.buffer, 0, 0);
    ctx.restore();
  }
}
