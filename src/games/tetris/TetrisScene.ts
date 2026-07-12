import { CanvasScene } from "../../engine/render/CanvasScene";
import { Keyboard } from "../../engine/input/Keyboard";

/** A tetromino: its 4x4 (or 3x3) rotation matrices and a color. */
type Piece = {
  color: string;
  /** Each rotation state as a matrix of 0/1 rows. */
  cells: number[][];
};

const EMPTY = "";
const COLS = 10;
const ROWS = 20;

// Classic tetromino shapes in their spawn orientation.
const PIECES: Piece[] = [
  { color: "#4dd0e1", cells: [[1, 1, 1, 1]] }, // I
  { color: "#f6d743", cells: [[1, 1], [1, 1]] }, // O
  { color: "#ab47bc", cells: [[0, 1, 0], [1, 1, 1]] }, // T
  { color: "#66bb6a", cells: [[0, 1, 1], [1, 1, 0]] }, // S
  { color: "#ef5350", cells: [[1, 1, 0], [0, 1, 1]] }, // Z
  { color: "#5c6bc0", cells: [[1, 0, 0], [1, 1, 1]] }, // J
  { color: "#ffa726", cells: [[0, 0, 1], [1, 1, 1]] }, // L
];

type Active = {
  piece: Piece;
  matrix: number[][];
  row: number;
  col: number;
};

function rotate(matrix: number[][]): number[][] {
  const rows = matrix.length;
  const cols = matrix[0].length;
  const out: number[][] = Array.from({ length: cols }, () => Array(rows).fill(0));
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      out[c][rows - 1 - r] = matrix[r][c];
    }
  }
  return out;
}

export class TetrisScene extends CanvasScene {
  private readonly keyboard = Keyboard.instance;

  private grid: string[][] = [];
  private active: Active | null = null;
  private nextPiece: Piece = this.randomPiece();

  private dropTimer = 0;
  private dropInterval = 0.8; // seconds per gravity step
  private moveTimer = 0; // for held left/right auto-repeat
  private score = 0;
  private lines = 0;
  private level = 1;
  private gameOver = false;

  // Playfield geometry (세로 화면: 보드 좌측 + 우측 정보 패널).
  private readonly cell = 28;
  private readonly boardX = 20;
  private readonly boardY = 30;

  constructor(width: number, height: number) {
    super(width, height);
    this.reset();
  }

  private randomPiece(): Piece {
    return PIECES[Math.floor(Math.random() * PIECES.length)];
  }

  private reset(): void {
    this.grid = Array.from({ length: ROWS }, () => Array(COLS).fill(EMPTY));
    this.score = 0;
    this.lines = 0;
    this.level = 1;
    this.dropInterval = 0.8;
    this.gameOver = false;
    this.nextPiece = this.randomPiece();
    this.spawn();
  }

  private spawn(): void {
    const piece = this.nextPiece;
    this.nextPiece = this.randomPiece();
    const matrix = piece.cells.map((row) => [...row]);
    const col = Math.floor((COLS - matrix[0].length) / 2);
    this.active = { piece, matrix, row: 0, col };
    if (this.collides(this.active, 0, 0, matrix)) {
      this.gameOver = true;
      this.active = null;
    }
  }

  /** True if placing `matrix` at (row+dr, col+dc) hits a wall/floor/block. */
  private collides(a: Active, dr: number, dc: number, matrix: number[][]): boolean {
    for (let r = 0; r < matrix.length; r++) {
      for (let c = 0; c < matrix[r].length; c++) {
        if (!matrix[r][c]) continue;
        const nr = a.row + dr + r;
        const nc = a.col + dc + c;
        if (nc < 0 || nc >= COLS || nr >= ROWS) return true;
        if (nr >= 0 && this.grid[nr][nc] !== EMPTY) return true;
      }
    }
    return false;
  }

  private lock(): void {
    const a = this.active;
    if (!a) return;
    for (let r = 0; r < a.matrix.length; r++) {
      for (let c = 0; c < a.matrix[r].length; c++) {
        if (!a.matrix[r][c]) continue;
        const nr = a.row + r;
        const nc = a.col + c;
        if (nr >= 0) this.grid[nr][nc] = a.piece.color;
      }
    }
    this.clearLines();
    this.spawn();
  }

