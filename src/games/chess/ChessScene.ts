import { CanvasScene } from "../../engine/render/CanvasScene";
import { Mouse } from "../../engine/input/Mouse";

/**
 * Two-player local chess. White (uppercase) vs black (lowercase).
 *
 * Rules implemented: all piece movement + captures, turn alternation, check /
 * checkmate / stalemate detection, castling (king & queen side), en passant,
 * and automatic pawn promotion to a queen. Click your own piece to select it,
 * then click a highlighted square to move.
 */
type Color = "w" | "b";
type Cell = string; // "" or one of KQRBNP / kqrbnp

type Move = {
  r: number;
  c: number;
  castle?: "K" | "Q";
  enpassant?: boolean;
  promo?: boolean;
};

const SIZE = 8;

const GLYPH: Record<string, string> = {
  K: "♔", Q: "♕", R: "♖", B: "♗", N: "♘", P: "♙",
  k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟",
};

function colorOf(piece: Cell): Color | null {
  if (!piece) return null;
  return piece === piece.toUpperCase() ? "w" : "b";
}

function inside(r: number, c: number): boolean {
  return r >= 0 && r < SIZE && c >= 0 && c < SIZE;
}

function cloneBoard(board: Cell[][]): Cell[][] {
  return board.map((row) => row.slice());
}

type Rights = { wK: boolean; wQ: boolean; bK: boolean; bQ: boolean };

export class ChessScene extends CanvasScene {
  private readonly mouse = Mouse.instance;

  private board: Cell[][] = [];
  private turn: Color = "w";
  private rights: Rights = { wK: true, wQ: true, bK: true, bQ: true };
  private enPassant: { r: number; c: number } | null = null;

  private selected: { r: number; c: number } | null = null;
  private targets: Move[] = [];
  private status = "";
  private gameOver = false;

  // Board geometry. 세로 화면: 상단에 차례 표시, 보드는 가로 중앙.
  private readonly cell = 60;
  private readonly boardX: number;
  private readonly boardY = 70;

  constructor(width: number, height: number) {
    super(width, height);
    this.boardX = Math.round((width - SIZE * this.cell) / 2);
    this.reset();
  }

  private reset(): void {
    const back = "RNBQKBNR";
    this.board = Array.from({ length: SIZE }, () => Array(SIZE).fill(""));
    for (let c = 0; c < SIZE; c++) {
      this.board[0][c] = back[c].toLowerCase();
      this.board[1][c] = "p";
      this.board[6][c] = "P";
      this.board[7][c] = back[c];
    }
    this.turn = "w";
    this.rights = { wK: true, wQ: true, bK: true, bQ: true };
    this.enPassant = null;
    this.selected = null;
    this.targets = [];
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
      // Click anywhere on the board to restart once the game is decided.
      if (Mouse.hit(px, py, this.boardX, this.boardY, SIZE * this.cell, SIZE * this.cell)) {
        this.reset();
      }
      return;
    }
    const c = Math.floor((px - this.boardX) / this.cell);
    const r = Math.floor((py - this.boardY) / this.cell);
    if (!inside(r, c)) {
      return;
    }

    // Clicking a legal target of the current selection performs the move.
    if (this.selected) {
      const move = this.targets.find((m) => m.r === r && m.c === c);
      if (move) {
        this.applyMove(this.selected.r, this.selected.c, move);
        return;
      }
    }

