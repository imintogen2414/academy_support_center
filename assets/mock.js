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
// 휴대폰: 상태 표시줄 + 앱 위쪽 + 내용 + 아래 탭(tab번째가 켜짐)
const STATUS = '<div class="m-status"><span>9:41</span><i class="m-island"></i><span class="m-sig"><i></i><i></i><i></i></span></div>';
const appPage = (role, title, body, tab = 0) => `
      <div class="m-app-top"><span class="m-av"></span><b>${title}</b><span class="m-bell"></span></div>
      <div class="m-body">${body}</div>
      <div class="m-tabbar">${TABS[role].map((t, i) => `<span class="${i === tab ? 'on' : ''}">${t}</span>`).join('')}</div>`;
const phone = (role, title, body, tab = 0) => `
  <div class="m-phone r-${role}">
    <div class="m-screen">${STATUS}${appPage(role, title, body, tab)}</div>
  </div>`;
const PHONE_W = 300, PHONE_H = 620;

// 예시 QR 그림 (진짜로 찍히지는 않아요): 세 귀퉁이 네모 + 정해진 무늬
function fakeQr(n = 25) {
  let seed = 11; const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  let r = '';
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const f = [[0, 0], [n - 7, 0], [0, n - 7]].find(([a, b]) => x >= a && x < a + 7 && y >= b && y < b + 7);
    let on;
    if (f) { const dx = x - f[0], dy = y - f[1]; on = dx === 0 || dy === 0 || dx === 6 || dy === 6 || (dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4); }
    else on = rnd() > .52 && !((x === 7 || y === 7) && (x < 8 || y < 8 || x > n - 9 || y > n - 9));
    if (on) r += `<rect x="${x}" y="${y}" width="1.02" height="1.02"/>`;
  }
  return `<svg class="m-qr" viewBox="-1 -1 ${n + 2} ${n + 2}" aria-hidden="true">${r}</svg>`;
}
const bubble = (t, me, who) => `<div class="m-bub${me ? ' me' : ''}">${who ? `<small>${who}</small>` : ''}<span>${t}</span></div>`;
const scoreBar = (t, v) => `<div class="m-score"><span>${t}</span><i style="--w:${v}%"></i><b>${v}</b></div>`;

