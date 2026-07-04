import "./style.css";
import { Game } from "./engine/core/Game";
import { MindHackScene } from "./games/mindhack/MindHackScene";

const width = 960;
const height = 540;

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("App root not found");
}

const shell = document.createElement("main");
shell.className = "shell";
shell.innerHTML = `
  <h1>Web 2D Game Engine</h1>
  <p>OOP + small modules + reusable files.</p>
  <section class="stage"></section>
`;

const stage = shell.querySelector<HTMLElement>(".stage");
if (!stage) {
  throw new Error("Stage not found");
}

const canvas = document.createElement("canvas");
canvas.width = width;
canvas.height = height;
stage.append(canvas);
app.append(shell);

const ctx = canvas.getContext("2d");
if (!ctx) {
  throw new Error("2D context is not supported");
}

const scene = new MindHackScene(width, height);
const game = new Game(scene, ctx);
game.start();
