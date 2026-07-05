import { Component } from "../core/Component";

/**
 * Point light attached to an entity.
 *
 * Data only — the {@link import("../render/LightingLayer").LightingLayer}
 * reads every light in the scene and composites them into one overlay. The
 * light is centered on the entity's transform; `radius` is its reach in pixels,
 * `color` its tint, and `intensity` (0..1) how strongly it brightens.
 *
 * `flicker` (0..1) optionally wobbles the intensity for torches / unstable
 * lights; call {@link update} each frame (it runs automatically as a component).
 */
export class Light extends Component {
  radius: number;
  color: string;
  intensity: number;
  flicker: number;

  private time = 0;

  constructor(options?: {
    radius?: number;
    color?: string;
    intensity?: number;
    flicker?: number;
  }) {
    super();
    this.radius = options?.radius ?? 160;
    this.color = options?.color ?? "#ffffff";
    this.intensity = options?.intensity ?? 1;
    this.flicker = options?.flicker ?? 0;
  }

  override update(deltaTime: number): void {
    this.time += deltaTime;
  }

  /** Current intensity including flicker, clamped to [0, 1]. */
  get effectiveIntensity(): number {
    if (this.flicker <= 0) {
      return this.intensity;
    }
    // Cheap pseudo-random wobble from two out-of-phase sine waves.
    const wobble = Math.sin(this.time * 18) * 0.6 + Math.sin(this.time * 7.3) * 0.4;
    return Math.max(0, Math.min(1, this.intensity + wobble * this.flicker));
  }
}
