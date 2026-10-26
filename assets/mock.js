// 첫 화면 · 분야 상세에 쓰는 기기 그림(노트북 · 휴대폰)과 그 안의 예시 화면
// 그림은 정해진 크기(W×H)로 그린 뒤 넣을 칸 너비에 맞춰 줄여요(fitMocks). 숫자 · 이름은 모두 예시예요.
const mk = {
  chip: (t, c) => `<span class="m-chip ${c || ''}">${t}</span>`,
  row: (a, b, c) => `<div class="m-row"><span>${a}</span>${b ? `<b>${b}</b>` : ''}${c || ''}</div>`,
  bar: (t, k) => `<div class="m-top"><b>${t}</b>${k ? `<span>${k}</span>` : ''}</div>`
};

// 정해진 크기 그림을 칸 너비에 맞춰 줄여요
const fitBox = (w, h, inner, cls = '') => `<div class="fit ${cls}" style="aspect-ratio:${w}/${h}" data-w="${w}"><div class="fit-in" style="width:${w}px;height:${h}px">${inner}</div></div>`;
function fitMocks(root = document) {
  root.querySelectorAll('.fit').forEach(f => {
    const k = f.clientWidth / Number(f.dataset.w);
    if (k > 0) f.firstElementChild.style.transform = `scale(${k})`;
  });
}
if (window.ResizeObserver) {
  const ro = new ResizeObserver(() => fitMocks());
  ro.observe(document.documentElement);
}

const TABS = { owner: ['홈', '수납', '채팅', '전체 메뉴'], teacher: ['출결', '원생', '채팅', '전체 메뉴'], parent: ['홈', '수납', '채팅', '전체 메뉴'], student: ['할 일', '시간표', '채팅', '전체 메뉴'] };
// 휴대폰: 상태 표시줄 + 앱 위쪽 + 내용
const phone = (role, title, body, extra = '') => `
  <div class="m-phone r-${role}">
    <div class="m-screen">
      <div class="m-status"><span>9:41</span><i class="m-island"></i><span class="m-sig"><i></i><i></i><i></i></span></div>
      <div class="m-app-top"><span class="m-av"></span><b>${title}</b><span class="m-bell"></span></div>
      <div class="m-body">${body}</div>
      ${extra}
      <div class="m-tabbar">${TABS[role].map((t, i) => `<span class="${i ? '' : 'on'}">${t}</span>`).join('')}</div>
    </div>
  </div>`;
const PHONE_W = 300, PHONE_H = 620;

// 역할마다 휴대폰 화면
const PHONE_SCREENS = {
  owner: () => phone('owner', '하늘영어학원', `
    <p class="m-hello">정수민 원장님, 오늘 챙길 일 4개</p>
    <div class="m-card">
      ${mk.row('10월 미납', '6건', mk.chip('안내 보내기', 'blue'))}
      ${mk.row('입금 확인', '2건', mk.chip('확인', 'blue'))}
      ${mk.row('원천세 신고', 'D-5', mk.chip('서류', ''))}
      ${mk.row('체험수업 16:00', '2명', '')}
    </div>
    <div class="m-card m-split"><div><small>다니는 원생</small><b>128명</b></div><div><small>10월 수납</small><b>92%</b></div></div>
    <div class="m-card"><small class="m-cap">저절로 처리한 일</small>${mk.row('10월 청구서 48건', '', mk.chip('완료', 'good'))}${mk.row('미납 안내 6가정', '', mk.chip('완료', 'good'))}</div>`),
  teacher: () => phone('teacher', '초등 B반 출결', `
    <p class="m-hello">10월 26일 월요일 · 16:30 수업</p>
    <div class="m-card m-att">${['김서연', '박준호', '이하은', '정민재', '최유나', '한지우'].map((n, i) => `
      <div class="m-row" style="--i:${i}"><span><i class="m-dot"></i>${n}</span><span class="m-seg">${['출석', '지각', '결석'].map((s, j) => `<em class="${(i === 3 ? j === 1 : j === 0) ? 'on' : ''}">${s}</em>`).join('')}</span></div>`).join('')}
    </div>
    <div class="m-btn">저장하기 · 12/13</div>`),
  parent: () => phone('parent', '우리 아이 · 김서연', `
    <div class="m-card m-hi"><span class="m-live"></span><div><b>오늘 15:02 출석했어요</b><small>하늘영어학원 · 초등 B반</small></div></div>
    <div class="m-card">
      <small class="m-cap">10월 수강료</small>
      <div class="m-price"><s>300,000원</s><b>270,000원</b></div>
      <small class="m-note">형제 할인 10% · 오늘까지</small>
      <div class="m-btn sm">바로 내기</div>
    </div>
    <div class="m-card">${mk.row('겨울방학 특강 안내', '', mk.chip('새 공지', 'blue'))}${mk.row('오늘 할 일', '2/3', '')}</div>`),
  student: () => phone('student', '오늘 할 일', `
    <p class="m-hello">서연아, 오늘 3개 중 2개 했어</p>
    <div class="m-card m-todo">${[['단어 30개 외우기', 1], ['리딩 3과 읽기', 1], ['문법 워크북 12쪽', 0]].map(([t, d], i) => `
      <div class="m-row" style="--i:${i}"><span><i class="m-box ${d ? 'on' : ''}"></i>${t}</span></div>`).join('')}
    </div>
    <div class="m-card"><small class="m-cap">다음 수업</small>${mk.row('16:30 영어 · 초등 B반', '', mk.chip('302호', ''))}</div>
    <div class="m-card"><small class="m-cap">성장 리포트</small>${mk.row('9월 리포트가 왔어요', '', mk.chip('보기', 'blue'))}</div>`)
};

