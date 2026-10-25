// 플랫폼 화면 — 해시로 페이지를 바꿉니다
// #home → #영역(예: #admin) → #영역/세부(예: #admin/attend) → #영역/세부/항목 순서로 한 단계씩 들어가요
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
  brief: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18"/>',
  grad: '<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c3 2 9 2 12 0v-5"/>',
  play: '<path d="M7 4l13 8-13 8z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  ext: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>'
};
const ic = (name, cls = 'icon') => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICON[name]}</svg>`;

const params = new URLSearchParams(location.search);
// 데모: 첫 화면 데모 버튼(?demo=1&role=…)이나 예전 주소(?role=…)로 들어온 경우. 그 밖엔 실제 로그인이 필요해요.
const DEMO = params.has('demo') || params.has('role');
let ROLE = DATA.users[params.get('role')] ? params.get('role') : 'owner';
let ME = DATA.users[ROLE];
let PROFILE = null; // 실제로 로그인한 회원의 프로필 (데모면 null)
let REAL = null;    // 실제 학원 데이터 { academy, role, students, codes, members } (데모면 null)
const MK = DATA.marketingUrl;

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg; t.hidden = false;
  clearTimeout(toast.h); toast.h = setTimeout(() => t.hidden = true, 2200);
}

/* ---------- 공통 조각 ---------- */
const head = (title, desc, acts = '') => `
  <div class="page-head"><div><h1>${title}</h1>${desc ? `<p>${desc}</p>` : ''}</div>${acts ? `<div class="acts">${acts}</div>` : ''}</div>`;
const bar = (pct, cls = '') => `<div class="pbar ${cls}"><span style="width:${Math.min(100, pct)}%"></span></div>`;
const STEP_CHIP = { todo: ['crit', '작성 필요'], doing: ['warn', '준비 중'], done: ['good', '제출 완료'] };
const teacherName = () => ROLE === 'teacher' ? ME.name : null;

/* ================= 원장 · 행정 지원 ================= */
function attendPage() {
  const sum = DATA.attendance.reduce((a, c) => [a[0] + c.present, a[1] + c.total], [0, 0]);
  return head('출결 관리', `오늘 ${sum[0]}/${sum[1]}명 출석 · 강사가 수업 중에 입력하면 학부모에게 바로 알림이 가요.`) + `
  <section class="card"><div class="list">
    ${DATA.attendance.map(c => `
      <div class="li">
        <span class="av" style="background:var(--navy-700)">${c.cls[0]}</span>
        <div><div class="t">${c.cls} <span class="muted small">${c.time}</span></div>${bar(c.present / c.total * 100)}</div>
        <div class="r"><b class="num">${c.present}/${c.total}</b>${c.absent ? `<span class="chip crit">결석 ${c.absent}</span>` : c.present < c.total ? '<span class="chip warn">입력 전</span>' : '<span class="chip good">전원 출석</span>'}</div>
      </div>`).join('')}
  </div></section>`;
}

function billingPage() {
  const b = DATA.billing;
  return head('수납·청구', `${b.month} 청구 ${b.total}건 중 ${b.paid}건 납부 완료`) + `
  <div class="stats">
    <div class="stat"><span>청구</span><b class="num">${b.total}건</b></div>
    <div class="stat"><span>납부 완료</span><b class="num">${b.paid}건</b></div>
    <div class="stat crit"><span>미납</span><b class="num">${b.unpaidAmount}만 원</b></div>
  </div>
  <section class="card">
    <div class="card-head"><h2>미납 가정</h2><button class="btn sm primary" data-act="remindAll">전체 납부 안내 보내기</button></div>
    <div class="list">
      ${DATA.unpaid.map((u, i) => `
        <div class="li">
          <span class="av" style="background:var(--blue-500)">${u.name[0]}</span>
          <div><div class="t">${u.name} <span class="muted small">${u.cls}</span></div><div class="d">${u.days}일 지남</div></div>
          <div class="r"><b class="num">${u.amount}만 원</b>${u.sent ? '<span class="chip good">안내 보냄</span>' : `<button class="btn sm" data-remind="${i}">안내 보내기</button>`}</div>
        </div>`).join('')}
    </div>
  </section>
  <a class="hint" href="#mou/partners">${ic('handshake')}<span>카드 결제(PG) 제휴를 신청하면 카드 수수료가 내려가요</span><b>제휴 보기 →</b></a>`;
}

function financePage() {
  const f = DATA.finance;
  const max = Math.max(...f.items.map(i => i[1]));
  return head('재정', '10월 1일 – 25일 기준 · 수납과 급여 지급이 자동으로 반영돼요.') + `
  <div class="stats">
    <div class="stat"><span>수입</span><b class="num">${f.income.toLocaleString()}만 원</b></div>
    <div class="stat"><span>지출</span><b class="num">${f.expense.toLocaleString()}만 원</b></div>
    <div class="stat good"><span>남은 금액</span><b class="num">${(f.income - f.expense).toLocaleString()}만 원</b></div>
  </div>
  <section class="card">
    <div class="card-head"><h2>지출 항목</h2></div>
    <div class="rows">
      ${f.items.map(([n, v]) => `<div class="row-bar"><span>${n}</span>${bar(v / max * 100)}<b class="num">${v}만 원</b></div>`).join('')}
    </div>
  </section>
  <a class="hint" href="#mou/mine">${ic('handshake')}<span>교재 공동구매 제휴로 이번 달 교재비 20만 원을 아꼈어요</span><b>내 제휴 →</b></a>`;
}

function paperPage() {
  return head('서류·행정', '교육청·공단에 낼 서류를 마감 순서로 챙겨 드려요. 서식은 학원 정보로 미리 채워져 있어요.') + `
  <section class="card"><div class="list">
    ${DATA.paperwork.map((p, i) => {
      const [c, l] = STEP_CHIP[p.status];
      return `
      <div class="li">
        <span class="av" style="background:${p.status === 'done' ? 'var(--good)' : 'var(--navy-700)'}">${ic('doc')}</span>
        <div><div class="t">${p.title} <span class="muted small">${p.org}</span></div><div class="d">${p.desc}</div></div>
        <div class="r"><span class="chip ${c}">${l}</span><span class="time">마감 ${p.due}</span>${p.status !== 'done' ? `<button class="btn sm primary" data-paper="${i}">제출하기</button>` : ''}</div>
      </div>`;
    }).join('')}
  </div></section>`;
}

/* ================= 원장 · 강사 관리 ================= */
function staffPage() {
  const total = DATA.training.length;
  return head('우리 학원 강사', '센터 교육 이수 현황과 담당 반을 확인해요.') + `
  <section class="card"><div class="list">
    ${DATA.staff.map(s => `
      <div class="li">
        <span class="av" style="background:var(--navy-700)">${s.name[0]}</span>
        <div><div class="t">${s.name} <span class="muted small">${s.cls}</span></div><div class="d">근무 시작 ${s.since}</div></div>
        <div class="r"><span class="time">센터 교육 이수</span><b class="num">${DATA.training.filter(t => t.status[s.name] === 'done').length}/${total}</b></div>
      </div>`).join('')}
  </div></section>
  <a class="hint" href="#teachers/hire">${ic('brief')}<span>강사가 더 필요하세요? 센터 채용 게시판에 공고를 올릴 수 있어요</span><b>강사 채용 →</b></a>`;
}

function trainingList(base) {
  const me = teacherName();
  return `
  <section class="card"><div class="list">
    ${DATA.training.map(t => {
      const sts = Object.values(t.status);
      const done = sts.filter(s => s === 'done').length;
      const right = me
        ? (t.status[me] === 'done' ? '<span class="chip good">이수 완료</span>' : `<span class="chip warn">마감 ${t.due}</span>`)
        : `<b class="num">${done}/${sts.length}명</b>${bar(done / sts.length * 100, 'sm')}`;
      return `
      <a class="li link" href="#${base}/${t.id}">
        <span class="thumb-sm">${ic('play')}</span>
        <div><div class="t">${t.title}</div><div class="d"><span class="chip ${t.cat === '필수' ? 'crit' : 'info'}">${t.cat}</span> ${t.len} · 마감 ${t.due}</div></div>
        <div class="r">${right}</div>
      </a>`;
    }).join('')}
  </div></section>`;
}

function trainingPage() {
  return head('강사 교육', '학원지원센터 본부가 매달 교육 영상을 배부해요. 강사가 시청하고 리플렉션을 쓰면 여기서 확인할 수 있어요.') + trainingList('teachers/training');
}

function trainingDetail(id, base) {
  const t = DATA.training.find(x => x.id === id);
  if (!t) return notFound();
  const me = teacherName();
  const notDone = Object.entries(t.status).filter(([, s]) => s !== 'done').map(([n]) => n);
  const player = `
    <div class="player"><span class="play">${ic('play')}</span><span class="len num">${t.len}</span><span class="by">학원지원센터 교육팀</span></div>`;
  const reflections = `
    <section class="card">
      <div class="card-head"><h2>리플렉션 ${t.reflections.length}개</h2></div>
      ${t.reflections.length ? `<div class="reflects">${t.reflections.map(r => `
        <div class="reflect"><div class="who"><b>${esc(r.who)}</b> <span class="muted small">${r.at}</span></div><p>${esc(r.text)}</p></div>`).join('')}</div>`
        : '<p class="muted small" style="margin:0">아직 작성된 리플렉션이 없어요.</p>'}
    </section>`;

  if (me) {
    const done = t.status[me] === 'done';
    return head(t.title, t.desc) + `
    <div class="grid2">
      <div>${player}</div>
      <section class="card">
        <div class="card-head"><h2>내 리플렉션</h2>${done ? '<span class="chip good">이수 완료</span>' : `<span class="chip warn">마감 ${t.due}</span>`}</div>
        ${done ? '<p class="muted" style="margin:0">제출했어요. 원장님과 센터 교육팀이 확인해요.</p>' : `
        <p class="muted small" style="margin:0 0 10px">영상을 보고 배운 점, 내 수업에 적용할 점을 적어 주세요.</p>
        <textarea id="reflectText" rows="6" placeholder="예: 활동 전환 신호를 정해 두는 방법을 다음 주 수업에 써 보려고 해요."></textarea>
        <button class="btn primary" id="reflectSubmit" style="margin-top:10px">제출하고 이수 완료</button>`}
      </section>
    </div>` + reflections;
  }

  return head(t.title, t.desc, notDone.length ? `<button class="btn" data-nudge="${t.id}">미이수 강사에게 알림</button>` : '') + `
  <div class="grid2">
    <div>${player}</div>
    <section class="card">
      <div class="card-head"><h2>이수 현황</h2><span class="sub">마감 ${t.due}</span></div>
      <div class="list">
        ${Object.entries(t.status).map(([n, s]) => `
          <div class="li"><span class="av" style="background:var(--navy-700)">${n[0]}</span><div class="t">${n}</div>
          <div class="r">${s === 'done' ? '<span class="chip good">이수</span>' : '<span class="chip mute">미이수</span>'}</div></div>`).join('')}
      </div>
    </section>
  </div>` + reflections;
}

function hirePage() {
  const mine = DATA.jobs.filter(j => j.mine);
  return head('강사 채용', '공고는 학원지원센터 강사 채용 게시판에 올라가고, 센터에 가입한 강사들이 바로 지원해요.', `<button class="btn primary" data-act="newJob">${ic('plus')}새 공고 올리기</button>`) +
  mine.map(j => `
  <section class="card" style="margin-bottom:16px">
    <div class="card-head"><div><h2>${esc(j.title)}</h2><div class="sub">${j.type} · ${j.pay} · ${j.hours} · 마감 ${j.due}</div></div><span class="chip info">지원자 ${(j.applicants || []).length}명</span></div>
    ${(j.applicants || []).length ? `<div class="list">${j.applicants.map((a, i) => `
      <div class="li">
        <span class="av" style="background:var(--blue-500)">${a.name[0]}</span>
        <div><div class="t">${a.name}</div><div class="d">${a.career} · ${a.at} 지원</div></div>
        <div class="r"><span class="chip ${a.step.startsWith('면접') ? 'good' : 'mute'}">${a.step}</span>${a.step.startsWith('면접') ? '' : `<button class="btn sm" data-interview="${j.id}:${i}">면접 제안</button>`}</div>
      </div>`).join('')}</div>` : '<p class="muted small" style="margin:0">아직 지원자가 없어요. 보통 3일 안에 첫 지원이 들어와요.</p>'}
  </section>`).join('');
}

/* ================= 원장 · 제휴(MOU) ================= */
let partnerCat = '전체';
const P_STATE = { using: ['good', '이용 중'], applied: ['info', '신청 완료 · 센터 확인 중'] };
function partnersPage() {
  const cats = ['전체', ...new Set(DATA.partners.map(p => p.cat))];
  const shown = DATA.partners.filter(p => partnerCat === '전체' || p.cat === partnerCat);
  return head('제휴처 둘러보기', '학원지원센터가 미리 MOU를 맺어 둔 곳이에요. 따로 협상하거나 계약서를 쓸 필요 없이 신청만 하면 바로 연결돼요.') + `
  <div class="banner">
    <div><span class="pill">유학 제휴 파트너</span><h2>유학은 인투어브로드와 함께해요</h2><p>방학 영어캠프 · 조기유학 · 어학연수 · 해외 대학 진학까지. 우리 학원 학생과 학부모에게 유학 프로그램을 연결해 드려요.</p></div>
    <a class="btn primary" href="${DATA.abroadUrl}" target="_blank" rel="noopener">인투어브로드 바로가기 ${ic('ext')}</a>
  </div>
  <div class="filters">${cats.map(c => `<button class="${c === partnerCat ? 'on' : ''}" data-cat="${c}">${c}</button>`).join('')}</div>
  <div class="grid3">
    ${shown.map(p => `
      <div class="perk ${p.status !== 'none' ? 'joined' : ''}">
        <span class="who">${p.cat} · ${p.name}</span>
        <span class="t">${p.benefit}</span>
        <span class="d">${p.desc}</span>
        <div class="row">${p.status === 'none' ? `<button class="btn sm primary" data-apply="${p.id}">바로 신청</button>` : `<span class="chip ${P_STATE[p.status][0]}">${P_STATE[p.status][1]}</span>`}</div>
      </div>`).join('')}
  </div>`;
}

function myPartnersPage() {
  const mine = DATA.partners.filter(p => p.status !== 'none');
  const saved = mine.reduce((a, p) => a + (p.saved || 0), 0);
  return head('내 제휴', '신청하고 이용 중인 제휴예요. 유학 프로그램 참가 현황과 할인 내역을 함께 봐요.') + `
  <div class="stats">
    <div class="stat"><span>이용 · 신청</span><b class="num">${mine.length}곳</b></div>
    <div class="stat"><span>유학 제휴</span><b class="num">${mine.filter(p => p.cat === '유학').length}곳</b></div>
    <div class="stat good"><span>이번 달 아낀 비용</span><b class="num">${saved}만 원</b></div>
  </div>
  <section class="card"><div class="list">
    ${mine.map(p => `
      <div class="li">
        <span class="av" style="background:var(--blue-600)">${ic('handshake')}</span>
        <div><div class="t">${p.name} <span class="muted small">${p.cat}</span></div><div class="d">${p.benefit}</div></div>
        <div class="r"><span class="chip ${P_STATE[p.status][0]}">${P_STATE[p.status][1]}</span>${p.saved ? `<span class="time">${p.saved}만 원 절감</span>` : p.note ? `<span class="time">${p.note}</span>` : ''}</div>
      </div>`).join('')}
  </div></section>
  <a class="hint" href="#mou/partners">${ic('plus')}<span>다른 제휴처도 둘러보세요</span><b>제휴처 둘러보기 →</b></a>`;
}

/* ================= 원장 · 홍보 지원 ================= */
const mkBanner = () => `
  <div class="banner">
    <div><span class="pill">공식 홍보 파트너</span><h2>홍보는 인투마케팅이 맡아요</h2><p>블로그 · 디자인 · 영상 · SNS 광고까지, 학원 홍보를 전문으로 하는 인투마케팅에 바로 연결해 드려요.</p></div>
    <a class="btn primary" href="${MK}" target="_blank" rel="noopener">인투마케팅 바로가기 ${ic('ext')}</a>
  </div>`;

function servicesPage() {
  return head('홍보 서비스', '필요한 서비스를 골라 의뢰하면 학원 정보가 인투마케팅에 함께 전달돼요.') + mkBanner() + `
  <div class="grid2 even">
    ${DATA.promoServices.map(s => `
      <section class="card svc">
        <div class="svc-ic">${ic(s.icon)}</div>
        <h2>${s.name}</h2>
        <p>${s.desc}</p>
        <ul>${s.items.map(x => `<li>${x}</li>`).join('')}</ul>
        <a class="btn sm primary" href="${MK}" target="_blank" rel="noopener">의뢰하기 ${ic('ext')}</a>
      </section>`).join('')}
  </div>`;
}

function requestsPage() {
  return head('의뢰 현황', '인투마케팅에 맡긴 작업이 어디까지 왔는지 보여 드려요.') + `
  <section class="card"><div class="list">
    ${DATA.promoRequests.map(r => `
      <div class="li">
        <span class="av" style="background:var(--blue-600)">${ic('megaphone')}</span>
        <div><div class="t">${r.title}</div><div class="d">${r.svc} · ${r.at} 의뢰</div>${bar(r.progress)}</div>
        <div class="r"><span class="chip ${r.step.includes('확인') ? 'warn' : 'info'}">${r.step}</span></div>
      </div>`).join('')}
  </div></section>
  <a class="hint" href="#promo/services">${ic('plus')}<span>새 홍보 작업이 필요하세요?</span><b>홍보 서비스 →</b></a>`;
}

/* ================= 원장 · 학생·학부모 관리 ================= */
function leadsPage() {
  return head('상담·등록', '카드를 다음 단계로 끌어다 놓거나 버튼으로 옮기세요. 등록으로 옮기면 원생 명단에 추가돼요.', `<button class="btn primary" data-act="addLead">${ic('plus')}새 문의 추가</button>`) + `
  <div class="board">
    ${DATA.stages.map((st, si) => {
      const items = DATA.leads.filter(l => l.stage === st.id);
      return `
      <div class="col" data-stage="${st.id}">
        <div class="col-head"><b>${st.name}</b><span class="cnt">${items.length}</span></div>
        ${items.map(l => `
          <div class="lead" draggable="true" data-id="${l.id}">
            <div class="top"><span class="nm">${esc(l.name)} <span class="muted small">${esc(l.grade)}</span></span>${l.urgent ? '<span class="chip crit">오늘</span>' : ''}</div>
            <div class="d">${esc(l.want)} · ${esc(l.src)}</div>
            <div class="bot"><span class="next">${esc(l.next)}</span>${si < 3 ? `<button class="mv" data-move="${l.id}">${DATA.stages[si + 1].name} →</button>` : '<span class="chip good">원생 등록</span>'}</div>
          </div>`).join('')}
      </div>`;
    }).join('')}
  </div>`;
}

function studentsPage() {
  if (REAL) return realStudentsPage();
  return head('원생 명단', `원생 ${DATA.academy.students}명 중 일부 · 학부모 연락처와 출석률, 수납 상태를 함께 봐요.`) + `
  <section class="card"><div class="table">
    <div class="tr th"><span>학생</span><span>반</span><span>학부모</span><span>출석률</span><span>10월 수납</span></div>
    ${DATA.students.map(s => `
      <div class="tr"><span><b>${s.name}</b> <span class="muted small">${s.grade}</span></span><span>${s.cls}</span><span>${s.parent} <span class="muted small">${s.phone}</span></span><span class="num">${s.attend}%</span><span>${s.paid ? '<span class="chip good">완료</span>' : '<span class="chip crit">미납</span>'}</span></div>`).join('')}
  </div></section>`;
}

/* ---------- 실제 데이터: 원생 명단 (Supabase students) ---------- */
function realStudentsPage() {
  const list = REAL.students, canEdit = ROLE === 'owner';
  const add = canEdit ? `<button class="btn primary" data-act="addStudent">${ic('plus')}원생 추가</button>` : '';
  const body = list.length ? `
  <section class="card"><div class="table">
    <div class="tr th sv"><span>학생</span><span>반</span><span>학부모</span><span>메모</span><span></span></div>
    ${list.map(s => `
      <div class="tr sv">
        <span><b>${esc(s.name)}</b> <span class="muted small">${esc(s.grade || '')}</span></span>
        <span>${esc(s.class_name || '-')}</span>
        <span>${esc(s.parent_name || '-')} <span class="muted small">${esc(s.parent_phone || '')}</span></span>
        <span class="muted small">${esc(s.memo || '')}</span>
        <span>${canEdit ? `<button class="btn sm" data-edit-student="${s.id}">수정</button>` : ''}</span>
      </div>`).join('')}
  </div></section>` : `
  <section class="card empty">
    <span class="tile-ic">${ic('users')}</span>
    <h2>아직 원생이 없어요</h2>
    <p class="muted">원생을 추가하면 여기에 모여요. 학부모님은 초대 코드로 학부모 앱에 들어올 수 있어요.</p>
    ${add}
  </section>`;
  return head('원생 명단', `원생 ${list.length}명 · 학생과 학부모 연락처를 한곳에 모아요.`, list.length ? add : '') + body +
    (canEdit ? `<a class="hint" href="#members/invite">${ic('users')}<span>강사님·학부모님을 학원에 초대하려면 초대 코드를 보내 주세요</span><b>초대 코드 →</b></a>` : '');
}

const CODE_INFO = {
  owner: ['원장용', '다른 원장님·부원장님이 가입할 때 넣는 코드예요. 꼭 필요한 분께만 알려 주세요.'],
  teacher: ['강사용', '강사님이 가입할 때 넣는 코드예요.'],
  family: ['학부모·학생용', '학부모님과 학생이 가입할 때 넣는 코드예요. 공지에 함께 보내면 편해요.']
};
function invitePage() {
  const codes = REAL ? REAL.codes : [{ kind: 'owner', code: 'DEMO0WNR' }, { kind: 'teacher', code: 'DEMOTCHR' }, { kind: 'family', code: 'DEMOFAMY' }];
  const people = REAL ? REAL.members : [{ name: ME.name, role: 'owner' }, { name: '김민지', role: 'teacher' }, { name: '김은정', role: 'parent' }];
  return head('초대 코드', '사이트에서 가입할 때 이 코드를 넣으면 우리 학원에 합류해요. 어떤 코드로 들어오는지에 따라 역할이 정해져요.') + `
  <div class="codes">${codes.map(c => `
    <div class="code-card">
      <span class="who">${CODE_INFO[c.kind][0]}</span>
      <b class="num">${esc(c.code)}</b>
      <p>${CODE_INFO[c.kind][1]}</p>
      <button class="btn sm" data-copy="${esc(c.code)}">코드 복사</button>
    </div>`).join('')}
  </div>
  <section class="card" style="margin-top:16px">
    <div class="card-head"><h2>우리 학원 사람들</h2><span class="sub">${people.length}명</span></div>
    <div class="list">${people.map(p => `
      <div class="li"><span class="av" style="background:var(--navy-700)">${esc(p.name[0])}</span><div class="t">${esc(p.name)}</div><div class="r"><span class="chip ${p.role === 'owner' ? 'info' : 'mute'}">${ROLE_NAMES[p.role]}</span></div></div>`).join('')}
    </div>
  </section>`;
}

// 원생 추가·수정 창
function studentDialog(s) {
  const d = $('#dlg') || document.body.appendChild(Object.assign(document.createElement('dialog'), { id: 'dlg' }));
  const v = k => esc((s && s[k]) || '');
  d.innerHTML = `
  <form method="dialog" class="dlg" id="stuForm" novalidate>
    <h2>${s ? '원생 정보 고치기' : '원생 추가'}</h2>
    <div class="two"><label class="f">이름 *<input name="name" value="${v('name')}" maxlength="50" required></label><label class="f">학년<input name="grade" value="${v('grade')}" maxlength="20" placeholder="예: 초5"></label></div>
    <label class="f">반<input name="class_name" value="${v('class_name')}" maxlength="50" placeholder="예: 초등 B반"></label>
    <div class="two"><label class="f">학부모 이름<input name="parent_name" value="${v('parent_name')}" maxlength="50"></label><label class="f">학부모 연락처<input name="parent_phone" value="${v('parent_phone')}" maxlength="30" type="tel" placeholder="010-0000-0000"></label></div>
    <label class="f">메모<input name="memo" value="${v('memo')}" maxlength="500"></label>
    <p class="msg" id="stuMsg" hidden></p>
    <div class="acts">${s ? '<button type="button" class="btn danger" id="stuDel">삭제</button>' : ''}<span style="flex:1"></span><button type="button" class="btn" id="stuCancel">취소</button><button class="btn primary">저장</button></div>
  </form>`;
  d.showModal();
  $('#stuCancel').onclick = () => d.close();
  $('#stuForm').onsubmit = async e => {
    e.preventDefault();
    const el = e.target.elements, row = {};
    ['name', 'grade', 'class_name', 'parent_name', 'parent_phone', 'memo'].forEach(k => row[k] = el[k].value.trim() || null);
    const msg = $('#stuMsg');
    if (!row.name) { msg.textContent = '이름을 적어 주세요.'; msg.hidden = false; return; }
    const q = s ? SB.from('students').update(row).eq('id', s.id) : SB.from('students').insert({ ...row, academy_id: REAL.academy.id });
    const { error } = await q;
    if (error) { msg.textContent = '저장하지 못했어요. 잠시 후 다시 시도해 주세요.'; msg.hidden = false; return; }
    d.close(); await loadStudents(); render(); toast(s ? '원생 정보를 고쳤어요' : `${row.name} 학생을 추가했어요`);
  };
  if (s) $('#stuDel').onclick = async () => {
    if (!confirm(`${s.name} 학생을 명단에서 삭제할까요?`)) return;
    const { error } = await SB.from('students').delete().eq('id', s.id);
    if (error) { toast('삭제하지 못했어요'); return; }
    d.close(); await loadStudents(); render(); toast('삭제했어요');
  };
}

function noticesPage() {
  return head('학부모 공지', '공지를 보내면 학부모 앱에 알림이 가고, 누가 읽었는지 확인할 수 있어요.', `<button class="btn primary" data-act="newNotice">${ic('plus')}새 공지 쓰기</button>`) + `
  <section class="card"><div class="list">
    ${DATA.notices.map(n => `
      <div class="li">
        <span class="av" style="background:var(--blue-500)">${ic('chat')}</span>
        <div><div class="t">${esc(n.title)}</div><div class="d">${esc(n.to)} · ${n.at}</div></div>
        <div class="r"><span class="time">읽음</span><b class="num">${n.read}/${n.total}</b></div>
      </div>`).join('')}
  </div></section>`;
}

/* ================= 강사 화면 ================= */
function jobsPage() {
  return head('채용 공고', '학원지원센터에 가입한 학원들의 강사 채용 공고예요. 프로필과 교육 이수 기록이 함께 전달돼요.') + `
  <section class="card"><div class="list">
    ${DATA.jobs.map(j => `
      <div class="li">
        <span class="av" style="background:var(--navy-700)">${j.academy[0]}</span>
        <div><div class="t">${esc(j.title)}</div><div class="d">${j.academy} · ${j.area} · ${j.pay} · ${j.hours}</div></div>
        <div class="r">${j.applied ? '<span class="chip good">지원 완료</span>' : `<button class="btn sm primary" data-applyjob="${j.id}">지원하기</button>`}<span class="time">마감 ${j.due}</span></div>
      </div>`).join('')}
  </div></section>`;
}

/* ================= 학부모 화면 ================= */
function kidSchedulePage() {
  const c = DATA.child;
  return head('오늘 일정·숙제', `${c.name} · 다니는 학원 ${c.academies}곳`) + `
  <div class="grid2 even">
    <section class="card"><div class="card-head"><h2>오늘 일정</h2></div><div class="list">
      ${c.today.map(t => `<div class="li"><span class="av time-av num">${t.time}</span><div><div class="t">${t.what}</div><div class="d">${t.where}</div></div><span></span></div>`).join('')}
    </div></section>
    <section class="card"><div class="card-head"><h2>숙제</h2></div>${homeworkList()}</section>
  </div>`;
}

function kidRecordPage() {
  const r = DATA.child.record;
  return head('기록·성적', '하늘영어학원 · 초등 B반') + `
  <div class="stats">
    <div class="stat good"><span>이번 달 출석률</span><b class="num">${r.attend}%</b></div>
    <div class="stat"><span>최근 시험</span><b>${r.lastTest}</b></div>
  </div>
  <section class="card"><div class="card-head"><h2>선생님 코멘트</h2></div><p style="margin:0">${r.comment}</p></section>`;
}

function kidBillsPage() {
  return head('수납', '학원 세 곳의 수강료를 한 번에 확인하고 낼 수 있어요.') + `
  <section class="card"><div class="list">
    ${DATA.child.bills.map((b, i) => `
      <div class="li">
        <span class="av" style="background:var(--navy-700)">${b.acad[0]}</span>
        <div><div class="t">${b.acad}</div><div class="d">${b.month} 수강료</div></div>
        <div class="r"><b class="num">${b.amount}만 원</b>${b.paid ? '<span class="chip good">납부 완료</span>' : `<button class="btn sm primary" data-pay="${i}">결제하기</button>`}</div>
      </div>`).join('')}
  </div></section>`;
}

function newsPage() {
  return head('학원 소식', '학원에서 보낸 공지예요.') + `
  <section class="card"><div class="list">
    ${DATA.notices.filter(n => n.to === '전체 학부모').concat([{ title: '10월 수강료 납부 안내', to: '하늘영어학원', at: '10/20' }]).map(n => `
      <div class="li"><span class="av" style="background:var(--blue-500)">${ic('chat')}</span><div><div class="t">${esc(n.title)}</div><div class="d">${n.at}</div></div><span></span></div>`).join('')}
  </div></section>`;
}

function homeworkList() {
  return `<div class="checks">${DATA.child.homework.map((h, i) => `
    <label class="chk ${h.done ? 'done' : ''}"><input type="checkbox" data-hw="${i}" ${h.done ? 'checked' : ''}><span><b>${h.what}</b><small>${h.acad}</small></span></label>`).join('')}</div>`;
}

/* ================= 역할별 메뉴 구조 =================
   영역(area) → 세부(subs) 두 단계. subs가 없으면 영역 화면이 바로 열려요. */
const AREAS = {
  owner: {
    admin: { name: '행정 지원', icon: 'shield', desc: '출결·수납·재정·서류 처리를 한곳에서', stat: () => `행정 마감 D-0 · 미납 ${DATA.unpaid.length}건`,
      subs: {
        attend: { name: '출결 관리', icon: 'attend', desc: '반별 오늘 출석과 결석 알림', stat: () => { const s = DATA.attendance.reduce((a, c) => [a[0] + c.present, a[1] + c.total], [0, 0]); return `오늘 ${s[0]}/${s[1]}명`; }, render: attendPage },
        billing: { name: '수납·청구', icon: 'card', desc: '청구서 발송과 미납 안내', stat: () => `미납 ${DATA.unpaid.filter(u => !u.sent).length}건`, render: billingPage },
        finance: { name: '재정', icon: 'chart', desc: '수입·지출과 남은 금액', stat: () => `이번 달 +${DATA.finance.income - DATA.finance.expense}만 원`, render: financePage },
        paper: { name: '서류·행정', icon: 'doc', desc: '교육청·공단 신고 서류', stat: () => `작성 필요 ${DATA.paperwork.filter(p => p.status === 'todo').length}건`, render: paperPage }
      } },
    teachers: { name: '강사 관리', icon: 'grad', desc: '센터 강사 교육과 채용까지', stat: () => `교육 미이수 ${DATA.training.reduce((a, t) => a + Object.values(t.status).filter(s => s !== 'done').length, 0)}건 · 지원자 ${DATA.jobs.filter(j => j.mine).reduce((a, j) => a + (j.applicants || []).length, 0)}명`,
      subs: {
        staff: { name: '우리 학원 강사', icon: 'users', desc: '담당 반과 교육 이수 현황', stat: () => `${DATA.staff.length}명`, render: staffPage },
        training: { name: '강사 교육', icon: 'video', desc: '본부 교육 영상과 강사 리플렉션', stat: () => `영상 ${DATA.training.length}개`, render: trainingPage, detail: id => trainingDetail(id, 'teachers/training') },
        hire: { name: '강사 채용', icon: 'brief', desc: '공고 올리기와 지원자 관리', stat: () => `지원자 ${DATA.jobs.filter(j => j.mine).reduce((a, j) => a + (j.applicants || []).length, 0)}명`, render: hirePage }
      } },
    members: { name: '학생·학부모 관리', icon: 'users', desc: '상담·등록부터 원생 명단, 학부모 공지까지', stat: () => `새 문의 ${DATA.leads.filter(l => l.stage === 'inquiry').length}건`,
      subs: {
        leads: { name: '상담·등록', icon: 'leads', desc: '문의 → 상담 → 체험수업 → 등록', stat: () => `진행 중 ${DATA.leads.filter(l => l.stage !== 'enrolled').length}명`, render: leadsPage },
        students: { name: '원생 명단', icon: 'users', desc: '학생·학부모 연락처, 출석, 수납', stat: () => `원생 ${DATA.academy.students}명`, render: studentsPage },
        invite: { name: '초대 코드', icon: 'plus', desc: '원장·강사·학부모를 우리 학원에 초대', stat: () => REAL ? `함께하는 사람 ${REAL.members.length}명` : '코드 3종류', render: invitePage },
        notices: { name: '학부모 공지', icon: 'chat', desc: '공지 보내고 읽음 확인', stat: () => `이번 달 ${DATA.notices.length}건`, render: noticesPage }
      } },
    mou: { name: '제휴(MOU)', icon: 'handshake', desc: '유학·캠프 등 센터가 맺어 둔 제휴를 바로 신청', stat: () => `이용 중 ${DATA.partners.filter(p => p.status === 'using').length}곳 · 신청 가능 ${DATA.partners.filter(p => p.status === 'none').length}곳`,
      subs: {
        partners: { name: '제휴처 둘러보기', icon: 'handshake', desc: '유학 · 캠프 · 어학연수와 그 밖의 제휴', stat: () => `${DATA.partners.length}곳`, render: partnersPage },
        mine: { name: '내 제휴', icon: 'check', desc: '이용 중인 제휴와 아낀 비용', stat: () => `${DATA.partners.filter(p => p.status !== 'none').length}곳`, render: myPartnersPage }
      } },
    promo: { name: '홍보 지원', icon: 'megaphone', desc: '블로그·디자인·영상을 인투마케팅이 지원', stat: () => `진행 중 의뢰 ${DATA.promoRequests.length}건`,
      subs: {
        services: { name: '홍보 서비스', icon: 'megaphone', desc: '블로그 · 디자인 · 영상 · SNS 광고', stat: () => '인투마케팅 연결', render: servicesPage },
        requests: { name: '의뢰 현황', icon: 'check', desc: '맡긴 작업의 진행 상황', stat: () => `${DATA.promoRequests.length}건`, render: requestsPage }
      } }
  },
  teacher: {
    learn: { name: '강사 교육', icon: 'video', desc: '본부 교육 영상 시청과 리플렉션', stat: () => `남은 교육 ${DATA.training.filter(t => t.status[ME.name] !== 'done').length}개`,
      render: () => head('강사 교육', '학원지원센터 본부에서 배부한 교육 영상이에요. 시청하고 리플렉션을 쓰면 이수 완료돼요.') + trainingList('learn'), detail: id => trainingDetail(id, 'learn') },
    jobs: { name: '채용 공고', icon: 'brief', desc: '센터 가입 학원들의 강사 채용', stat: () => `공고 ${DATA.jobs.length}건`, render: jobsPage }
  },
  parent: {
    kid: { name: '우리 아이', icon: 'grad', desc: '일정·숙제, 기록, 수납을 한 번에', stat: () => `${DATA.child.name} · 학원 ${DATA.child.academies}곳`,
      subs: {
        schedule: { name: '일정·숙제', icon: 'cal', desc: '오늘 일정과 숙제', stat: () => `오늘 ${DATA.child.today.length}개`, render: kidSchedulePage },
        record: { name: '기록·성적', icon: 'doc', desc: '출석률·시험·선생님 코멘트', stat: () => `출석 ${DATA.child.record.attend}%`, render: kidRecordPage },
        bills: { name: '수납', icon: 'card', desc: '학원별 수강료 결제', stat: () => { const n = DATA.child.bills.filter(b => !b.paid).length; return n ? `낼 금액 ${n}건` : '모두 납부'; }, render: kidBillsPage }
      } },
    news: { name: '학원 소식', icon: 'chat', desc: '학원 공지와 안내', stat: () => '새 공지 2건', render: newsPage }
  },
  student: {}
};
let MY = AREAS[ROLE];

/* ---------- 홈 ---------- */
function tiles() {
  return `<div class="tiles ${Object.keys(MY).length === 5 ? 'five' : ''}">${Object.entries(MY).map(([id, a]) => `
    <a class="tile" href="#${id}">
      <span class="tile-ic">${ic(a.icon)}</span>
      <b>${a.name}</b>
      <span class="d">${a.desc}</span>
      <span class="stat-line">${a.stat()}</span>
      <span class="go">열기 →</span>
    </a>`).join('')}</div>`;
}

function todo(items) {
  return `<section class="card todo"><div class="card-head"><h2>오늘 챙길 일</h2><span class="sub">${items.length}건</span></div><div class="list">
    ${items.map(([t, d, href, chip]) => `
      <a class="li link" href="${href}"><span class="dotmark"></span><div><div class="t">${t}</div><div class="d">${d}</div></div><div class="r">${chip}</div></a>`).join('')}
  </div></section>`;
}

function home() {
  if (ROLE === 'owner') {
    const urgent = DATA.leads.filter(l => l.urgent).length;
    return head(`안녕하세요, ${ME.name} 원장님`, `${DATA.today} · 학원 운영에 필요한 지원을 다섯 가지로 묶었어요.`) +
      todo([
        ['강사 채용 통보 서류 제출', '교육청 · 서식이 미리 채워져 있어요', '#admin/paper', '<span class="chip crit">D-0</span>'],
        [`새 문의 ${urgent}건에 전화하기`, '네이버 플레이스 · 전단지', '#members/leads', '<span class="chip crit">오늘</span>'],
        ['설명회 전단지 시안 확인', '인투마케팅 · 디자인 지원', '#promo/requests', '<span class="chip warn">확인 필요</span>'],
        [`김민지 강사 교육 미이수 ${DATA.training.filter(t => t.status['김민지'] !== 'done').length}건`, '센터 교육 영상 · 가장 빠른 마감 10/31', '#teachers/training', '<span class="chip mute">알림 보내기</span>']
      ]) + `<h2 class="sec-title">무엇을 도와드릴까요?</h2>` + tiles();
  }
  if (ROLE === 'teacher') {
    const left = DATA.training.filter(t => t.status[ME.name] !== 'done');
    return head(`${ME.name} 선생님, 안녕하세요`, `${DATA.today} · ${DATA.academy.name} 초등 A·B반`) +
      todo(left.slice(0, 2).map(t => [t.title, `센터 교육 영상 · ${t.len}`, `#learn/${t.id}`, `<span class="chip warn">마감 ${t.due}</span>`])
        .concat([['오늘 수업 · 초등 B반 17:00', '출결은 수업 중에 입력해 주세요', '#home', '<span class="chip info">오늘</span>']])) +
      `<h2 class="sec-title">바로 가기</h2>` + tiles();
  }
  if (ROLE === 'parent') {
    const c = DATA.child;
    return head(`${ME.name} 님, 안녕하세요`, `${DATA.today} · ${c.name}(${c.grade})의 학원 ${c.academies}곳을 한 화면에서 봐요.`) +
      todo([
        ['10월 하늘영어학원 수강료', '30만 원 · 오늘까지', '#kid/bills', '<span class="chip crit">D-0</span>'],
        [`오늘 일정 ${c.today.length}개`, c.today.map(t => `${t.time} ${t.what.split(' ·')[0]}`).join(' · '), '#kid/schedule', '<span class="chip info">오늘</span>'],
        ['11월 학부모 설명회 안내', '하늘영어학원 공지', '#news', '<span class="chip mute">새 공지</span>']
      ]) + `<h2 class="sec-title">바로 가기</h2>` + tiles();
  }
  // 학생
  const c = DATA.child;
  return head(`${ME.name}, 오늘도 힘내요!`, DATA.today) + `
  <div class="grid2 even">
    <section class="card"><div class="card-head"><h2>오늘 학원</h2></div><div class="list">
      ${c.today.map(t => `<div class="li"><span class="av time-av num">${t.time}</span><div><div class="t">${t.what}</div><div class="d">${t.where}</div></div><span></span></div>`).join('')}
    </div></section>
    <section class="card"><div class="card-head"><h2>오늘 할 숙제</h2><span class="sub">다 하면 체크!</span></div>${homeworkList()}</section>
  </div>`;
}

