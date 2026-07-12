import { AudioManager } from "../../engine/audio/AudioManager";
import { Keyboard } from "../../engine/input/Keyboard";
import { Mouse } from "../../engine/input/Mouse";
import { CanvasScene } from "../../engine/render/CanvasScene";
import { drawImageCover, isImageReady, loadImage } from "../../engine/render/ImageCache";
import { Button } from "../../engine/ui/Button";
import { Column } from "../../engine/ui/Column";
import { Label } from "../../engine/ui/Label";
import { Panel } from "../../engine/ui/Panel";
import { ProgressBar } from "../../engine/ui/ProgressBar";
import { Slider } from "../../engine/ui/Slider";
import { Toggle } from "../../engine/ui/Toggle";
import { UI } from "../../engine/ui/UI";
import cardBlankUrl from "./assets/card-blank.png";
import frameConsoleUrl from "./assets/frame-console.png";
import idcardPlayerUrl from "./assets/idcard-player.png";
import portraitAnomalyUrl from "./assets/portrait-anomaly.png";
import portraitBlankUrl from "./assets/portrait-blank.png";
import portraitPlayerHairUrl from "./assets/portrait-player-hair.png";
import sceneFacilityUrl from "./assets/scene-facility.png";
import sceneForestUrl from "./assets/scene-forest.png";
import screenMonitorUrl from "./assets/screen-monitor.png";
import { PLAYER_CHARACTER_ID } from "./StoryState";
import { StoryRunner } from "./StoryRunner";

const ANOMALY_CHARACTER_ID = "anomaly";

// §15 실제 아트 소스 → 에셋. 프레임 배경(관제실 chrome) + 장면/모니터/카드.
const FRAME_CONSOLE_IMG = loadImage(frameConsoleUrl);
const SCREEN_MONITOR_IMG = loadImage(screenMonitorUrl);
const SCENE_FOREST_IMG = loadImage(sceneForestUrl);
const SCENE_FACILITY_IMG = loadImage(sceneFacilityUrl);
const IDCARD_PLAYER_IMG = loadImage(idcardPlayerUrl);
const CARD_BLANK_IMG = loadImage(cardBlankUrl);
const PORTRAIT_BLANK_IMG = loadImage(portraitBlankUrl);
const PORTRAIT_HAIR_IMG = loadImage(portraitPlayerHairUrl);
const PORTRAIT_ANOMALY_IMG = loadImage(portraitAnomalyUrl);

const REVEAL_CHARS_PER_SEC = 42;
const FADE_PER_SEC = 4;
const LOG_HISTORY_ROWS = 4;
const LOG_ROW_HEIGHT = 34;
const LOG_ROW_GAP = 6;

type Rect = { x: number; y: number; w: number; h: number };

// §18 업무노트/보고서 폼 — 괴물 연구부·제2지부 분류 필드(드롭다운은 클릭 시 값 순환).
const REPORT_FIELDS: { key: string; options: string[] }[] = [
  { key: "등급", options: ["미정", "1급", "2급", "3급", "격리"] },
  { key: "외형", options: ["미정", "인간형", "혼합형", "무정형"] },
  { key: "감정 유형", options: ["미정", "공포", "분노", "슬픔", "무(無)"] },
  { key: "관리법", options: ["미정", "격리", "구속", "소각", "회유"] },
  { key: "행동", options: ["미정", "수동적", "능동적", "적대적"] },
];

/**
 * 괴이 연구소 — 내러티브 씬 (Blue Print.md §9 관제실 레이아웃 v0.3 · §15 실제 에셋).
 *
 * 배경은 `frame-console.png`(1920×1080 → 캔버스 960×540에 0.5배 정확히 정렬)이 관제실
 * chrome을 담당하고, 그 구멍마다 콘텐츠를 얹는다:
 *  - 좌상단 대형 모니터 = 장면 일러스트(`scene-forest`/`scene-facility`).
 *  - 우측 = 이벤트 로그(`screen-monitor` 베젤 위) — 지난 기록 + 현재 낭독(타자기) + 선택지.
 *  - 좌하단 프레임 = 관리자 ID 카드(`idcard-player`).
 *  - 하단중앙 장치 = 바이탈(hp/정신 게이지 · 심박선 · 경고등 3).
 *  - 인물 등장 시 하단에 카드 레일(`card-blank`+초상) 오버레이.
 *
 * `StoryRunner`가 상태/전이를 소유하고 이 씬은 순수 표현 계층. ⚙ 버튼으로 설정
 * (전체화면/음량/대사 속도) 모달을 연다.
 */
