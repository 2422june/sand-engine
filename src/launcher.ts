import "./style.css";

/** The launcher lists every game page. Add a game here + its own HTML entry. */
type LauncherEntry = { title: string; href: string; desc: string };

const GAMES: LauncherEntry[] = [
  { title: "MindHack (엔진 데모)", href: "./mindhack.html", desc: "입력·조명·오디오·충돌 종합 데모" },
  { title: "테트리스", href: "./tetris.html", desc: "회전·라인클리어·레벨" },
  { title: "체스 (2인)", href: "./chess.html", desc: "체크메이트·캐슬링·앙파상·승격" },
  { title: "체커 (2인)", href: "./checkers.html", desc: "잡기 강제·연속 점프·킹" },
  { title: "길건너 친구들", href: "./crossy.html", desc: "절차적 차선·자동차 피하기" },
  { title: "괴이 연구소", href: "./anomaly-research.html", desc: "내러티브 선택형 어드벤처 (프로토타입)" },
];

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) {
  throw new Error("App root not found");
}

const shell = document.createElement("main");
shell.className = "shell";
shell.innerHTML = `
  <h1>Web 2D Game Engine</h1>
  <p>OOP · 작은 모듈 · 재사용 파일. 게임별 독립 엔트리로 빌드돼.</p>
  <nav class="launcher-grid"></nav>
`;

const grid = shell.querySelector<HTMLElement>(".launcher-grid");
if (!grid) {
  throw new Error("Launcher grid not found");
}

for (const entry of GAMES) {
  const card = document.createElement("a");
  card.className = "launcher-card";
  card.href = entry.href;
  card.innerHTML = `
    <span class="launcher-card__title">${entry.title}</span>
    <span class="launcher-card__desc">${entry.desc}</span>
  `;
  grid.append(card);
}

app.append(shell);
