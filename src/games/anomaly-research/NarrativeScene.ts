import { AudioManager } from "../../engine/audio/AudioManager";
import { Keyboard } from "../../engine/input/Keyboard";
import { CanvasScene } from "../../engine/render/CanvasScene";
import { Button } from "../../engine/ui/Button";
import { Column } from "../../engine/ui/Column";
import { Label } from "../../engine/ui/Label";
import { Panel } from "../../engine/ui/Panel";
import { Row } from "../../engine/ui/Row";
import { Slider } from "../../engine/ui/Slider";
import { Toggle } from "../../engine/ui/Toggle";
import { UI } from "../../engine/ui/UI";
import { PLAYER_CHARACTER_ID } from "./StoryState";
import { StoryRunner } from "./StoryRunner";

const REVEAL_CHARS_PER_SEC = 42;
const FADE_PER_SEC = 4;
const INVENTORY_SLOTS = 4;
const STAT_PIPS = 5;
const LOG_ROW_HEIGHT = 36;
const LOG_ROW_GAP = 6;
const ROSTER_CARD_WIDTH = 76;
const ROSTER_CARD_HEIGHT = 92;
const ROSTER_CARD_GAP = 8;

/**
 * 괴이 연구소 — 내러티브 씬 (Blue Print.md §3, §9, UI 2026-07-10 재설계 — 참고
 * 게임 "감정의 바다" 실제 플레이 영상 캡처 반영).
 *
 * `StoryRunner`가 상태/전이를 소유하고, 이 씬은 순수 표현 계층. 레이아웃 4분면:
 * 좌측 소지품 슬롯 / 중앙 상단 낭독 패널 + 캐릭터 로스터 스트립 + 하단 캐릭터
 * 상세(심박·경고등·상태) / 우측 로그 — 선택지는 별도 그리드가 아니라 로그 맨
 * 아래에 이어지는 클릭 가능한 줄로 통합했다. ⚙ 버튼으로 설정(전체화면/음량/
 * 대사 속도) 모달을 연다. 삽화 에셋이 없어 씬 패널은 계속 텍스트를 담당한다.
 */
export class NarrativeScene extends CanvasScene {
  private readonly runner = new StoryRunner();
  private readonly ui = new UI();
  private readonly keyboard = Keyboard.instance;

  private readonly leftPanel: Panel;
  private readonly narrativePanel: Panel;
  private readonly rosterPanel: Panel;
  private readonly lowerPanel: Panel;
  private readonly rightPanel: Panel;

  private readonly choiceArea: Column;
  private readonly rosterArea: Row;
  private readonly settingsButton: Button;
  private readonly scrimPanel: Panel;
  private readonly settingsGroup: Panel;
  private readonly fullscreenToggle: Toggle;

  private shownPassageId = "";
  private revealedChars = 0;
  private textAlpha = 0;
  private choicesBuilt = false;
  private elapsed = 0;
  private lastCharacterCount = 0;
  private selectedCharacterId = PLAYER_CHARACTER_ID;
  private settingsOpen = false;
  private revealSpeedMultiplier = 1;

