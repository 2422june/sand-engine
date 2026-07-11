import "./style.css";
import { Game } from "./engine/core/Game";
import type { Scene } from "./engine/core/Scene";
import { Mouse } from "./engine/input/Mouse";
import { TouchControls } from "./engine/input/TouchControls";

export type GameFactory = (width: number, height: number) => Scene;

export type BootOptions = {
  /** Heading shown above the canvas. */
  title: string;
  /** Optional one-line control hint. */
  subtitle?: string;
  /** Builds the scene for this page. */
  create: GameFactory;
  width?: number;
  height?: number;
  /** Show the on-screen D-pad/A/B overlay on touch devices. Default: true. */
  touchControls?: boolean;
};

/**
 * Boot a single game into the page.
 *
 * Each game has its own HTML entry, so this replaces the old unified
 * `main.ts` runner: no scene switching, one game per bundle. Shared plumbing
 * (canvas, pointer input, mobile touch pad, game loop) lives here so per-game
 * entries stay a two-liner.
 */
export function bootGame(options: BootOptions): Game {
  const width = options.width ?? 960;
  const height = options.height ?? 540;

  const app = document.querySelector<HTMLDivElement>("#app");
  if (!app) {
    throw new Error("App root not found");
  }

  const shell = document.createElement("main");
  shell.className = "shell";
  shell.innerHTML = `
    <a class="back-link" href="./index.html">← 게임 선택</a>
    <h1>${options.title}</h1>
    ${options.subtitle ? `<p>${options.subtitle}</p>` : ""}
    <section class="stage"></section>
  `;

  const stage = shell.querySelector<HTMLElement>(".stage");
  if (!stage) {
    throw new Error("Stage node not found");
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.tabIndex = 0; // let the canvas hold keyboard focus
  stage.append(canvas);
  app.append(shell);

  // Route pointer input (chess/checkers) into canvas coordinate space.
  Mouse.instance.attach(canvas);

  // On-screen gamepad for mobile (drives Keyboard virtual keys), overlaid
  // inside the stage so it doesn't shrink the game area. Shows only on touch
  // devices; append `?pad=1` to force it on desktop for testing. Games that
  // don't need it (pointer-only boards, tap-driven narrative) opt out.
  if (options.touchControls ?? true) {
    const forcePad = new URLSearchParams(location.search).get("pad") === "1";
    new TouchControls(stage, forcePad);
  }

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("2D context is not supported");
  }

  const game = new Game(options.create(width, height), ctx);
  game.start();
  canvas.focus();
  return game;
}
