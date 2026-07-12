import"./style-ib-_VuH4.js";const a=[{title:"MindHack (엔진 데모)",href:"./mindhack.html",desc:"입력·조명·오디오·충돌 종합 데모"},{title:"테트리스",href:"./tetris.html",desc:"회전·라인클리어·레벨"},{title:"체스 (2인)",href:"./chess.html",desc:"체크메이트·캐슬링·앙파상·승격"},{title:"체커 (2인)",href:"./checkers.html",desc:"잡기 강제·연속 점프·킹"},{title:"길건너 친구들",href:"./crossy.html",desc:"절차적 차선·자동차 피하기"},{title:"감정의 바다",href:"./anomaly-research.html",desc:"내러티브 선택형 어드벤처 (프로토타입)"},{title:"공용 템플릿 테스트",href:"./template.html",desc:"콘텐츠 없는 빈 게임 — 공용 셸/템플릿 확인용"}],c=document.querySelector("#app");if(!c)throw new Error("App root not found");const t=document.createElement("main");t.className="shell";t.innerHTML=`
  <h1>Web 2D Game Engine</h1>
  <p>OOP · 작은 모듈 · 재사용 파일. 게임별 독립 엔트리로 빌드돼.</p>
  <nav class="launcher-grid"></nav>
`;const n=t.querySelector(".launcher-grid");if(!n)throw new Error("Launcher grid not found");for(const r of a){const e=document.createElement("a");e.className="launcher-card",e.href=r.href,e.innerHTML=`
    <span class="launcher-card__title">${r.title}</span>
    <span class="launcher-card__desc">${r.desc}</span>
  `,n.append(e)}c.append(t);
