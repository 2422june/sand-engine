import"./style-DIk7YpYj.js";const s=[{title:"MindHack (엔진 데모)",href:"./mindhack.html",desc:"입력·조명·오디오·충돌 종합 데모"},{title:"테트리스",href:"./tetris.html",desc:"회전·라인클리어·레벨"},{title:"체스 (2인)",href:"./chess.html",desc:"체크메이트·캐슬링·앙파상·승격"},{title:"체커 (2인)",href:"./checkers.html",desc:"잡기 강제·연속 점프·킹"},{title:"길건너 친구들",href:"./crossy.html",desc:"절차적 차선·자동차 피하기"},{title:"괴이 연구소",href:"./anomaly-research.html",desc:"캐릭터 일러스트·로그·선택지 중심 스토리 어드벤처 샘플"},{title:"인외 수집가",href:"./inhuman-collector.html",desc:"현재 작업 중인 전용 프로토타입 링크"},{title:"인외 수집가-test",href:"./inhuman-collector-test.html",desc:"Document 콘티 반영 실험용 테스트판"},{title:"Live2D 테스트",href:"./live2d-test.html",desc:"공식 Cubism SDK 전용 분리 렌더 확인 페이지"},{title:"풍랑 속의 사람",href:"./soul-storm.html",desc:"심리 서사 런타임 프로토타입"},{title:"월도행: 조선 암행록",href:"./moonlit-sword.html",desc:"조선 암행 서사 + 턴제 결투 프로토타입"},{title:"공용 템플릿 테스트",href:"./template.html",desc:"콘텐츠 없는 빈 게임 — 공용 셸/템플릿 확인용"}],c=document.querySelector("#app");if(!c)throw new Error("App root not found");const t=document.createElement("main");t.className="shell";t.innerHTML=`
  <h1>Web 2D Game Engine</h1>
  <p>OOP · 작은 모듈 · 재사용 파일. 게임별 독립 엔트리로 빌드돼.</p>
  <nav class="launcher-grid"></nav>
`;const l=t.querySelector(".launcher-grid");if(!l)throw new Error("Launcher grid not found");for(const r of s){const e=document.createElement("a");e.className="launcher-card",e.href=r.href,e.innerHTML=`
    <span class="launcher-card__title">${r.title}</span>
    <span class="launcher-card__desc">${r.desc}</span>
  `,l.append(e)}c.append(t);
