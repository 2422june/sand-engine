import { Component } from "../core/Component";
import { Sprite } from "./Sprite";

export type AnimationFrame = {
  color?: string;
  scale?: number;
  duration: number;
};

export class Animation extends Component {
  private readonly clips = new Map<string, AnimationFrame[]>();
  private elapsed = 0;
  currentClip: string | null = null;
  frameIndex = 0;

  addClip(name: string, frames: AnimationFrame[]): this {
    this.clips.set(name, frames);
    if (!this.currentClip) {
      this.play(name);
    }
    return this;
  }

  play(name: string): void {
    if (this.currentClip === name) {
      return;
    }

    this.currentClip = name;
    this.frameIndex = 0;
    this.elapsed = 0;
    this.applyCurrentFrame();
  }

  override update(deltaTime: number): void {
    const frames = this.currentClip ? this.clips.get(this.currentClip) : undefined;
    if (!frames || frames.length === 0) {
      return;
    }

    this.elapsed += deltaTime;
    if (this.elapsed < frames[this.frameIndex].duration) {
      return;
    }

    this.elapsed = 0;
    this.frameIndex = (this.frameIndex + 1) % frames.length;
    this.applyCurrentFrame();
  }

  private applyCurrentFrame(): void {
    const sprite = this.entity?.getComponent(Sprite);
    const frames = this.currentClip ? this.clips.get(this.currentClip) : undefined;
    const frame = frames?.[this.frameIndex];

    if (!sprite || !frame) {
      return;
    }

    if (frame.color) {
      sprite.color = frame.color;
    }

    if (frame.scale) {
      sprite.scale = frame.scale;
    }
  }
}
