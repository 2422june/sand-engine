import { CanvasScene } from "../../engine/render/CanvasScene";
import { Keyboard } from "../../engine/input/Keyboard";

/**
 * "길건너 친구들" style hopper. Move forward across procedurally generated
 * grass and traffic lanes without getting hit by a car. Forward hops raise the
 * score; the camera follows the player. Keyboard only.
 *
 * Controls: ↑/W hop forward, ↓/S back, ←/A / →/D sideways, R restart.
 */
type LaneType = "grass" | "road";

type Car = { x: number; len: number };

type Lane = {
  type: LaneType;
  color: string;
  dir: number; // +1 / -1, road only
  speed: number; // tiles per second, road only
  cars: Car[];
};

const COLS = 9; // 세로 화면: 9열 (540 / TILE 60)
const TILE = 60;
const ROWS_BEHIND = 3; // 플레이어 뒤로 보이는 줄 수 — 나머지는 전부 전방 시야

export class CrossyScene extends CanvasScene {
  private readonly keyboard = Keyboard.instance;
  private readonly lanes = new Map<number, Lane>();

  private playerRow = 0;
  private playerCol = COLS >> 1;
  private score = 0;
  private gameOver = false;
  private consecutiveRoads = 0;

  constructor(width: number, height: number) {
    super(width, height);
    this.reset();
  }

  private reset(): void {
    this.lanes.clear();
    this.playerRow = 0;
    this.playerCol = COLS >> 1;
    this.score = 0;
    this.gameOver = false;
    this.consecutiveRoads = 0;
  }

  private getLane(row: number): Lane {
    const existing = this.lanes.get(row);
    if (existing) return existing;

    let lane: Lane;
    // First rows are a safe grass shoulder.
    if (row <= 1) {
      lane = { type: "grass", color: this.grassColor(row), dir: 1, speed: 0, cars: [] };
    } else {
      // Avoid more than 3 roads in a row so there is always a safe hop.
      const prev = this.lanes.get(row - 1);
      const forceGrass = prev?.type === "road" && this.roadStreak(row - 1) >= 3;
      const isRoad = !forceGrass && Math.random() < 0.55;
      if (isRoad) {
        const dir = Math.random() < 0.5 ? 1 : -1;
        const speed = 2 + Math.random() * 3.5;
        const count = 2 + Math.floor(Math.random() * 3);
        const cars: Car[] = [];
        const gap = COLS / count;
        for (let i = 0; i < count; i++) {
          cars.push({ x: i * gap + Math.random() * gap * 0.5, len: Math.random() < 0.3 ? 2 : 1 });
        }
        lane = { type: "road", color: "#37414f", dir, speed, cars };
      } else {
        lane = { type: "grass", color: this.grassColor(row), dir: 1, speed: 0, cars: [] };
      }
    }
    this.lanes.set(row, lane);
    return lane;
  }

  private grassColor(row: number): string {
    return row % 2 === 0 ? "#4b8f3a" : "#54a043";
  }

  /** How many consecutive road lanes end at `row` (walking backwards). */
  private roadStreak(row: number): number {
    let n = 0;
    let r = row;
    while (this.lanes.get(r)?.type === "road") {
      n++;
      r--;
    }
    return n;
  }

  override update(deltaTime: number): void {
    const dt = Math.min(deltaTime, 0.05); // clamp so tab-away doesn't teleport cars

    if (this.gameOver) {
      if (this.keyboard.wasPressed("r") || this.keyboard.wasPressed("Enter")) {
        this.reset();
      }
      return;
    }

    // Discrete hops.
    if (this.keyboard.wasPressed("ArrowUp") || this.keyboard.wasPressed("w")) {
      this.playerRow++;
      this.score = Math.max(this.score, this.playerRow);
    }
    if (this.keyboard.wasPressed("ArrowDown") || this.keyboard.wasPressed("s")) {
      if (this.playerRow > 0) this.playerRow--;
    }
    if (this.keyboard.wasPressed("ArrowLeft") || this.keyboard.wasPressed("a")) {
      if (this.playerCol > 0) this.playerCol--;
    }
    if (this.keyboard.wasPressed("ArrowRight") || this.keyboard.wasPressed("d")) {
      if (this.playerCol < COLS - 1) this.playerCol++;
    }

    // Advance traffic on all lanes currently in view (a bit beyond, too).
    const top = this.playerRow + this.playerScreenRow + 2;
    const bottom = this.playerRow - (this.visibleRows() - this.playerScreenRow) - 2;
    for (let row = bottom; row <= top; row++) {
      const lane = this.getLane(row);
      if (lane.type !== "road") continue;
      for (const car of lane.cars) {
        car.x += lane.dir * lane.speed * dt;
        if (lane.dir > 0 && car.x > COLS + 1) car.x = -car.len - 1;
        else if (lane.dir < 0 && car.x < -car.len - 1) car.x = COLS + 1;
      }
    }

    // Collision on the player's own lane.
    const lane = this.getLane(this.playerRow);
    if (lane.type === "road") {
      const center = this.playerCol + 0.5;
      for (const car of lane.cars) {
        if (center > car.x && center < car.x + car.len) {
          this.gameOver = true;
          break;
        }
      }
    }
  }

