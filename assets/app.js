// 플랫폼 화면 — 해시(#home, #leads …)로 페이지를 바꿉니다
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const ICON = {
  home: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  leads: '<path d="M3 4h18l-7 8v6l-4 2v-8z"/>',
  page: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M8 14h5"/>',
  megaphone: '<path d="M3 11l18-7-7 18-2-8-9-3z"/>',
  video: '<rect x="2" y="5" width="15" height="14" rx="2"/><path d="M17 10l5-3v10l-5-3"/>',
  check: '<path d="M9 11l3 3 8-8"/><path d="M20 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
  handshake: '<path d="M8 12l3 3 5-5"/><path d="M2 12l5-5 5 3 5-3 5 5-10 9z"/>',
  doc: '<path d="M4 4h12l4 4v12H4z"/><path d="M8 12h8M8 16h5"/>',
  attend: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M9 12l2 2 4-4"/>',
  card: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>',
  chat: '<path d="M21 12a8 8 0 0 1-12 7l-6 2 2-6a8 8 0 1 1 16-3z"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  shield: '<path d="M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z"/>',
  cal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  star: '<path d="M12 2l3 6.5 7 .8-5.2 4.7 1.5 7L12 17.5 5.7 21l1.5-7L2 9.3l7-.8z"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2 20c0-3.5 3-6 7-6s7 2.5 7 6"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14c2.4.6 4 2.8 4 6"/>',
  play: '<path d="M7 4l13 8-13 8z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>'
};
const ic = (name, cls = 'icon') => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICON[name]}</svg>`;

// 역할별 메뉴. soon = 아직 화면이 없는 메뉴 (설명만 보여줌)
const NAV = {
  owner: [
    { items: [['home', '홈', 'home']] },
    { group: '성장 · 홍보·마케팅', items: [['leads', '상담·등록 관리', 'leads'], ['promo', '학원 홍보 페이지', 'page'], ['marketing', '마케팅 의뢰', 'megaphone']] },
    { group: '성장 · 강사', items: [['videos', '수업 영상', 'video'], ['eval', '강사 평가', 'check']] },
    { group: '성장 · 제휴', items: [['perks', '제휴 마켓', 'handshake'], ['mou', '내 제휴·서명', 'doc']] },
    { group: '운영', items: [['attend', '출결', 'attend'], ['billing', '수납·청구', 'card'], ['msg', '메신저', 'chat'], ['records', '학생 기록부', 'doc'], ['finance', '재정', 'chart'], ['admin', '교육청 행정', 'shield']] }
  ],
  teacher: [
    { items: [['home', '홈', 'home']] },
    { group: '내 수업', items: [['videos', '수업 영상 올리기', 'video'], ['eval', '받은 피드백', 'check'], ['attend', '출결·과제 입력', 'attend']] },
    { group: '소통', items: [['msg', '메신저', 'chat']] }
  ],
  parent: [
    { items: [['home', '홈', 'home']] },
    { group: '우리 아이', items: [['cal', '일정·시간표', 'cal'], ['records', '기록·성적', 'doc'], ['billing', '수납', 'card']] },
    { group: '소통', items: [['msg', '메신저', 'chat'], ['review', '인증 후기 쓰기', 'star']] }
  ]
};

// 아직 만들지 않은 화면의 설명 (2차 기획안 내용)
const SOON = {
  promo: ['학원 홍보 페이지', '반 구성·강사 소개·시간표·교습비로 공개 페이지를 자동으로 만들어요.', ['네이버 플레이스·인스타 프로필 링크용 주소', '재원생 학부모 인증 후기', '개인정보 없는 성과 카드 이미지']],
  marketing: ['마케팅 의뢰', '마케팅 상품을 고르면 학원 정보·사진·성과 카드가 마케팅 회사에 자동으로 전달돼요.', ['개강 패키지 · 방학 특강 · SNS 월 관리 · 지역 광고', '시안 승인', '월말 성과 리포트 (광고비 · 문의 · 등록 · 1명당 등록 비용)']],
  videos: ['수업 영상', '강사가 수업 일부(10~20분)를 올리면 원장님이 장면마다 코멘트를 남겨요.', ['타임라인 코멘트', '촬영 동의하지 않은 학생 얼굴 자동 가림', '90일 후 자동 삭제']],
  eval: ['강사 평가', '학원이 정한 기준으로 평가하고, 출석률·재등록률과 함께 성장 추이를 봐요.', ['평가 체크리스트 (준비 · 설명 · 참여 · 시간 배분 · 판서)', '강사별 점수 변화', '우수 수업 영상 모음']],
  perks: ['제휴 마켓', '플랫폼이 맺은 MOU 혜택과 제휴를 찾는 학원·기관을 한곳에서 봐요.', ['교재사 · PG사 · 보험사 단체 혜택', '학원 간 패키지 · 셔틀 공동 운영', '방과후 · 기업 위탁']],
  mou: ['내 제휴·서명', '조건을 협의하고 표준 MOU에 전자 서명한 뒤, 할인은 청구서·재정에 자동 반영돼요.', ['제안서 보내기', '전자 서명 · 서류함 보관', '제휴 성과 (유입 원생 · 절감 비용)']],
  attend: ['출결', '1차 시제품의 출결 기능이 이 자리로 옮겨 와요.', []],
  billing: ['수납·청구', '1차 시제품의 수납 기능이 이 자리로 옮겨 와요.', []],
  msg: ['메신저', '1차 시제품의 메신저(공지 · 반 · 1:1 · 강사실)가 이 자리로 옮겨 와요.', []],
  records: ['학생 기록부', '1차 시제품의 기록부 기능이 이 자리로 옮겨 와요.', []],
  finance: ['재정', '1차 시제품의 재정 관리 기능이 이 자리로 옮겨 와요.', []],
  admin: ['교육청 행정', '강사 채용 통보, 교습비 변경 신고 같은 행정 마감을 챙겨요.', []],
  cal: ['일정·시간표', '여러 학원의 시간표와 일정을 한 달력에서 봐요.', []],
  review: ['인증 후기 쓰기', '수강 중인 학부모만 후기를 쓸 수 있어 "인증 후기"로 표시돼요.', []]
};

const params = new URLSearchParams(location.search);
const ROLE = DATA.users[params.get('role')] ? params.get('role') : 'owner';
const ME = DATA.users[ROLE];

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg; t.hidden = false;
  clearTimeout(toast.h); toast.h = setTimeout(() => t.hidden = true, 2200);
}

function renderChrome(page) {
  $('#acad').innerHTML = `<span class="dot">${DATA.academy.short}</span><div><b>${DATA.academy.name}</b><span>${DATA.academy.area} · 원생 ${DATA.academy.students}명</span></div>`;
  const newLeads = DATA.leads.filter(l => l.stage === 'inquiry').length;
  const newVideos = DATA.videos.filter(v => v.status === 'new').length;
  const badge = { leads: ROLE === 'owner' ? newLeads : 0, videos: ROLE === 'owner' ? newVideos : 0, msg: 3 };
  $('#nav').innerHTML = NAV[ROLE].map(g => `
    ${g.group ? `<div class="nav-group">${g.group}</div>` : ''}
    ${g.items.map(([id, label, icon]) => `
      <a class="nav-item ${id === page ? 'on' : ''}" href="#${id}">${ic(icon)}<span>${label}</span>${badge[id] ? `<span class="badge">${badge[id]}</span>` : ''}</a>`).join('')}
  `).join('');
  $('#me').innerHTML = `<span class="av" style="background:${ME.color}">${ME.av}</span><div><b>${ME.name}</b><span>${ME.label}</span></div><a href="login.html">로그아웃</a>`;
  document.title = `${DATA.academy.name} — 학원지원센터`;
}

/* ---------- 원장 홈 ---------- */
function ownerHome() {
  const f = DATA.funnel;
  const rate = Math.round(f.enrolled / f.inquiry * 100);
  const grow = Math.round((f.inquiry - f.lastMonth) / f.lastMonth * 100);
  const newVideos = DATA.videos.filter(v => v.status === 'new');
  const avgScore = (DATA.teachers.reduce((a, t) => a + t.score, 0) / DATA.teachers.length).toFixed(1);
  const steps = [['문의', f.inquiry], ['상담', f.consult], ['체험수업', f.trial], ['등록', f.enrolled]];
  const maxSrc = Math.max(...DATA.sources.map(s => s[1]));
  const urgent = DATA.leads.filter(l => l.urgent || l.stage === 'trial');

  return `
  <div class="page-head">
    <div><h1>안녕하세요, ${ME.name} 원장님</h1><p>${DATA.today} · 이번 달 우리 학원의 성장을 한눈에 확인하세요.</p></div>
    <div class="acts"><a class="btn" href="#marketing">${ic('megaphone')}마케팅 의뢰</a><a class="btn primary" href="#leads">${ic('plus')}상담 등록</a></div>
  </div>

  <div class="kpis">
    <div class="kpi hero">
      <div class="lbl"><span class="ic">${ic('leads')}</span>이번 달 신규 상담</div>
      <div class="val num">${f.inquiry}<small>건</small></div>
      <div class="foot"><span class="chip">▲ ${grow}%</span> 지난달 ${f.lastMonth}건 대비</div>
    </div>
    <div class="kpi">
      <div class="lbl"><span class="ic">${ic('check')}</span>등록 전환율</div>
      <div class="val num">${rate}<small>%</small></div>
      <div class="foot">문의 ${f.inquiry}건 중 ${f.enrolled}명 등록</div>
    </div>
    <div class="kpi">
      <div class="lbl"><span class="ic">${ic('video')}</span>강사 평가</div>
      <div class="val num">${avgScore}<small>/ 5</small></div>
      <div class="foot"><span class="chip warn">피드백 대기 ${newVideos.length}</span></div>
    </div>
    <div class="kpi">
      <div class="lbl"><span class="ic">${ic('handshake')}</span>제휴로 아낀 비용</div>
      <div class="val num">20<small>만 원</small></div>
      <div class="foot">이번 달 · 교재사 MOU</div>
    </div>
  </div>

  <div class="grid2">
    <section class="card">
      <div class="card-head"><div><h2>상담 → 등록 흐름</h2><div class="sub">10월 1일 – 25일 누적</div></div><a href="#leads">상담 관리 열기 →</a></div>
      <div class="funnel">
        ${steps.map(([l, n], i) => `
          <div class="fstep ${i === 3 ? 'last' : ''}">
            <div class="l">${l}</div>
            <div class="n num">${n}</div>
            <div class="r">${i === 0 ? '시작' : `이전 단계의 ${Math.round(n / steps[i - 1][1] * 100)}%`}</div>
            <div class="bar"><span style="width:${n / f.inquiry * 100}%"></span></div>
          </div>`).join('')}
      </div>
      <div class="sources">
        <div class="card-head" style="margin:6px 0 0"><h2 style="font-size:14px">어디서 문의가 왔나요?</h2><span class="sub">문의 · 등록</span></div>
        ${DATA.sources.map(([n, c, e]) => `
          <div class="src"><span>${n}</span><div class="bar"><span style="width:${c / maxSrc * 100}%"></span></div><span class="v"><b>${c}</b> · ${e}명</span></div>`).join('')}
      </div>
    </section>

    <section class="card">
      <div class="card-head"><div><h2>오늘 챙길 상담</h2><div class="sub">연락이 필요하거나 체험수업이 잡힌 학생</div></div></div>
      <div class="list">
        ${urgent.map(l => `
          <div class="li">
            <span class="av" style="background:${l.stage === 'trial' ? '#17a06b' : 'var(--blue-500)'}">${l.name[0]}</span>
            <div><div class="t">${l.name} <span class="muted" style="font-weight:500;font-size:12.5px">${l.grade} · ${l.want}</span></div><div class="d">${l.src} · ${l.next}</div></div>
            <div class="r"><span class="chip ${l.stage === 'trial' ? 'good' : 'crit'}">${l.stage === 'trial' ? '체험수업' : '새 문의'}</span><span class="time">${l.at}</span></div>
          </div>`).join('')}
      </div>
    </section>
  </div>

  <div class="grid2">
    <section class="card">
      <div class="card-head"><div><h2>피드백을 기다리는 수업 영상</h2><div class="sub">강사가 직접 골라 올린 수업 일부예요</div></div><a href="#videos">전체 보기 →</a></div>
      ${newVideos.map(v => `
        <div class="video">
          <div class="thumb"><span class="play">${ic('play', 'icon')}</span><span class="len num">${v.len}</span></div>
          <div>
            <div class="t">${v.title}</div>
            <div class="d">${v.teacher} 강사 · ${v.cls} · ${v.at} 업로드</div>
            <div class="meta"><span class="chip warn">피드백 대기</span>${v.note ? `<span class="chip mute">${v.note}</span>` : ''}</div>
          </div>
        </div>`).join('')}
    </section>

    <section class="card">
      <div class="card-head"><div><h2>강사 평가 추이</h2><div class="sub">최근 평가 평균 · 담당 반 재등록률</div></div><a href="#eval">평가하기 →</a></div>
      <div class="list">
        ${DATA.teachers.map(t => `
          <div class="li">
            <span class="av" style="background:var(--navy-700)">${t.name[0]}</span>
            <div><div class="t">${t.name}</div><div class="d">${t.retention ? `재등록률 ${t.retention}%` : '수습 기간 · 재등록 데이터 없음'}</div></div>
            <div class="r"><b class="num" style="font-size:18px">${t.score}</b><span class="time">${t.trend}</span></div>
          </div>`).join('')}
      </div>
    </section>
  </div>

  <section class="card" style="margin-bottom:16px">
    <div class="card-head"><div><h2>제휴 혜택</h2><div class="sub">플랫폼 MOU와 학원 간 제휴 제안</div></div><a href="#perks">제휴 마켓 →</a></div>
    <div class="grid3">
      ${DATA.perks.map((p, i) => `
        <div class="perk ${p.joined ? 'joined' : ''}">
          <span class="who">${p.who}</span>
          <span class="t">${p.title}</span>
          <span class="d">${p.desc}</span>
          <div class="row">
            ${p.joined ? '<span class="chip good">참여 중</span>' : `<button class="btn sm primary" data-perk="${i}">${p.proposal ? '제안 보기' : '참여하기'}</button>`}
          </div>
        </div>`).join('')}
    </div>
  </section>

  <section class="card">
    <div class="card-head"><div><h2>오늘의 운영</h2><div class="sub">매일 하는 업무는 운영 메뉴에서 처리해요</div></div></div>
    <div class="ops">
      ${DATA.ops.map(o => `<div class="op"><div class="l">${o.l}</div><div class="v num">${o.v}</div><div class="d">${o.d}</div></div>`).join('')}
    </div>
  </section>`;
}

/* ---------- 상담·등록 관리 (칸반) ---------- */
let leadFilter = '전체';
function leadsPage() {
  const srcs = ['전체', ...new Set(DATA.leads.map(l => l.src))];
  const shown = DATA.leads.filter(l => leadFilter === '전체' || l.src === leadFilter);
  return `
  <div class="page-head">
    <div><h1>상담·등록 관리</h1><p>카드를 다음 단계로 끌어다 놓거나 버튼으로 옮기세요. 등록으로 옮기면 원생으로 전환돼요.</p></div>
    <div class="acts"><button class="btn primary" id="addLead">${ic('plus')}새 문의 추가</button></div>
  </div>
  <div class="filters">${srcs.map(s => `<button class="${s === leadFilter ? 'on' : ''}" data-filter="${esc(s)}">${esc(s)}</button>`).join('')}</div>
  <div class="board">
    ${DATA.stages.map((st, si) => {
      const items = shown.filter(l => l.stage === st.id);
      return `
      <div class="col" data-stage="${st.id}">
        <div class="col-head"><b>${st.name}</b><span class="cnt">${items.length}</span></div>
        ${items.map(l => `
          <div class="lead" draggable="true" data-id="${l.id}">
            <div class="top"><span class="nm">${esc(l.name)} <span class="muted" style="font-weight:500;font-size:12.5px">${esc(l.grade)}</span></span>${l.urgent ? '<span class="chip crit">오늘</span>' : ''}</div>
            <div class="d">${esc(l.want)} · ${esc(l.src)}</div>
            <div class="bot"><span class="next">${esc(l.next)}</span>${si < 3 ? `<button class="mv" data-move="${l.id}">${DATA.stages[si + 1].name} →</button>` : '<span class="chip good">원생 전환</span>'}</div>
          </div>`).join('')}
      </div>`;
    }).join('')}
  </div>`;
}

function moveLead(id, stage) {
  const l = DATA.leads.find(x => x.id === +id);
  if (!l || l.stage === stage) return;
  l.stage = stage; l.urgent = false;
  const name = DATA.stages.find(s => s.id === stage).name;
  l.next = stage === 'enrolled' ? '첫 수업 일정 잡기' : stage === 'trial' ? '체험수업 일정 잡기' : '상담 일정 잡기';
  render();
  toast(stage === 'enrolled' ? `${l.name} 학생이 원생으로 등록됐어요` : `${l.name} → ${name} 단계로 옮겼어요`);
}

function bindLeads() {
  document.querySelectorAll('[data-filter]').forEach(b => b.onclick = () => { leadFilter = b.dataset.filter; render(); });
  document.querySelectorAll('[data-move]').forEach(b => b.onclick = () => {
    const l = DATA.leads.find(x => x.id === +b.dataset.move);
    const i = DATA.stages.findIndex(s => s.id === l.stage);
    moveLead(l.id, DATA.stages[i + 1].id);
  });
  document.querySelectorAll('.lead').forEach(c => {
    c.ondragstart = e => { e.dataTransfer.setData('text/plain', c.dataset.id); c.classList.add('dragging'); };
    c.ondragend = () => c.classList.remove('dragging');
  });
  document.querySelectorAll('.col').forEach(col => {
    col.ondragover = e => { e.preventDefault(); col.classList.add('drop'); };
    col.ondragleave = () => col.classList.remove('drop');
    col.ondrop = e => { e.preventDefault(); col.classList.remove('drop'); moveLead(e.dataTransfer.getData('text/plain'), col.dataset.stage); };
  });
  $('#addLead').onclick = () => {
    const name = prompt('학생 이름을 입력하세요');
    if (!name) return;
    DATA.leads.unshift({ id: Date.now(), name, grade: '-', want: '희망 반 미정', src: '직접 입력', stage: 'inquiry', at: '10/25', next: '오늘 전화 필요', urgent: true });
    render(); toast('새 문의를 추가했어요');
  };
}

/* ---------- 강사 · 학부모 홈 (다음 단계에서 채움) ---------- */
function simpleHome() {
  const who = ROLE === 'teacher'
    ? ['김민지 선생님, 안녕하세요', '이번 주 올린 수업 영상과 받은 피드백, 오늘 수업을 여기서 보게 돼요.', ['오늘 수업: 초등 B반 17:00', '피드백 대기 중인 영상 1개', '단어시험 출제 마감 D-1']]
    : ['김은정 어머님, 안녕하세요', '서연이가 다니는 학원 3곳의 일정·수납·알림을 한 화면에서 보게 돼요.', ['오늘: 태권도 15:00 · 영어 17:00', '10월 영어 수강료 납부 D-0', '새 공지 2건']];
  return `
  <div class="page-head"><div><h1>${who[0]}</h1><p>${DATA.today}</p></div></div>
  <div class="soon-card"><div class="ic">${ic('home')}</div><h2>${ROLE === 'teacher' ? '강사' : '학부모'} 화면은 다음 단계에서 다듬어요</h2><p>${who[1]}</p><ul>${who[2].map(x => `<li>${x}</li>`).join('')}</ul></div>`;
}

function soonPage(id) {
  const [title, desc, items] = SOON[id] || ['준비 중', '', []];
  return `
  <div class="page-head"><div><h1>${title}</h1></div></div>
  <div class="soon-card">
    <div class="ic">${ic('doc')}</div>
    <h2>이 화면은 아직 시안 전이에요</h2>
    <p>${desc}</p>
    ${items.length ? `<ul>${items.map(x => `<li>${x}</li>`).join('')}</ul>` : ''}
  </div>`;
}

function render() {
  const page = (location.hash || '#home').slice(1);
  renderChrome(page);
  let html;
  if (page === 'home') html = ROLE === 'owner' ? ownerHome() : simpleHome();
  else if (page === 'leads' && ROLE === 'owner') html = leadsPage();
  else html = soonPage(page);
  $('#view').innerHTML = html;
  if (page === 'leads' && ROLE === 'owner') bindLeads();
  document.querySelectorAll('[data-perk]').forEach(b => b.onclick = () => {
    const p = DATA.perks[b.dataset.perk];
    if (p.proposal) { location.hash = '#mou'; return; }
    p.joined = true; render(); toast(`${p.who} 혜택에 참여했어요`);
  });
  $('#side').classList.remove('open');
}

$('#menuBtn').onclick = () => $('#side').classList.toggle('open');
$('#side').addEventListener('click', e => { if (e.target === $('#side')) $('#side').classList.remove('open'); });
window.addEventListener('hashchange', () => { render(); window.scrollTo(0, 0); });
render();
