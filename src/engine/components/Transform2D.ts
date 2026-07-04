import { Component } from "../core/Component";

export class Transform2D extends Component {
  x: number;
  y: number;
  rotation: number;

  constructor(x = 0, y = 0, rotation = 0) {
    super();
    this.x = x;
    this.y = y;
    this.rotation = rotation;
  }
}