  constructor(width: number, height: number) {
    super(width, height);

    this.leftPanel = this.ui.add(new Panel(16, 16, 64, 508));
    this.narrativePanel = this.ui.add(new Panel(96, 16, 560, 200));
    this.rosterPanel = this.ui.add(new Panel(96, 224, 560, 100));
    this.lowerPanel = this.ui.add(new Panel(96, 332, 560, 192));
    this.rightPanel = this.ui.add(new Panel(672, 16, 272, 508));

    this.choiceArea = this.rightPanel.addChild(new Column(8, 0, this.rightPanel.width - 16, { gap: LOG_ROW_GAP }));
    this.rosterArea = this.ui.add(
      new Row(this.rosterPanel.worldX + 10, this.rosterPanel.worldY + 10, { gap: ROSTER_CARD_GAP }),
    );

    this.settingsButton = this.ui.add(
      new Button(this.narrativePanel.x + 8, this.narrativePanel.y + 8, 32, 28, "⚙", {
        color: "rgba(234, 241, 255, 0.08)",
        hoverColor: "rgba(234, 241, 255, 0.2)",
        activeColor: "rgba(234, 241, 255, 0.3)",
        textColor: "#eaf1ff",
        font: "16px Pretendard, sans-serif",
      }),
    );
    this.settingsButton.onClick(() => this.openSettings());

    this.scrimPanel = this.ui.add(new Panel(0, 0, width, height, { color: "rgba(4, 6, 10, 0.65)", borderWidth: 0 }));
    this.scrimPanel.visible = false;

    const modalWidth = 400;
    const modalHeight = 224;
    const modalX = (width - modalWidth) / 2;
    const modalY = (height - modalHeight) / 2;
    this.settingsGroup = this.ui.add(
      new Panel(modalX, modalY, modalWidth, modalHeight, { color: "#131a26", borderColor: "#2b3a55", borderWidth: 1 }),
    );
    this.settingsGroup.visible = false;

    this.settingsGroup.addChild(
      new Label(20, 16, "설정", { color: "#eaf1ff", font: "bold 18px Pretendard, sans-serif" }),
    );

    this.fullscreenToggle = this.settingsGroup.addChild(
      new Toggle(20, 56, 20, "전체화면", typeof document !== "undefined" && !!document.fullscreenElement),
    );
    this.fullscreenToggle.onChange((checked) => {
      if (checked) {
        void document.documentElement.requestFullscreen?.().catch(() => {});
      } else {
        void document.exitFullscreen?.().catch(() => {});
      }
    });
    if (typeof document !== "undefined") {
      document.addEventListener("fullscreenchange", () => {
        this.fullscreenToggle.checked = !!document.fullscreenElement;
      });
    }

    this.settingsGroup.addChild(new Label(20, 92, "음량", { color: "#a6bbd2", font: "13px Pretendard, sans-serif" }));
    const volumeSlider = this.settingsGroup.addChild(
      new Slider(100, 90, 260, 14, 0, 1, AudioManager.instance.masterVolume),
    );
    volumeSlider.onChange((value) => {
      AudioManager.instance.masterVolume = value;
    });

    this.settingsGroup.addChild(
      new Label(20, 132, "대사 속도", { color: "#a6bbd2", font: "13px Pretendard, sans-serif" }),
    );
    const speedSlider = this.settingsGroup.addChild(new Slider(100, 130, 260, 14, 0.5, 2, 1));
    speedSlider.onChange((value) => {
      this.revealSpeedMultiplier = value;
    });

    const closeButton = this.settingsGroup.addChild(new Button(150, 172, 100, 36, "닫기"));
    closeButton.onClick(() => this.closeSettings());
  }

