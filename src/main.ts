import "./style.css";
import { Game } from "./engine/core/Game";
import type { Scene } from "./engine/core/Scene";
import { Mouse } from "./engine/input/Mouse";
import { TouchControls } from "./engine/input/TouchControls";
import { MindHackScene } from "./games/mindhack/MindHackScene";
import { TetrisScene } from "./games/tetris/TetrisScene";
import { ChessScene } from "./games/chess/ChessScene";
import { CheckersScene } from "./games/checkers/CheckersScene";
import { CrossyScene } from "./games/crossy/CrossyScene";

const width = 960;
const height = 540;

type GameEntry = {
  id: string;
  title: string;
  create: (w: number, h: number) => Scene;
};

// Register games here — the menu is generated from this list.
const GAMES: GameEntry[] = [
  { id: "mindhack", title: "MindHack (엔진 데모)", create: (w, h) => new MindHackScene(w, h) },
  { id: "tetris", title: "테트리스", create: (w, h) => new TetrisScene(w, h) },
  { id: "chess", title: "체스 (2인)", create: (w, h) => new ChessScene(w, h) },
  { id: "checkers", title: "체커 (2인)", create: (w, h) => new CheckersScene(w, h) },
  { id: "crossy", title: "길건너 친구들", create: (w, h) => new CrossyScene(w, h) },
];

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("App root not found");
}

const shell = document.createElement("main");
shell.className = "shell";
shell.innerHTML = `
  <h1>Web 2D Game Engine</h1>
  <p>OOP + small modules + reusable files.</p>
  <nav class="game-menu"></nav>
  <section class="stage"></section>
`;

const menu = shell.querySelector<HTMLElement>(".game-menu");
const stage = shell.querySelector<HTMLElement>(".stage");
if (!menu || !stage) {
  throw new Error("Layout nodes not found");
}

const canvas = document.createElement("canvas");
canvas.width = width;
canvas.height = height;
canvas.tabIndex = 0; // let the canvas hold keyboard focus
stage.append(canvas);
app.append(shell);

// Route pointer input (chess/checkers) into canvas coordinate space.
Mouse.instance.attach(canvas);

// On-screen gamepad for mobile (drives Keyboard virtual keys). Shows only on
// touch devices; append `?pad=1` to the URL to force it on desktop for testing.
const forcePad = new URLSearchParams(location.search).get("pad") === "1";
new TouchControls(shell, forcePad);

const ctx = canvas.getContext("2d");
if (!ctx) {
  throw new Error("2D context is not supported");
}

const game = new Game(GAMES[0].create(width, height), ctx);
game.start();

// Build the menu buttons and wire scene switching.
const buttons = new Map<string, HTMLButtonElement>();
function selectGame(entry: GameEntry): void {
  game.setScene(entry.create(width, height));
  for (const [id, btn] of buttons) {
    btn.classList.toggle("active", id === entry.id);
  }
  canvas.focus();
}

for (const entry of GAMES) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "game-tab";
  btn.textContent = entry.title;
  btn.addEventListener("click", () => selectGame(entry));
  buttons.set(entry.id, btn);
  menu.append(btn);
}
buttons.get(GAMES[0].id)?.classList.add("active");