/* ---------- 영역 첫 화면 (세부 메뉴 고르기) ---------- */
function areaIndex(id, a) {
  return head(a.name, a.desc) + `<div class="tiles">${Object.entries(a.subs).map(([sid, s]) => `
    <a class="tile" href="#${id}/${sid}">
      <span class="tile-ic">${ic(s.icon)}</span>
      <b>${s.name}</b>
      <span class="d">${s.desc}</span>
      <span class="stat-line">${s.stat()}</span>
      <span class="go">열기 →</span>
    </a>`).join('')}</div>`;
}

const notFound = () => head('페이지를 찾을 수 없어요', '') + '<a class="btn" href="#home">홈으로</a>';

/* ---------- 경로 해석 ---------- */
function resolve(parts) {
  const [aid, sid, item] = parts;
  const crumbs = [['홈', '#home']];
  if (aid === 'home' || !aid) return { html: home(), crumbs: [], area: 'home' };
  const a = MY[aid];
  if (!a) return { html: notFound(), crumbs, area: '' };
  crumbs.push([a.name, `#${aid}`]);
  if (!a.subs) {
    // 하위 메뉴가 없는 영역: #영역 → #영역/항목
    if (sid && a.detail) {
      const t = DATA.training.find(x => x.id === sid);
      crumbs.push([t ? t.title : '', '']);
      return { html: a.detail(sid), crumbs, area: aid };
    }
    return { html: a.render(), crumbs, area: aid };
  }
  if (!sid) return { html: areaIndex(aid, a), crumbs, area: aid };
  const s = a.subs[sid];
  if (!s) return { html: notFound(), crumbs, area: aid };
  crumbs.push([s.name, `#${aid}/${sid}`]);
  if (item && s.detail) {
    const t = DATA.training.find(x => x.id === item);
    crumbs.push([t ? t.title : '', '']);
    return { html: s.detail(item), crumbs, area: aid };
  }
  return { html: s.render(), crumbs, area: aid };
}

