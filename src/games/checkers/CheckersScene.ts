import { CanvasScene } from "../../engine/render/CanvasScene";
import { Mouse } from "../../engine/input/Mouse";

/**
 * Two-player local checkers (English draughts, 8x8).
 *
 * Rules: men move/capture forward only, kings one step in any diagonal,
 * captures are mandatory, and multi-jumps must be completed. Reaching the far
 * rank promotes a man to a king (and ends the turn). Click your own piece,
 * then click a highlighted square.
 *
 * Pieces: white "w"/"W" (bottom, moves up), black "b"/"B" (top, moves down);
 * uppercase = king.
 */
type Color = "w" | "b";
type Cell = string;

type Move = { r: number; c: number; cap?: { r: number; c: number } };

const SIZE = 8;

function colorOf(piece: Cell): Color | null {
  if (!piece) return null;
  return piece.toLowerCase() === "w" ? "w" : "b";
}
function isKing(piece: Cell): boolean {
  return piece === piece.toUpperCase() && piece !== "";
}
function inside(r: number, c: number): boolean {
  return r >= 0 && r < SIZE && c >= 0 && c < SIZE;
}

export class CheckersScene extends CanvasScene {
  private readonly mouse = Mouse.instance;

  private board: Cell[][] = [];
  private turn: Color = "w";
  private selected: { r: number; c: number } | null = null;
  private targets: Move[] = [];
  private chainFrom: { r: number; c: number } | null = null;
  private status = "";
  private gameOver = false;

  private readonly cell = 60;
  private readonly boardX = 40;
  private readonly boardY = 30;

  constructor(width: number, height: number) {
    super(width, height);
    this.reset();
  }