// 노트북: 원장 화면 (왼쪽 메뉴 + 오늘 챙길 일 + 숫자 + 매출 그래프)
const LAP_W = 820, LAP_H = 470;
const laptopMock = () => fitBox(LAP_W, LAP_H, `
  <div class="m-laptop">
    <div class="m-lid"><div class="m-win">
      <aside class="m-side"><b class="m-logo"><i></i>학원지원센터</b>${['홈', '행정·재정', '학생·학부모', '강사', '일정·시간표', '채팅'].map((t, i) => `<span class="${i ? '' : 'on'}">${t}</span>`).join('')}</aside>
      <main class="m-main">
        <div class="m-head"><div><small>10월 26일 월요일</small><b>안녕하세요, 정수민 원장님</b></div><span class="m-search">학생 · 반 · 메뉴 찾기</span></div>
        <div class="m-stats">
          <div><small>다니는 원생</small><b>128<em>명</em></b><i class="up">이번 달 +6</i></div>
          <div><small>10월 수납</small><b>92<em>%</em></b><i>미납 6건</i></div>
          <div><small>이번 달 순이익</small><b>1,240<em>만원</em></b><i class="up">지난달보다 +8%</i></div>
        </div>
        <div class="m-cols">
          <div class="m-panel"><b class="m-pt">오늘 챙길 일</b>
            ${[['미납 6건 · 학부모 안내', '안내 보내기'], ['입금 확인 2건', '확인하기'], ['원천세 신고 마감 D-5', '서류 보기'], ['체험수업 16:00 · 2명', '상담 카드']].map(([t, b], i) => `<div class="m-li" style="--i:${i}"><span>${t}</span><em>${b}</em></div>`).join('')}
          </div>
          <div class="m-panel"><b class="m-pt">월별 매출</b>
            <div class="m-chart">${[52, 61, 58, 70, 66, 78].map((h, i) => `<i style="--h:${h}%;--i:${i}"><span>${5 + i}월</span></i>`).join('')}</div>
          </div>
        </div>
      </main>
    </div></div>
    <div class="m-base"></div>
  </div>`, 'fit-laptop');

// 첫 화면 그림: 노트북 + 휴대폰(학부모) + 떠오르는 알림
const heroMock = () => `
  <div class="hero-mock">
    <div class="hm-laptop">${laptopMock()}</div>
    <div class="hm-phone">${fitBox(PHONE_W, PHONE_H, PHONE_SCREENS.parent(), 'fit-phone')}</div>
    <div class="hm-toast" aria-hidden="true"><span class="t-ic"></span><span class="t-tx"><b></b><small></small></span></div>
  </div>`;
// 떠오르는 알림 (몇 초마다 바뀌어요)
const HERO_TOASTS = [
  ['owner', '10월 청구서 48건을 만들었어요', '자동으로 처리 · 오전 9:10'],
  ['parent', '서연이가 15:02에 출석했어요', '학부모님께 바로 알림'],
  ['teacher', '김민지 강사님이 출결을 넣었어요', '초등 B반 12/13'],
  ['owner', '원천세 신고 마감 5일 전이에요', '계산표가 준비됐어요']
];