function renderChrome(area) {
  $('#acad').innerHTML = ROLE === 'parent' || ROLE === 'student'
    ? `<span class="dot">${DATA.child.name[1]}</span><div><b>${DATA.child.name} (${DATA.child.grade})</b><span>학원 ${DATA.child.academies}곳</span></div>`
    : `<span class="dot">${DATA.academy.short}</span><div><b>${DATA.academy.name}</b><span>${DATA.academy.area} · 원생 ${DATA.academy.students}명</span></div>`;
  // 숫자 배지는 아직 예시 데이터라 실제 로그인에서는 숨겨요
  const badge = REAL ? {} : {
    members: DATA.leads.filter(l => l.urgent).length,
    learn: DATA.training.filter(t => t.status[ME.name] !== 'done').length
  };
  const items = [['home', '홈', 'home'], ...Object.entries(MY).map(([id, a]) => [id, a.name, a.icon])];
  $('#nav').innerHTML = items.map(([id, label, icon]) => `
    <a class="nav-item ${id === area ? 'on' : ''}" href="#${id}">${ic(icon)}<span>${label}</span>${badge[id] && ROLE !== 'parent' ? `<span class="badge">${badge[id]}</span>` : ''}</a>`).join('');
  $('#me').innerHTML = `<span class="av" style="background:${ME.color}">${ME.av}</span><div><b>${ME.name}</b><span>${ME.label}</span></div><a href="index.html" id="logout">로그아웃</a>`;
  $('#logout').onclick = async e => {
    if (!PROFILE || !SB) return;
    e.preventDefault(); await SB.auth.signOut(); location.href = 'index.html';
  };
  document.title = `${ROLE === 'owner' || ROLE === 'teacher' ? DATA.academy.name : ME.name} — 학원지원센터`;
}