// 역할마다 휴대폰 여러 장: [위쪽 제목, 켜진 탭, 아래 설명 [제목, 설명], 내용]. 첫 장은 첫 화면 그림에도 써요.
const PHONE_PAGES = {
  owner: [
    ['하늘영어학원', 0, ['홈 · 오늘 챙길 일', '미납 · 입금 확인 · 서류 마감 · 체험수업처럼 오늘 할 일만 먼저 보여요. 누르면 그 일로 바로 가요.'], `
    <p class="m-hello">정수민 원장님, 오늘 챙길 일 4개</p>
    <div class="m-card">
      ${mk.row('10월 미납', '6건', mk.chip('안내 보내기', 'blue'))}
      ${mk.row('입금 확인', '2건', mk.chip('확인', 'blue'))}
      ${mk.row('원천세 신고', 'D-5', mk.chip('서류', ''))}
      ${mk.row('체험수업 16:00', '2명', '')}
    </div>
    <div class="m-card m-split"><div><small>다니는 원생</small><b>128명</b></div><div><small>10월 수납</small><b>92%</b></div></div>
    <div class="m-card"><small class="m-cap">저절로 처리한 일</small>${mk.row('10월 청구서 48건', '', mk.chip('완료', 'good'))}${mk.row('미납 안내 6가정', '', mk.chip('완료', 'good'))}</div>`],
    ['입구 출석 QR', 0, ['입구 QR 출석', '하루에 한 번 바뀌는 QR을 입구에 띄우거나 인쇄해 붙여 두면, 학생이 와서 직접 찍어 출석해요. 수업 10분이 지나면 지각으로 저절로 들어가요.'], `
    <div class="m-card m-qrcard">${fakeQr()}<b>10월 26일 (월) 출석 QR</b><small>휴대폰 카메라로 찍어 주세요</small><span class="m-chip blue">QR 인쇄</span></div>
    <div class="m-card"><small class="m-cap">방금 출석</small>${mk.row('김서연 · 초등 B반', '15:02', mk.chip('출석', 'good'))}${mk.row('박준호 · 중등 A반', '15:04', mk.chip('출석', 'good'))}${mk.row('정민재 · 중등 A반', '16:43', mk.chip('지각', ''))}</div>`],
    ['수납 · 10월', 1, ['수납 · 청구', '정해 둔 수강료와 할인으로 청구서가 저절로 만들어지고, 학부모님이 "보냈어요"를 누르면 입금 확인만 하면 돼요.'], `
    <div class="m-card m-split"><div><small>받을 돈</small><b>3,840만</b></div><div><small>받은 돈</small><b>92%</b></div></div>
    <div class="m-card"><small class="m-cap">입금 확인</small>${mk.row('박준호 · 320,000원', '', mk.chip('확인', 'blue'))}${mk.row('최유나 · 270,000원', '', mk.chip('확인', 'blue'))}</div>
    <div class="m-card"><small class="m-cap">미납 6건</small>${mk.row('이하은 · 300,000원', 'D+3', '')}${mk.row('한지우 · 300,000원', 'D+1', '')}<div class="m-btn sm">미납 안내 한 번에 보내기</div></div>`],
    ['학부모 공지', 1, ['공지 · 읽음 확인', '전체나 반별로 공지를 보내면 학부모 휴대폰에 바로 떠요. 읽은 가족 · 안 읽은 가족이 보여서 다시 알릴 사람만 골라요.'], `
    <div class="m-card"><small class="m-cap">어제 보낸 공지</small><b class="m-big-t">겨울방학 특강 안내</b><div class="m-meter"><i style="--w:82%"></i></div><small class="m-note">28가족 중 23가족 읽음</small></div>
    <div class="m-card"><small class="m-cap">안 읽은 가족 5</small>${mk.row('이하은 학부모', '', mk.chip('다시 알림', 'blue'))}${mk.row('정민재 학부모', '', mk.chip('다시 알림', 'blue'))}${mk.row('한지우 학부모', '', mk.chip('다시 알림', 'blue'))}</div>`],
    ['직책 · 권한', 3, ['직책 · 권한', '매니저 · 재정 담당처럼 학원 안 직책을 정하고, 원장님만 쓰던 기능을 강사마다 하나씩 켜 줘요. 켜 준 화면만 강사 메뉴에 생겨요.'], `
    <div class="m-card m-hi"><span class="m-av2">김</span><div><b>김민지 · 매니저</b><small>초등 B반 · 중등 A반 담당</small></div></div>
    <div class="m-card"><small class="m-cap">켜 준 기능</small>${[['모든 원생', 1], ['수납', 1], ['결재 처리', 1], ['공지', 1], ['재정', 0], ['원천세', 0]].map(([t, on]) => mk.row(t, '', mk.chip(on ? '켬' : '끔', on ? 'blue' : ''))).join('')}</div>
    <div class="m-card"><small class="m-cap">우리 학원 직책</small><div class="m-chips">${mk.chip('매니저', 'blue')}${mk.chip('재정 담당', '')}${mk.chip('상담 실장', '')}</div></div>`]
  ],
  teacher: [
    ['초등 B반 출결', 0, ['담당 반 출결', '수업 중에 휴대폰으로 출석 · 지각 · 결석을 눌러요. QR로 먼저 찍은 학생은 이미 체크돼 있어요.'], `
    <p class="m-hello">10월 26일 월요일 · 16:30 수업</p>
    <div class="m-card m-att">${['김서연', '박준호', '이하은', '정민재', '최유나', '한지우'].map((n, i) => `
      <div class="m-row" style="--i:${i}"><span><i class="m-dot"></i>${n}</span><span class="m-seg">${['출석', '지각', '결석'].map((s, j) => `<em class="${(i === 3 ? j === 1 : j === 0) ? 'on' : ''}">${s}</em>`).join('')}</span></div>`).join('')}
    </div>
    <div class="m-btn">저장하기 · 12/13</div>`],
    ['원생 · 이하은', 1, ['학생 한 명 보기', '학부모 연락처를 누르면 바로 전화 · 문자가 되고, 최근 출결 · 상담 기록 · 할 일을 한 화면에서 봐요.'], `
    <div class="m-card m-hi"><span class="m-av2">이</span><div><b>이하은 · 초5</b><small>초등 B반 · 학부모 이수진</small></div></div>
    <div class="m-card">${mk.row('학부모 연락처', '010-0000-1234', '')}<div class="m-chips">${mk.chip('전화 걸기', 'blue')}${mk.chip('문자', '')}${mk.chip('번호 복사', '')}</div></div>
    <div class="m-card"><small class="m-cap">최근 수업 7번</small><div class="m-days">${['출', '출', '지', '출', '출', '결', '출'].map(x => `<i class="${x === '지' ? 'late' : x === '결' ? 'off' : ''}">${x}</i>`).join('')}</div></div>
    <div class="m-card"><small class="m-cap">상담 메모</small><p class="m-p">문법 기초 보충 원함 · 11월부터 주 3회 상의</p></div>`],
    ['오늘 할 일 주기', 1, ['오늘 할 일', '반 전체나 학생 여러 명을 골라 숙제를 주면 학생 · 학부모 화면에 바로 떠요. 누가 했는지도 보여요.'], `
    <div class="m-card"><small class="m-cap">누구에게</small><div class="m-chips">${mk.chip('초등 B반 전체', 'blue')}${mk.chip('여러 명 고르기', '')}</div></div>
    <div class="m-card m-todo">${[['단어 30개 외우기', 1], ['리딩 3과 읽기', 1], ['문법 워크북 12쪽', 1]].map(([t], i) => `<div class="m-row" style="--i:${i}"><span><i class="m-box on"></i>${t}</span></div>`).join('')}</div>
    <div class="m-card"><small class="m-cap">어제 숙제</small>${mk.row('다 한 학생', '11/13', '')}${mk.row('안 한 학생', '정민재 · 한지우', '')}</div>
    <div class="m-btn">13명에게 보내기</div>`],
    ['일정 · 시간표', 3, ['시간표 함께 고치기', '원장님과 강사님이 같은 시간표를 넣고 고쳐요. 칸마다 누가 넣고 고쳤는지 남고, 아래 "바뀐 기록"에서 한눈에 봐요.'], `
    <div class="m-card">${[['월', '16:30 초등 B반 리딩', '박윤지 넣음'], ['수', '16:30 초등 B반 문법', '김민지 고침 10/27'], ['금', '17:30 중등 A반 단어', '박윤지 넣음']].map(([d, t, w]) => `<div class="m-row"><span><em class="m-wd">${d}</em>${t}</span></div><small class="m-note">${w}</small>`).join('')}</div>
    <div class="m-card"><small class="m-cap">바뀐 기록</small>${mk.row('김민지 · 수 16:30 시간 고침', '10/27', '')}${mk.row('박윤지 · 11/2 월말 평가 넣음', '10/25', '')}</div>
    <div class="m-btn">수업 더하기</div>`],
    ['성장 리포트 · 10월', 3, ['성장 리포트', '과목 점수 · 학습 태도 · 의견을 적어 발급하면 학부모님이 휴대폰으로 받아 봐요. 출결 · 숙제는 저절로 채워져요.'], `
    <div class="m-card"><small class="m-cap">김서연 · 과목 점수</small>${scoreBar('리딩', 92)}${scoreBar('문법', 84)}${scoreBar('단어', 96)}</div>
    <div class="m-card">${mk.row('출석률', '100%', '')}${mk.row('숙제 수행', '27/28', '')}</div>
    <div class="m-card"><small class="m-cap">종합 의견</small><p class="m-p">긴 지문도 끝까지 읽는 힘이 생겼어요. 다음 달은 서술형 문법에 집중해요.</p></div>
    <div class="m-btn">학부모님께 발급하기</div>`]
  ],
  parent: [
    ['우리 아이 · 김서연', 0, ['홈 · 우리 아이', '오늘 출석 · 이번 달 수강료 · 새 공지 · 오늘 할 일을 한 번에 봐요.'], `
    <div class="m-card m-hi"><span class="m-live"></span><div><b>오늘 15:02 출석했어요</b><small>하늘영어학원 · 초등 B반</small></div></div>
    <div class="m-card">
      <small class="m-cap">10월 수강료</small>
      <div class="m-price"><s>300,000원</s><b>270,000원</b></div>
      <small class="m-note">형제 할인 10% · 오늘까지</small>
      <div class="m-btn sm">바로 내기</div>
    </div>
    <div class="m-card">${mk.row('겨울방학 특강 안내', '', mk.chip('새 공지', 'blue'))}${mk.row('오늘 할 일', '2/3', '')}</div>`],
    ['출석 알림', 0, ['QR 출석 알림', '아이가 학원 입구 QR을 찍으면 그 시각이 바로 떠요. 학원에 와야만 찍히니 출석이 정확해요.'], `
    <div class="m-card m-done"><span class="m-ok"></span><b>서연이가 출석했어요</b><small>오늘 15:02 · 입구 QR · 수업 시작 전</small></div>
    <div class="m-card"><small class="m-cap">이번 주 출결</small><div class="m-days">${['월', '화', '수', '목', '금'].map((d, i) => `<i class="${i === 2 ? 'late' : i > 3 ? 'none' : ''}">${d}</i>`).join('')}</div><small class="m-note">수요일 16:43 지각 · 나머지 출석</small></div>
    <div class="m-card">${mk.row('다음 수업', '수 16:30', mk.chip('302호', ''))}</div>`],
    ['수강료 내기', 1, ['수강료 바로 내기', '학원 계좌를 복사해 보내고 "보냈어요"를 누르면 원장님께 바로 알림이 가요. 할인 내역도 함께 보여요.'], `
    <div class="m-card"><small class="m-cap">10월 수강료</small><div class="m-price"><s>300,000원</s><b>270,000원</b></div><small class="m-note">형제 할인 10%</small></div>
    <div class="m-card"><small class="m-cap">입금 계좌</small>${mk.row('국민 123456-00-000000', '', mk.chip('복사', 'blue'))}${mk.row('예금주', '하늘영어학원', '')}</div>
    <div class="m-btn">보냈어요</div>
    <p class="m-hello">원장님이 확인하면 "납부 완료"로 바뀌어요</p>`],
    ['김민지 강사님', 2, ['채팅', '개인 번호 없이 원장님 · 담당 강사님과 바로 이야기해요. 읽으면 읽음 표시가 바로 바뀌어요.'], `
    <div class="m-chat">${bubble('어머님, 서연이 오늘 리딩 발표 정말 잘했어요!', 0, '김민지 강사')}${bubble('와 감사해요 ㅎㅎ 집에서도 칭찬해 줄게요', 1)}${bubble('다음 주 단어 시험 범위는 3~4과예요', 0, '김민지 강사')}${bubble('네 알겠습니다!', 1)}</div>
    <div class="m-input"><span>메시지 보내기</span><i></i></div>`]
  ],
  student: [
    ['오늘 할 일', 0, ['오늘 할 일', '선생님이 준 숙제를 하고 체크해요. 부모님 화면에도 바로 보여요.'], `
    <p class="m-hello">서연아, 오늘 3개 중 2개 했어</p>
    <div class="m-card m-todo">${[['단어 30개 외우기', 1], ['리딩 3과 읽기', 1], ['문법 워크북 12쪽', 0]].map(([t, d], i) => `
      <div class="m-row" style="--i:${i}"><span><i class="m-box ${d ? 'on' : ''}"></i>${t}</span></div>`).join('')}
    </div>
    <div class="m-card"><small class="m-cap">다음 수업</small>${mk.row('16:30 영어 · 초등 B반', '', mk.chip('302호', ''))}</div>
    <div class="m-card"><small class="m-cap">성장 리포트</small>${mk.row('9월 리포트가 왔어요', '', mk.chip('보기', 'blue'))}</div>`],
    ['QR로 출석', 0, ['입구 QR로 출석', '학원에 도착하면 입구 QR을 휴대폰 카메라로 찍어요. 로그인돼 있으면 바로 "출석했어요"가 떠요.'], `
    <div class="m-cam"><div class="m-frame">${fakeQr()}</div><small>입구 QR을 네모 안에 맞춰 주세요</small></div>
    <div class="m-card m-done sm"><span class="m-ok"></span><div><b>출석했어요 · 15:02</b><small>하늘영어학원 · 초등 B반</small></div></div>`],
    ['시간표', 1, ['이번 주 시간표', '요일마다 수업 · 강의실 · 선생님이 보이고, 시험 · 휴원 일정도 함께 나와요.'], `
    <div class="m-card">${[['월', '16:30 영어 리딩', '302호'], ['화', '16:30 영어 문법', '302호'], ['수', '16:30 영어 리딩', '302호'], ['목', '쉬는 날', ''], ['금', '16:30 단어 시험', '301호']].map(([d, t, r]) => mk.row(`<em class="m-wd">${d}</em>${t}`, '', r ? mk.chip(r, '') : '')).join('')}</div>
    <div class="m-card"><small class="m-cap">일정</small>${mk.row('11월 2일 · 월말 평가', '', mk.chip('시험', 'crit'))}${mk.row('11월 9일 · 학원 휴원', '', mk.chip('휴원', ''))}</div>`],
    ['성장 리포트 · 9월', 3, ['성장 리포트', '선생님이 보낸 리포트로 과목 점수와 잘한 점 · 노력할 점을 봐요.'], `
    <div class="m-card"><small class="m-cap">과목 점수</small>${scoreBar('리딩', 92)}${scoreBar('문법', 84)}${scoreBar('단어', 96)}</div>
    <div class="m-card"><small class="m-cap">잘한 점</small><p class="m-p">긴 지문도 끝까지 집중해서 읽어요.</p><small class="m-cap">다음 목표</small><p class="m-p">서술형 문법 문제 80점 넘기기</p></div>`]
  ]
};
// 첫 장만 (첫 화면 그림 · 강사 소개)
const PHONE_SCREENS = Object.fromEntries(Object.entries(PHONE_PAGES).map(([r, ps]) => [r, () => phone(r, ps[0][0], ps[0][3], ps[0][1])]));
// 여러 장을 옆으로 넘기는 휴대폰 (첫 화면 "휴대폰에서도")
const phoneDeck = role => `
  <div class="m-phone r-${role}">
    <div class="m-screen">${STATUS}<div class="m-pages">${PHONE_PAGES[role].map(([t, tab, , body], i) => `<div class="m-pg" data-pg="${i}">${appPage(role, t, body, tab)}</div>`).join('')}</div></div>
  </div>`;

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
  ['parent', '서연이가 입구 QR로 출석했어요', '15:02 · 학부모님께 바로 알림'],
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
