import "./style.css";
import { Game } from "./engine/core/Game";
import type { Scene } from "./engine/core/Scene";
import { Mouse } from "./engine/input/Mouse";
import { TouchControls } from "./engine/input/TouchControls";

export type GameFactory = (width: number, height: number) => Scene;

export type BootOptions = {
  /** Used only as the browser tab title (never drawn on screen). */
  title: string;
  /** @deprecated 화면 밖엔 아무것도 두지 않는다 — 더 이상 렌더되지 않음(엔트리 호환용). */
  subtitle?: string;
  /** Builds the scene for this page. */
  create: GameFactory;
  /**
   * Fixed logical canvas size. Omit BOTH to use "fill" mode — the template
   * rule: the canvas fills the whole viewport (and tracks resize/rotation), so
   * nothing is ever placed outside the game screen.
   */
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
  // 크기를 둘 다 생략하면 "fill" 모드 — 캔버스가 뷰포트를 꽉 채운다(템플릿 규칙:
  // 게임 화면 밖엔 아무 요소도 두지 않으므로 캔버스가 곧 화면 전체).
  const fill = options.width === undefined && options.height === undefined;
  let width = options.width ?? (fill ? Math.round(window.innerWidth) : 960);
  let height = options.height ?? (fill ? Math.round(window.innerHeight) : 540);

  const app = document.querySelector<HTMLDivElement>("#app");
  if (!app) {
    throw new Error("App root not found");
  }

  const isPortrait = height > width;
  const rotateMessage = isPortrait
    ? "이 게임은 세로 화면에 최적화되어 있어요.<br>기기를 세로로 세워주세요."
    : "이 게임은 가로 화면에 최적화되어 있어요.<br>기기를 옆으로 돌려주세요.";

  const shell = document.createElement("main");
  shell.className = fill ? "shell fill" : "shell";
  shell.dataset.orientation = isPortrait ? "portrait" : "landscape";
  // 게임 화면엔 이름/조작법 헤더를 띄우지 않는다(접속 시 깔끔하게). 이름은 탭 제목으로만.
  document.title = options.title;
  // fill 모드는 어떤 방향이든 캔버스가 화면을 채우므로 방향 안내를 쓰지 않는다.
  const rotatePromptHtml = fill
    ? ""
    : `<div class="rotate-prompt"><div class="rotate-prompt__icon">⟳</div><p>${rotateMessage}</p></div>`;
  shell.innerHTML = `
    <section class="stage"></section>
    ${rotatePromptHtml}
    <div class="exit-prompt" hidden>
      <div class="exit-prompt__box">
        <p class="exit-prompt__title">게임을 종료할까요?</p>
        <div class="exit-prompt__actions">
          <button type="button" class="exit-prompt__btn exit-prompt__btn--quit">게임 종료하기</button>
          <button type="button" class="exit-prompt__btn exit-prompt__btn--cancel">계속하기</button>
        </div>
      </div>
    </div>
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

  const scene = options.create(width, height);
  const game = new Game(scene, ctx);
  game.start();
  canvas.focus();

  // fill 모드: 캔버스가 CSS로 화면을 꽉 채우므로(100vw×100dvh), 그 **실제 렌더 크기**를
  // ResizeObserver로 관측해 버퍼(canvas.width/height)와 씬 논리 크기를 1:1로 맞춘다.
  // window.innerWidth/orientationchange는 회전 순간 옛 값/0을 줘서 화면이 비는 일이 있어
  // 대신 element의 clientWidth/Height(레이아웃 확정 후 값)를 쓴다.
  if (fill) {
    const applySize = (): void => {
      const w = Math.max(1, Math.round(canvas.clientWidth));
      const h = Math.max(1, Math.round(canvas.clientHeight));
      if (canvas.width === w && canvas.height === h) {
        return;
      }
      width = w;
      height = h;
      canvas.width = w;
      canvas.height = h;
      (scene as Partial<{ resize: (w: number, h: number) => void }>).resize?.(w, h);
    };
    if (typeof ResizeObserver !== "undefined") {
      new ResizeObserver(applySize).observe(canvas);
    } else {
      window.addEventListener("resize", applySize);
      window.addEventListener("orientationchange", applySize);
    }
    applySize();
  }

  // 상단 '게임 선택' 링크 대신, 뒤로 가기(브라우저/기기 back)를 가로채 종료 확인을
  // 띄우고 "게임 종료하기"를 눌러야 메인으로 나간다. 히스토리에 더미 항목을 심어
  // 두고, back 이 올 때마다 다시 심어(재무장) 확인 없이는 페이지를 벗어나지 않게 한다.
  const exitPrompt = shell.querySelector<HTMLElement>(".exit-prompt");
  if (exitPrompt) {
    const armBackTrap = (): void => {
      history.pushState({ gameTrap: true }, "");
    };
    armBackTrap();
    window.addEventListener("popstate", () => {
      // 뒤로 가기 → 확인창만 띄우고 머문다. 여기서 재무장하지 않는다 — 재무장하면
      // 종료 시 히스토리에 게임 항목이 남아 "메인에서 뒤로 가기 → 게임 복귀" 버그가 생긴다.
      exitPrompt.hidden = false;
    });
    exitPrompt.querySelector<HTMLButtonElement>(".exit-prompt__btn--quit")?.addEventListener("click", () => {
      // replace로 현재(게임) 항목을 메인으로 덮어써, 메인에서 뒤로 가기 해도 게임으로 안 돌아간다.
      window.location.replace("./index.html");
    });
    exitPrompt.querySelector<HTMLButtonElement>(".exit-prompt__btn--cancel")?.addEventListener("click", () => {
      exitPrompt.hidden = true;
      armBackTrap(); // 취소 시에만 다시 무장 → 다음 뒤로 가기에도 확인창이 뜬다.
    });
  }

  return game;
}