  private visibleRows(): number {
    return Math.ceil(this.height / TILE);
  }

  /** 플레이어가 고정되는 화면 줄(위에서부터). 세로가 길수록 아래로 내려 전방 시야를 넓힌다. */
  private get playerScreenRow(): number {
    return this.visibleRows() - ROWS_BEHIND;
  }

  private rowToScreenY(row: number): number {
    return (this.playerScreenRow - (row - this.playerRow)) * TILE;
  }

  override render(ctx: CanvasRenderingContext2D): void {
    this.clear(ctx, "#20303f");

    const rows = this.visibleRows();
    for (let screen = -1; screen <= rows; screen++) {
      const row = this.playerRow + (this.playerScreenRow - screen);
      if (row < 0) {
        ctx.fillStyle = "#2c3e50";
        ctx.fillRect(0, screen * TILE, this.width, TILE);
        continue;
      }
      const lane = this.getLane(row);
      const y = screen * TILE;
      ctx.fillStyle = lane.color;
      ctx.fillRect(0, y, this.width, TILE);

      if (lane.type === "road") {
        // Lane divider dashes.
        ctx.strokeStyle = "rgba(255,255,255,0.25)";
        ctx.lineWidth = 3;
        ctx.setLineDash([16, 14]);
        ctx.beginPath();
        ctx.moveTo(0, y + TILE / 2);
        ctx.lineTo(this.width, y + TILE / 2);
        ctx.stroke();
        ctx.setLineDash([]);

        for (const car of lane.cars) {
          const cx = car.x * TILE;
          const cw = car.len * TILE;
          ctx.fillStyle = lane.dir > 0 ? "#e6584e" : "#4e9ce6";
          this.roundRect(ctx, cx + 4, y + 8, cw - 8, TILE - 16, 8);
          ctx.fill();
          ctx.fillStyle = "rgba(255,255,255,0.7)";
          const wx = lane.dir > 0 ? cx + cw - 14 : cx + 6;
          ctx.fillRect(wx, y + 14, 8, TILE - 28);
        }
      }
    }

    // Player (a little frog-ish blob).
    const px = this.playerCol * TILE + TILE / 2;
    const py = this.rowToScreenY(this.playerRow) + TILE / 2;
    ctx.fillStyle = "#f4d03f";
    ctx.beginPath();
    ctx.arc(px, py, TILE * 0.33, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1c1c1c";
    ctx.beginPath();
    ctx.arc(px - 8, py - 6, 4, 0, Math.PI * 2);
    ctx.arc(px + 8, py - 6, 4, 0, Math.PI * 2);
    ctx.fill();

    // HUD.
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fillRect(0, 0, this.width, 34);
    ctx.fillStyle = "#e8eefc";
    ctx.font = "bold 18px 'Noto Sans KR', sans-serif";
    ctx.fillText(`점수  ${this.score}`, 16, 24);

    if (this.gameOver) {
      ctx.fillStyle = "rgba(0,0,0,0.68)";
      ctx.fillRect(0, this.height / 2 - 46, this.width, 92);
      ctx.textAlign = "center";
      ctx.fillStyle = "#ff6b6b";
      ctx.font = "bold 30px 'Noto Sans KR', sans-serif";
      ctx.fillText("치였다! 🚗", this.width / 2, this.height / 2 - 6);
      ctx.fillStyle = "#e8eefc";
      ctx.font = "15px 'Noto Sans KR', sans-serif";
      ctx.fillText(`점수 ${this.score} · Enter / R 재시작`, this.width / 2, this.height / 2 + 24);
      ctx.textAlign = "left";
    }
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
}