function render() {
  const parts = (location.hash || '#home').slice(1).split('/');
  const r = resolve(parts);
  renderChrome(r.area);
  const crumbs = r.crumbs.length ? `<nav class="crumbs">${r.crumbs.map(([l, h], i) =>
    i < r.crumbs.length - 1 ? `<a href="${h}">${esc(l)}</a><span>›</span>` : `<b>${esc(l)}</b>`).join('')}</nav>` : '';
  // 실제 데이터로 연결된 화면이 아니면 "예시"라고 알려 줘요
  const realPages = ['members/students', 'members/invite'];
  const isReal = realPages.includes(parts.slice(0, 2).join('/'));
  const note = PROFILE && !isReal ? `<div class="demo-note">${ROLE === 'owner'
    ? '원생 명단 · 초대 코드는 실제 데이터예요. 나머지 화면은 아직 예시예요.'
    : '지금 보이는 내용은 아직 예시예요. 실제 데이터는 차례로 연결돼요.'}</div>` : '';
  $('#view').innerHTML = note + crumbs + r.html;
  bind();
  $('#side').classList.remove('open');
}

/* ---------- 버튼 동작 ---------- */
function on(sel, fn) { document.querySelectorAll(sel).forEach(el => el.onclick = e => fn(el, e)); }