// 분야 상세 · 첫 화면 기능 소개에 쓰는 창 모양 화면
const winMock = (title, body, w = 520, h = 380) => fitBox(w, h, `<div class="m-window"><div class="m-wtop"><i></i><i></i><i></i><span>${title}</span></div><div class="m-wbody">${body}</div></div>`, 'fit-win');
const AREA_MOCK = {
  admin: () => winMock('수납 · 청구 — 10월', `
    <div class="m-auto"><span class="m-switch on"></span><div><b>자동으로 처리 켜짐</b><small>매달 1일 청구서 · 기한 지나면 미납 안내</small></div></div>
    <div class="m-table">
      <div class="m-tr m-th"><span>학생</span><span>원가</span><span>받을 금액</span><span>상태</span></div>
      ${[['김서연 · 초등 B', '300,000', '270,000', ['형제 할인', ''], ['납부', 'good']], ['박준호 · 중등 A', '320,000', '320,000', null, ['입금 확인', 'blue']], ['이하은 · 초등 B', '300,000', '300,000', null, ['미납', 'crit']], ['정민재 · 중등 A', '320,000', '288,000', ['장기 10%', ''], ['납부', 'good']]].map(([n, a, b, d, s], i) => `
      <div class="m-tr" style="--i:${i}"><span>${n}</span><span class="${a !== b ? 'strike' : ''}">${a}</span><span><b>${b}</b>${d ? mk.chip(d[0], '') : ''}</span><span>${mk.chip(s[0], s[1])}</span></div>`).join('')}
    </div>`),
  members: () => winMock('상담 · 등록', `
    <div class="m-kanban">${[['문의', ['이도윤 · 초4', '최서아 · 중1']], ['상담', ['강하준 · 초6']], ['체험수업', ['윤지호 · 초5', '임채원 · 중2']], ['등록', ['한예린 · 초3']]].map(([c, list], i) => `
      <div class="m-col" style="--i:${i}"><small>${c} <em>${list.length}</em></small>${list.map(n => `<div class="m-kc">${n}</div>`).join('')}</div>`).join('')}
    </div>
    <div class="m-read"><div><b>겨울방학 특강 안내</b><small>전체 공지 · 어제</small></div><div class="m-meter"><i style="--w:82%"></i></div><span>23/28 가족 읽음</span></div>`),
  teachers: () => fitBox(PHONE_W, PHONE_H, PHONE_SCREENS.teacher(), 'fit-phone'),
  promo: () => winMock('내 의뢰 · 블로그 정기 포스팅', `
    <ol class="m-steps">${['접수', '담당자 연락', '작업 중', '시안 확인', '완료'].map((s, i) => `<li class="${i < 3 ? 'done' : i === 3 ? 'now' : ''}">${s}</li>`).join('')}</ol>
    <div class="m-draft"><div class="m-thumb"></div><div><b>영통 초등 영어, 겨울방학 전에 시작해야 하는 이유</b><small>인투마케팅 · 시안 2개 · 오늘 올라옴</small><div class="m-acts"><span class="m-btn sm">승인하기</span><span class="m-btn sm line">고칠 점 남기기</span></div></div></div>`),
  mou: () => winMock('유학 · 캠프 안내', `
    <div class="m-camp"><div class="m-cimg"><b>2027 겨울</b><span>필리핀 클락 영어캠프 · 4주</span></div>
      <div class="m-cinfo">${mk.row('대상', '초3 ~ 중2', '')}${mk.row('기간', '1월 4일 ~ 1월 31일', '')}${mk.row('학부모 상담 신청', '12가정', mk.chip('인투유학 연결', 'blue'))}</div></div>
    <div class="m-auto"><span class="m-switch on"></span><div><b>학부모 앱에 안내 중</b><small>신청이 오면 원장님 확인 뒤 상담사가 연락해요</small></div></div>`),
  hire: () => winMock('강사 채용 · 지원자', `
    <div class="m-job"><b>초등 영어 파트타임 강사 (주 3일)</b><small>하늘영어학원 · 수원 영통구 · 경력 1년 이상 · D-12</small></div>
    ${[['박지수', '영어교육 전공 · 경력 3년', '서류 통과', 'blue'], ['오세린', 'TESOL · 경력 1년', '면접 예정', ''], ['문태호', '경력 5년 · 교육 이수 4개', '새 지원', 'good']].map(([n, d, s, c], i) => `
      <div class="m-ap" style="--i:${i}"><span class="m-av2">${n[0]}</span><div><b>${n}</b><small>${d}</small></div>${mk.chip(s, c)}</div>`).join('')}`)
};
