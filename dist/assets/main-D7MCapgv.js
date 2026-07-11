import"./style-BUWbtKDH.js";const a=[{title:"MindHack (엔진 데모)",href:"./mindhack.html",desc:"입력·조명·오디오·충돌 종합 데모"},{title:"테트리스",href:"./tetris.html",desc:"회전·라인클리어·레벨"},{title:"체스 (2인)",href:"./chess.html",desc:"체크메이트·캐슬링·앙파상·승격"},{title:"체커 (2인)",href:"./checkers.html",desc:"잡기 강제·연속 점프·킹"},{title:"길건너 친구들",href:"./crossy.html",desc:"절차적 차선·자동차 피하기"},{title:"괴이 연구소",href:"./anomaly-research.html",desc:"내러티브 선택형 어드벤처 (프로토타입)"}],c=document.querySelector("#app");if(!c)throw new Error("App root not found");const r=document.createElement("main");r.className="shell";r.innerHTML=`
  <h1>Web 2D Game Engine</h1>
  <p>OOP · 작은 모듈 · 재사용 파일. 게임별 독립 엔트리로 빌드돼.</p>
  <nav class="launcher-grid"></nav>
`;const n=r.querySelector(".launcher-grid");if(!n)throw new Error("Launcher grid not found");for(const t of a){const e=document.createElement("a");e.className="launcher-card",e.href=t.href,e.innerHTML=`
    <span class="launcher-card__title">${t.title}</span>
    <span class="launcher-card__desc">${t.desc}</span>
  `,n.append(e)}c.append(r);