  private reset(): void {
    this.board = Array.from({ length: SIZE }, () => Array(SIZE).fill(""));
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if ((r + c) % 2 === 1) {
          if (r < 3) this.board[r][c] = "b";
          else if (r > 4) this.board[r][c] = "w";
        }
      }
    }
    this.turn = "w";
    this.selected = null;
    this.targets = [];
    this.chainFrom = null;
    this.gameOver = false;
    this.status = "백(White) 차례";
  }

  override update(_deltaTime: number): void {
    if (this.mouse.wasPressed(0)) {
      this.handleClick(this.mouse.x, this.mouse.y);
    }
  }

  private handleClick(px: number, py: number): void {
    if (this.gameOver) {
      if (Mouse.hit(px, py, this.boardX, this.boardY, SIZE * this.cell, SIZE * this.cell)) {
        this.reset();
      }
      return;
    }
    const c = Math.floor((px - this.boardX) / this.cell);
    const r = Math.floor((py - this.boardY) / this.cell);
    if (!inside(r, c)) return;

    if (this.selected) {
      const move = this.targets.find((m) => m.r === r && m.c === c);
      if (move) {
        this.applyMove(this.selected.r, this.selected.c, move);
        return;
      }
    }

    if (this.chainFrom) {
      return; // during a multi-jump only the chaining piece's targets are valid
    }

    const piece = this.board[r][c];
    if (piece && colorOf(piece) === this.turn) {
      const moves = this.legalFrom(r, c);
      if (moves.length) {
        this.selected = { r, c };
        this.targets = moves;
        return;
      }
    }
    this.selected = null;
    this.targets = [];
  }

  private dirsFor(piece: Cell): number[][] {
    if (isKing(piece)) return [[-1, -1], [-1, 1], [1, -1], [1, 1]];
    return colorOf(piece) === "w" ? [[-1, -1], [-1, 1]] : [[1, -1], [1, 1]];
  }

  private pieceCaptures(r: number, c: number): Move[] {
    const piece = this.board[r][c];
    const enemy = colorOf(piece) === "w" ? "b" : "w";
    const out: Move[] = [];
    for (const [dr, dc] of this.dirsFor(piece)) {
      const mr = r + dr;
      const mc = c + dc;
      const lr = r + 2 * dr;
      const lc = c + 2 * dc;
      if (inside(lr, lc) && !this.board[lr][lc] && inside(mr, mc) && colorOf(this.board[mr][mc]) === enemy) {
        out.push({ r: lr, c: lc, cap: { r: mr, c: mc } });
      }
    }
    return out;
  }

  private pieceSimple(r: number, c: number): Move[] {
    const piece = this.board[r][c];
    const out: Move[] = [];
    for (const [dr, dc] of this.dirsFor(piece)) {
      const nr = r + dr;
      const nc = c + dc;
      if (inside(nr, nc) && !this.board[nr][nc]) out.push({ r: nr, c: nc });
    }
    return out;
  }

  private sideHasCapture(color: Color): boolean {
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (colorOf(this.board[r][c]) === color && this.pieceCaptures(r, c).length) return true;
      }
    }
    return false;
  }

  /** Legal moves from (r,c), honoring mandatory capture and active chains. */
  private legalFrom(r: number, c: number): Move[] {
    const color = colorOf(this.board[r][c]);
    if (!color) return [];
    if (this.chainFrom) {
      return this.chainFrom.r === r && this.chainFrom.c === c ? this.pieceCaptures(r, c) : [];
    }
    const caps = this.pieceCaptures(r, c);
    if (this.sideHasCapture(color)) return caps;
    return this.pieceSimple(r, c);
  }

  private applyMove(fr: number, fc: number, m: Move): void {
    let piece = this.board[fr][fc];
    const color = colorOf(piece)!;
    this.board[fr][fc] = "";
    if (m.cap) this.board[m.cap.r][m.cap.c] = "";

    // Promotion on reaching the far rank.
    const kingRow = color === "w" ? 0 : SIZE - 1;
    let promoted = false;
    if (!isKing(piece) && m.r === kingRow) {
      piece = piece.toUpperCase();
      promoted = true;
    }
    this.board[m.r][m.c] = piece;

    // Continue a multi-jump if more captures exist and we didn't just promote.
    if (m.cap && !promoted && this.pieceCaptures(m.r, m.c).length) {
      this.chainFrom = { r: m.r, c: m.c };
      this.selected = { r: m.r, c: m.c };
      this.targets = this.pieceCaptures(m.r, m.c);
      this.status = `${color === "w" ? "백(White)" : "흑(Black)"} 연속 점프!`;
      return;
    }

    // End the turn.
    this.chainFrom = null;
    this.selected = null;
    this.targets = [];
    this.turn = color === "w" ? "b" : "w";
    this.evaluateState();
  }

  private sideHasAnyMove(color: Color): boolean {
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (colorOf(this.board[r][c]) === color) {
          if (this.pieceCaptures(r, c).length || this.pieceSimple(r, c).length) return true;
        }
      }
    }
    return false;
  }

  private evaluateState(): void {
    const label = this.turn === "w" ? "백(White)" : "흑(Black)";
    if (!this.sideHasAnyMove(this.turn)) {
      this.gameOver = true;
      const winner = this.turn === "w" ? "흑(Black)" : "백(White)";
      this.status = `${winner} 승리! — 클릭하면 재시작`;
      return;
    }
    this.status = this.sideHasCapture(this.turn) ? `${label} 차례 — 잡기 강제` : `${label} 차례`;
  }

  override render(ctx: CanvasRenderingContext2D): void {
    this.clear(ctx);
    const { boardX, boardY, cell } = this;

    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        ctx.fillStyle = (r + c) % 2 === 0 ? "#ecdbb6" : "#7a4a2b";
        ctx.fillRect(boardX + c * cell, boardY + r * cell, cell, cell);
      }
    }

    if (this.selected) {
      ctx.fillStyle = "rgba(90, 200, 120, 0.4)";
      ctx.fillRect(boardX + this.selected.c * cell, boardY + this.selected.r * cell, cell, cell);
    }
    for (const m of this.targets) {
      const cx = boardX + m.c * cell + cell / 2;
      const cy = boardY + m.r * cell + cell / 2;
      ctx.fillStyle = m.cap ? "rgba(220, 70, 70, 0.6)" : "rgba(40, 120, 60, 0.6)";
      ctx.beginPath();
      ctx.arc(cx, cy, cell * 0.16, 0, Math.PI * 2);
      ctx.fill();
    }

    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const p = this.board[r][c];
        if (!p) continue;
        const cx = boardX + c * cell + cell / 2;
        const cy = boardY + r * cell + cell / 2;
        ctx.beginPath();
        ctx.arc(cx, cy, cell * 0.36, 0, Math.PI * 2);
        ctx.fillStyle = colorOf(p) === "w" ? "#f2f2f2" : "#222";
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = colorOf(p) === "w" ? "#b9b9b9" : "#000";
        ctx.stroke();
        if (isKing(p)) {
          ctx.fillStyle = "#e2b93b";
          ctx.font = `${cell * 0.4}px 'Segoe UI Symbol', sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("♛", cx, cy + 2);
          ctx.textAlign = "left";
          ctx.textBaseline = "alphabetic";
        }
      }
    }

    const px = boardX + SIZE * cell + 30;
    ctx.fillStyle = "#e8eefc";
    ctx.font = "bold 22px 'Noto Sans KR', sans-serif";
    ctx.fillText("체커", px, boardY + 26);
    ctx.font = "15px 'Noto Sans KR', sans-serif";
    ctx.fillStyle = "#bfd1e6";
    ctx.fillText(this.status, px, boardY + 62);
    ctx.fillStyle = "#6f83a3";
    ctx.font = "12px 'Noto Sans KR', sans-serif";
    const hints = ["말 클릭 → 선택", "잡기 있으면 강제", "연속 점프 지원", "끝줄 도달 → 킹(♛)", "2인용 (마우스)"];
    hints.forEach((h, i) => ctx.fillText(h, px, boardY + 110 + i * 20));
  }
}
