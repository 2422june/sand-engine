# Game Design System 편집기 (로컬 도구)

`game-design-system/`의 4개 설계 문서를 실제 파일로 편집하고, 화면 설계 이미지를 게임별로
관리하는 로컬 웹앱. (AI 연결 없음 — 순수 편집기)

> ⚠️ **로컬 전용.** 실제 레포 파일을 쓴다. 공개 배포 금지.

## 실행

```bash
# 프로젝트 루트(sand-engine)에서
npm run gds
# → http://localhost:4321
```

환경변수:
- `GDS_PORT` — 기본 `4321`.

## 기능

- **4개 문서 편집** (실제 파일 read/write):
  - Document `documents/<id>.md` (게임별) · Blue Print `blueprints/<id>/Blue Print.md` (게임별)
  - Rule Book `RULEBOOK.md` (공용) · Document Rule `documents/DOCUMENT_RULES.md` (공용)
  - `Ctrl/Cmd+S` 저장.
- **새 게임** — id를 넣고 Document 작성 후 저장하면 파일 생성.
- **화면 설계 이미지** — `documents/<id>/wireframes/`에 업로드/미리보기.

## 구조

- `server.mjs` — 의존성 없는 Node 서버(파일 I/O만).
- `public/index.html` — 단일 파일 프론트엔드(HTML/CSS/JS 인라인).