  override update(deltaTime: number): void {
    super.update(deltaTime);
    this.elapsed += deltaTime;

    // 1) 포인터 입력을 먼저 처리 — runner 상태가 이 안에서 바뀔 수 있다.
    this.ui.update(deltaTime);

    // 2) 플레이어 본인의 로스터 카드 상태문구를 상태이상 배열과 동기화.
    const player = this.runner.state.characters.find((c) => c.id === PLAYER_CHARACTER_ID);
    if (player) {
      player.condition = this.runner.state.status.join(", ") || "정상";
    }
    this.syncRosterButtons();

    // 3) 노드가 바뀌었으면 타자기/페이드를 리셋하고 선택지 목록을 비운다.
    const passage = this.runner.current;
    if (passage.id !== this.shownPassageId) {
      this.shownPassageId = passage.id;
      this.revealedChars = 0;
      this.textAlpha = 0;
      this.choicesBuilt = false;
      this.choiceArea.children.length = 0;
      this.choiceArea.y = this.rightPanel.height - 8; // 선택지 없는 동안 로그가 전체 공간을 쓰게.
    }

    // 4) 타자기 진행 + 페이드 인 (설정에서 조절한 배속 반영).
    const fullLength = passage.text.length;
    if (this.revealedChars < fullLength) {
      this.revealedChars = Math.min(
        fullLength,
        this.revealedChars + deltaTime * REVEAL_CHARS_PER_SEC * this.revealSpeedMultiplier,
      );
    }
    this.textAlpha = Math.min(1, this.textAlpha + deltaTime * FADE_PER_SEC);
    const typingDone = this.revealedChars >= fullLength;

    // 5) 낭독이 끝나면 선택지(로그 하단 항목)를 한 번만 만든다.
    if (typingDone && !this.choicesBuilt) {
      this.buildChoiceButtons();
      this.choicesBuilt = true;
    }

    if (this.settingsOpen) {
      if (this.keyboard.wasPressed("Escape")) {
        this.closeSettings();
      }
      return; // 설정 모달이 열려 있는 동안은 게임 진행 입력을 받지 않는다.
    }

    // 6) 키보드: Space/Enter로 타이핑 스킵 또는 진행, 숫자키 1~6으로 선택.
    if (this.keyboard.wasPressed(" ") || this.keyboard.wasPressed("Enter")) {
      if (!typingDone) {
        this.revealedChars = fullLength;
      } else if (!this.runner.isEnding && !this.runner.hasChoices) {
        this.runner.advance();
      }
    }
    if (typingDone && !this.runner.isEnding) {
      const choices = this.runner.choices;
      for (let i = 0; i < choices.length && i < 6; i++) {
        if (this.keyboard.wasPressed(String(i + 1))) {
          this.runner.choose(choices[i].id);
        }
      }
    }
  }

  private openSettings(): void {
    this.settingsOpen = true;
    this.scrimPanel.visible = true;
    this.settingsGroup.visible = true;
    this.choiceArea.visible = false;
    this.rosterArea.visible = false;
  }

  private closeSettings(): void {
    this.settingsOpen = false;
    this.scrimPanel.visible = false;
    this.settingsGroup.visible = false;
    this.choiceArea.visible = true;
    this.rosterArea.visible = true;
  }

  /** 선택지를 로그와 같은 스타일의 클릭 가능한 줄로 만들어 우측 패널 하단에 이어붙인다. */
  private buildChoiceButtons(): void {
    this.choiceArea.children.length = 0;
    const passage = this.runner.current;
    const rowWidth = this.choiceArea.width;
    const rowStyle = {
      color: "rgba(234, 241, 255, 0.06)",
      hoverColor: "rgba(90, 127, 192, 0.35)",
      activeColor: "rgba(90, 127, 192, 0.55)",
      textColor: "#eaf1ff",
      font: "13px Pretendard, sans-serif",
      textAlign: "left" as const,
      textPadding: 12,
    };

    const addRow = (label: string, action: () => void): void => {
      const button = this.choiceArea.addChild(new Button(0, 0, rowWidth, LOG_ROW_HEIGHT, label, rowStyle));
      button.onClick(action);
    };

    if (passage.ending) {
      addRow("▸ 다시 시작", () => this.runner.restart());
    } else {
      const choices = this.runner.choices;
      if (choices.length === 0) {
        addRow("▸ 계속 (Space)", () => this.runner.advance());
      } else {
        choices.forEach((choice, index) => {
          addRow(`▸ ${index + 1}) ${choice.label}`, () => this.runner.choose(choice.id));
        });
      }
    }

    this.choiceArea.reflow();
    // 선택지 블록을 우측 패널 하단에 붙이고, 로그는 그 위 남는 공간을 쓴다.
    this.choiceArea.y = this.rightPanel.height - 8 - this.choiceArea.height;
  }

  /** 캐릭터 로스터가 늘어나면 클릭 가능한 카드 버튼(투명 히트박스, 실제 그림은 render에서)을 새로 만든다. */
  private syncRosterButtons(): void {
    const characters = this.runner.state.characters;
    if (characters.length === this.lastCharacterCount) {
      return;
    }
    this.lastCharacterCount = characters.length;
    this.rosterArea.children.length = 0;
    for (const character of characters) {
      const button = this.rosterArea.addChild(
        new Button(0, 0, ROSTER_CARD_WIDTH, ROSTER_CARD_HEIGHT, "", {
          color: "rgba(234, 241, 255, 0.06)",
          hoverColor: "rgba(90, 127, 192, 0.25)",
          activeColor: "rgba(90, 127, 192, 0.4)",
        }),
      );
      button.onClick(() => {
        this.selectedCharacterId = character.id;
      });
    }
    this.rosterArea.reflow();
  }