    // Otherwise (re)select if it is the side-to-move's own piece.
    const piece = this.board[r][c];
    if (piece && colorOf(piece) === this.turn) {
      this.selected = { r, c };
      this.targets = this.legalMoves(r, c);
    } else {
      this.selected = null;
      this.targets = [];
    }
  }

  // ---- Move generation -----------------------------------------------------

  /** Is square (r,c) attacked by any piece of `by`? */
  private isAttacked(board: Cell[][], r: number, c: number, by: Color): boolean {
    // Pawns.
    const pawn = by === "w" ? "P" : "p";
    const dir = by === "w" ? 1 : -1; // attacker sits one rank "behind" its push
    for (const dc of [-1, 1]) {
      const pr = r + dir;
      const pc = c + dc;
      if (inside(pr, pc) && board[pr][pc] === pawn) return true;
    }
    // Knights.
    const knight = by === "w" ? "N" : "n";
    const kOff = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
    for (const [dr, dc] of kOff) {
      if (inside(r + dr, c + dc) && board[r + dr][c + dc] === knight) return true;
    }
    // King.
    const king = by === "w" ? "K" : "k";
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if ((dr || dc) && inside(r + dr, c + dc) && board[r + dr][c + dc] === king) return true;
      }
    }
    // Sliding: rook/queen (orthogonal), bishop/queen (diagonal).
    const rook = by === "w" ? "R" : "r";
    const bishop = by === "w" ? "B" : "b";
    const queen = by === "w" ? "Q" : "q";
    const ortho = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    const diag = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
    for (const [dr, dc] of ortho) {
      if (this.rayHits(board, r, c, dr, dc, [rook, queen])) return true;
    }
    for (const [dr, dc] of diag) {
      if (this.rayHits(board, r, c, dr, dc, [bishop, queen])) return true;
    }
    return false;
  }

  private rayHits(board: Cell[][], r: number, c: number, dr: number, dc: number, pieces: string[]): boolean {
    let nr = r + dr;
    let nc = c + dc;
    while (inside(nr, nc)) {
      const p = board[nr][nc];
      if (p) {
        return pieces.includes(p);
      }
      nr += dr;
      nc += dc;
    }
    return false;
  }

  private kingPos(board: Cell[][], color: Color): { r: number; c: number } | null {
    const king = color === "w" ? "K" : "k";
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (board[r][c] === king) return { r, c };
      }
    }
    return null;
  }

  private inCheck(board: Cell[][], color: Color): boolean {
    const kp = this.kingPos(board, color);
    if (!kp) return false;
    return this.isAttacked(board, kp.r, kp.c, color === "w" ? "b" : "w");
  }

  /** Pseudo-legal moves (ignoring self-check) for the piece at (r,c). */
  private pseudoMoves(board: Cell[][], r: number, c: number): Move[] {
    const piece = board[r][c];
    const color = colorOf(piece);
    if (!color) return [];
    const type = piece.toUpperCase();
    const moves: Move[] = [];
    const enemy = color === "w" ? "b" : "w";

    const add = (nr: number, nc: number): void => {
      if (!inside(nr, nc)) return;
      const t = board[nr][nc];
      if (!t || colorOf(t) === enemy) moves.push({ r: nr, c: nc });
    };
    const ray = (dirs: number[][]): void => {
      for (const [dr, dc] of dirs) {
        let nr = r + dr;
        let nc = c + dc;
        while (inside(nr, nc)) {
          const t = board[nr][nc];
          if (!t) {
            moves.push({ r: nr, c: nc });
          } else {
            if (colorOf(t) === enemy) moves.push({ r: nr, c: nc });
            break;
          }
          nr += dr;
          nc += dc;
        }
      }
    };

    if (type === "P") {
      const fwd = color === "w" ? -1 : 1;
      const startRow = color === "w" ? 6 : 1;
      const promoRow = color === "w" ? 0 : 7;
      // Forward one / two.
      if (inside(r + fwd, c) && !board[r + fwd][c]) {
        moves.push({ r: r + fwd, c, promo: r + fwd === promoRow });
        if (r === startRow && !board[r + 2 * fwd][c]) {
          moves.push({ r: r + 2 * fwd, c });
        }
      }
      // Captures + en passant.
      for (const dc of [-1, 1]) {
        const nr = r + fwd;
        const nc = c + dc;
        if (!inside(nr, nc)) continue;
        const t = board[nr][nc];
        if (t && colorOf(t) === enemy) {
          moves.push({ r: nr, c: nc, promo: nr === promoRow });
        } else if (this.enPassant && this.enPassant.r === nr && this.enPassant.c === nc) {
          moves.push({ r: nr, c: nc, enpassant: true });
        }
      }
    } else if (type === "N") {
      const off = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
      for (const [dr, dc] of off) add(r + dr, c + dc);
    } else if (type === "B") {
      ray([[-1, -1], [-1, 1], [1, -1], [1, 1]]);
    } else if (type === "R") {
      ray([[-1, 0], [1, 0], [0, -1], [0, 1]]);
    } else if (type === "Q") {
      ray([[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [-1, 1], [1, -1], [1, 1]]);
    } else if (type === "K") {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr || dc) add(r + dr, c + dc);
        }
      }
      this.addCastling(board, r, c, color, moves);
    }
    return moves;
  }

  private addCastling(board: Cell[][], r: number, c: number, color: Color, moves: Move[]): void {
    const homeRow = color === "w" ? 7 : 0;
    if (r !== homeRow || c !== 4) return;
    if (this.inCheck(board, color)) return;
    const enemy = color === "w" ? "b" : "w";
    const canK = color === "w" ? this.rights.wK : this.rights.bK;
    const canQ = color === "w" ? this.rights.wQ : this.rights.bQ;
    // King-side: squares (r,5),(r,6) empty, and (r,4),(r,5),(r,6) not attacked.
    if (canK && !board[homeRow][5] && !board[homeRow][6]) {
      if (!this.isAttacked(board, homeRow, 5, enemy) && !this.isAttacked(board, homeRow, 6, enemy)) {
        moves.push({ r: homeRow, c: 6, castle: "K" });
      }
    }
    // Queen-side: (r,1),(r,2),(r,3) empty, and (r,4),(r,3),(r,2) not attacked.
    if (canQ && !board[homeRow][1] && !board[homeRow][2] && !board[homeRow][3]) {
      if (!this.isAttacked(board, homeRow, 3, enemy) && !this.isAttacked(board, homeRow, 2, enemy)) {
        moves.push({ r: homeRow, c: 2, castle: "Q" });
      }
    }
  }

  /** Legal moves: pseudo-legal filtered so the mover's king is not in check. */
  private legalMoves(r: number, c: number): Move[] {
    const color = colorOf(this.board[r][c]);
    if (!color) return [];
    const out: Move[] = [];
    for (const m of this.pseudoMoves(this.board, r, c)) {
      const test = cloneBoard(this.board);
      this.rawApply(test, r, c, m);
      if (!this.inCheck(test, color)) out.push(m);
    }
    return out;
  }

  /** Apply a move onto `board` in place (no rights/turn bookkeeping). */
  private rawApply(board: Cell[][], fr: number, fc: number, m: Move): void {
    const piece = board[fr][fc];
    board[fr][fc] = "";
    if (m.enpassant) {
      board[fr][m.c] = ""; // captured pawn sits on the mover's rank
    }
    let placed = piece;
    if (m.promo) {
      placed = colorOf(piece) === "w" ? "Q" : "q";
    }
    board[m.r][m.c] = placed;
    if (m.castle === "K") {
      board[m.r][5] = board[m.r][7];
      board[m.r][7] = "";
    } else if (m.castle === "Q") {
      board[m.r][3] = board[m.r][0];
      board[m.r][0] = "";
    }
  }

  private applyMove(fr: number, fc: number, m: Move): void {
    const piece = this.board[fr][fc];
    const color = colorOf(piece)!;
    const type = piece.toUpperCase();

    this.rawApply(this.board, fr, fc, m);

    // Update castling rights.
    if (type === "K") {
      if (color === "w") { this.rights.wK = false; this.rights.wQ = false; }
      else { this.rights.bK = false; this.rights.bQ = false; }
    }
    const clearRookRight = (sr: number, sc: number): void => {
      if (sr === 7 && sc === 0) this.rights.wQ = false;
      if (sr === 7 && sc === 7) this.rights.wK = false;
      if (sr === 0 && sc === 0) this.rights.bQ = false;
      if (sr === 0 && sc === 7) this.rights.bK = false;
    };
    clearRookRight(fr, fc); // a rook that moved
    clearRookRight(m.r, m.c); // a rook that was captured on its home square

    // Set en-passant target if a pawn advanced two squares.
    this.enPassant = null;
    if (type === "P" && Math.abs(m.r - fr) === 2) {
      this.enPassant = { r: (m.r + fr) / 2, c: fc };
    }

    // Hand the turn over and evaluate the new side-to-move's situation.
    this.turn = color === "w" ? "b" : "w";
    this.selected = null;
    this.targets = [];
    this.evaluateState();
  }

  private hasAnyLegalMove(color: Color): boolean {
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (colorOf(this.board[r][c]) === color && this.legalMoves(r, c).length > 0) {
          return true;
        }
      }
    }
    return false;
  }

  private evaluateState(): void {
    const label = this.turn === "w" ? "백(White)" : "흑(Black)";
    const checked = this.inCheck(this.board, this.turn);
    const canMove = this.hasAnyLegalMove(this.turn);
    if (!canMove) {
      this.gameOver = true;
      if (checked) {
        const winner = this.turn === "w" ? "흑(Black)" : "백(White)";
        this.status = `체크메이트! ${winner} 승리 — 클릭하면 재시작`;
      } else {
        this.status = "스테일메이트 (무승부) — 클릭하면 재시작";
      }
      return;
    }
    this.status = checked ? `${label} 차례 — 체크!` : `${label} 차례`;
  }

  // ---- Rendering -----------------------------------------------------------

  override render(ctx: CanvasRenderingContext2D): void {
    this.clear(ctx);
    const { boardX, boardY, cell } = this;

    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const x = boardX + c * cell;
        const y = boardY + r * cell;
        ctx.fillStyle = (r + c) % 2 === 0 ? "#ecdbb6" : "#a97a52";
        ctx.fillRect(x, y, cell, cell);
      }
    }

    // Highlight selection.
    if (this.selected) {
      const { r, c } = this.selected;
      ctx.fillStyle = "rgba(90, 200, 120, 0.45)";
      ctx.fillRect(boardX + c * cell, boardY + r * cell, cell, cell);
    }
    // Highlight legal targets.
    for (const m of this.targets) {
      const cx = boardX + m.c * cell + cell / 2;
      const cy = boardY + m.r * cell + cell / 2;
      const capture = this.board[m.r][m.c] || m.enpassant;
      ctx.fillStyle = "rgba(40, 120, 60, 0.55)";
      ctx.beginPath();
      ctx.arc(cx, cy, capture ? cell * 0.42 : cell * 0.16, 0, Math.PI * 2);
      if (capture) {
        ctx.lineWidth = 4;
        ctx.strokeStyle = "rgba(40, 120, 60, 0.75)";
        ctx.stroke();
      } else {
        ctx.fill();
      }
    }

    // Pieces.
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `${cell * 0.78}px 'Segoe UI Symbol', 'Noto Sans Symbols2', sans-serif`;
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const p = this.board[r][c];
        if (!p) continue;
        const x = boardX + c * cell + cell / 2;
        const y = boardY + r * cell + cell / 2 + 2;
        ctx.fillStyle = colorOf(p) === "w" ? "#fdfdfd" : "#1c1c1c";
        ctx.strokeStyle = colorOf(p) === "w" ? "#333" : "#000";
        ctx.lineWidth = 1;
        ctx.strokeText(GLYPH[p], x, y);
        ctx.fillText(GLYPH[p], x, y);
      }
    }
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";

    // 차례/승패 — 게임 화면 상단 중앙(인게임 HUD).
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = this.gameOver ? "#ffd54f" : "#e8eefc";
    ctx.font = "bold 18px 'Noto Sans KR', sans-serif";
    ctx.fillText(this.status, this.width / 2, boardY / 2);
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
  }
}