export class NarrativeScene extends CanvasScene {
  private readonly runner = new StoryRunner();
  private readonly ui = new UI();
  private readonly keyboard = Keyboard.instance;
  private readonly mouse = Mouse.instance;

  // frame-console.png 구멍에 맞춘 콘텐츠 영역 (캔버스 크기에 비례).
  private readonly sceneRegion: Rect;
  private readonly logRegion: Rect;
  private readonly idRegion: Rect;
  private readonly deviceRegion: Rect;

  private readonly choiceArea: Column;
  private readonly hpBar: ProgressBar;
  private readonly sanityBar: ProgressBar;
  private readonly settingsButton: Button;
  private readonly scrimPanel: Panel;
  private readonly settingsGroup: Panel;
  private readonly fullscreenToggle: Toggle;

  private shownPassageId = "";
  private revealedChars = 0;
  private textAlpha = 0;
  private choicesBuilt = false;
  private elapsed = 0;
  private settingsOpen = false;
  private revealSpeedMultiplier = 1;
  private reportOpen = false;
  private readonly reportSel = REPORT_FIELDS.map(() => 0);
  private reportSubmitted = false;

  constructor(width: number, height: number) {
    super(width, height);

    const rx = (fx: number): number => Math.round(fx * width);
    const ry = (fy: number): number => Math.round(fy * height);
    // 아래 분수는 1920×1080 프레임 아트에서 잰 각 구멍의 상대 위치.
    this.sceneRegion = { x: rx(0.071), y: ry(0.024), w: rx(0.479), h: ry(0.596) };
    this.logRegion = { x: rx(0.579), y: ry(0.030), w: rx(0.406), h: ry(0.940) };
    this.idRegion = { x: rx(0.018), y: ry(0.648), w: rx(0.185), h: ry(0.330) };
    this.deviceRegion = { x: rx(0.230), y: ry(0.655), w: rx(0.300), h: ry(0.320) };

    const logPad = 10;
    this.choiceArea = this.ui.add(
      new Column(this.logRegion.x + logPad, 0, this.logRegion.w - logPad * 2, { gap: LOG_ROW_GAP }),
    );

    // 바이탈 게이지는 엔진 `ProgressBar` 재사용(Rule Book 「재사용 우선」). 장치 영역에 배치되고
    // scrimPanel보다 먼저 add 되어 설정 모달이 열리면 스크림에 가려진다.
    const dr = this.deviceRegion;
    const barX = dr.x + 40;
    const barW = dr.w - 20 - 30;
    const barY = dr.y + 52;
    this.hpBar = this.ui.add(new ProgressBar(barX, barY, barW, 12, 100, 100, { fillColor: "#e6584e" }));
    this.sanityBar = this.ui.add(new ProgressBar(barX, barY + 22, barW, 12, 100, 100, { fillColor: "#7bdff6" }));

    this.settingsButton = this.ui.add(
      new Button(12, 12, 34, 30, "⚙", {
        color: "rgba(20, 24, 32, 0.55)",
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

    // 와이어프레임/§6: 저장하기 · 나가기 (창모드는 위 전체화면 토글이 담당 — 끄면 창).
    const saveButton = this.settingsGroup.addChild(new Button(70, 172, 110, 36, "저장하기"));
    saveButton.onClick(() => this.closeSettings());
    const exitButton = this.settingsGroup.addChild(new Button(220, 172, 110, 36, "나가기"));
    exitButton.onClick(() => this.closeSettings());
  }

  override update(deltaTime: number): void {
    super.update(deltaTime);
    this.elapsed += deltaTime;

    // 1) 포인터 입력을 먼저 처리 — runner 상태가 이 안에서 바뀔 수 있다.
    this.ui.update(deltaTime);
    this.handleReportPointer(); // 업무노트 토글/폼 클릭 (§18)

    // 2) 플레이어 로스터 상태문구를 상태이상 배열과 동기화.
    const player = this.runner.state.characters.find((c) => c.id === PLAYER_CHARACTER_ID);
    if (player) {
      player.condition = this.runner.state.status.join(", ") || "정상";
    }
    this.hpBar.value = this.runner.state.stats.hp;
    this.sanityBar.value = this.runner.state.stats.정신;

    // 3) 노드가 바뀌었으면 타자기/페이드를 리셋하고 선택지 목록을 비운다.
    const passage = this.runner.current;
    if (passage.id !== this.shownPassageId) {
      this.shownPassageId = passage.id;
      this.revealedChars = 0;
      this.textAlpha = 0;
      this.choicesBuilt = false;
      this.choiceArea.children.length = 0;
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
    //    업무노트(보고서 폼)가 열려 있으면 진행 입력을 받지 않는다.
    if (!this.reportOpen) {
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
  }

  // ── 업무노트/보고서 폼 (§18) ───────────────────────────────────────────────

  private tabletTabRect(): Rect {
    const r = this.logRegion;
    return { x: r.x + r.w - 96, y: r.y + 4, w: 88, h: 26 };
  }

  private reportFieldRect(i: number): Rect {
    const r = this.logRegion;
    const pad = 14;
    const rowH = 34;
    const gap = 8;
    const top = r.y + 74;
    return { x: r.x + pad, y: top + i * (rowH + gap), w: r.w - pad * 2, h: rowH };
  }

  private reportActionRects(): { back: Rect; submit: Rect } {
    const r = this.logRegion;
    const pad = 14;
    const by = r.y + r.h - 46;
    const bw = (r.w - pad * 2 - 10) / 2;
    return {
      back: { x: r.x + pad, y: by, w: bw, h: 36 },
      submit: { x: r.x + pad + bw + 10, y: by, w: bw, h: 36 },
    };
  }

  /** 업무노트 탭 토글 + (열렸을 때) 필드 순환/액션 버튼 클릭 처리. */
  private handleReportPointer(): void {
    if (this.settingsOpen || !this.mouse.wasPressed(0)) {
      return;
    }
    const mx = this.mouse.x;
    const my = this.mouse.y;
    const tab = this.tabletTabRect();
    if (Mouse.hit(mx, my, tab.x, tab.y, tab.w, tab.h)) {
      this.reportOpen = !this.reportOpen;
      this.choiceArea.visible = !this.reportOpen;
      return;
    }
    if (!this.reportOpen) {
      return;
    }
    for (let i = 0; i < REPORT_FIELDS.length; i++) {
      const fr = this.reportFieldRect(i);
      if (Mouse.hit(mx, my, fr.x, fr.y, fr.w, fr.h)) {
        this.reportSel[i] = (this.reportSel[i] + 1) % REPORT_FIELDS[i].options.length;
        return;
      }
    }
    const a = this.reportActionRects();
    if (Mouse.hit(mx, my, a.back.x, a.back.y, a.back.w, a.back.h)) {
      this.reportOpen = false;
      this.choiceArea.visible = true;
    } else if (Mouse.hit(mx, my, a.submit.x, a.submit.y, a.submit.w, a.submit.h)) {
      this.reportSubmitted = true;
      this.reportOpen = false;
      this.choiceArea.visible = true;
    }
  }

  private openSettings(): void {
    this.settingsOpen = true;
    this.scrimPanel.visible = true;
    this.settingsGroup.visible = true;
    this.choiceArea.visible = false;
  }

  private closeSettings(): void {
    this.settingsOpen = false;
    this.scrimPanel.visible = false;
    this.settingsGroup.visible = false;
    this.choiceArea.visible = true;
  }

  /** 선택지를 로그와 같은 스타일의 클릭 가능한 줄로 만들어 로그 영역 하단에 이어붙인다. */
  private buildChoiceButtons(): void {
    this.choiceArea.children.length = 0;
    const passage = this.runner.current;
    const rowWidth = this.choiceArea.width;
    const rowStyle = {
      color: "rgba(120, 150, 200, 0.16)",
      hoverColor: "rgba(90, 127, 192, 0.4)",
      activeColor: "rgba(90, 127, 192, 0.6)",
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
    // 선택지 블록을 로그 영역 하단에 붙인다.
    this.choiceArea.y = this.logRegion.y + this.logRegion.h - 12 - this.choiceArea.height;
  }

  override render(ctx: CanvasRenderingContext2D): void {
    this.clear(ctx, "#08090d");

    // 관제실 프레임 배경 (그림 준비 전엔 어두운 바탕 유지).
    if (isImageReady(FRAME_CONSOLE_IMG)) {
      drawImageCover(ctx, FRAME_CONSOLE_IMG, 0, 0, this.width, this.height);
    }

    if (!this.settingsOpen) {
      this.renderScene(ctx);
      this.renderIdCard(ctx);
      this.renderDevice(ctx);
      if (this.reportOpen) {
        this.renderReport(ctx);
      } else {
        this.renderLog(ctx);
      }
      this.renderTabletTab(ctx);
      this.renderRosterOverlay(ctx);
    }

    // 패널/버튼/모달은 위에 — 설정 버튼, 선택지 버튼, (열렸다면) 설정 모달.
    this.ui.render(ctx);
  }

  /** 좌상단 대형 모니터 = 장면 일러스트. 격리 영역 생성 후엔 괴이 숲, 그 전엔 시설. */
  private renderScene(ctx: CanvasRenderingContext2D): void {
    const domainActive = (this.runner.state.flags.domain ?? 0) > 0;
    // 독대·폭주·진압·격리 등 괴이가 화면의 주체인 백본에선 장면창에 괴이 아트(§9).
    const anomalyScenes = ["b_confront", "b_sabotage", "b_rampage", "b_subdue", "b_contain"];
    let img = domainActive ? SCENE_FOREST_IMG : SCENE_FACILITY_IMG;
    if (anomalyScenes.includes(this.runner.current.id) && isImageReady(PORTRAIT_ANOMALY_IMG)) {
      img = PORTRAIT_ANOMALY_IMG;
    }
    if (!isImageReady(img)) {
      return;
    }
    const { x, y, w, h } = this.sceneRegion;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    drawImageCover(ctx, img, x, y, w, h);
    ctx.restore();
  }

  /** 좌하단 프레임 = 관리자 ID 카드 (완성 아트). */
  private renderIdCard(ctx: CanvasRenderingContext2D): void {
    if (!isImageReady(IDCARD_PLAYER_IMG)) {
      return;
    }
    const { x, y, w, h } = this.idRegion;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    // 카드 원본 비율(300×443)을 지키며 영역 안에 맞춤(contain) — 잘리지 않게.
    const ratio = IDCARD_PLAYER_IMG.naturalWidth / IDCARD_PLAYER_IMG.naturalHeight;
    let dw = w;
    let dh = w / ratio;
    if (dh > h) {
      dh = h;
      dw = h * ratio;
    }
    const dx = x + (w - dw) / 2;
    const dy = y + (h - dh) / 2;
    ctx.drawImage(IDCARD_PLAYER_IMG, dx, dy, dw, dh);
    ctx.restore();
  }

  /** 하단중앙 장치 = 바이탈: hp/정신 게이지 + 심박선 + 경고등 3. */
  private renderDevice(ctx: CanvasRenderingContext2D): void {
    const { x, y, w, h } = this.deviceRegion;
    const stats = this.runner.state.stats;
    const status = this.runner.state.status.join(", ") || "정상";

    ctx.save();
    ctx.textBaseline = "top";
    ctx.textAlign = "left";

    // 심박선.
    const waveX = x + 10;
    const waveY = y + 6;
    const waveWidth = w - 20 - 66;
    const waveHeight = 34;
    ctx.fillStyle = "rgba(3, 6, 11, 0.72)";
    ctx.fillRect(waveX, waveY, waveWidth, waveHeight);
    ctx.strokeStyle = stats.hp > 30 ? "#5ad19b" : "#e6584e";
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

    // 경고등 3개 — 상태 심각도로 점등.
    const severity = this.conditionSeverity(status);
    const dotSize = 12;
    for (let i = 0; i < 3; i++) {
      const dx = waveX + waveWidth + 12 + i * (dotSize + 6);
      ctx.beginPath();
      ctx.fillStyle = i < severity ? "#e6584e" : "rgba(43, 58, 85, 0.9)";
      ctx.arc(dx + dotSize / 2, waveY + waveHeight / 2, dotSize / 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // hp/정신 라벨 (게이지 바 자체는 엔진 ProgressBar가 그림 — ui.render).
    const barY = waveY + waveHeight + 12;
    ctx.fillStyle = "#a6bbd2";
    ctx.font = "11px Pretendard, sans-serif";
    ctx.fillText("HP", waveX, barY + 1);
    ctx.fillText("정신", waveX, barY + 23);

    // 상태.
    ctx.fillStyle = "#c7d3e8";
    ctx.fillText(`상태: ${status}`, waveX, barY + 44);

    // 아이템 그리드(소지품 6칸) — 장치 하단.
    const inventory = this.runner.state.inventory;
    const slotCount = 6;
    const slotSize = 18;
    const slotGap = 4;
    const gridY = y + h - slotSize - 8;
    for (let i = 0; i < slotCount; i++) {
      const sx = waveX + i * (slotSize + slotGap);
      const item = inventory[i];
      ctx.fillStyle = item ? "rgba(90, 209, 155, 0.35)" : "rgba(234, 241, 255, 0.05)";
      ctx.fillRect(sx, gridY, slotSize, slotSize);
      ctx.strokeStyle = "#2b3a55";
      ctx.lineWidth = 1;
      ctx.strokeRect(sx, gridY, slotSize, slotSize);
      if (item) {
        ctx.fillStyle = "#eaf1ff";
        ctx.font = "10px Pretendard, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(item.slice(0, 1), sx + slotSize / 2, gridY + slotSize / 2);
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
      }
    }
    if (inventory.length > slotCount) {
      ctx.fillStyle = "#ffd54f";
      ctx.font = "bold 10px Pretendard, sans-serif";
      ctx.fillText(`+${inventory.length - slotCount}`, waveX + slotCount * (slotSize + slotGap) + 2, gridY + 4);
    }
    ctx.restore();
  }

  /** 상태문구 키워드로 경고등 점등 개수(0~3). */
  private conditionSeverity(condition: string): number {
    if (/폭주|사망/.test(condition)) {
      return 3;
    }
    if (/부상|기절|경계/.test(condition)) {
      return 2;
    }
    if (/출혈|불안|어지럼/.test(condition)) {
      return 1;
    }
    return 0;
  }

  /** 우측 = 이벤트 로그: 모니터 베젤 + 지난 기록(흐리게) + 현재 낭독(타자기) + 선택지(UI). */
  private renderLog(ctx: CanvasRenderingContext2D): void {
    const { x, y, w, h } = this.logRegion;

    // 모니터 베젤 배경 + 가독성용 어두운 스크림.
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    if (isImageReady(SCREEN_MONITOR_IMG)) {
      drawImageCover(ctx, SCREEN_MONITOR_IMG, x, y, w, h);
    }
    ctx.fillStyle = "rgba(6, 9, 15, 0.82)";
    ctx.fillRect(x, y, w, h);
    ctx.restore();

    const pad = 14;
    const innerX = x + pad;
    const innerW = w - pad * 2;
    let cursorY = y + 12;

    ctx.save();
    ctx.textAlign = "left";
    ctx.textBaseline = "top";

    // 지난 기록 (현재 노드 진입 로그 1줄은 현재 낭독과 겹치므로 그 위쪽만).
    const history = this.runner.recentLog(LOG_HISTORY_ROWS + 1).slice(0, LOG_HISTORY_ROWS);
    for (const line of history) {
      ctx.fillStyle = "rgba(120, 150, 200, 0.14)";
      ctx.fillRect(innerX, cursorY, innerW, LOG_ROW_HEIGHT);
      ctx.fillStyle = "#8ea0bd";
      ctx.font = "12px Pretendard, sans-serif";
      const display = line.length > 24 ? `${line.slice(0, 24)}…` : line;
      ctx.fillText(display, innerX + 10, cursorY + LOG_ROW_HEIGHT / 2 - 6);
      cursorY += LOG_ROW_HEIGHT + LOG_ROW_GAP;
    }

    // 현재 낭독 — 헤더 구분선 + 본문(타자기/페이드). 선택지 블록 위 공간까지.
    const passage = this.runner.current;
    const revealed = passage.text.slice(0, Math.floor(this.revealedChars));
    const choicesTop = this.choiceArea.children.length > 0 ? this.choiceArea.y : y + h - 12;
    const narrationTop = cursorY + 8;
    const narrationBottom = choicesTop - 10;

    ctx.globalAlpha = this.textAlpha;
    let ny = narrationTop;
    if (passage.ending) {
      ctx.fillStyle = "#ffd54f";
      ctx.font = "bold 18px Pretendard, sans-serif";
      ctx.fillText(passage.endingTitle ?? "", innerX, ny);
      ny += 28;
    }
    ctx.fillStyle = "#eaf1ff";
    ctx.font = "15px Pretendard, sans-serif";
    for (const line of this.wrapText(ctx, revealed, innerW)) {
      if (ny > narrationBottom) {
        break;
      }
      ctx.fillText(line, innerX, ny);
      ny += 23;
    }
    ctx.restore();
  }

  /** 인물이 2명 이상 등장하면 하단에 카드 레일(빈 카드 템플릿 + 초상)을 오버레이한다. */
  private renderRosterOverlay(ctx: CanvasRenderingContext2D): void {
    const characters = this.runner.state.characters;
    if (characters.length <= 1) {
      return;
    }
    const cardH = Math.round(this.height * 0.2);
    const cardW = Math.round(cardH * (300 / 443));
    const gap = 8;
    const totalW = characters.length * cardW + (characters.length - 1) * gap;
    let cx = Math.max(12, (this.width - totalW) / 2);
    const cy = this.height - cardH - 6;

    for (const character of characters) {
      if (isImageReady(CARD_BLANK_IMG)) {
        ctx.drawImage(CARD_BLANK_IMG, cx, cy, cardW, cardH);
      } else {
        ctx.fillStyle = "rgba(20, 26, 38, 0.9)";
        ctx.fillRect(cx, cy, cardW, cardH);
      }

      // 초상 창(카드 상단 중앙, 대략적 비율).
      const pw = cardW * 0.5;
      const ph = cardH * 0.42;
      const px = cx + (cardW - pw) / 2;
      const py = cy + cardH * 0.16;
      this.drawPortrait(ctx, character.id, px, py, pw, ph);

      ctx.fillStyle = "#1a1f2b";
      ctx.font = `bold ${Math.round(cardH * 0.1)}px Pretendard, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      const name = character.condition === "사망" ? "사망" : character.name;
      ctx.fillText(name, cx + cardW / 2, cy + cardH * 0.66);
      cx += cardW + gap;
    }
  }

  /** 초상 합성 — 플레이어는 blank+hair 레이어, 괴이는 전용 아트, 그 외는 blank. */
  private drawPortrait(
    ctx: CanvasRenderingContext2D,
    characterId: string,
    x: number,
    y: number,
    w: number,
    h: number,
  ): void {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    if (characterId === ANOMALY_CHARACTER_ID) {
      if (isImageReady(PORTRAIT_ANOMALY_IMG)) {
        drawImageCover(ctx, PORTRAIT_ANOMALY_IMG, x, y, w, h);
      }
    } else {
      if (isImageReady(PORTRAIT_BLANK_IMG)) {
        drawImageCover(ctx, PORTRAIT_BLANK_IMG, x, y, w, h);
      }
      if (characterId === PLAYER_CHARACTER_ID && isImageReady(PORTRAIT_HAIR_IMG)) {
        drawImageCover(ctx, PORTRAIT_HAIR_IMG, x, y, w, h);
      }
    }
    ctx.restore();
  }

  /** 우측 패널 상단의 로그 ↔ 업무노트 전환 탭 (두 뷰 모두에서 노출). */
  private renderTabletTab(ctx: CanvasRenderingContext2D): void {
    const t = this.tabletTabRect();
    ctx.save();
    ctx.fillStyle = this.reportOpen ? "rgba(90, 127, 192, 0.5)" : "rgba(120, 150, 200, 0.18)";
    ctx.fillRect(t.x, t.y, t.w, t.h);
    ctx.strokeStyle = "#2b3a55";
    ctx.lineWidth = 1;
    ctx.strokeRect(t.x, t.y, t.w, t.h);
    ctx.fillStyle = "#eaf1ff";
    ctx.font = "12px Pretendard, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(this.reportOpen ? "▸ 로그" : "▸ 업무노트", t.x + t.w / 2, t.y + t.h / 2);
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.restore();
  }

  /** 우측 = 업무노트/보고서 폼 (§18): 괴물 연구부·제2지부 분류 필드 + 소재/아이템 + 액션. */
  private renderReport(ctx: CanvasRenderingContext2D): void {
    const r = this.logRegion;

    ctx.save();
    ctx.beginPath();
    ctx.rect(r.x, r.y, r.w, r.h);
    ctx.clip();
    if (isImageReady(SCREEN_MONITOR_IMG)) {
      drawImageCover(ctx, SCREEN_MONITOR_IMG, r.x, r.y, r.w, r.h);
    }
    ctx.fillStyle = "rgba(12, 16, 24, 0.92)";
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.restore();

    const pad = 14;
    const innerX = r.x + pad;

    ctx.save();
    ctx.textBaseline = "top";
    ctx.textAlign = "left";

    // 로고 + 제목.
    ctx.fillStyle = "#0b0d12";
    ctx.beginPath();
    ctx.arc(innerX + 15, r.y + 24, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#8ea0bd";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = "#eaf1ff";
    ctx.font = "bold 16px Pretendard, sans-serif";
    ctx.fillText("괴물 연구부", innerX + 40, r.y + 10);
    ctx.fillStyle = "#a6bbd2";
    ctx.font = "11px Pretendard, sans-serif";
    ctx.fillText("제2지부 · 업무노트", innerX + 40, r.y + 30);

    // 분류 필드(드롭다운: 클릭 시 값 순환).
    for (let i = 0; i < REPORT_FIELDS.length; i++) {
      const fr = this.reportFieldRect(i);
      const field = REPORT_FIELDS[i];
      ctx.fillStyle = "rgba(234, 241, 255, 0.06)";
      ctx.fillRect(fr.x, fr.y, fr.w, fr.h);
      ctx.strokeStyle = "#2b3a55";
      ctx.lineWidth = 1;
      ctx.strokeRect(fr.x, fr.y, fr.w, fr.h);
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#a6bbd2";
      ctx.font = "12px Pretendard, sans-serif";
      ctx.fillText(field.key, fr.x + 10, fr.y + fr.h / 2);
      ctx.fillStyle = "#eaf1ff";
      ctx.textAlign = "right";
      ctx.fillText(`${field.options[this.reportSel[i]]}  ▾`, fr.x + fr.w - 10, fr.y + fr.h / 2);
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
    }

    // 감응 후 소재 + 아이템.
    const lastFr = this.reportFieldRect(REPORT_FIELDS.length - 1);
    let ty = lastFr.y + lastFr.h + 12;
    const clip = (s: string): string => (s.length > 34 ? `${s.slice(0, 34)}…` : s);
    ctx.fillStyle = "#a6bbd2";
    ctx.font = "11px Pretendard, sans-serif";
    ctx.fillText("감응 후 소재 (확보 보고서)", innerX, ty);
    ty += 16;
    ctx.fillStyle = "#c7d3e8";
    ctx.font = "12px Pretendard, sans-serif";
    ctx.fillText(clip(this.runner.state.reports.join(", ") || "—"), innerX, ty);
    ty += 22;
    ctx.fillStyle = "#a6bbd2";
    ctx.font = "11px Pretendard, sans-serif";
    ctx.fillText("아이템", innerX, ty);
    ty += 16;
    ctx.fillStyle = "#c7d3e8";
    ctx.font = "12px Pretendard, sans-serif";
    ctx.fillText(clip(this.runner.state.inventory.join(", ") || "—"), innerX, ty);

    // 액션 버튼.
    const a = this.reportActionRects();
    const drawBtn = (rect: Rect, label: string, primary: boolean): void => {
      ctx.fillStyle = primary ? "rgba(90, 127, 192, 0.45)" : "rgba(234, 241, 255, 0.08)";
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
      ctx.strokeStyle = "#2b3a55";
      ctx.lineWidth = 1;
      ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
      ctx.fillStyle = "#eaf1ff";
      ctx.font = "13px Pretendard, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label, rect.x + rect.w / 2, rect.y + rect.h / 2);
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
    };
    drawBtn(a.back, "되돌아 간다", false);
    drawBtn(a.submit, this.reportSubmitted ? "1지부로 전송됨" : "작성완료·전송", true);

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
