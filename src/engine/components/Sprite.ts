import { Component } from "../core/Component";

export type SpriteShape = "circle" | "rect";

export class Sprite extends Component {
  width: number;
  height: number;
  color: string;
  shape: SpriteShape;
  scale: number;
  opacity: number;

  constructor(options: {
    width: number;
    height: number;
    color: string;
    shape?: SpriteShape;
    scale?: number;
    opacity?: number;
  }) {
    super();
    this.width = options.width;
    this.height = options.height;
    this.color = options.color;
    this.shape = options.shape ?? "rect";
    this.scale = options.scale ?? 1;
    this.opacity = options.opacity ?? 1;
  }
}