  override render(ctx: CanvasRenderingContext2D): void {
    this.clear(ctx, "#0b0d12");
    this.ui.render(ctx);
    if (!this.settingsOpen) {
      this.renderNarrativeText(ctx);
      this.renderLeftColumn(ctx);
      this.renderRosterStrip(ctx);
      this.renderCharacterDetail(ctx);
      this.renderRightColumn(ctx);
    }
  }

  private renderNarrativeText(ctx: CanvasRenderingContext2D): void {
    const passage = this.runner.current;
    const revealed = passage.text.slice(0, Math.floor(this.revealedChars));

    ctx.save();
    ctx.globalAlpha = this.textAlpha;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";

    const innerX = this.narrativePanel.worldX + 20;
    let innerY = this.narrativePanel.worldY + 44; // ⚙ 버튼 아래로 내려서 겹치지 않게.

    if (passage.ending) {
      ctx.fillStyle = "#ffd54f";
      ctx.font = "bold 20px Pretendard, sans-serif";
      ctx.fillText(passage.endingTitle ?? "", innerX, innerY);
      innerY += 32;
    }

    ctx.fillStyle = "#eaf1ff";
    ctx.font = "17px Pretendard, sans-serif";
    const maxWidth = this.narrativePanel.width - 40;
    for (const line of this.wrapText(ctx, revealed, maxWidth)) {
      ctx.fillText(line, innerX, innerY);
      innerY += 25;
    }
    ctx.restore();
  }

  /** 좌측 컬럼: 소지품 슬롯 4칸. */
  private renderLeftColumn(ctx: CanvasRenderingContext2D): void {
    const x = this.leftPanel.worldX;
    const y = this.leftPanel.worldY;
    const inventory = this.runner.state.inventory;
    const slotSize = 48;
    const slotGap = 10;
    const slotsTop = y + 30;

    ctx.save();
    ctx.fillStyle = "#a6bbd2";
    ctx.font = "11px Pretendard, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText("소지품", x + this.leftPanel.width / 2, y + 8);

    for (let i = 0; i < INVENTORY_SLOTS; i++) {
      const sy = slotsTop + i * (slotSize + slotGap);
      const item = inventory[i];
      ctx.fillStyle = item ? "rgba(234, 241, 255, 0.14)" : "rgba(234, 241, 255, 0.04)";
      ctx.strokeStyle = item ? "#5a7fc0" : "#2b3a55";
      ctx.lineWidth = 1;
      ctx.fillRect(x + 8, sy, slotSize, slotSize);
      ctx.strokeRect(x + 8, sy, slotSize, slotSize);
      if (item) {
        ctx.fillStyle = "#eaf1ff";
        ctx.font = "11px Pretendard, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(item.length > 4 ? `${item.slice(0, 4)}…` : item, x + 8 + slotSize / 2, sy + slotSize / 2);
      }
    }
    if (inventory.length > INVENTORY_SLOTS) {
      const lastY = slotsTop + (INVENTORY_SLOTS - 1) * (slotSize + slotGap);
      ctx.fillStyle = "#ffd54f";
      ctx.font = "bold 11px Pretendard, sans-serif";
      ctx.textAlign = "right";
      ctx.textBaseline = "bottom";
      ctx.fillText(`+${inventory.length - INVENTORY_SLOTS}`, x + 8 + slotSize - 3, lastY + slotSize - 3);
    }
    ctx.restore();
  }