function bind() {
  // 원생 명단 · 초대 코드 (실제 데이터)
  on('[data-act="addStudent"]', () => REAL ? studentDialog(null) : toast('데모에서는 추가할 수 없어요'));
  on('[data-edit-student]', b => studentDialog(REAL.students.find(s => s.id === b.dataset.editStudent)));
  on('[data-copy]', b => navigator.clipboard.writeText(b.dataset.copy).then(() => toast('코드를 복사했어요'), () => toast(b.dataset.copy)));
  // 수납
  on('[data-remind]', b => { DATA.unpaid[b.dataset.remind].sent = true; render(); toast('납부 안내를 보냈어요'); });
  on('[data-act="remindAll"]', () => { DATA.unpaid.forEach(u => u.sent = true); render(); toast(`미납 ${DATA.unpaid.length}가정에 안내를 보냈어요`); });
  // 서류
  on('[data-paper]', b => { const p = DATA.paperwork[b.dataset.paper]; p.status = 'done'; render(); toast(`${p.title} 서류를 제출했어요`); });
  // 강사 교육
  on('[data-nudge]', () => toast('미이수 강사에게 알림을 보냈어요'));
  const submit = $('#reflectSubmit');
  if (submit) submit.onclick = () => {
    const text = $('#reflectText').value.trim();
    if (!text) { toast('리플렉션을 적어 주세요'); return; }
    const t = DATA.training.find(x => x.id === location.hash.split('/').pop());
    t.reflections.push({ who: ME.name, at: '10/25', text });
    t.status[ME.name] = 'done';
    render(); toast('제출했어요 · 이수 완료');
  };
  // 채용
  on('[data-act="newJob"]', () => {
    const title = prompt('공고 제목을 입력하세요', '중등 영어 강사 (파트타임)');
    if (!title) return;
    DATA.jobs.unshift({ id: 'j' + Date.now(), academy: DATA.academy.name, mine: true, title, area: DATA.academy.area, type: '파트타임', pay: '협의', hours: '협의', due: '11/25', applicants: [] });
    render(); toast('센터 채용 게시판에 공고를 올렸어요');
  });
  on('[data-interview]', b => { const [jid, i] = b.dataset.interview.split(':'); const a = DATA.jobs.find(j => j.id === jid).applicants[i]; a.step = '면접 제안 보냄'; render(); toast(`${a.name} 님께 면접을 제안했어요`); });
  on('[data-applyjob]', b => { const j = DATA.jobs.find(x => x.id === b.dataset.applyjob); j.applied = true; render(); toast(`${j.academy}에 지원서를 보냈어요`); });
  // 제휴
  on('[data-cat]', b => { partnerCat = b.dataset.cat; render(); });
  on('[data-apply]', b => { const p = DATA.partners.find(x => x.id === b.dataset.apply); p.status = 'applied'; render(); toast(`${p.name} 제휴를 신청했어요 · 센터가 1일 안에 연결해 드려요`); });
  // 학생·학부모
  on('[data-act="newNotice"]', () => {
    const title = prompt('공지 제목을 입력하세요');
    if (!title) return;
    DATA.notices.unshift({ title, to: '전체 학부모', at: '10/25', read: 0, total: DATA.academy.students });
    render(); toast('학부모 앱으로 공지를 보냈어요');
  });
  on('[data-act="addLead"]', () => {
    const name = prompt('학생 이름을 입력하세요');
    if (!name) return;
    DATA.leads.unshift({ id: Date.now(), name, grade: '-', want: '희망 반 미정', src: '직접 입력', stage: 'inquiry', next: '오늘 전화 필요', urgent: true });
    render(); toast('새 문의를 추가했어요');
  });
  on('[data-move]', b => {
    const l = DATA.leads.find(x => x.id === +b.dataset.move);
    moveLead(l.id, DATA.stages[DATA.stages.findIndex(s => s.id === l.stage) + 1].id);
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
  // 학부모 · 학생
  on('[data-pay]', b => { DATA.child.bills[b.dataset.pay].paid = true; render(); toast('결제했어요'); });
  document.querySelectorAll('[data-hw]').forEach(c => c.onchange = () => { DATA.child.homework[c.dataset.hw].done = c.checked; render(); });
}

function moveLead(id, stage) {
  const l = DATA.leads.find(x => x.id === +id);
  if (!l || l.stage === stage) return;
  l.stage = stage; l.urgent = false;
  l.next = stage === 'enrolled' ? '첫 수업 일정 잡기' : stage === 'trial' ? '체험수업 일정 잡기' : '상담 일정 잡기';
  render();
  toast(stage === 'enrolled' ? `${l.name} 학생이 원생으로 등록됐어요` : `${l.name} → ${DATA.stages.find(s => s.id === stage).name} 단계로 옮겼어요`);
}

$('#menuBtn').onclick = () => $('#side').classList.toggle('open');
$('#side').addEventListener('click', e => { if (e.target === $('#side')) $('#side').classList.remove('open'); });
window.addEventListener('hashchange', () => { if (MY) { render(); window.scrollTo(0, 0); } });

/* ---------- 시작: 데모면 바로, 아니면 Supabase 로그인 확인 ---------- */
const ROLE_NAMES = { owner: '원장', teacher: '강사', parent: '학부모', student: '학생' };

function useProfile() {
  ROLE = PROFILE.role; MY = AREAS[ROLE];
  const nm = esc(PROFILE.name || PROFILE.username || '회원');
  ME = { ...DATA.users[ROLE], name: nm, av: nm[0], label: ROLE_NAMES[ROLE] };
  if (PROFILE.academy_name && (ROLE === 'owner' || ROLE === 'teacher')) {
    DATA.academy.name = esc(PROFILE.academy_name); DATA.academy.short = DATA.academy.name[0];
  }
}

// 구글로 처음 가입하면 역할이 없어서, 한 번만 고르게 해요
function rolePicker(user) {
  MY = null;
  const m = user.user_metadata || {};
  $('.layout').style.display = 'block';
  $('.layout').innerHTML = `
  <div class="picker"><form class="card" id="pickForm" novalidate>
    <span class="logo"><span class="logo-mark">${ic('home')}</span>학원지원센터</span>
    <h1>반가워요! 한 가지만 알려 주세요</h1>
    <p class="muted">역할에 맞는 화면으로 안내해 드려요. 나중에 바꿀 수 있어요.</p>
    <label class="f">어떤 분이세요?
      <span class="role-pick">${Object.entries(ROLE_NAMES).map(([v, l], i) => `<label><input type="radio" name="role" value="${v}" ${i ? '' : 'checked'}><span>${l}</span></label>`).join('')}</span>
    </label>
    <label class="f">이름<input name="fullname" value="${esc(m.full_name || m.name || '')}" maxlength="50"></label>
    <label class="f">학원 이름<input name="academy" placeholder="예: 하늘영어학원" maxlength="100"></label>
    <p class="msg" id="pickMsg" hidden></p>
    <button class="btn primary">시작하기</button>
  </form></div>`;
  $('#pickForm').onsubmit = async e => {
    e.preventDefault();
    const el = e.target.elements, name = el.fullname.value.trim();
    const msg = $('#pickMsg');
    if (!name) { msg.textContent = '이름을 적어 주세요.'; msg.hidden = false; return; }
    const { error } = await SB.from('profiles')
      .update({ role: el.role.value, name: name.slice(0, 50), academy_name: el.academy.value.trim().slice(0, 100) || null })
      .eq('id', user.id);
    if (error) { msg.textContent = '저장하지 못했어요. 잠시 후 다시 시도해 주세요.'; msg.hidden = false; return; }
    location.reload();
  };
}

/* ---------- 실제 학원 데이터 불러오기 ---------- */
async function loadStudents() {
  const { data } = await SB.from('students').select('*').eq('academy_id', REAL.academy.id).order('created_at');
  REAL.students = data || [];
  DATA.academy.students = REAL.students.length;
}
async function loadInvite() {
  const [c, m] = await Promise.all([
    SB.rpc('get_invite_codes', { p_academy: REAL.academy.id }),
    SB.rpc('list_academy_members', { p_academy: REAL.academy.id })
  ]);
  REAL.codes = c.data || [];
  REAL.members = m.data || [];
}
function useAcademy() {
  const a = REAL.academy;
  DATA.academy.name = esc(a.name); DATA.academy.short = DATA.academy.name[0];
  DATA.academy.area = esc(a.region || '지역 미등록');
}

// 아직 학원에 속하지 않았을 때: 원장은 학원 만들기 / 모두 초대 코드로 합류
const JOIN_ERRORS = {
  invalid_code: '코드를 찾을 수 없어요. 다시 확인해 주세요.',
  'role_mismatch:owner': '원장용 코드예요. 원장으로 가입한 분만 쓸 수 있어요.',
  'role_mismatch:teacher': '강사용 코드예요. 강사로 가입한 분만 쓸 수 있어요.',
  'role_mismatch:family': '학부모·학생용 코드예요. 학부모나 학생으로 가입한 분만 쓸 수 있어요.',
  owner_only: '학원은 원장님만 만들 수 있어요.'
};
const joinError = e => JOIN_ERRORS[Object.keys(JOIN_ERRORS).find(k => (e.message || '').includes(k))] || '문제가 생겼어요. 잠시 후 다시 시도해 주세요.';

function onboarding(user) {
  MY = null;
  const owner = PROFILE.role === 'owner';
  const who = { owner: '원장님', teacher: '강사님', parent: '학부모님', student: '학생' }[PROFILE.role];
  $('.layout').style.display = 'block';
  $('.layout').innerHTML = `
  <div class="picker"><div class="card">
    <span class="logo"><span class="logo-mark">${ic('home')}</span>학원지원센터</span>
    <h1>${esc(PROFILE.name || '')} ${who}, 학원을 연결해 주세요</h1>
    ${owner ? `
    <form class="f-stack" id="makeForm" novalidate>
      <p class="muted">처음이시면 우리 학원을 만들어 주세요. 만들면 강사·학부모 초대 코드가 생겨요.</p>
      <label class="f">학원 이름<input name="aname" value="${esc(PROFILE.academy_name || '')}" maxlength="100" placeholder="예: 하늘영어학원"></label>
      <label class="f">지역<input name="region" maxlength="100" placeholder="예: 수원 영통구"></label>
      <p class="msg" id="makeMsg" hidden></p>
      <button class="btn primary">학원 만들기</button>
    </form>
    <div class="or">이미 다른 원장님이 학원을 만들었나요?</div>` : `
    <p class="muted">학원에서 받은 <b>${PROFILE.role === 'teacher' ? '강사용' : '학부모·학생용'} 초대 코드</b>를 넣어 주세요.</p>`}
    <form class="f-stack" id="joinForm" novalidate>
      <label class="f">초대 코드<input name="code" maxlength="20" placeholder="예: K7P2QX9M" autocapitalize="characters" style="text-transform:uppercase"></label>
      <p class="msg" id="joinMsg" hidden></p>
      <button class="btn ${owner ? '' : 'primary'}">코드로 합류하기</button>
    </form>
    <p class="muted small">역할을 잘못 고르셨나요? <a href="#" id="reRole" style="color:var(--blue-600);font-weight:600">역할 다시 고르기</a> · <a href="#" id="obOut" style="color:var(--blue-600);font-weight:600">로그아웃</a></p>
  </div></div>`;
  const fail = (id, t) => { const m = $(id); m.textContent = t; m.hidden = false; };
  if (owner) $('#makeForm').onsubmit = async e => {
    e.preventDefault();
    const el = e.target.elements, name = el.aname.value.trim();
    if (!name) return fail('#makeMsg', '학원 이름을 적어 주세요.');
    const { error } = await SB.rpc('create_academy', { p_name: name, p_region: el.region.value.trim() || null });
    if (error) return fail('#makeMsg', joinError(error));
    location.reload();
  };
  $('#joinForm').onsubmit = async e => {
    e.preventDefault();
    const code = e.target.elements.code.value.trim();
    if (!code) return fail('#joinMsg', '초대 코드를 적어 주세요.');
    const { error } = await SB.rpc('join_academy', { p_code: code });
    if (error) return fail('#joinMsg', joinError(error));
    location.reload();
  };
  $('#reRole').onclick = async e => { e.preventDefault(); await SB.from('profiles').update({ role: null }).eq('id', user.id); location.reload(); };
  $('#obOut').onclick = async e => { e.preventDefault(); await SB.auth.signOut(); location.href = 'index.html'; };
}

async function boot() {
  if (!DEMO) {
    if (!SB) { location.replace('index.html'); return; }
    const { data } = await SB.auth.getSession(); // 구글 로그인으로 돌아온 경우 ?code= 를 여기서 세션으로 바꿔요
    if (params.has('code')) history.replaceState(null, '', 'app.html' + location.hash);
    if (!data.session) { location.replace('index.html'); return; }
    const user = data.session.user;
    const { data: p } = await SB.from('profiles').select('username, name, role, academy_name').eq('id', user.id).maybeSingle();
    PROFILE = p || {};
    if (!PROFILE.role) { rolePicker(user); return; }

    // 소속 학원 (여러 곳이면 먼저 들어간 곳)
    const { data: mem } = await SB.from('academy_members').select('role, academies(id, name, region)')
      .eq('user_id', user.id).order('created_at').limit(1);
    if (!mem || !mem.length) { onboarding(user); return; }
    PROFILE.role = mem[0].role; // 실제 역할은 초대 코드로 정해진 소속 역할
    useProfile();
    REAL = { academy: mem[0].academies, role: mem[0].role, students: [], codes: [], members: [] };
    useAcademy();
    if (ROLE === 'owner' || ROLE === 'teacher') await loadStudents();
    if (ROLE === 'owner') await loadInvite();
  }
  render();
}
boot();