  private clearLines(): void {
    let cleared = 0;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (this.grid[r].every((cell) => cell !== EMPTY)) {
        this.grid.splice(r, 1);
        this.grid.unshift(Array(COLS).fill(EMPTY));
        cleared++;
        r++; // re-check the same row index after shift-down
      }
    }
    if (cleared > 0) {
      this.lines += cleared;
      // Standard-ish scoring.
      this.score += [0, 100, 300, 500, 800][cleared] * this.level;
      this.level = 1 + Math.floor(this.lines / 10);
      this.dropInterval = Math.max(0.08, 0.8 - (this.level - 1) * 0.07);
    }
  }

  private tryMove(dc: number): void {
    if (!this.active) return;
    if (!this.collides(this.active, 0, dc, this.active.matrix)) {
      this.active.col += dc;
    }
  }

  private tryRotate(): void {
    if (!this.active) return;
    const rotated = rotate(this.active.matrix);
    // Basic wall kicks: try in place, then nudged left/right.
    for (const kick of [0, -1, 1, -2, 2]) {
      if (!this.collides(this.active, 0, kick, rotated)) {
        this.active.matrix = rotated;
        this.active.col += kick;
        return;
      }
    }
  }

  private softDrop(): void {
    if (!this.active) return;
    if (!this.collides(this.active, 1, 0, this.active.matrix)) {
      this.active.row++;
      this.score += 1;
    } else {
      this.lock();
    }
  }

  private hardDrop(): void {
    if (!this.active) return;
    let dist = 0;
    while (!this.collides(this.active, dist + 1, 0, this.active.matrix)) {
      dist++;
    }
    this.active.row += dist;
    this.score += dist * 2;
    this.lock();
  }

  override update(deltaTime: number): void {
    const k = this.keyboard;

    if (this.gameOver) {
      if (k.wasPressed("Enter") || k.wasPressed("r")) this.reset();
      return;
    }

    // Discrete inputs.
    if (k.wasPressed("ArrowUp") || k.wasPressed("x")) this.tryRotate();
    if (k.wasPressed(" ")) this.hardDrop();
    if (k.wasPressed("ArrowLeft")) this.tryMove(-1);
    if (k.wasPressed("ArrowRight")) this.tryMove(1);

    // Held left/right auto-repeat.
    this.moveTimer += deltaTime;
    if (this.moveTimer >= 0.09) {
      this.moveTimer = 0;
      if (k.isHeld("ArrowLeft") && !k.wasPressed("ArrowLeft")) this.tryMove(-1);
      if (k.isHeld("ArrowRight") && !k.wasPressed("ArrowRight")) this.tryMove(1);
    }

    // Gravity — faster while soft-dropping.
    const interval = k.isHeld("ArrowDown") ? Math.min(this.dropInterval, 0.05) : this.dropInterval;
    this.dropTimer += deltaTime;
    if (this.dropTimer >= interval) {
      this.dropTimer = 0;
      this.softDrop();
    }
  }

  override render(ctx: CanvasRenderingContext2D): void {
    this.clear(ctx, "#0b1220");
    const { cell, boardX, boardY } = this;
    const boardW = COLS * cell;
    const boardH = ROWS * cell;

    // Playfield background + grid lines.
    ctx.fillStyle = "#0f1830";
    ctx.fillRect(boardX, boardY, boardW, boardH);
    ctx.strokeStyle = "rgba(255,255,255,0.05)";
    ctx.lineWidth = 1;
    for (let c = 0; c <= COLS; c++) {
      ctx.beginPath();
      ctx.moveTo(boardX + c * cell, boardY);
      ctx.lineTo(boardX + c * cell, boardY + boardH);
      ctx.stroke();
    }
    for (let r = 0; r <= ROWS; r++) {
      ctx.beginPath();
      ctx.moveTo(boardX, boardY + r * cell);
      ctx.lineTo(boardX + boardW, boardY + r * cell);
      ctx.stroke();
    }

    // Settled blocks.
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (this.grid[r][c] !== EMPTY) {
          this.drawCell(ctx, boardX + c * cell, boardY + r * cell, this.grid[r][c]);
        }
      }
    }

    // Ghost + active piece.
    if (this.active) {
      const a = this.active;
      let ghost = 0;
      while (!this.collides(a, ghost + 1, 0, a.matrix)) ghost++;
      for (let r = 0; r < a.matrix.length; r++) {
        for (let c = 0; c < a.matrix[r].length; c++) {
          if (!a.matrix[r][c]) continue;
          const gx = boardX + (a.col + c) * cell;
          const gy = boardY + (a.row + ghost + r) * cell;
          ctx.fillStyle = "rgba(255,255,255,0.08)";
          ctx.fillRect(gx + 1, gy + 1, cell - 2, cell - 2);
        }
      }
      for (let r = 0; r < a.matrix.length; r++) {
        for (let c = 0; c < a.matrix[r].length; c++) {
          if (!a.matrix[r][c]) continue;
          const nr = a.row + r;
          if (nr < 0) continue;
          this.drawCell(ctx, boardX + (a.col + c) * cell, boardY + nr * cell, a.piece.color);
        }
      }
    }

    // 우측 상태 패널 — 이름/조작법은 제거, 점수·라인·레벨·NEXT만.
    const px = boardX + boardW + 28;
    ctx.font = "15px 'Noto Sans KR', sans-serif";
    ctx.fillStyle = "#bfd1e6";
    ctx.fillText(`점수  ${this.score}`, px, boardY + 30);
    ctx.fillText(`라인  ${this.lines}`, px, boardY + 54);
    ctx.fillText(`레벨  ${this.level}`, px, boardY + 78);

    // Next piece preview.
    ctx.fillText("NEXT", px, boardY + 120);
    const nm = this.nextPiece.cells;
    for (let r = 0; r < nm.length; r++) {
      for (let c = 0; c < nm[r].length; c++) {
        if (!nm[r][c]) continue;
        this.drawCell(ctx, px + c * cell, boardY + 135 + r * cell, this.nextPiece.color);
      }
    }

    if (this.gameOver) {
      ctx.fillStyle = "rgba(0,0,0,0.72)";
      ctx.fillRect(boardX, boardY + boardH / 2 - 40, boardW, 80);
      ctx.fillStyle = "#ff6b6b";
      ctx.font = "bold 26px 'Noto Sans KR', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("GAME OVER", boardX + boardW / 2, boardY + boardH / 2);
      ctx.fillStyle = "#e8eefc";
      ctx.font = "14px 'Noto Sans KR', sans-serif";
      ctx.fillText("Enter / R 재시작", boardX + boardW / 2, boardY + boardH / 2 + 24);
      ctx.textAlign = "left";
    }
  }

  private drawCell(ctx: CanvasRenderingContext2D, x: number, y: number, color: string): void {
    const s = this.cell;
    ctx.fillStyle = color;
    ctx.fillRect(x + 1, y + 1, s - 2, s - 2);
    // Subtle top-left highlight for a beveled look.
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.fillRect(x + 1, y + 1, s - 2, 3);
    ctx.fillRect(x + 1, y + 1, 3, s - 2);
  }
}