  /** 씬 패널 아래: 등장한 캐릭터를 카드로 걸어놓은 스트립 (클릭 시 하단 상세 전환). */
  private renderRosterStrip(ctx: CanvasRenderingContext2D): void {
    const characters = this.runner.state.characters;
    const buttons = this.rosterArea.children;

    ctx.save();
    ctx.fillStyle = "#a6bbd2";
    ctx.font = "11px Pretendard, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText("등장인물", this.rosterPanel.worldX + 10, this.rosterPanel.worldY - 14);

    for (let i = 0; i < characters.length && i < buttons.length; i++) {
      const character = characters[i];
      const button = buttons[i];
      const x = button.worldX;
      const y = button.worldY;
      const selected = character.id === this.selectedCharacterId;

      ctx.fillStyle = selected ? "rgba(255, 213, 79, 0.14)" : "rgba(234, 241, 255, 0.05)";
      ctx.strokeStyle = selected ? "#ffd54f" : "#2b3a55";
      ctx.lineWidth = selected ? 2 : 1;
      ctx.fillRect(x, y, button.width, button.height);
      ctx.strokeRect(x, y, button.width, button.height);

      ctx.fillStyle = "rgba(234, 241, 255, 0.08)";
      ctx.fillRect(x + 10, y + 10, button.width - 20, button.height - 44);

      ctx.fillStyle = "#8ea0bd";
      ctx.font = "10px Pretendard, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText(character.role, x + button.width / 2, y + button.height - 30);

      ctx.fillStyle = "#eaf1ff";
      ctx.font = "bold 11px Pretendard, sans-serif";
      ctx.fillText(character.name, x + button.width / 2, y + button.height - 18);
    }
    ctx.restore();
  }

  /** 하단 패널: 선택된 캐릭터의 이름/역할 + 심박 애니메이션 + 경고등 + 상태문구 (+플레이어면 HP/정신/능력). */
  private renderCharacterDetail(ctx: CanvasRenderingContext2D): void {
    const x = this.lowerPanel.worldX;
    const y = this.lowerPanel.worldY;
    const width = this.lowerPanel.width;
    const character =
      this.runner.state.characters.find((c) => c.id === this.selectedCharacterId) ?? this.runner.state.characters[0];

    ctx.save();
    ctx.textBaseline = "top";
    ctx.textAlign = "left";
    ctx.fillStyle = "#eaf1ff";
    ctx.font = "bold 16px Pretendard, sans-serif";
    ctx.fillText(character.name, x + 16, y + 14);
    ctx.fillStyle = "#a6bbd2";
    ctx.font = "12px Pretendard, sans-serif";
    ctx.fillText(character.role, x + 16, y + 36);

    // 심박 그래프.
    const waveX = x + 16;
    const waveY = y + 60;
    const waveWidth = width - 32 - 90;
    const waveHeight = 40;
    ctx.fillStyle = "#05070b";
    ctx.fillRect(waveX, waveY, waveWidth, waveHeight);
    ctx.strokeStyle = "#5ad19b";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    const points = 48;
    for (let i = 0; i <= points; i++) {
      const t = i / points;
      const px = waveX + t * waveWidth;
      const phase = this.elapsed * 2.4 + t * 10;
      const spike = (i + Math.floor(this.elapsed * 6)) % 12 === 0 ? 1 : 0.08;
      const pulse = Math.sin(phase) * 0.25 + Math.sin(phase * 4) * spike;
      const py = waveY + waveHeight / 2 - pulse * (waveHeight / 2 - 4);
      if (i === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.stroke();

    // 경고등 3개 — 상태 심각도에 따라 점등.
    const severity = this.conditionSeverity(character.condition);
    const dotSize = 12;
    for (let i = 0; i < 3; i++) {
      const dx = waveX + waveWidth + 14 + i * (dotSize + 6);
      ctx.beginPath();
      ctx.fillStyle = i < severity ? "#e6584e" : "#2b3a55";
      ctx.arc(dx + dotSize / 2, waveY + waveHeight / 2, dotSize / 2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = "#c7d3e8";
    ctx.font = "13px Pretendard, sans-serif";
    ctx.fillText(`상태: ${character.condition}`, x + 16, waveY + waveHeight + 12);

    if (character.id === PLAYER_CHARACTER_ID) {
      const stats = this.runner.state.stats;
      const abilities = this.runner.state.abilities;
      this.renderPipGauge(ctx, x + 16, waveY + waveHeight + 42, "HP", stats.hp, "#e6584e");
      this.renderPipGauge(ctx, x + 200, waveY + waveHeight + 42, "정신", stats.정신, "#7bdff6");
      ctx.fillStyle = "#8ea0bd";
      ctx.font = "12px Pretendard, sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(`속도 ${abilities.속도} · 인지 ${abilities.인지}`, x + width - 16, waveY + waveHeight + 36);
    }
    ctx.restore();
  }

  /** 상태문구 키워드로 경고등 점등 개수(0~3)를 대충 매긴다. */
  private conditionSeverity(condition: string): number {
    if (/폭주|사망/.test(condition)) {
      return 3;
    }
    if (/부상|기절|경계/.test(condition)) {
      return 2;
    }
    if (/출혈|불안/.test(condition)) {
      return 1;
    }
    return 0;
  }

  /** `x,y`(세로 중앙)에서 시작하는 라벨 + 5칸 핍 게이지 (100/STAT_PIPS 단위로 채움). */
  private renderPipGauge(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    label: string,
    value: number,
    color: string,
  ): void {
    ctx.fillStyle = "#a6bbd2";
    ctx.font = "12px Pretendard, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(label, x, y);

    const pipSize = 12;
    const pipGap = 4;
    const filled = Math.round((value / 100) * STAT_PIPS);
    const startX = x + 32;
    for (let i = 0; i < STAT_PIPS; i++) {
      const px = startX + i * (pipSize + pipGap);
      ctx.fillStyle = i < filled ? color : "#1a2233";
      ctx.strokeStyle = "#2b3a55";
      ctx.fillRect(px, y - pipSize / 2, pipSize, pipSize);
      ctx.strokeRect(px, y - pipSize / 2, pipSize, pipSize);
    }
  }

  /** 우측 컬럼: 진행 기록 로그. 선택지 블록(choiceArea, UI 트리)이 차지하는 만큼 위쪽만 채운다. */
  private renderRightColumn(ctx: CanvasRenderingContext2D): void {
    const x = this.rightPanel.worldX;
    const y = this.rightPanel.worldY;
    const width = this.rightPanel.width;

    ctx.save();
    ctx.fillStyle = "#a6bbd2";
    ctx.font = "bold 13px Pretendard, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText("기록", x + 12, y + 10);

    const logTop = y + 34;
    const choiceTop = y + this.choiceArea.y;
    const logBottom = choiceTop - 8;
    const rowStep = LOG_ROW_HEIGHT + LOG_ROW_GAP;
    const maxLines = Math.max(0, Math.floor((logBottom - logTop + LOG_ROW_GAP) / rowStep));
    const lines = this.runner.recentLog(maxLines);

    let rowY = logTop;
    for (const line of lines) {
      ctx.fillStyle = "rgba(234, 241, 255, 0.05)";
      ctx.fillRect(x + 8, rowY, width - 16, LOG_ROW_HEIGHT);

      ctx.fillStyle = "#c7d3e8";
      ctx.font = "13px Pretendard, sans-serif";
      ctx.textBaseline = "middle";
      const display = line.length > 22 ? `${line.slice(0, 22)}…` : line;
      ctx.fillText(display, x + 16, rowY + LOG_ROW_HEIGHT / 2);
      rowY += rowStep;
    }
    ctx.restore();
  }

  /** Greedy word-wrap (splits on spaces; falls back to raw text if a single word overflows). */
  private wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
    const lines: string[] = [];
    for (const paragraph of text.split("\n")) {
      const words = paragraph.split(" ");
      let line = "";
      for (const word of words) {
        const candidate = line ? `${line} ${word}` : word;
        if (line && ctx.measureText(candidate).width > maxWidth) {
          lines.push(line);
          line = word;
        } else {
          line = candidate;
        }
      }
      lines.push(line);
    }
    return lines;
  }
}
