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
  plane: '<path d="M21 3L3 10.5l7 2.5 2.5 7z"/><path d="M21 3L10 13"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
  ext: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>'
};
const ic = (name, cls = 'icon') => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICON[name]}</svg>`;

const params = new URLSearchParams(location.search);
// 데모: 첫 화면 데모 버튼(?demo=1&role=…)이나 예전 주소(?role=…)로 들어온 경우. 그 밖엔 실제 로그인이 필요해요.
const DEMO = params.has('demo') || params.has('role');
let ROLE = DATA.users[params.get('role')] ? params.get('role') : 'owner';
let ME = DATA.users[ROLE];
// 예시 계정: 강사가 이미 이수한 교육엔 리플렉션 예시를 넣어 둬요
if (ROLE === 'teacher') DATA.training.forEach(t => { if (t.status[ME.name] === 'done') t.myRefl = { at: '10/20', text: '신고 의무와 절차를 다시 정리할 수 있었어요. 수업 전 아이들 상태를 살피는 습관을 들이려고 해요.' }; });
let PROFILE = null; // 실제로 로그인한 회원의 프로필 (데모면 null)
let REAL = null;    // 실제 학원 데이터 { academy, role, students, codes, members } (데모면 null)
let USER = null;    // Supabase 로그인 사용자
let CENTER = null;  // 센터 관리자 자료 { videos, done, requests, admins, refl, partnerApps, abroad } (관리자가 아니면 null)
let JOBS = null;    // 강사: 센터 채용 게시판 { posts, mine } (데모면 null)
let SEEKER = false; // 아직 학원에 합류하지 않은 강사가 채용 공고만 보는 중
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

/* ---------- 날짜 · 돈 (실제 데이터 화면에서 씀) ---------- */
const ymd = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const day0 = s => new Date(`${s}T00:00`); // 'YYYY-MM-DD' → 그날 0시 (내 시간대)
const TODAY = ymd();
let MONTH = TODAY.slice(0, 7); // 수납·재정에서 보고 있는 달
const won = n => `${(n || 0).toLocaleString()}원`;
// 금액 칸: 치는 동안 1,000 단위 쉼표가 저절로 들어가요 (저장할 때는 쉼표를 빼요)
const comma = v => { const d = String(v ?? '').replace(/[^0-9]/g, '').replace(/^0+(?=\d)/, ''); return d ? Number(d).toLocaleString('ko-KR') : ''; };
const numOf = v => { const d = String(v ?? '').replace(/[,\s원]/g, ''); return d === '' ? null : Number(d); };
document.addEventListener('input', e => {
  const t = e.target;
  if (!t.classList || !t.classList.contains('won-in')) return;
  const right = t.value.length - t.selectionStart, v = comma(t.value);
  t.value = v;
  const at = Math.max(0, v.length - right); t.setSelectionRange(at, at);
});
const sum = (list, f) => list.reduce((a, x) => a + f(x), 0);
const md = s => s ? `${+s.slice(5, 7)}/${+s.slice(8, 10)}` : '';
const dday = s => Math.round((day0(s) - day0(TODAY)) / 864e5);
const ddChip = s => {
  if (!s) return '<span class="chip mute">마감 없음</span>';
  const n = dday(s);
  return `<span class="chip ${n < 0 ? 'crit' : n <= 7 ? 'warn' : 'mute'}">${n < 0 ? `${-n}일 지남` : n === 0 ? 'D-day' : `D-${n}`}</span>`;
};
const todayText = () => { const t = day0(TODAY); return `${t.getFullYear()}년 ${t.getMonth() + 1}월 ${t.getDate()}일 (${'일월화수목금토'[t.getDay()]})`; };
const monthLabel = m => `${m.slice(0, 4)}년 ${+m.slice(5)}월`;
const shiftMonth = (m, n) => ymd(new Date(+m.slice(0, 4), +m.slice(5) - 1 + n, 1)).slice(0, 7);
const monthBar = () => `
  <div class="pager"><button class="btn sm" data-month="-1" aria-label="이전 달">‹</button><b>${monthLabel(MONTH)}</b><button class="btn sm" data-month="1" aria-label="다음 달">›</button>${MONTH !== TODAY.slice(0, 7) ? '<button class="btn sm" data-month="0">이번 달</button>' : ''}</div>`;
// 원생을 반별로 묶기 (반이 없으면 "반 미지정")
const byClass = list => {
  const g = {};
  list.forEach(s => (g[s.class_name || '반 미지정'] ||= []).push(s));
  return Object.entries(g).sort(([a], [b]) => a.localeCompare(b, 'ko'));
};
const noStudents = () => `
  <section class="card empty">
    <span class="tile-ic">${ic('users')}</span>
    <h2>먼저 원생을 추가해 주세요</h2>
    <p class="muted">원생 명단에 학생이 있어야 출결과 청구를 할 수 있어요.</p>
    ${ROLE === 'owner' ? '<a class="btn primary" href="#members/students">원생 명단으로</a>' : ''}
  </section>`;

/* ================= 원장 · 행정 지원 ================= */
function attendPage() {
  if (REAL) return realAttendPage();
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
  if (REAL) return realBillingPage();
  const b = DATA.billing;
  return head('수납·청구', `${b.month} 청구 ${b.total}건 중 ${b.paid}건 납부 완료`) + `
  <div class="stats">
    <div class="stat"><span>청구</span><b class="num">${b.total}건</b></div>
    <div class="stat"><span>납부 완료</span><b class="num">${b.paid}건</b></div>
    <div class="stat crit"><span>미납</span><b class="num">${won(b.unpaidAmount * 1e4)}</b></div>
  </div>
  <section class="card">
    <div class="card-head"><h2>미납 가정</h2><button class="btn sm primary" data-act="remindAll">전체 납부 안내 보내기</button></div>
    <div class="list">
      ${DATA.unpaid.map((u, i) => `
        <div class="li">
          <span class="av" style="background:var(--blue-500)">${u.name[0]}</span>
          <div><div class="t">${u.name} <span class="muted small">${u.cls}</span></div><div class="d">${u.days}일 지남</div></div>
          <div class="r"><b class="num">${won(u.amount * 1e4)}</b>${u.sent ? '<span class="chip good">안내 보냄</span>' : `<button class="btn sm" data-remind="${i}">안내 보내기</button>`}</div>
        </div>`).join('')}
    </div>
  </section>
  <a class="hint" href="#mou/partners">${ic('handshake')}<span>카드 결제(PG) 제휴를 신청하면 카드 수수료가 내려가요</span><b>제휴 보기 →</b></a>`;
}

function financePage() {
  if (REAL) return realFinancePage();
  const f = DATA.finance;
  const max = Math.max(...f.items.map(i => i[1]));
  return head('재정', '10월 1일 – 25일 기준 · 수납과 급여 지급이 자동으로 반영돼요.') + `
  <div class="stats">
    <div class="stat"><span>수입</span><b class="num">${won(f.income * 1e4)}</b></div>
    <div class="stat"><span>지출</span><b class="num">${won(f.expense * 1e4)}</b></div>
    <div class="stat good"><span>남은 금액</span><b class="num">${won((f.income - f.expense) * 1e4)}</b></div>
  </div>
  <section class="card">
    <div class="card-head"><h2>지출 항목</h2></div>
    <div class="rows">
      ${f.items.map(([n, v]) => `<div class="row-bar"><span>${n}</span>${bar(v / max * 100)}<b class="num">${won(v * 1e4)}</b></div>`).join('')}
    </div>
  </section>
  <a class="hint" href="#mou/mine">${ic('handshake')}<span>교재 공동구매 제휴로 이번 달 교재비 200,000원을 아꼈어요</span><b>내 제휴 →</b></a>`;
}

function paperPage() {
  if (REAL) return realPaperPage();
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

/* ---------- 실제 데이터: 출결 (Supabase attendance) ---------- */
const ATT = { present: ['출석', 'good'], late: ['지각', 'warn'], absent: ['결석', 'crit'], early: ['조퇴', 'info'] };
function realAttendPage() {
  const { day, map } = REAL.attend, list = REAL.students;
  const when = day === TODAY ? '오늘' : `${md(day)}`;
  const pager = `
    <div class="pager"><button class="btn sm" data-day="-1" aria-label="전날">‹</button><input type="date" id="attDay" value="${day}"><button class="btn sm" data-day="1" aria-label="다음 날">›</button>${day !== TODAY ? '<button class="btn sm" data-day="0">오늘</button>' : ''}</div>`;
  if (!list.length) return head('출결 관리', '') + noStudents();
  const cnt = k => list.filter(s => map[s.id] === k).length;
  return head('출결 관리', `${when} · 버튼을 누르면 바로 저장돼요. 같은 버튼을 한 번 더 누르면 취소돼요.`) + pager + `
  <div class="stats">
    <div class="stat good"><span>출석</span><b class="num">${cnt('present')}명</b></div>
    <div class="stat"><span>지각 · 조퇴</span><b class="num">${cnt('late') + cnt('early')}명</b></div>
    <div class="stat crit"><span>결석</span><b class="num">${cnt('absent')}명</b></div>
    <div class="stat"><span>입력 전</span><b class="num">${list.filter(s => !map[s.id]).length}명</b></div>
  </div>` + byClass(list).map(([cls, ss]) => `
  <section class="card att">
    <div class="card-head"><div><h2>${esc(cls)}</h2><span class="sub">출석 ${ss.filter(s => map[s.id] === 'present' || map[s.id] === 'late').length}/${ss.length}명</span></div>
      ${ss.some(s => !map[s.id]) ? `<button class="btn sm" data-att-rest="${esc(cls)}">남은 학생 모두 출석</button>` : '<span class="chip good">입력 완료</span>'}</div>
    <div class="list">${ss.map(s => `
      <div class="li">
        <span class="av" style="background:${map[s.id] ? 'var(--navy-700)' : 'var(--blue-100)'}">${esc(s.name[0])}</span>
        <div class="t">${esc(s.name)} <span class="muted small">${esc(s.grade || '')}</span></div>
        <div class="seg">${Object.entries(ATT).map(([k, [l, c]]) => `<button class="${map[s.id] === k ? `on ${c}` : ''}" data-att="${s.id}:${k}">${l}</button>`).join('')}</div>
      </div>`).join('')}
    </div>
  </section>`).join('');
}

async function markAttendance(ids, status) {
  const before = { ...REAL.attend.map };
  ids.forEach(id => { if (status) REAL.attend.map[id] = status; else delete REAL.attend.map[id]; });
  render();
  const { error } = await SB.rpc('mark_attendance', { p_students: ids, p_day: REAL.attend.day, p_status: status });
  if (error) { REAL.attend.map = before; render(); toast('저장하지 못했어요. 다시 시도해 주세요.'); }
}

/* ---------- 실제 데이터: 수납·청구 (Supabase invoices) ---------- */
function realBillingPage() {
  const list = REAL.invoices.filter(i => i.month === MONTH);
  const paid = list.filter(i => i.paid_at), unpaid = list.filter(i => !i.paid_at);
  const acts = `<button class="btn" data-act="addInvoice">${ic('plus')}한 건 추가</button><button class="btn primary" data-act="billMonth">${ic('card')}이 달 청구서 만들기</button>`;
  const row = i => `
    <div class="li">
      <span class="av" style="background:${i.paid_at ? 'var(--good)' : 'var(--blue-500)'}">${esc(i.student_name[0])}</span>
      <div><div class="t"><span class="nm-link" data-edit-inv="${i.id}" role="button" tabindex="0">${esc(i.student_name)}</span> <span class="muted small">${esc(i.class_name || '')}</span></div>
        <div class="d">${esc(i.title)}${i.paid_at ? ` · ${md(i.paid_at)} 납부${i.method ? ` · ${esc(i.method)}` : ''}` : i.due ? ` · 기한 ${md(i.due)}` : ''}</div></div>
      <div class="r"><b class="num">${won(i.amount)}</b>${i.paid_at ? '<span class="chip good">납부 완료</span>'
        : `<span class="btns">${i.due && i.due < TODAY ? ddChip(i.due) : ''}<button class="btn sm" data-copy-inv="${i.id}">안내 문구</button><button class="btn sm primary" data-pay-inv="${i.id}">납부 확인</button></span>`}</div>
    </div>`;
  const body = !list.length ? (REAL.students.length ? `
  <section class="card empty">
    <span class="tile-ic">${ic('card')}</span>
    <h2>${monthLabel(MONTH)} 청구서가 아직 없어요</h2>
    <p class="muted">반마다 금액을 넣으면 그 반 학생 모두에게 한 번에 청구서가 만들어져요.</p>
    <button class="btn primary" data-act="billMonth">이 달 청구서 만들기</button>
  </section>` : noStudents()) : `
  ${unpaid.length ? `<section class="card" style="margin-bottom:16px">
    <div class="card-head"><h2>미납 ${unpaid.length}건</h2><button class="btn sm" data-act="copyAllInv">안내 문구 모두 복사</button></div>
    <div class="list stack">${unpaid.map(row).join('')}</div>
  </section>` : ''}
  ${paid.length ? `<section class="card">
    <div class="card-head"><h2>납부 완료 ${paid.length}건</h2><span class="sub">이름을 누르면 결제 방법·메모를 고칠 수 있어요</span></div>
    <div class="list stack">${paid.map(row).join('')}</div>
  </section>` : ''}`;
  return head('수납·청구', `${monthLabel(MONTH)} 청구 ${list.length}건 중 ${paid.length}건 납부 완료`, acts) + plansCard() + monthBar() + `
  <div class="stats">
    <div class="stat"><span>청구 합계</span><b class="num">${won(sum(list, i => i.amount))}</b></div>
    <div class="stat good"><span>받은 금액</span><b class="num">${won(sum(paid, i => i.amount))}</b></div>
    <div class="stat crit"><span>미납 ${unpaid.length}건</span><b class="num">${won(sum(unpaid, i => i.amount))}</b></div>
  </div>` + body;
}

// 학부모님께 보낼 납부 안내 문구 (문자·카톡에 붙여 넣기)
const invNotice = i => `[${REAL.academy.name}] ${i.student_name} 학생 ${+i.month.slice(5)}월 ${i.title} ${won(i.amount)} 납부 안내드려요.${i.due ? ` 납부 기한은 ${md(i.due)}이에요.` : ''} 이미 내셨다면 이 메시지는 넘겨 주세요. 감사합니다.`;
const copyText = (text, ok) => navigator.clipboard.writeText(text).then(() => toast(ok), () => prompt('아래 문구를 복사해 주세요', text));

const PAY_METHODS = ['카드', '계좌이체', '현금', '기타'];
function invoiceDialog(i) {
  formDialog({
    title: i ? `${i.student_name} 학생 청구` : '청구 한 건 추가', table: 'invoices', row: i, after: loadInvoices,
    label: () => '청구를',
    fields: [
      ['student_id', '학생', { type: 'select', required: true, createOnly: true, options: REAL.students.map(s => [s.id, `${s.name}${s.class_name ? ` · ${s.class_name}` : ''}`]) }],
      ['month', '청구 월', { type: 'month', required: true, createOnly: true, value: MONTH, half: true }], ['title', '항목', { required: true, max: 50, value: '수강료', half: true }],
      ['amount', '금액', { type: 'won', required: true, placeholder: '예: 300,000', half: true }], ['due', '납부 기한', { type: 'date', half: true }],
      ['paid_at', '납부한 날', { type: 'date', half: true }], ['method', '결제 방법', { type: 'select', options: PAY_METHODS, half: true }],
      ['memo', '메모', { max: 300 }]
    ]
  });
  // 학생을 고르면 정해 둔 수강료를 금액에 채워 줘요
  const pick = $('#dlgForm [name="student_id"]'), amt = $('#dlgForm [name="amount"]');
  if (pick) pick.onchange = () => { const p = planOf(REAL.students.find(x => x.id === pick.value)); if (p && !amt.value) amt.value = comma(p.amount); };
}

/* ---------- 수강료 미리 정해 두기 (tuition_plans) ---------- */
const planOf = s => s && s.tuition_plan_id ? (REAL.plans || []).find(p => p.id === s.tuition_plan_id) : null;
const planLabel = p => `${p.name} · ${won(p.amount)}`;
function plansCard() {
  const ps = REAL.plans, with_ = REAL.students.filter(planOf).length;
  return `
  <section class="card" style="margin-bottom:16px">
    <div class="card-head"><h2>정해 둔 수강료 ${ps.length}개</h2><span class="btns">${ps.length ? '<button class="btn sm" data-act="applyPlan">학생에게 붙이기</button>' : ''}<button class="btn sm primary" data-act="addPlan">${ic('plus')}수강료 추가</button></span></div>
    ${ps.length ? `<div class="plan-list">${ps.map(p => {
      const n = REAL.students.filter(x => x.tuition_plan_id === p.id).length;
      return `<button class="plan" data-edit-plan="${p.id}"><b>${esc(p.name)}</b><span class="num">${won(p.amount)}</span><small>${p.class_name ? `${esc(p.class_name)} · ` : ''}학생 ${n}명</small></button>`;
    }).join('')}</div>
    <p class="muted small" style="margin:10px 0 0">수강료를 붙인 학생 ${with_}명은 "이 달 청구서 만들기"에서 금액이 저절로 들어가요. 학생마다 하나하나 칠 필요 없어요.</p>`
    : `<p class="muted small" style="margin:0">"초등 주 3회 300,000원"처럼 수강료를 미리 만들어 두고 학생(반 전체도 한 번에)에게 붙이면, 매달 청구서를 만들 때 금액이 저절로 들어가요.</p>`}
  </section>`;
}
function planDialog(p) {
  formDialog({
    title: p ? '수강료 고치기' : '수강료 추가', table: 'tuition_plans', row: p, after: loadPlans,
    label: r => `${r.name} 수강료를`,
    fields: [
      ['name', '이름', { required: true, max: 50, placeholder: '예: 초등 주 3회', chips: ['초등 주 2회', '초등 주 3회', '중등 주 3회', '고등 주 3회', '특강'] }],
      ['amount', '한 달 금액', { type: 'won', required: true, placeholder: '예: 300,000', half: true }],
      ['class_name', '주로 쓰는 반', { type: 'select', options: allClassNames(), blank: '반 상관없음', half: true }],
      ['memo', '메모', { max: 200, placeholder: '예: 교재비 별도' }]
    ]
  });
}
const allClassNames = () => [...new Set(REAL.students.map(x => x.class_name).filter(Boolean))].sort();
// 수강료를 학생들에게 한 번에 붙이기 (반마다 "모두" 체크)
function applyPlanDialog() {
  const d = dialogEl(), groups = byClass(REAL.students);
  d.innerHTML = `
  <form method="dialog" class="dlg" id="planForm" novalidate>
    <h2>수강료를 학생에게 붙이기</h2>
    <label class="f">수강료<select name="plan">${REAL.plans.map(p => `<option value="${p.id}">${esc(planLabel(p))}</option>`).join('')}<option value="">수강료 떼기</option></select></label>
    <div class="apply-groups">${groups.map(([cls, ss], n) => `
      <fieldset><legend><label><input type="checkbox" data-all="${n}"> ${esc(cls)} 모두 <span class="muted small">${ss.length}명</span></label></legend>
        <div class="checks">${ss.map(x => `<label class="chk"><input type="checkbox" name="st" value="${x.id}" data-g="${n}"><span><b>${esc(x.name)}</b><small>${planOf(x) ? esc(planLabel(planOf(x))) : '수강료 없음'}</small></span></label>`).join('')}</div></fieldset>`).join('')}</div>
    <p class="msg" id="dlgMsg" hidden></p>
    <div class="acts"><span style="flex:1"></span><button type="button" class="btn" id="dlgCancel">취소</button><button class="btn primary">붙이기</button></div>
  </form>`;
  d.showModal();
  const sel = d.querySelector('[name=plan]');
  // 반을 정해 둔 수강료를 고르면 그 반 학생을 미리 체크해 줘요
  const pre = () => { const p = REAL.plans.find(x => x.id === sel.value); d.querySelectorAll('[name=st]').forEach(c => { const st = REAL.students.find(x => x.id === c.value); c.checked = !!(p && p.class_name && st.class_name === p.class_name); }); };
  sel.onchange = pre; pre();
  d.querySelectorAll('[data-all]').forEach(a => a.onchange = () => d.querySelectorAll(`[data-g="${a.dataset.all}"]`).forEach(c => { c.checked = a.checked; }));
  $('#dlgCancel').onclick = () => d.close();
  $('#planForm').onsubmit = async e => {
    e.preventDefault();
    const ids = [...d.querySelectorAll('[name=st]:checked')].map(c => c.value);
    if (!ids.length) { const m = $('#dlgMsg'); m.textContent = '학생을 한 명 이상 골라 주세요.'; m.hidden = false; return; }
    const { error } = await SB.from('students').update({ tuition_plan_id: sel.value || null }).in('id', ids);
    if (error) { const m = $('#dlgMsg'); m.textContent = '저장하지 못했어요. 다시 시도해 주세요.'; m.hidden = false; return; }
    d.close(); await loadStudents(); render(); toast(`${ids.length}명에게 ${sel.value ? '수강료를 붙였어요' : '수강료를 뗐어요'}`);
  };
}

// 이 달 청구서를 한 번에: 수강료를 붙인 학생은 그 금액으로, 나머지는 반마다 금액을 넣어요
function billMonthDialog() {
  if (!REAL.students.length) { location.hash = '#members/students'; toast('먼저 원생을 추가해 주세요'); return; }
  const planned = REAL.students.filter(planOf), groups = byClass(REAL.students.filter(x => !planOf(x)));
  const last = {}; // 지난번 수강료를 반별로 미리 채워 줘요
  [...REAL.invoices].filter(i => i.title === '수강료').sort((a, b) => a.month.localeCompare(b.month)).forEach(i => { last[i.class_name || '반 미지정'] = i.amount; });
  const byPlan = REAL.plans.map(p => [p, planned.filter(x => x.tuition_plan_id === p.id)]).filter(([, ss]) => ss.length);
  // 납부 기한 기본값: 그달 10일, 이번 달인데 10일이 지났으면 말일
  const due = `${MONTH}-10` < TODAY && MONTH === TODAY.slice(0, 7) ? ymd(new Date(+MONTH.slice(0, 4), +MONTH.slice(5), 0)) : `${MONTH}-10`;
  const d = dialogEl();
  d.innerHTML = `
  <form method="dialog" class="dlg" id="billForm" novalidate>
    <h2>${monthLabel(MONTH)} 청구서 만들기</h2>
    <p class="muted small" style="margin:0">수강료를 붙인 학생은 그 금액으로 저절로 만들어져요. 나머지는 반마다 금액을 넣으면 그 반 학생 모두에게 만들어져요. 같은 달에 같은 항목이 이미 있는 학생은 건너뛰어요.</p>
    <div class="two"><label class="f">항목<input name="title" value="수강료" maxlength="50"></label><label class="f">납부 기한<input name="due" type="date" value="${due}"></label></div>
    ${byPlan.length ? `<div class="plan-sum"><b>정해 둔 수강료로 ${planned.length}명</b>${byPlan.map(([p, ss]) => `<span>${esc(p.name)} ${won(p.amount)} × ${ss.length}명</span>`).join('')}</div>` : ''}
    ${groups.map(([cls, ss], n) => `<label class="f">${esc(cls)} <span class="muted small">${ss.length}명 · 비워 두면 건너뛰어요</span><span class="won-wrap"><input name="c${n}" class="won-in" inputmode="numeric" autocomplete="off" placeholder="금액" value="${comma(last[cls])}"><i>원</i></span></label>`).join('')}
    ${!REAL.plans.length ? '<p class="muted small" style="margin:0">매달 같은 금액이면 "수강료 추가"로 미리 정해 두면 다음부터 넣을 필요가 없어요.</p>' : ''}
    <p class="msg" id="dlgMsg" hidden></p>
    <div class="acts"><span style="flex:1"></span><button type="button" class="btn" id="dlgCancel">취소</button><button class="btn primary">만들기</button></div>
  </form>`;
  d.showModal();
  const fail = t => { const m = $('#dlgMsg'); m.textContent = t; m.hidden = false; };
  $('#dlgCancel').onclick = () => d.close();
  $('#billForm').onsubmit = async e => {
    e.preventDefault();
    const el = e.target.elements, title = el.title.value.trim() || '수강료', due = el.due.value || null;
    const rows = []; let skipped = 0;
    const add = (st, amount) => {
      if (REAL.invoices.some(x => x.student_id === st.id && x.month === MONTH && x.title === title)) skipped++;
      else rows.push({ academy_id: REAL.academy.id, student_id: st.id, month: MONTH, title, amount, due });
    };
    planned.forEach(st => add(st, planOf(st).amount));
    for (const [n, [, ss]] of groups.entries()) {
      const v = el[`c${n}`].value.trim();
      if (v === '') continue;
      const amount = Math.round(numOf(v));
      if (!(amount >= 0)) return fail('금액은 숫자로 적어 주세요.');
      ss.forEach(st => add(st, amount));
    }
    if (!rows.length) return fail(skipped ? '이 달에 이미 모두 청구했어요.' : '금액을 한 반 이상 넣어 주세요.');
    const { error } = await SB.from('invoices').insert(rows);
    if (error) return fail('만들지 못했어요. 잠시 후 다시 시도해 주세요.');
    d.close(); await loadInvoices(); render();
    toast(`${rows.length}명에게 청구서를 만들었어요${skipped ? ` · ${skipped}명은 이미 있어 건너뜀` : ''}`);
  };
}

async function payInvoice(id) {
  const i = REAL.invoices.find(x => x.id === id);
  const { error } = await SB.from('invoices').update({ paid_at: TODAY }).eq('id', id);
  if (error) { toast('저장하지 못했어요'); return; }
  i.paid_at = TODAY; render(); toast(`${i.student_name} 학생 납부를 확인했어요`);
}

/* ---------- 실제 데이터: 재정 = 매출(받은 수납 + 직접 넣은 수입) - 지출 (Supabase incomes · expenses) ----------
   기간: 오늘 · 최근 7일 · 월별 · 3개월 · 6개월 · 1년. 기간이 길면 달마다, 짧으면 날마다 묶어서 그래프로 보여 줘요. */
const EXP_CATS = ['강사 급여', '임대료', '교재비', '공과금', '홍보비', '차량·간식', '기타'];
const INC_CATS = ['교재 판매', '특강', '방학 캠프', '입학금', '기타'];
const FIN_PERIODS = { day: '오늘', week: '최근 7일', month: '월별', m3: '3개월', m6: '6개월', y1: '1년', custom: '기간 직접 고르기' };
let FIN = 'month';
let FIN_FROM = null, FIN_TO = null; // 직접 고른 기간 (시작일부터 최대 1년)
const addDays = (s, n) => { const d = day0(s); d.setDate(d.getDate() + n); return ymd(d); };
const monthEnd = m => ymd(new Date(+m.slice(0, 4), +m.slice(5), 0));
// 기간 → { from, to, buckets: [{ label, from, to }], prev: 바로 앞 같은 길이 기간 }
const daysBetween = (a, b) => Math.round((day0(b) - day0(a)) / 864e5);
// 직접 고른 기간: 시작일부터 끝 날까지(최대 1년). 31일 이하면 날마다, 길면 달마다 묶어요
function customRange() {
  const from = FIN_FROM || `${TODAY.slice(0, 7)}-01`;
  let to = FIN_TO || TODAY;
  if (to < from) to = from;
  const maxTo = addDays(ymd(new Date(+from.slice(0, 4) + 1, +from.slice(5, 7) - 1, +from.slice(8))), -1);
  if (to > maxTo) to = maxTo;
  const n = daysBetween(from, to) + 1;
  let buckets;
  if (n <= 31) buckets = [...Array(n)].map((_, i) => { const d = addDays(from, i); return { label: md(d), from: d, to: d }; });
  else {
    buckets = [];
    for (let m = from.slice(0, 7); m <= to.slice(0, 7); m = shiftMonth(m, 1)) {
      const a = `${m}-01` < from ? from : `${m}-01`, b = monthEnd(m) > to ? to : monthEnd(m);
      buckets.push({ label: `${m.slice(2, 4)}.${+m.slice(5)}월`, from: a, to: b });
    }
  }
  return { from, to, buckets, prev: [addDays(from, -n), addDays(from, -1)], label: `${from.replaceAll('-', '.')} – ${to.replaceAll('-', '.')} (${n}일)`, prevLabel: `그 전 ${n}일`, maxTo };
}
function finRange(p = FIN) {
  if (p === 'custom') return customRange();
  if (p === 'day') return { from: TODAY, to: TODAY, buckets: [], prev: [addDays(TODAY, -1), addDays(TODAY, -1)], label: '오늘', prevLabel: '어제' };
  if (p === 'week') {
    const from = addDays(TODAY, -6);
    return { from, to: TODAY, buckets: [...Array(7)].map((_, i) => { const d = addDays(from, i); return { label: md(d), from: d, to: d }; }),
      prev: [addDays(from, -7), addDays(from, -1)], label: '최근 7일', prevLabel: '그 전 7일' };
  }
  if (p === 'month') {
    const last = +monthEnd(MONTH).slice(8);
    return { from: `${MONTH}-01`, to: monthEnd(MONTH), buckets: [...Array(last)].map((_, i) => { const d = `${MONTH}-${String(i + 1).padStart(2, '0')}`; return { label: String(i + 1), from: d, to: d }; }),
      prev: [`${shiftMonth(MONTH, -1)}-01`, monthEnd(shiftMonth(MONTH, -1))], label: monthLabel(MONTH), prevLabel: '지난달' };
  }
  const n = { m3: 3, m6: 6, y1: 12 }[p], cur = TODAY.slice(0, 7), first = shiftMonth(cur, 1 - n);
  return { from: `${first}-01`, to: monthEnd(cur), buckets: [...Array(n)].map((_, i) => { const m = shiftMonth(first, i); return { label: `${+m.slice(5)}월`, from: `${m}-01`, to: monthEnd(m) }; }),
    prev: [`${shiftMonth(first, -n)}-01`, monthEnd(shiftMonth(first, -1))], label: `${monthLabel(first)} – ${monthLabel(cur)}`, prevLabel: `그 전 ${n}개월` };
}
// 모든 돈의 흐름을 한 모양으로: { day, kind: in|out, cat, amount, memo, src, id }
function ledger() {
  return [
    ...REAL.invoices.filter(i => i.paid_at).map(i => ({ day: i.paid_at, kind: 'in', cat: i.title || '수강료', amount: i.amount, memo: `${i.student_name}${i.class_name ? ` · ${i.class_name}` : ''}`, src: 'inv', id: i.id })),
    ...REAL.incomes.map(x => ({ day: x.day, kind: 'in', cat: x.category, amount: x.amount, memo: x.memo || '', src: 'inc', id: x.id })),
    ...REAL.expenses.map(x => ({ day: x.day, kind: 'out', cat: x.category, amount: x.amount, memo: x.memo || '', src: 'exp', id: x.id }))
  ];
}
const inRange = (e, a, b) => e.day >= a && e.day <= b;
const finTotals = list => { const inc = sum(list.filter(e => e.kind === 'in'), e => e.amount), out = sum(list.filter(e => e.kind === 'out'), e => e.amount); return { inc, out, net: inc - out }; };
const signWon = n => `${n < 0 ? '-' : ''}${won(Math.abs(n))}`;
const versus = (now, before, label) => {
  if (!before) return now ? `${label}엔 없었어요` : '';
  const pct = Math.round((now - before) / Math.abs(before) * 100);
  return `${label}보다 ${pct >= 0 ? '▲' : '▼'} ${Math.abs(pct)}%`;
};
const groupCats = list => Object.entries(list.reduce((a, e) => (a[e.cat] = (a[e.cat] || 0) + e.amount, a), {})).sort((a, b) => b[1] - a[1]);
const catBars = (cats, cls) => { const max = Math.max(1, ...cats.map(c => c[1])); return `<div class="rows">${cats.map(([n, v]) => `<div class="row-bar wide"><span>${esc(n)}</span><div class="pbar ${cls}"><span style="width:${v / max * 100}%"></span></div><b class="num">${won(v)}</b></div>`).join('')}</div>`; };

// 매출 · 지출 막대 그래프 (칸마다 두 막대, 올리면 금액이 보여요)
function finChart(r, all) {
  const rows = r.buckets.map(b => ({ ...b, ...finTotals(all.filter(e => inRange(e, b.from, b.to))) }));
  const max = Math.max(1, ...rows.map(x => Math.max(x.inc, x.out)));
  const every = rows.length > 14 ? 5 : 1; // 날이 많으면 눈금 글자는 5일마다
  return `
  <section class="card">
    <div class="card-head"><h2>기간별 매출 · 지출</h2><span class="legend"><i class="sw in"></i>매출<i class="sw out"></i>지출</span></div>
    <div class="fchart" style="--n:${rows.length}">${rows.map((x, i) => `
      <div class="fc-col" tabindex="0" data-tip="${esc(x.label)}${r.buckets.length > 12 ? '일' : ''}&#10;매출 ${won(x.inc)}&#10;지출 ${won(x.out)}&#10;순이익 ${signWon(x.net)}">
        <div class="fc-bars"><span class="in" style="height:${x.inc / max * 100}%"></span><span class="out" style="height:${x.out / max * 100}%"></span></div>
        <small>${(i + 1) % every === 0 || i === 0 ? esc(x.label) : ''}</small>
      </div>`).join('')}
    </div>
    ${rows.length <= 12 ? `<div class="ftable"><div class="tr th"><span>기간</span><span>매출</span><span>지출</span><span>순이익</span></div>${rows.map(x => `
      <div class="tr"><span>${esc(x.label)}</span><span class="num">${won(x.inc)}</span><span class="num">${won(x.out)}</span><b class="num ${x.net < 0 ? 'neg' : ''}">${signWon(x.net)}</b></div>`).join('')}</div>` : ''}
  </section>`;
}

function realFinancePage() {
  const r = finRange(), all = ledger();
  const list = all.filter(e => inRange(e, r.from, r.to)).sort((a, b) => b.day.localeCompare(a.day) || (a.kind === b.kind ? 0 : a.kind === 'in' ? -1 : 1));
  const t = finTotals(list), p = finTotals(all.filter(e => inRange(e, ...r.prev)));
  // 못 받은 돈: 이 기간에 걸친 달의 청구 중 아직 납부 확인 안 한 것
  const months = new Set(FIN === 'month' ? [MONTH] : FIN === 'day' || FIN === 'week' ? [TODAY.slice(0, 7)] : r.buckets.map(b => b.from.slice(0, 7)).concat(FIN === 'custom' ? [r.from.slice(0, 7), r.to.slice(0, 7)] : []));
  const unpaid = REAL.invoices.filter(i => !i.paid_at && months.has(i.month));
  const rate = t.inc ? Math.round(t.net / t.inc * 100) : null;
  const acts = `<button class="btn" data-act="finXlsx">${ic('doc')}엑셀로 내려받기</button><button class="btn" data-import="expenses">${ic('doc')}지출 엑셀로 올리기</button>
    <button class="btn" data-act="addIncome">${ic('plus')}수입 추가</button><button class="btn primary" data-act="addExpense">${ic('plus')}지출 추가</button>`;
  return head('재정', `${r.label} · 매출은 수납·청구에서 "납부 확인"한 금액에 직접 넣은 수입(교재 판매 · 특강 등)을 더한 거예요.`, acts) + `
  <div class="filters">${Object.entries(FIN_PERIODS).map(([k, l]) => `<button class="${FIN === k ? 'on' : ''}" data-fin="${k}">${l}</button>`).join('')}</div>
  ${FIN === 'month' ? monthBar() : ''}
  ${FIN === 'custom' ? `<div class="range-pick"><label>시작일<input type="date" id="finFrom" value="${r.from}"></label><span>~</span>
    <label>끝 날<input type="date" id="finTo" value="${r.to}" min="${r.from}" max="${r.maxTo}"></label><span class="muted small">시작일부터 최대 1년까지 볼 수 있어요</span></div>` : ''}
  <div class="stats">
    <div class="stat"><span>매출</span><b class="num">${won(t.inc)}</b><small class="muted">${versus(t.inc, p.inc, r.prevLabel)}</small></div>
    <div class="stat"><span>지출</span><b class="num">${won(t.out)}</b><small class="muted">${versus(t.out, p.out, r.prevLabel)}</small></div>
    <div class="stat ${t.net < 0 ? 'crit' : 'good'}"><span>순이익</span><b class="num">${signWon(t.net)}</b><small class="muted">${rate === null ? '매출이 없어요' : `이익률 ${rate}%`}</small></div>
    <div class="stat ${unpaid.length ? 'crit' : ''}"><span>아직 못 받은 돈 ${unpaid.length}건</span><b class="num">${won(sum(unpaid, i => i.amount))}</b><small class="muted">${months.size > 3 ? `최근 ${months.size}개월` : [...months].map(m => `${+m.slice(5)}월`).join(' · ')} 청구 중 미납</small></div>
  </div>
  ${r.buckets.length ? finChart(r, all) : ''}
  <div class="grid2 even">
    <section class="card"><div class="card-head"><h2>매출 구성</h2><span class="sub">수강료 · 직접 넣은 수입</span></div>
      ${t.inc ? catBars(groupCats(list.filter(e => e.kind === 'in')), '') : '<p class="muted small" style="margin:0">이 기간에 들어온 돈이 없어요.</p>'}</section>
    <section class="card"><div class="card-head"><h2>지출 항목</h2></div>
      ${t.out ? catBars(groupCats(list.filter(e => e.kind === 'out')), 'out') : '<p class="muted small" style="margin:0">이 기간에 적은 지출이 없어요. 급여 · 임대료부터 넣어 보세요.</p>'}</section>
  </div>
  <section class="card">
    <div class="card-head"><h2>거래 내역 ${list.length}건</h2><span class="sub">누르면 고칠 수 있어요 · 수강료는 수납·청구에서 고쳐요</span></div>
    ${list.length ? `<div class="list">${list.slice(0, 200).map(e => `
      <a class="li link" href="#admin/finance" data-ledger="${e.src}:${e.id}">
        <span class="av time-av num">${md(e.day)}</span>
        <div><div class="t">${esc(e.cat)} <span class="chip ${e.kind === 'in' ? 'info' : 'mute'}">${e.kind === 'in' ? (e.src === 'inv' ? '수납' : '수입') : '지출'}</span></div><div class="d">${esc(e.memo)}</div></div>
        <div class="r"><b class="num ${e.kind === 'out' ? 'neg' : ''}">${e.kind === 'out' ? '-' : '+'}${won(e.amount)}</b></div>
      </a>`).join('')}</div>${list.length > 200 ? '<p class="muted small">최근 200건까지 보여 줘요. 전부 보려면 엑셀로 내려받아 주세요.</p>' : ''}` : '<p class="muted small" style="margin:0">아직 없어요.</p>'}
  </section>
  <a class="hint" href="#admin/billing">${ic('card')}<span>수강료 매출은 수납·청구에서 "납부 확인"을 누르면 저절로 들어와요</span><b>수납·청구 →</b></a>`;
}

// 보고 있는 기간의 거래 내역을 엑셀로
function finXlsx() {
  const r = finRange();
  const list = ledger().filter(e => inRange(e, r.from, r.to)).sort((a, b) => a.day.localeCompare(b.day));
  const t = finTotals(list);
  const rows = [['날짜', '구분', '항목', '금액(원)', '내용'],
    ...list.map(e => [e.day, e.kind === 'in' ? (e.src === 'inv' ? '수납' : '수입') : '지출', e.cat, String(e.kind === 'out' ? -e.amount : e.amount), e.memo]),
    [], ['', '', '매출 합계', String(t.inc), ''], ['', '', '지출 합계', String(t.out), ''], ['', '', '순이익', String(t.net), '']];
  downloadXlsx(`finance_${r.from}_${r.to}.xlsx`, rows, [12, 8, 14, 14, 30]);
  toast('거래 내역을 내려받았어요');
}

const finDay = () => FIN === 'month' ? (MONTH === TODAY.slice(0, 7) ? TODAY : `${MONTH}-01`) : TODAY;
function expenseDialog(x) {
  formDialog({
    title: x ? '지출 고치기' : '지출 추가', table: 'expenses', row: x, after: loadExpenses,
    label: r => `${r.category} 지출을`,
    fields: [
      ['day', '날짜', { type: 'date', required: true, value: finDay(), half: true }],
      ['category', '항목', { type: 'select', required: true, options: EXP_CATS, half: true }],
      ['amount', '금액', { type: 'won', required: true, placeholder: '예: 2,000,000' }],
      ['memo', '메모', { max: 200, placeholder: '예: 10월 김민지 강사 급여' }]
    ]
  });
}
function incomeDialog(x) {
  formDialog({
    title: x ? '수입 고치기' : '수입 추가', table: 'incomes', row: x, after: loadIncomes,
    label: r => `${r.category} 수입을`,
    fields: [
      ['day', '날짜', { type: 'date', required: true, value: finDay(), half: true }],
      ['category', '항목', { type: 'select', required: true, options: INC_CATS, half: true }],
      ['amount', '금액', { type: 'won', required: true, placeholder: '예: 150,000' }],
      ['memo', '메모', { max: 200, placeholder: '예: 겨울 특강 5명' }]
    ]
  });
}

/* ---------- 엑셀로 한꺼번에 올리기 (원생 · 지출) ----------
   양식 내려받기 → 채워서 올리기(.xlsx · .csv) → 미리보기에서 확인 → 저장. 읽기·양식 만들기는 assets/sheet.js */
const IMPORTS = {
  students: {
    title: '원생 엑셀로 올리기', what: '원생', file: 'students_template.xlsx', table: 'students', after: () => loadStudents(),
    cols: [
      ['name', '이름', { required: true, max: 50, alias: ['학생', '학생이름', '원생', '원생이름', '성명'] }],
      ['grade', '학년', { max: 20 }],
      ['class_name', '반', { max: 50, alias: ['반이름', '수업', '클래스', '담당반'] }],
      ['parent_name', '학부모 이름', { max: 50, alias: ['학부모', '보호자', '보호자이름', '부모님', '부모'] }],
      ['parent_phone', '학부모 연락처', { max: 30, alias: ['연락처', '전화', '전화번호', '휴대폰', '핸드폰', '보호자연락처', '학부모전화'] }],
      ['memo', '메모', { max: 500, alias: ['비고', '특이사항'] }]
    ],
    sample: [['예시) 이서연', '초5', '초등 B반', '김은정', '010-1234-5678', '형제 할인']],
    widths: [16, 8, 14, 14, 18, 24],
    dup: r => REAL.students.some(s => s.name === r.name && (s.class_name || '') === (r.class_name || '')),
    dupText: '같은 반에 같은 이름이 이미 있어요'
  },
  expenses: {
    title: '지출 엑셀로 올리기', what: '지출', file: 'expenses_template.xlsx', table: 'expenses', after: () => loadExpenses(),
    cols: [
      ['day', '날짜', { type: 'date', required: true, alias: ['일자', '지출일', '거래일', '사용일'] }],
      ['category', '항목', { required: true, max: 20, alias: ['분류', '구분', '지출항목', '계정', '계정과목'] }],
      ['amount', '금액', { type: 'money', required: true, alias: ['금액(원)', '지출액', '지출금액', '출금액', '출금'] }],
      ['memo', '메모', { max: 200, alias: ['내용', '비고', '적요', '사용처'] }]
    ],
    sample: [['예시) 2026-10-10', '강사 급여', '2,000,000', '10월 김민지 강사 급여'], ['예시) 2026-10-25', '임대료', '1,500,000', '']],
    widths: [16, 14, 14, 30],
    dup: r => REAL.expenses.some(x => x.day === r.day && x.category === r.category && x.amount === r.amount && (x.memo || '') === (r.memo || '')),
    dupText: '같은 날짜 · 항목 · 금액이 이미 있어요'
  }
};
const normHead = s => String(s || '').replace(/[\s*·_\-]|\(필수\)|\(선택\)/g, '').toLowerCase();
// 날짜: 2026-10-05 · 2026.10.5 · 2026/10/5 · 20261005 · 10/5(올해) · 엑셀 날짜 숫자
function toYmd(v) {
  const s = String(v).trim().replace(/\s/g, '').replace(/\.$/, '');
  let m = s.match(/^(\d{4})[-./년](\d{1,2})[-./월](\d{1,2})일?$/) || s.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (!m && (m = s.match(/^(\d{1,2})[-./월](\d{1,2})일?$/))) m = [s, TODAY.slice(0, 4), m[1], m[2]];
  if (!m && /^\d{5}(\.\d+)?$/.test(s)) return serialToYmd(+s);
  if (!m) return null;
  const d = new Date(+m[1], +m[2] - 1, +m[3]);
  return d.getMonth() === +m[2] - 1 && d.getDate() === +m[3] ? ymd(d) : null;
}
// 금액: 2,000,000 · 2000000원 · 200만 · 200만원
function toWon(v) {
  const s = String(v).replace(/[\s,원₩]/g, '');
  const m = s.match(/^(\d+(?:\.\d+)?)(만)?$/);
  if (!m) return null;
  const n = Math.round(+m[1] * (m[2] ? 10000 : 1));
  return n >= 0 && n <= 1e9 ? n : null;
}
function checkRows(cfg, rows) {
  // 머리글 줄 찾기 (위쪽 5줄 안에서 칸 이름이 가장 많이 맞는 줄)
  const names = cfg.cols.map(([, lab, o]) => [lab, ...(o.alias || [])].map(normHead));
  let headAt = -1, best = 0;
  rows.slice(0, 5).forEach((r, i) => { const n = r.filter(c => names.some(ns => ns.includes(normHead(c)))).length; if (n > best) { best = n; headAt = i; } });
  if (headAt < 0) return { error: `첫 줄에 ${cfg.cols.filter(c => c[2].required).map(c => `"${c[1]}"`).join(', ')} 같은 칸 이름이 있어야 해요. 양식을 내려받아 써 주세요.` };
  const head = rows[headAt].map(normHead);
  const idx = names.map(ns => head.findIndex(h => h && ns.includes(h)));
  const missing = cfg.cols.filter((c, i) => c[2].required && idx[i] < 0).map(c => c[1]);
  if (missing.length) return { error: `"${missing.join('", "')}" 칸을 찾지 못했어요. 첫 줄 칸 이름을 양식과 같게 맞춰 주세요.` };
  const seen = new Set();
  const out = rows.slice(headAt + 1).map((r, n) => {
    const line = headAt + n + 2, data = {}, errs = [];
    if (!r.some(c => String(c || '').trim())) return null;            // 빈 줄
    if (/^예시/.test(String(r[idx[0]] || '').trim())) return null;     // 양식의 예시 줄
    cfg.cols.forEach(([k, lab, o], i) => {
      const raw = idx[i] < 0 ? '' : String(r[idx[i]] ?? '').trim();
      if (!raw) { if (o.required) errs.push(`${lab} 비어 있음`); data[k] = null; return; }
      if (o.type === 'date') { const d = toYmd(raw); if (!d) errs.push(`${lab} "${raw}" 날짜로 못 읽음`); data[k] = d; return; }
      if (o.type === 'money') { const w = toWon(raw); if (w === null) errs.push(`${lab} "${raw}" 숫자로 못 읽음`); data[k] = w; return; }
      if (o.max && raw.length > o.max) errs.push(`${lab} ${o.max}자 넘음`);
      data[k] = raw.slice(0, o.max || 500);
    });
    const key = JSON.stringify(data), inDb = !errs.length && cfg.dup(data), inFile = seen.has(key);
    seen.add(key);
    const state = errs.length ? 'err' : inDb || inFile ? 'dup' : 'ok';
    return { line, data, state, why: errs.join(' · ') || (inDb ? cfg.dupText : inFile ? '파일 안에 같은 줄이 위에 또 있어요' : '') };
  }).filter(Boolean);
  return { rows: out };
}
function importDialog(kind) {
  const cfg = IMPORTS[kind], d = dialogEl();
  const start = msg => {
    d.innerHTML = `
    <form method="dialog" class="dlg wide" id="dlgForm" novalidate>
      <h2>${cfg.title}</h2>
      <ol class="imp-steps">
        <li><b>양식 내려받기</b><span>첫 줄 칸 이름은 그대로 두고, "예시)" 줄은 지우거나 그대로 두셔도 돼요(올라가지 않아요).</span>
          <button type="button" class="btn sm" id="impTpl">${ic('doc')}${cfg.what} 양식 내려받기 (.xlsx)</button></li>
        <li><b>엑셀에서 채우기</b><span>쓰던 엑셀이 있으면 칸 이름만 ${cfg.cols.map(c => `"${c[1]}"`).join(' · ')}로 바꿔도 돼요. ${cfg.cols.filter(c => c[2].required).map(c => c[1]).join(' · ')}은(는) 꼭 있어야 해요.</span></li>
        <li><b>파일 올리기</b><span>.xlsx 또는 .csv · 저장하기 전에 미리보기로 확인해요.</span>
          <label class="btn primary sm file-btn">${ic('plus')}파일 고르기<input type="file" id="impFile" accept=".xlsx,.csv,.txt,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"></label></li>
      </ol>
      <p class="msg" id="dlgMsg" ${msg ? '' : 'hidden'}>${msg || ''}</p>
      <div class="acts"><span style="flex:1"></span><button type="button" class="btn" id="dlgCancel">닫기</button></div>
    </form>`;
    $('#dlgCancel').onclick = () => d.close();
    $('#impTpl').onclick = () => downloadXlsx(cfg.file, [cfg.cols.map(c => c[1]), ...cfg.sample], cfg.widths);
    $('#impFile').onchange = async e => {
      const f = e.target.files[0];
      if (!f) return;
      if (f.size > 5 * 1024 * 1024) return start('파일이 너무 커요. 5MB 아래로 나눠서 올려 주세요.');
      let rows;
      try { rows = await readSheet(f); }
      catch (err) { return start(err.message === 'old_xls' ? '예전 엑셀(.xls) 파일이에요. 엑셀에서 "다른 이름으로 저장 → Excel 통합 문서(.xlsx)"로 저장해서 올려 주세요.' : '파일을 읽지 못했어요. 엑셀에서 .xlsx로 저장한 파일인지 확인해 주세요.'); }
      const res = checkRows(cfg, rows);
      if (res.error) return start(res.error);
      if (!res.rows.length) return start('올릴 줄이 없어요. 첫 줄 아래에 내용을 채워 주세요.');
      preview(f.name, res.rows);
    };
  };
  const preview = (fname, list) => {
    const ok = list.filter(r => r.state === 'ok'), dup = list.filter(r => r.state === 'dup'), bad = list.filter(r => r.state === 'err');
    const show = list.slice(0, 200);
    const cell = (k, v, o) => v == null ? '<span class="muted">-</span>' : o.type === 'money' ? won(v) : esc(v);
    d.innerHTML = `
    <form method="dialog" class="dlg wide" id="dlgForm" novalidate>
      <h2>${cfg.title} · 미리보기</h2>
      <p class="muted small" style="margin:0">${esc(fname)} · 모두 ${list.length}줄</p>
      <div class="imp-sum">
        <span class="chip good">올릴 것 ${ok.length}건</span>${dup.length ? `<span class="chip mute">이미 있어서 건너뜀 ${dup.length}건</span>` : ''}${bad.length ? `<span class="chip crit">고쳐야 할 줄 ${bad.length}건</span>` : ''}
      </div>
      <div class="imp-table"><table>
        <thead><tr><th>줄</th>${cfg.cols.map(c => `<th>${c[1]}</th>`).join('')}<th>상태</th></tr></thead>
        <tbody>${show.map(r => `<tr class="${r.state}"><td class="num">${r.line}</td>${cfg.cols.map(([k, , o]) => `<td>${cell(k, r.data[k], o)}</td>`).join('')}
          <td>${r.state === 'ok' ? '<span class="chip good">올림</span>' : `<span class="chip ${r.state === 'dup' ? 'mute' : 'crit'}">${r.state === 'dup' ? '건너뜀' : '오류'}</span> <small>${esc(r.why)}</small>`}</td></tr>`).join('')}</tbody>
      </table></div>
      ${list.length > show.length ? `<p class="muted small" style="margin:0">앞의 ${show.length}줄만 보여 드려요. 저장은 전체에 적용돼요.</p>` : ''}
      ${bad.length ? '<p class="muted small" style="margin:0">오류가 난 줄은 빼고 저장해요. 엑셀에서 고친 뒤 다시 올리면 이미 올라간 줄은 저절로 건너뛰어요.</p>' : ''}
      <p class="msg" id="dlgMsg" hidden></p>
      <div class="acts"><button type="button" class="btn" id="impAgain">다른 파일 고르기</button><span style="flex:1"></span><button type="button" class="btn" id="dlgCancel">취소</button>
        <button class="btn primary" ${ok.length ? '' : 'disabled'}>${ok.length}건 저장하기</button></div>
    </form>`;
    $('#dlgCancel').onclick = () => d.close();
    $('#impAgain').onclick = () => start();
    $('#dlgForm').onsubmit = async e => {
      e.preventDefault();
      const btn = e.target.querySelector('button.primary'); btn.disabled = true;
      let saved = 0;
      for (let i = 0; i < ok.length; i += 200) {
        btn.textContent = `저장하는 중… ${saved}/${ok.length}`;
        const { error } = await SB.from(cfg.table).insert(ok.slice(i, i + 200).map(r => ({ ...r.data, academy_id: REAL.academy.id })));
        if (error) {
          await cfg.after(); render();
          const m = $('#dlgMsg'); m.textContent = `${saved}건까지 저장하고 멈췄어요. 잠시 후 같은 파일을 다시 올리면 저장된 줄은 건너뛰어요.`; m.hidden = false;
          btn.textContent = '다시 저장'; btn.disabled = false; return;
        }
        saved += Math.min(200, ok.length - i);
      }
      d.close(); await cfg.after();
      if (kind === 'expenses') { const last = ok.map(r => r.data.day).sort().pop(); if (last) MONTH = last.slice(0, 7); }
      render(); toast(`${cfg.what} ${saved}건을 저장했어요${dup.length ? ` · ${dup.length}건은 이미 있어서 건너뛰었어요` : ''}`);
    };
  };
  start();
  d.showModal();
}

/* ---------- 실제 데이터: 서류·행정 마감 (Supabase paperwork) ---------- */
// 다음에 돌아오는 "매달 dd일" (month를 주면 매년 그 달 dd일)
function nextDue(dd, month = null) {
  const t = day0(TODAY);
  let x = new Date(t.getFullYear(), month ?? t.getMonth(), dd);
  if (x < t) x = month == null ? new Date(t.getFullYear(), t.getMonth() + 1, dd) : new Date(t.getFullYear() + 1, month, dd);
  return ymd(x);
}
// 학원이 자주 내는 서류 (지역 교육청마다 서식·기한이 다를 수 있어요) — [이름, 내는 곳, 마감, 설명, 반복]
const PAPER_PRESETS = () => [
  ['원천세 신고·납부', '세무서', nextDue(10), '강사 급여에서 뗀 세금을 다음 달 10일까지 신고하고 내요.', 'monthly'],
  ['4대보험 취득·상실 신고', '4대보험 공단', nextDue(15), '강사가 새로 오거나 그만두면 다음 달 15일까지 신고해요.', 'none'],
  ['강사 채용·해임 통보', '교육청', null, '강사를 새로 뽑거나 내보내면 교육청에 알려요. 기한은 관할 교육청에 확인해 주세요.', 'none'],
  ['교습비 변경 신고', '교육청', null, '교습비(수강료)를 바꾸려면 미리 교육청에 신고해요.', 'none'],
  ['사업장현황신고', '세무서', nextDue(10, 1), '면세사업자인 학원은 매년 2월 10일까지 지난해 수입을 신고해요.', 'yearly']
];
const REPEAT_LABEL = { none: '', monthly: '매달', yearly: '매년' };
const PAPER_NEXT = { todo: ['doing', '준비 시작'], doing: ['done', '제출 완료'], done: ['todo', '되돌리기'] };
const PAPER_LINKS = [['홈택스', 'https://www.hometax.go.kr', '원천세 · 사업장현황신고'], ['4대사회보험 정보연계센터', 'https://www.4insure.or.kr', '4대보험 취득 · 상실 신고']];
const WHT = 0.033; // 강사(사업소득) 원천징수: 소득세 3% + 지방소득세 0.3%
const ymOf = d => d.slice(0, 7);
const nextMonthDay = (m, dd) => `${shiftMonth(m, 1)}-${String(dd).padStart(2, '0')}`;

// 학원 데이터에서 챙길 서류를 저절로 찾아요 — [auto_key, 이름, 내는 곳, 마감, 설명]
function paperSuggestions() {
  const have = new Set(REAL.paperwork.map(p => p.auto_key).filter(Boolean)), out = [];
  const cur = TODAY.slice(0, 7), last = shiftMonth(cur, -1);
  // 1) 강사 급여 → 다음 달 10일 원천세 (예상 세액까지)
  [last, cur].forEach(m => {
    const pay = sum(REAL.expenses.filter(x => x.category === '강사 급여' && ymOf(x.day) === m), x => x.amount);
    if (pay > 0) out.push([`wht:${m}`, `${+m.slice(5)}월분 원천세 신고·납부`, '세무서', nextMonthDay(m, 10),
      `${+m.slice(5)}월 강사 급여 ${won(pay)} · 예상 세액 ${won(Math.round(pay * WHT / 10) * 10)}(3.3%) · "원천세 계산표"를 내려받아 홈택스에서 신고해요.`]);
  });
  // 2) 새로 합류한 강사 → 채용 통보 · (근로계약이면) 4대보험 취득
  REAL.members.filter(x => x.role === 'teacher' && dday(x.joined_at.slice(0, 10)) >= -60).forEach(x => {
    const d = x.joined_at.slice(0, 10);
    out.push([`hire:${x.name}:${d}`, `강사 채용 통보 · ${x.name}`, '교육청', null, `${md(d)}에 합류한 강사예요. 관할 교육청에 채용 사실을 알려요. "강사 명단"을 내려받아 쓰세요.`]);
    out.push([`ins:${x.name}:${d}`, `4대보험 취득 신고 · ${x.name}`, '4대보험 공단', nextMonthDay(ymOf(d), 15), '근로계약을 맺은 강사라면 다음 달 15일까지 신고해요. 프리랜서(3.3%)라면 넘겨도 돼요.']);
  });
  // 3) 반 수강료가 지난달과 달라졌으면 → 교습비 변경 신고
  const fee = m => { const o = {}; REAL.invoices.filter(i => i.month === m && i.title === '수강료').forEach(i => { o[i.class_name || '반 미지정'] = i.amount; }); return o; };
  const a = fee(last), b = fee(cur);
  Object.keys(b).filter(c => a[c] != null && a[c] !== b[c]).forEach(c => out.push([`fee:${c}:${cur}`, `교습비 변경 신고 · ${c}`, '교육청', null,
    `${c} 수강료가 ${won(a[c])} → ${won(b[c])}로 바뀌었어요. 교습비를 바꿀 땐 교육청에 미리 신고해요. "교습비 표"를 내려받아 쓰세요.`]));
  // 4) 1월 1일 ~ 2월 10일: 지난해 수입으로 사업장현황신고
  const y = +TODAY.slice(0, 4) - 1;
  if (TODAY <= `${y + 1}-02-10`) {
    const inc = sum(ledger().filter(e => e.kind === 'in' && e.day.startsWith(String(y))), e => e.amount);
    out.push([`biz:${y}`, `${y}년 사업장현황신고`, '세무서', `${y + 1}-02-10`, `${y}년 수입 ${won(inc)} · "사업장현황 수입 요약"을 내려받아 홈택스에서 신고해요.`]);
  }
  // 같은 마감의 같은 서류가 이미 목록에 있으면(예: 직접 넣은 원천세) 빼요
  const same = (t, due) => due && REAL.paperwork.some(p => p.due === due && ['원천세', '사업장현황'].some(w => t.includes(w) && p.title.includes(w)));
  return out.filter(([k, t, , due]) => !have.has(k) && !same(t, due));
}

// 서류 바로 만들기: 학원 데이터로 엑셀을 채워 내려받아요
const PAPER_DOCS = [
  ['roster', '원생 명부', '이름 · 학년 · 반 · 학부모 연락처', 'users'],
  ['attend', '출석부', '보고 있는 달의 날짜별 출결', 'attend'],
  ['fees', '수강료 납부 내역', '보고 있는 달 청구 · 납부', 'card'],
  ['feeTable', '교습비 표', '반별 수강료 (교습비 게시 · 변경 신고용)', 'chart'],
  ['staff', '강사 명단', '이름 · 합류일 (채용 통보용)', 'grad'],
  ['wht', '원천세 계산표', '보고 있는 달 강사 급여 3.3%', 'doc'],
  ['biz', '사업장현황 수입 요약', '지난해 월별 수입 · 지출', 'chart']
];
async function makePaperDoc(kind) {
  const acad = REAL.academy.name, m = MONTH, y = +TODAY.slice(0, 4) - 1;
  const title = (t, extra = '') => [[`${acad} ${t}${extra}`], [`만든 날 ${TODAY}`], []];
  let rows, file, widths;
  if (kind === 'roster') {
    rows = [...title('원생 명부'), ['번호', '이름', '학년', '반', '학부모', '학부모 연락처', '등록일', '메모'],
      ...REAL.students.map((s, i) => [String(i + 1), s.name, s.grade || '', s.class_name || '', s.parent_name || '', s.parent_phone || '', (s.created_at || '').slice(0, 10), s.memo || ''])];
    file = 'student_roster.xlsx'; widths = [6, 12, 8, 14, 12, 16, 12, 24];
  } else if (kind === 'attend') {
    const { data } = await SB.from('attendance').select('student_id, day, status').eq('academy_id', REAL.academy.id).gte('day', `${m}-01`).lte('day', monthEnd(m));
    const n = +monthEnd(m).slice(8), map = {}, L = { present: '출', late: '지', absent: '결', early: '조' };
    (data || []).forEach(a => { map[`${a.student_id}:${+a.day.slice(8)}`] = a.status; });
    rows = [...title('출석부', ` (${monthLabel(m)})`), ['이름', '반', ...[...Array(n)].map((_, i) => String(i + 1)), '출석', '지각', '결석', '조퇴'],
      ...REAL.students.map(s => { const st = [...Array(n)].map((_, i) => map[`${s.id}:${i + 1}`]); const c = k => String(st.filter(x => x === k).length);
        return [s.name, s.class_name || '', ...st.map(x => x ? L[x] : ''), c('present'), c('late'), c('absent'), c('early')]; })];
    file = `attendance_${m}.xlsx`; widths = [10, 12, ...Array(n).fill(4), 6, 6, 6, 6];
  } else if (kind === 'fees') {
    const list = REAL.invoices.filter(i => i.month === m);
    rows = [...title('수강료 납부 내역', ` (${monthLabel(m)})`), ['학생', '반', '항목', '금액(원)', '납부 기한', '납부일', '결제 방법'],
      ...list.map(i => [i.student_name, i.class_name || '', i.title, String(i.amount), i.due || '', i.paid_at || '미납', i.method || '']),
      [], ['', '', '청구 합계', String(sum(list, i => i.amount))], ['', '', '납부 합계', String(sum(list.filter(i => i.paid_at), i => i.amount))]];
    file = `tuition_${m}.xlsx`; widths = [12, 12, 10, 12, 12, 12, 10];
  } else if (kind === 'feeTable') {
    const o = {}; [...REAL.invoices].filter(i => i.title === '수강료').sort((a, b) => a.month.localeCompare(b.month)).forEach(i => { o[i.class_name || '반 미지정'] = [i.amount, i.month]; });
    const cnt = c => REAL.students.filter(s => (s.class_name || '반 미지정') === c).length;
    rows = [...title('교습비 표'), ['반', '월 교습비(원)', '기준 달', '학생 수'], ...Object.entries(o).map(([c, [a, mm]]) => [c, String(a), mm, String(cnt(c))])];
    file = 'tuition_table.xlsx'; widths = [16, 14, 10, 8];
  } else if (kind === 'staff') {
    rows = [...title('강사 명단'), ['번호', '이름', '합류일'], ...REAL.members.filter(x => x.role === 'teacher').map((x, i) => [String(i + 1), x.name, x.joined_at.slice(0, 10)])];
    file = 'teachers.xlsx'; widths = [6, 14, 12];
  } else if (kind === 'wht') {
    const list = REAL.expenses.filter(x => x.category === '강사 급여' && ymOf(x.day) === m);
    const r = (a, p) => String(Math.floor(a * p / 10) * 10);
    rows = [...title('원천세 계산표', ` (${monthLabel(m)} 지급분)`), ['지급일', '내용', '지급액(원)', '소득세 3%', '지방소득세 0.3%', '원천징수 합계', '실지급액'],
      ...list.map(x => [x.day, x.memo || '', String(x.amount), r(x.amount, 0.03), r(x.amount, 0.003), String(+r(x.amount, 0.03) + +r(x.amount, 0.003)), String(x.amount - +r(x.amount, 0.03) - +r(x.amount, 0.003))]),
      [], ['', '합계', String(sum(list, x => x.amount)), String(sum(list, x => +r(x.amount, 0.03))), String(sum(list, x => +r(x.amount, 0.003))), String(sum(list, x => +r(x.amount, 0.03) + +r(x.amount, 0.003)))],
      [], ['* 프리랜서 강사(사업소득) 3.3% 기준이에요. 근로계약 강사는 간이세액표로 따로 계산해요. 신고 · 납부 기한은 다음 달 10일.']];
    file = `withholding_${m}.xlsx`; widths = [12, 24, 12, 12, 14, 14, 12];
  } else if (kind === 'biz') {
    const all = ledger();
    rows = [...title(`${y}년 사업장현황 수입 요약`), ['월', '수강료 수납(원)', '기타 수입(원)', '수입 합계(원)', '지출 합계(원)'],
      ...[...Array(12)].map((_, i) => { const mm = `${y}-${String(i + 1).padStart(2, '0')}`, e = all.filter(x => x.day.startsWith(mm));
        const a = sum(e.filter(x => x.src === 'inv'), x => x.amount), b = sum(e.filter(x => x.src === 'inc'), x => x.amount);
        return [`${i + 1}월`, String(a), String(b), String(a + b), String(sum(e.filter(x => x.kind === 'out'), x => x.amount))]; }),
      [], ['합계', ...[e => e.src === 'inv', e => e.src === 'inc', e => e.kind === 'in', e => e.kind === 'out'].map(f => String(sum(all.filter(x => x.day.startsWith(String(y)) && f(x)), x => x.amount)))],
      [], ['* 수강료는 "납부 확인"한 날 기준이에요. 신고 기한은 이듬해 2월 10일.']];
    file = `business_report_${y}.xlsx`; widths = [8, 16, 14, 14, 14];
  }
  downloadXlsx(file, rows, widths);
  toast('내려받았어요 · 신고한 뒤 아래 목록에서 "제출 완료"를 눌러 주세요');
}

function realPaperPage() {
  const list = [...REAL.paperwork].sort((a, b) => (a.status === 'done') - (b.status === 'done') || (a.due || '9999').localeCompare(b.due || '9999'));
  const sug = paperSuggestions();
  const acts = `<button class="btn" data-act="presetPaper">자주 내는 서류 넣기</button><button class="btn primary" data-act="addPaper">${ic('plus')}서류 추가</button>`;
  return head('서류·행정', '학원 데이터로 챙길 서류를 저절로 찾아 주고, 명부 · 출석부 · 원천세 계산표 같은 서류는 바로 만들어 내려받을 수 있어요. 직접 넣는 것도 그대로 돼요.', acts) + `
  ${sug.length ? `<section class="card auto-sug">
    <div class="card-head"><div><h2>${ic('star')} 자동으로 찾은 서류 ${sug.length}건</h2><span class="sub">강사 급여 · 새 강사 · 수강료 변경 · 연간 신고를 살펴봤어요</span></div><button class="btn sm primary" data-act="addAllSug">모두 넣기</button></div>
    <div class="list">${sug.map(([k, t, org, due, memo]) => `
      <div class="li"><span class="av" style="background:var(--blue-50);color:var(--blue-600)">${ic('doc')}</span>
        <div><div class="t">${esc(t)} <span class="muted small">${esc(org)}</span></div><div class="d">${esc(memo)}</div></div>
        <div class="r">${due ? `<span class="time">마감 ${md(due)}</span>` : ''}<button class="btn sm" data-add-sug="${esc(k)}">목록에 넣기</button></div></div>`).join('')}</div>
  </section>` : ''}
  <h2 class="sec-title">서류 바로 만들기</h2>
  <div class="sec-row">${monthBar()}<span class="muted small">출석부 · 납부 내역 · 원천세 계산표는 보고 있는 달로 만들어요</span></div>
  <div class="doc-grid">${PAPER_DOCS.map(([k, t, dsc, icn]) => `
    <button class="doc-tile" data-make-doc="${k}"><span class="tile-ic">${ic(icn)}</span><b>${t}</b><span>${dsc}</span><small>엑셀 내려받기 ↓</small></button>`).join('')}</div>
  <h2 class="sec-title">챙길 서류 ${list.filter(p => p.status !== 'done').length}건</h2>
  ${list.length ? `<section class="card"><div class="list stack">
    ${list.map(p => {
      const [c, l] = STEP_CHIP[p.status], [next, nl] = PAPER_NEXT[p.status];
      return `
      <div class="li">
        <span class="av" style="background:${p.status === 'done' ? 'var(--good)' : 'var(--navy-700)'}">${ic('doc')}</span>
        <div><div class="t"><span class="nm-link" data-edit-paper="${p.id}" role="button" tabindex="0">${esc(p.title)}</span> <span class="muted small">${esc(p.org || '')}</span>${p.repeat !== 'none' ? ` <span class="chip info">${REPEAT_LABEL[p.repeat]} 반복</span>` : ''}${p.auto_key ? ' <span class="chip mute">자동</span>' : ''}</div><div class="d">${esc(p.memo || '')}</div></div>
        <div class="r"><span class="btns"><span class="chip ${c}">${l}</span>${p.status !== 'done' ? ddChip(p.due) : ''}</span>${p.due ? `<span class="time">마감 ${md(p.due)}</span>` : ''}<button class="btn sm ${next === 'done' ? 'primary' : ''}" data-paper-step="${p.id}:${next}">${nl}</button></div>
      </div>`;
    }).join('')}
  </div></section>` : `<section class="card empty"><span class="tile-ic">${ic('doc')}</span><h2>챙길 서류를 넣어 주세요</h2>
    <p class="muted">"자주 내는 서류 넣기"를 누르면 원천세 · 4대보험 · 교육청 신고처럼 학원이 자주 내는 서류가 한 번에 들어가요. 매달 · 매년 돌아오는 서류는 제출 완료하면 다음 회차가 저절로 생겨요.</p></section>`}
  <div class="link-row">${PAPER_LINKS.map(([n, u, d]) => `<a class="hint" href="${u}" target="_blank" rel="noopener">${ic('ext')}<span>${n} · ${d}</span><b>바로가기 →</b></a>`).join('')}</div>
  <p class="muted small">기한과 서식은 지역 교육청 · 기관마다 다를 수 있어요. 세액은 참고용이에요. 헷갈리면 센터 담당 매니저에게 물어보세요.</p>`;
}

function paperDialog(p) {
  formDialog({
    title: p ? '서류 고치기' : '서류 추가', table: 'paperwork', row: p, after: loadPaperwork,
    label: r => `${r.title} 서류를`,
    fields: [
      ['title', '서류 이름', { required: true, max: 100, placeholder: '예: 교습비 변경 신고' }],
      ['org', '내는 곳', { max: 50, placeholder: '예: 교육청', half: true }], ['due', '마감일', { type: 'date', half: true }],
      ['status', '상태', { type: 'select', required: true, value: 'todo', options: Object.entries(STEP_CHIP).map(([k, [, l]]) => [k, l]), half: true }],
      ['repeat', '반복', { type: 'select', required: true, value: 'none', options: [['none', '한 번만'], ['monthly', '매달 (제출하면 다음 달 것이 생겨요)'], ['yearly', '매년']], half: true }],
      ['memo', '메모', { max: 500 }]
    ]
  });
}

async function addPaperPresets() {
  const have = new Set(REAL.paperwork.map(p => p.title));
  const rows = PAPER_PRESETS().filter(([t]) => !have.has(t)).map(([title, org, due, memo, repeat]) => ({ academy_id: REAL.academy.id, title, org, due, memo, repeat }));
  if (!rows.length) { toast('자주 내는 서류는 이미 다 넣었어요'); return; }
  const { error } = await SB.from('paperwork').insert(rows);
  if (error) { toast('넣지 못했어요. 잠시 후 다시 시도해 주세요.'); return; }
  await loadPaperwork(); render(); toast(`서류 ${rows.length}건을 넣었어요`);
}
async function addSuggestions(keys) {
  const rows = paperSuggestions().filter(([k]) => keys.includes(k)).map(([auto_key, title, org, due, memo]) => ({ academy_id: REAL.academy.id, auto_key, title, org, due, memo }));
  if (!rows.length) return;
  const { error } = await SB.from('paperwork').insert(rows);
  if (error) { toast('넣지 못했어요. 잠시 후 다시 시도해 주세요.'); return; }
  await loadPaperwork(); render(); toast(`서류 ${rows.length}건을 챙길 목록에 넣었어요`);
}

// 반복 서류는 "제출 완료"하면 다음 회차를 저절로 만들어요
async function stepPaper(id, status) {
  const p = REAL.paperwork.find(x => x.id === id), before = p.status;
  p.status = status; render();
  const { error } = await SB.from('paperwork').update({ status }).eq('id', id);
  if (error) { p.status = before; render(); toast('저장하지 못했어요'); return; }
  if (status === 'done' && p.repeat !== 'none' && p.due) {
    const d = day0(p.due), nx = p.repeat === 'monthly' ? new Date(d.getFullYear(), d.getMonth() + 1, d.getDate()) : new Date(d.getFullYear() + 1, d.getMonth(), d.getDate());
    const due = ymd(nx);
    if (!REAL.paperwork.some(x => x.title === p.title && x.due === due)) {
      await SB.from('paperwork').insert({ academy_id: REAL.academy.id, title: p.title, org: p.org, due, memo: p.memo, repeat: p.repeat });
      await loadPaperwork(); render();
      toast(`제출 완료 · 다음 회차(${md(due)} 마감)를 만들어 뒀어요`); return;
    }
  }
  toast(status === 'done' ? `${p.title} 제출 완료로 표시했어요` : '상태를 바꿨어요');
}

// 원장 홈 "오늘 챙길 일" — 실제 데이터에서 골라요
function realOwnerTodo() {
  const items = [];
  REAL.paperwork.filter(p => p.status !== 'done' && p.due && dday(p.due) <= 14).sort((a, b) => a.due.localeCompare(b.due)).slice(0, 3)
    .forEach(p => items.push([`${esc(p.title)} 제출`, `${esc(p.org || '서류·행정')} · 마감 ${md(p.due)}`, '#admin/paper', ddChip(p.due)]));
  const sug = paperSuggestions();
  if (sug.length) items.push([`자동으로 찾은 서류 ${sug.length}건 확인하기`, sug.slice(0, 2).map(x => esc(x[1])).join(' · '), '#admin/paper', '<span class="chip info">자동</span>']);
  const late = REAL.invoices.filter(i => !i.paid_at && i.due && i.due < TODAY);
  if (late.length) items.push([`기한 지난 미납 ${late.length}건 안내하기`, `합계 ${won(sum(late, i => i.amount))}`, '#admin/billing', '<span class="chip crit">미납</span>']);
  const left = REAL.attend.day === TODAY && day0(TODAY).getDay() !== 0 ? REAL.students.filter(s => !REAL.attend.map[s.id]).length : 0;
  if (left) items.push([`오늘 출결 ${left}명 입력 전`, '강사님이 수업 중에 입력해도 돼요', '#admin/attend', '<span class="chip warn">오늘</span>']);
  const urgent = DATA.leads.filter(l => l.urgent);
  if (urgent.length) items.push([`급한 문의 ${urgent.length}건에 연락하기`, urgent.slice(0, 3).map(l => esc(l.name)).join(' · '), '#members/leads', '<span class="chip crit">오늘</span>']);
  items.push(...scheduleTodo().filter(i => !i[0].startsWith('오늘 수업')));
  if (REAL.students.length && REAL.todoDay === TODAY && !REAL.todos.length) items.push(['오늘 학생 할 일 주기', '반 전체에 한 번에 줄 수 있어요 · 학생 · 학부모 앱에 바로 보여요', '#members/todos', '<span class="chip mute">할 일</span>']);
  const apv = REAL.approvals.filter(a => a.status === 'pending');
  if (apv.length) items.push([`강사 결재 ${apv.length}건 확인하기`, apv.slice(0, 3).map(a => `${esc(a.requester_name || '강사')} · ${esc(a.title)}`).join(' / '), '#admin/approvals', '<span class="chip warn">결재 대기</span>']);
  const fresh = REAL.applicants.filter(a => a.status === 'applied');
  if (fresh.length) items.push([`새 강사 지원자 ${fresh.length}명`, fresh.slice(0, 3).map(a => esc(a.name)).join(' · '), '#teachers/hire', '<span class="chip info">지원</span>']);
  const ab = REAL.abroad.requests.filter(r => r.status === 'new');
  if (ab.length) items.push([`유학 상담 신청 ${ab.length}건 확인하기`, ab.slice(0, 3).map(r => `${esc(r.parent_name)} · ${esc(r.program)}`).join(' / '), '#mou/abroad', '<span class="chip crit">새 신청</span>']);
  const miss = sum(DATA.training, t => Object.values(t.status).filter(x => x !== 'done').length);
  if (miss) items.push([`강사 교육 미이수 ${miss}건`, '센터 교육 영상 · 강사님께 알려 주세요', '#teachers/training', '<span class="chip mute">확인</span>']);
  const review = REAL.promoReqs.filter(r => r.status === 'review');
  if (review.length) items.push([`홍보 시안 ${review.length}건 확인하기`, review.slice(0, 2).map(r => `${esc(r.service)} · ${esc(r.title)}`).join(' / '), '#promo/requests', '<span class="chip warn">확인 필요</span>']);
  const waiting = REAL.family.filter(f => !f.students.length);
  if (waiting.length && REAL.students.length) items.push([`앱 가입한 가족 ${waiting.length}명 아이와 연결하기`, waiting.slice(0, 3).map(f => esc(f.name)).join(' · '), '#members/students', '<span class="chip info">앱 연결</span>']);
  if (!items.length) items.push(['오늘 급하게 챙길 일은 없어요', '서류 마감 · 미납 · 출결 · 급한 문의를 살펴봤어요', '#admin', '<span class="chip good">여유</span>']);
  return items;
}

/* ================= 학원 일정 · 시간표 (Supabase timetable · academy_events) =================
   원장 · 강사 · 학부모 · 학생 모두 같은 화면을 봐요. 강의실 · 담당 강사 · 메모 같은 세부 사항은 원장 · 강사에게만 보여요.
   시간표는 원장이, 일정은 원장 · 강사가 넣어요(강사는 내가 넣은 일정만 고쳐요). */
const WEEK = [1, 2, 3, 4, 5, 6, 0]; // 월요일부터
const WD = '일월화수목금토';
const EV_KINDS = ['수업', '시험', '행사', '휴원', '상담', '설명회', '기타'];
const EV_COLOR = { 수업: 'info', 시험: 'crit', 행사: 'good', 휴원: 'mute', 상담: 'warn', 설명회: 'info', 기타: 'mute' };
let SCH_VIEW = 'week', SCH_CLASS = null;
const mondayOf = d => { const x = day0(d); return addDays(d, -((x.getDay() + 6) % 7)); };
let SCH_WEEK = null; // 주간 시간표에서 보고 있는 주의 월요일
const isStaff = () => ROLE === 'owner' || ROLE === 'teacher';
const hm = t => t ? t.slice(0, 5) : '';
const schData = () => REAL ? { tt: REAL.timetable, ev: REAL.events } : { tt: DATA.timetable, ev: DATA.events };
const myClasses = () => REAL && !isStaff() ? [...new Set(REAL.kids.map(k => k.class_name).filter(Boolean))] : !REAL && !isStaff() ? [DATA.child.cls] : [];
const allClasses = () => [...new Set([...schData().tt.map(t => t.class_name), ...(REAL ? REAL.students.map(s => s.class_name) : DATA.students.map(s => s.cls))].filter(Boolean))].sort();
// 반 고르기: 가족은 우리 아이 반이 먼저, 원장 · 강사는 전체가 먼저
function schClass() {
  if (SCH_CLASS === null) SCH_CLASS = myClasses().length ? 'mine' : 'all';
  return SCH_CLASS;
}
const classOk = cls => { const c = schClass(); return c === 'all' || (c === 'mine' ? !cls || myClasses().includes(cls) : !cls || cls === c); };
const evOn = (e, d) => e.day <= d && (e.end_day || e.day) >= d;

function schedulePage() {
  const { tt, ev } = schData(), staff = isStaff(), c = schClass();
  const classes = [...new Set([...tt.map(t => t.class_name)])].sort();
  const opts = [...(myClasses().length ? [['mine', ROLE === 'student' ? '내 반' : '우리 아이 반']] : []), ['all', '전체'], ...(staff ? classes.map(x => [x, x]) : [])];
  const acts = [ROLE === 'owner' ? `<button class="btn" data-act="addTT">${ic('plus')}시간표 추가</button>` : '', staff ? `<button class="btn primary" data-act="addEv">${ic('plus')}일정 추가</button>` : ''].join('');
  const todayTT = tt.filter(t => +t.weekday === day0(TODAY).getDay() && classOk(t.class_name)).sort((a, b) => a.start_time.localeCompare(b.start_time));
  const todayEv = ev.filter(e => evOn(e, TODAY) && classOk(e.target_class));
  return head('일정 · 시간표', staff ? '학부모 · 학생에게도 같은 시간표와 일정이 보여요. 강의실 · 담당 강사 · 메모는 원장님과 강사님에게만 보여요.' : '학원 시간표와 시험 · 행사 · 휴원 일정이에요.', acts) + `
  <div class="sch-bar">
    <div class="filters">${[['week', '주간 시간표'], ['month', '월간 일정']].map(([k, l]) => `<button class="${SCH_VIEW === k ? 'on' : ''}" data-sch-view="${k}">${l}</button>`).join('')}</div>
    ${opts.length > 1 ? `<div class="filters">${opts.map(([k, l]) => `<button class="${c === k ? 'on' : ''}" data-sch-class="${esc(k)}">${esc(l)}</button>`).join('')}</div>` : ''}
  </div>
  <section class="card today-strip">
    <b>오늘 ${todayText().split(' ').slice(1).join(' ')}</b>
    ${todayTT.length || todayEv.length ? [...todayEv.map(e => `<span class="chip ${EV_COLOR[e.kind]}">${esc(e.kind)} · ${esc(e.title)}</span>`), ...todayTT.map(t => `<span class="chip mute">${hm(t.start_time)} ${esc(t.class_name)}${t.subject ? ` ${esc(t.subject)}` : ''}</span>`)].join('')
      : '<span class="muted small">오늘은 수업 · 일정이 없어요</span>'}
  </section>` + (SCH_VIEW === 'week' ? weekView(tt, staff) : monthView(ev, staff));
}

function weekView(tt, staff) {
  const list = tt.filter(t => classOk(t.class_name));
  if (!tt.length) return `
  <section class="card empty"><span class="tile-ic">${ic('cal')}</span><h2>아직 시간표가 없어요</h2>
    <p class="muted">${ROLE === 'owner' ? '반마다 요일 · 시간을 넣으면 강사 · 학부모 · 학생 모두에게 같은 시간표가 보여요.' : '원장님이 시간표를 넣으면 여기에 보여요.'}</p>
    ${ROLE === 'owner' ? `<button class="btn primary" data-act="addTT">시간표 추가</button>` : ''}</section>`;
  const mon = SCH_WEEK || mondayOf(TODAY), sun = addDays(mon, 6), dateOf = d => addDays(mon, (d + 6) % 7);
  const evs = schData().ev.filter(e => classOk(e.target_class) && e.day <= sun && (e.end_day || e.day) >= mon);
  const days = WEEK.filter(d => d >= 1 && d <= 5 || list.some(t => +t.weekday === d) || evs.some(e => evOn(e, dateOf(d))));
  const thisWeek = mon === mondayOf(TODAY), wk = Math.round(daysBetween(mondayOf(TODAY), mon) / 7);
  return `
  <div class="week-bar">
    <button class="btn sm" data-sch-week="-1" aria-label="지난주">‹</button>
    <b>${+mon.slice(5, 7)}월 ${+mon.slice(8)}일 – ${+sun.slice(5, 7)}월 ${+sun.slice(8)}일</b>
    <span class="chip ${thisWeek ? 'info' : 'mute'}">${thisWeek ? '이번 주' : wk > 0 ? `${wk}주 뒤` : `${-wk}주 전`}</span>
    <button class="btn sm" data-sch-week="1" aria-label="다음 주">›</button>
    ${thisWeek ? '' : '<button class="btn sm" data-sch-week="0">이번 주로</button>'}
    <label class="wk-pick">날짜로 고르기<input type="date" id="schWeekPick" value="${mon}"></label>
  </div>
  <div class="tt" style="--d:${days.length}">${days.map(d => {
    const date = dateOf(d), isToday = date === TODAY, dayEv = evs.filter(e => evOn(e, date)), off = dayEv.some(e => e.kind === '휴원');
    const blks = list.filter(t => +t.weekday === d).sort((a, b) => a.start_time.localeCompare(b.start_time));
    return `
    <section class="tt-day ${isToday ? 'today' : ''} ${off ? 'off' : ''}">
      <h3>${WD[d]} <span class="dt">${+date.slice(5, 7)}/${+date.slice(8)}</span>${isToday ? ' <span class="chip info">오늘</span>' : ''}</h3>
      ${dayEv.map(e => `<span class="chip ${EV_COLOR[e.kind]} tt-ev">${esc(e.kind)} · ${esc(e.title)}</span>`).join('')}
      ${blks.length ? blks.map(t => `
      <${ROLE === 'owner' ? `button type="button" data-edit-tt="${t.id}"` : 'div'} class="tt-blk">
        <span class="tm num">${hm(t.start_time)}–${hm(t.end_time)}</span>
        <b>${esc(t.class_name)}</b>${t.subject ? `<span>${esc(t.subject)}</span>` : ''}
        ${staff && (t.room || t.teacher_name) ? `<span class="sub">${[t.room, t.teacher_name].filter(Boolean).map(esc).join(' · ')}</span>` : ''}
        ${staff && t.note ? `<span class="note">${esc(t.note)}</span>` : ''}
      </${ROLE === 'owner' ? 'button' : 'div'}>`).join('') : '<p class="muted small">수업 없음</p>'}
    </section>`;
  }).join('')}</div>
  ${ROLE === 'owner' ? '<p class="muted small">시간표 칸을 누르면 고치거나 지울 수 있어요.</p>' : ''}`;
}

function monthView(ev, staff) {
  const first = day0(`${MONTH}-01`), last = +monthEnd(MONTH).slice(8), pad = first.getDay();
  const list = ev.filter(e => classOk(e.target_class) && e.day <= monthEnd(MONTH) && (e.end_day || e.day) >= `${MONTH}-01`).sort((a, b) => a.day.localeCompare(b.day) || hm(a.start_time).localeCompare(hm(b.start_time)));
  const canEdit = e => ROLE === 'owner' || (ROLE === 'teacher' && (!REAL || e.created_by === USER.id));
  const cells = [...Array(pad)].map(() => '<div class="cal-c off"></div>').concat([...Array(last)].map((_, i) => {
    const d = `${MONTH}-${String(i + 1).padStart(2, '0')}`, es = list.filter(e => evOn(e, d)), w = day0(d).getDay();
    return `<div class="cal-c ${d === TODAY ? 'today' : ''} ${w === 0 ? 'sun' : w === 6 ? 'sat' : ''}"><span class="dn">${i + 1}</span>${es.slice(0, 3).map(e => `<span class="ev ${EV_COLOR[e.kind]}" title="${esc(e.title)}">${esc(e.title)}</span>`).join('')}${es.length > 3 ? `<span class="more">+${es.length - 3}</span>` : ''}</div>`;
  }));
  return monthBar() + `
  <section class="card">
    <div class="cal">${[...WD].map((x, i) => `<div class="cal-h ${i === 0 ? 'sun' : i === 6 ? 'sat' : ''}">${x}</div>`).join('')}${cells.join('')}</div>
  </section>
  <section class="card">
    <div class="card-head"><h2>${+MONTH.slice(5)}월 일정 ${list.length}개</h2>${staff ? '<span class="sub">메모는 원장 · 강사만 보여요</span>' : ''}</div>
    ${list.length ? `<div class="list">${list.map(e => `
      <${canEdit(e) ? `a href="#schedule" data-edit-ev="${e.id}"` : 'div'} class="li ${canEdit(e) ? 'link' : ''}">
        <span class="av time-av num">${md(e.day)}${e.end_day && e.end_day !== e.day ? `<small>~${md(e.end_day)}</small>` : ''}</span>
        <div><div class="t">${esc(e.title)} <span class="chip ${EV_COLOR[e.kind]}">${esc(e.kind)}</span></div>
          <div class="d">${e.start_time ? `${hm(e.start_time)}${e.end_time ? `–${hm(e.end_time)}` : ''} · ` : ''}${e.target_class ? esc(e.target_class) : '전체'}</div>
          ${staff && e.detail ? `<div class="d pre">${esc(e.detail)}</div>` : ''}</div>
        <div class="r">${dday(e.day) >= 0 && dday(e.day) <= 14 ? ddChip(e.day) : ''}</div>
      </${canEdit(e) ? 'a' : 'div'}>`).join('')}</div>` : `<p class="muted small" style="margin:0">이 달 일정이 없어요.${staff ? ' 시험 · 행사 · 휴원을 넣어 두면 학부모 · 학생에게도 보여요.' : ''}</p>`}
  </section>`;
}

function ttDialog(t) {
  const classes = allClasses();
  formDialog({
    title: t ? '시간표 고치기' : '시간표 추가', table: 'timetable', row: t, after: loadSchedule,
    label: r => `${r.class_name} 수업을`,
    check: d => d.end_time <= d.start_time ? '끝나는 시간이 시작보다 늦어야 해요.' : null,
    fields: [
      ['class_name', '반', { required: true, max: 50, chips: classes, placeholder: '예: 초등 B반' }],
      ['weekday', '요일', { type: 'select', required: true, options: WEEK.map(d => [d, `${WD[d]}요일`]), value: 1, half: true }],
      ['subject', '과목', { max: 50, placeholder: '예: 영어 리딩', half: true }],
      ['start_time', '시작', { type: 'time', required: true, value: '16:00', half: true }], ['end_time', '끝', { type: 'time', required: true, value: '17:30', half: true }],
      ['room', '강의실 (원장·강사만)', { max: 30, placeholder: '예: 2강의실', half: true }], ['teacher_name', '담당 강사 (원장·강사만)', { max: 50, half: true, placeholder: '예: 김민지' }],
      ['note', '메모 (원장·강사만)', { max: 300, placeholder: '예: 격주 단어 시험' }]
    ]
  });
}
function evDialog(e) {
  formDialog({
    title: e ? '일정 고치기' : '일정 추가', table: 'academy_events', row: e, after: loadSchedule,
    label: r => `${r.title} 일정을`,
    check: d => d.end_day && d.end_day < d.day ? '끝나는 날이 시작하는 날보다 앞이에요.' : d.end_time && d.start_time && d.end_time <= d.start_time ? '끝나는 시간이 시작보다 늦어야 해요.' : null,
    fields: [
      ['title', '일정', { required: true, max: 100, placeholder: '예: 11월 월말 평가' }],
      ['kind', '종류', { type: 'select', required: true, options: EV_KINDS, value: '행사', half: true }],
      ['target_class', '누구에게', { type: 'select', options: allClasses(), blank: '전체', half: true }],
      ['day', '날짜', { type: 'date', required: true, value: MONTH === TODAY.slice(0, 7) ? TODAY : `${MONTH}-01`, half: true }], ['end_day', '끝나는 날 (여러 날이면)', { type: 'date', half: true }],
      ['start_time', '시작 시간', { type: 'time', half: true }], ['end_time', '끝 시간', { type: 'time', half: true }],
      ['detail', '메모 (원장·강사만 보여요)', { type: 'area', rows: 3, max: 1000, placeholder: '예: 시험지 30부 출력 · 2강의실' }]
    ]
  });
}
// 오늘 시간표 · 일정 → 홈 "오늘 챙길 일"
function scheduleTodo(link = '#schedule') {
  const { tt, ev } = schData(), w = day0(TODAY).getDay(), mine = myClasses();
  const fit = cls => !mine.length || !cls || mine.includes(cls);
  const items = ev.filter(e => (evOn(e, TODAY) || e.day === addDays(TODAY, 1)) && fit(e.target_class)).slice(0, 2)
    .map(e => [`${e.day === TODAY || evOn(e, TODAY) ? '오늘' : '내일'} ${esc(e.title)}`, `${esc(e.kind)}${e.start_time ? ` · ${hm(e.start_time)}` : ''}${e.target_class ? ` · ${esc(e.target_class)}` : ''}`, link, `<span class="chip ${EV_COLOR[e.kind]}">${esc(e.kind)}</span>`]);
  const today = tt.filter(t => +t.weekday === w && fit(t.class_name)).sort((a, b) => a.start_time.localeCompare(b.start_time));
  if (today.length) items.push([`오늘 수업 ${today.length}개`, today.slice(0, 3).map(t => `${hm(t.start_time)} ${esc(t.class_name)}`).join(' · '), link, '<span class="chip info">시간표</span>']);
  return items;
}

/* ================= 학생 할 일 (Supabase student_todos) =================
   원장 · 강사는 반 전체나 학생 한 명에게, 부모님은 우리 아이에게 할 일을 정해 줘요. 학생은 체크하고, 스스로 넣을 수도 있어요. */
const TODO_PICKS = ['단어 외우기', '숙제하기', '오늘 배운 것 복습', '독서 30분', '문제집 2쪽', '준비물 챙기기', '오답 노트'];
const BY_ROLE = { owner: '원장님', teacher: '선생님', parent: '부모님', student: '내가' };
const todoBy = t => t.creator_role === 'student' ? (ROLE === 'student' ? '내가 정함' : `${esc(t.creator_name || '')} 학생이 정함`) : t.creator_role === 'parent' ? `부모님${t.creator_name ? ` · ${esc(t.creator_name)}` : ''}` : `${t.creator_name ? `${esc(t.creator_name)} ` : ''}${BY_ROLE[t.creator_role] || '학원'}`;
const todosOf = sid => REAL.todos.filter(t => t.student_id === sid);
const canDelTodo = t => ROLE === 'owner' || t.created_by === USER.id;
const todoItem = t => `
  <label class="chk ${t.done_at ? 'done' : ''}"><input type="checkbox" data-todo="${t.id}" ${t.done_at ? 'checked' : ''}>
    <span><b>${esc(t.title)}</b><small>${todoBy(t)}${t.done_at ? ` · ${md(t.done_at.slice(0, 10))} 완료` : ''}</small></span>
    ${canDelTodo(t) ? `<button type="button" class="x" data-del-todo="${t.id}" aria-label="지우기">×</button>` : ''}</label>`;
const todoDayBar = () => {
  const d = REAL.todoDay;
  return `<div class="pager"><button class="btn sm" data-todo-day="-1" aria-label="전날">‹</button><input type="date" id="todoDay" value="${d}"><button class="btn sm" data-todo-day="1" aria-label="다음 날">›</button>${d !== TODAY ? '<button class="btn sm" data-todo-day="0">오늘</button>' : ''}</div>`;
};
const todoAddForm = (targets, hint) => `
  <form class="card todo-add" id="todoAdd" novalidate>
    <div class="row">${targets ? `<select name="who" aria-label="누구에게">${targets}</select>` : ''}
      <input name="title" maxlength="100" placeholder="${hint}" aria-label="할 일"><button class="btn primary">${ic('plus')}추가</button></div>
    <div class="pick-chips">${TODO_PICKS.map(p => `<button type="button" data-todo-pick="${p}">${p}</button>`).join('')}</div>
  </form>`;
const progress = list => { const n = list.filter(t => t.done_at).length; return list.length ? `<span class="sub">${list.length}개 중 ${n}개 완료</span>${bar(n / list.length * 100, 'sm')}` : ''; };

function todosPage() {
  if (!REAL) return head('오늘 할 일', '학원과 부모님이 정해 준 할 일이에요. 다 하면 체크!') + `<section class="card">${homeworkList()}</section>`;
  const when = REAL.todoDay === TODAY ? '오늘' : md(REAL.todoDay);
  if (isStaff()) {
    if (!REAL.students.length) return head('학생 할 일', '') + noStudents();
    const groups = byClass(REAL.students);
    const targets = groups.map(([cls, ss]) => `<option value="c:${esc(cls)}">${esc(cls)} 전체 (${ss.length}명)</option>`).join('') +
      groups.map(([cls, ss]) => `<optgroup label="${esc(cls)}">${ss.map(s => `<option value="s:${s.id}">${esc(s.name)}</option>`).join('')}</optgroup>`).join('');
    const all = REAL.todos;
    return head('학생 할 일', `${when} · 반 전체나 학생 한 명에게 할 일을 주면 학생 · 학부모 앱에 바로 보여요. 학생이 체크하면 여기서도 보여요.`) + todoDayBar() + `
    <div class="stats"><div class="stat"><span>${when} 할 일</span><b class="num">${all.length}개</b></div><div class="stat good"><span>완료</span><b class="num">${all.filter(t => t.done_at).length}개</b></div>
      <div class="stat"><span>할 일 받은 학생</span><b class="num">${new Set(all.map(t => t.student_id)).size}/${REAL.students.length}명</b></div></div>
    ${todoAddForm(targets, '예: 단어 20개 외우기')}` + groups.map(([cls, ss]) => `
    <section class="card" style="margin-bottom:16px">
      <div class="card-head"><h2>${esc(cls)}</h2>${progress(all.filter(t => ss.some(s => s.id === t.student_id)))}</div>
      <div class="todo-grid">${ss.map(s => `
        <div class="todo-st"><b>${esc(s.name)}</b>${todosOf(s.id).length ? `<div class="checks">${todosOf(s.id).map(todoItem).join('')}</div>` : '<p class="muted small" style="margin:0">할 일 없음</p>'}</div>`).join('')}</div>
    </section>`).join('');
  }
  // 학부모 · 학생
  if (!REAL.kids.length) return head('오늘 할 일', '') + noKid();
  const k = kidNow(), list = todosOf(k.id), me = ROLE === 'student';
  return head(me ? `${when} 할 일` : `${esc(k.name)}의 ${when} 할 일`, me ? '학원 선생님과 부모님이 정해 준 할 일이에요. 다 하면 체크! 내가 할 일을 더 넣을 수도 있어요.'
    : '학원에서 정한 할 일과 부모님이 정한 할 일이 함께 보여요. 아이가 체크하면 바로 보여요.') + kidPicker() + todoDayBar() + `
  <section class="card" style="margin-bottom:16px">
    <div class="card-head"><h2>${list.length ? (list.every(t => t.done_at) ? '다 했어요! 🎉' : `${list.filter(t => !t.done_at).length}개 남았어요`) : '할 일이 없어요'}</h2>${progress(list)}</div>
    ${list.length ? `<div class="checks big">${[...list].sort((a, b) => !!a.done_at - !!b.done_at).map(todoItem).join('')}</div>` : `<p class="muted small" style="margin:0">${me ? '오늘은 정해진 할 일이 없어요. 스스로 정해 볼까요?' : '아래에서 할 일을 정해 주세요.'}</p>`}
  </section>` + todoAddForm('', me ? '예: 수학 문제집 2쪽' : '예: 줄넘기 100번 · 일기 쓰기');
}

async function addTodos(who, title) {
  const day = REAL.todoDay, aid = REAL.academy.id;
  let ids;
  if (!isStaff()) ids = [kidNow().id];
  else if (who.startsWith('c:')) ids = REAL.students.filter(s => (s.class_name || '반 미지정') === who.slice(2)).map(s => s.id);
  else ids = [who.slice(2)];
  const { error } = await SB.from('student_todos').insert(ids.map(student_id => ({ academy_id: aid, student_id, day, title })));
  if (error) { toast('저장하지 못했어요. 다시 시도해 주세요.'); return false; }
  await loadTodos(day); render(); toast(ids.length > 1 ? `${ids.length}명에게 할 일을 줬어요` : '할 일을 넣었어요');
  return true;
}
async function checkTodo(id, done) {
  const t = REAL.todos.find(x => x.id === id), before = t.done_at;
  t.done_at = done ? new Date().toISOString() : null; render();
  const { error } = await SB.rpc('check_todo', { p_id: id, p_done: done });
  if (error) { t.done_at = before; render(); toast('저장하지 못했어요'); return; }
  if (done && ROLE === 'student' && todosOf(t.student_id).every(x => x.done_at)) toast('오늘 할 일을 다 했어요! 잘했어요 🎉');
}
const todoStat = () => {
  if (!REAL) return `숙제 ${DATA.child.homework.filter(h => !h.done).length}개 남음`;
  const list = isStaff() ? REAL.todos : REAL.kids.length ? todosOf(kidNow().id) : [];
  if (REAL.todoDay !== TODAY) return '할 일';
  return list.length ? `오늘 ${list.length}개 중 ${list.filter(t => t.done_at).length}개 완료` : '오늘 할 일 없음';
};
// 홈 "오늘 할 일" 카드 (학생 · 학부모)
function todayTodoCard() {
  if (!REAL || !REAL.kids.length || REAL.todoDay !== TODAY) return '';
  const list = todosOf(kidNow().id), link = ROLE === 'student' ? '#todos' : '#kid/todos';
  return `
  <section class="card" style="margin-bottom:16px">
    <div class="card-head"><h2>${ROLE === 'student' ? '오늘 할 일' : `${esc(kidNow().name)} 오늘 할 일`}</h2>${list.length ? progress(list) : `<a class="sub" href="${link}">할 일 정하기 →</a>`}</div>
    ${list.length ? `<div class="checks">${[...list].sort((a, b) => !!a.done_at - !!b.done_at).slice(0, 6).map(todoItem).join('')}</div>${list.length > 6 ? `<a class="sub" href="${link}">모두 보기 →</a>` : ''}` : '<p class="muted small" style="margin:0">오늘은 정해진 할 일이 없어요.</p>'}
  </section>`;
}

/* ================= 성장 리포트 (Supabase growth_reports) =================
   원장 · 강사가 학생기록부처럼 써서 "발급"하면 연결된 학부모 · 학생이 봐요. 출결 · 할 일 수행은 기간에 맞춰 저절로 채워요.
   인쇄 · PDF 저장은 브라우저 인쇄(window.print)로, 인쇄할 때는 리포트만 보여요(app.css @media print). */
const RATING_ITEMS = ['수업 태도', '참여도', '과제 수행', '이해도', '성장 의지'];
const RATING_WORD = ['', '노력 필요', '보통', '좋음', '우수', '매우 우수'];
const DEMO_REPORT = { id: 'demo', student_name: '이서연', class_name: '초등 B반', title: '2026년 10월 성장 리포트', period_from: '2026-10-01', period_to: '2026-10-31', status: 'issued', issued_at: '2026-10-31T09:00:00Z', writer_name: '김민지',
  scores: [{ subject: '단어 시험', score: '95', note: '4주 연속 90점 이상' }, { subject: '리딩', score: '88', note: '긴 지문 이해가 좋아졌어요' }, { subject: '라이팅', score: 'B+', note: '문장 연결을 연습 중' }],
  ratings: { '수업 태도': 5, '참여도': 4, '과제 수행': 5, '이해도': 4, '성장 의지': 5 },
  strengths: '수업 시간에 손을 들고 발표하는 일이 많아졌고, 숙제를 빠짐없이 해 와요.', improve: '라이팅에서 접속사를 써서 문장을 길게 이어 쓰는 연습이 더 필요해요.',
  comment: '한 달 동안 단어 시험 점수가 꾸준히 올랐어요. 특히 리딩 시간에 모르는 단어를 문맥으로 추측하는 힘이 생겼어요. 집에서도 하루 10분 소리 내어 읽기를 함께 해 주시면 큰 도움이 돼요.',
  goals: '11월 목표: 라이팅 한 문단(5문장) 혼자 쓰기 · 단어 시험 평균 95점', stats: { total: 13, present: 12, late: 1, absent: 0, early: 0, todos: 18, todosDone: 17 } };
const reportsData = () => REAL ? REAL.reports : [DEMO_REPORT];
const reportBase = () => ROLE === 'owner' ? 'members/reports' : ROLE === 'parent' ? 'kid/reports' : 'reports';
let rpEditing = null; // 고치는 중인 발급 리포트 id
const RP_STATS = {};  // 리포트 id → 기간 출결 · 할 일 (불러오는 중이면 null)

const stars = n => `<span class="stars" aria-label="${n}점">${[1, 2, 3, 4, 5].map(i => `<i class="${i <= n ? 'on' : ''}">★</i>`).join('')}</span>`;
const attRate = st => st && st.total ? Math.round((st.present + st.late) / st.total * 100) : null;

function reportsPage() {
  const list = reportsData(), staff = isStaff();
  if (!staff) {
    const k = REAL && REAL.kids.length ? kidNow() : null;
    const mine = REAL ? list.filter(r => k && r.student_id === k.id) : list;
    if (REAL && !k) return head('성장 리포트', '') + noKid();
    return head('성장 리포트', `학원 선생님이 발급한 ${ROLE === 'student' ? '내' : `${k ? esc(k.name) : DATA.child.name}의`} 성장 기록이에요. 열어서 인쇄하거나 PDF로 저장할 수 있어요.`) + (REAL ? kidPicker() : '') + (mine.length ? `
    <section class="card"><div class="list">${mine.map(r => `
      <a class="li link" href="#${reportBase()}/${r.id}"><span class="av" style="background:var(--blue-600)">${ic('doc')}</span>
        <div><div class="t">${esc(r.title)}</div><div class="d">${md(r.period_from)} – ${md(r.period_to)} · ${esc(r.writer_name || '학원')} 선생님 · ${md((r.issued_at || r.created_at).slice(0, 10))} 발급</div></div>
        <div class="r"><span class="chip good">열기</span></div></a>`).join('')}</div></section>` : `
    <section class="card empty"><span class="tile-ic">${ic('doc')}</span><h2>아직 발급된 리포트가 없어요</h2><p class="muted">선생님이 성장 리포트를 발급하면 여기에 보여요.</p></section>`);
  }
  const acts = REAL ? `<button class="btn primary" data-act="newReport">${ic('plus')}리포트 만들기</button>` : '';
  const drafts = list.filter(r => r.status === 'draft'), issued = list.filter(r => r.status === 'issued');
  const row = r => `
    <a class="li link" href="#${reportBase()}/${r.id}"><span class="av" style="background:${r.status === 'issued' ? 'var(--good)' : 'var(--navy-700)'}">${esc((r.student_name || '학')[0])}</span>
      <div><div class="t">${esc(r.student_name || '')} <span class="muted small">${esc(r.class_name || '')}</span></div><div class="d">${esc(r.title)} · ${esc(r.writer_name || '')}</div></div>
      <div class="r">${r.status === 'issued' ? `<span class="chip good">발급</span><span class="time">${md(r.issued_at.slice(0, 10))}</span>` : '<span class="chip warn">작성 중</span>'}</div></a>`;
  return head('성장 리포트', '학생기록부처럼 과목 점수 · 평가 · 선생님 의견을 적어 발급하면 학부모 · 학생 앱에 바로 보여요. 출결과 할 일 수행은 기간에 맞춰 저절로 채워요.', acts) + (list.length ? `
  ${drafts.length ? `<section class="card" style="margin-bottom:16px"><div class="card-head"><h2>작성 중 ${drafts.length}개</h2><span class="sub">학부모에게는 아직 안 보여요</span></div><div class="list">${drafts.map(row).join('')}</div></section>` : ''}
  ${issued.length ? `<section class="card"><div class="card-head"><h2>발급 ${issued.length}개</h2></div><div class="list">${issued.map(row).join('')}</div></section>` : ''}` : `
  <section class="card empty"><span class="tile-ic">${ic('doc')}</span><h2>첫 성장 리포트를 만들어 보세요</h2>
    <p class="muted">학생 한 명이나 반 전체를 고르면 리포트 틀이 만들어져요. 점수와 의견을 채워 발급하면 돼요.</p>${acts}</section>`);
}

function newReportDialog() {
  if (!REAL.students.length) { toast('먼저 원생을 추가해 주세요'); return; }
  const groups = byClass(REAL.students), last = shiftMonth(TODAY.slice(0, 7), Number(TODAY.slice(8)) <= 10 ? -1 : 0);
  const d = dialogEl();
  d.innerHTML = `
  <form method="dialog" class="dlg" id="rpNew" novalidate>
    <h2>성장 리포트 만들기</h2>
    <label class="f">누구 리포트인가요?<select name="who">${groups.map(([cls, ss]) => `<option value="c:${esc(cls)}">${esc(cls)} 전체 (${ss.length}명)</option>`).join('')}${groups.map(([cls, ss]) => `<optgroup label="${esc(cls)}">${ss.map(s => `<option value="s:${s.id}">${esc(s.name)}</option>`).join('')}</optgroup>`).join('')}</select></label>
    <label class="f">제목<input name="title" maxlength="100" value="${monthLabel(last)} 성장 리포트"></label>
    <div class="two"><label class="f">기간 시작<input type="date" name="from" value="${last}-01"></label><label class="f">기간 끝<input type="date" name="to" value="${monthEnd(last)}"></label></div>
    <p class="muted small" style="margin:0">반 전체를 고르면 학생마다 따로 리포트가 만들어져요. 다 쓴 리포트만 골라서 발급하면 돼요.</p>
    <p class="msg" id="dlgMsg" hidden></p>
    <div class="acts"><span style="flex:1"></span><button type="button" class="btn" id="dlgCancel">취소</button><button class="btn primary">만들기</button></div>
  </form>`;
  d.showModal();
  $('#dlgCancel').onclick = () => d.close();
  $('#rpNew').onsubmit = async e => {
    e.preventDefault();
    const el = e.target.elements, who = el.who.value, fail = t => { const m = $('#dlgMsg'); m.textContent = t; m.hidden = false; };
    const title = el.title.value.trim(), from = el.from.value, to = el.to.value;
    if (!title || !from || !to) return fail('제목과 기간을 넣어 주세요.');
    if (to < from) return fail('기간 끝이 시작보다 앞이에요.');
    const ids = who.startsWith('c:') ? REAL.students.filter(s => (s.class_name || '반 미지정') === who.slice(2)).map(s => s.id) : [who.slice(2)];
    const { data, error } = await SB.from('growth_reports').insert(ids.map(student_id => ({ academy_id: REAL.academy.id, student_id, title, period_from: from, period_to: to,
      scores: [], ratings: {} }))).select('id');
    if (error) return fail('만들지 못했어요. 잠시 후 다시 시도해 주세요.');
    d.close(); await loadReports();
    if (ids.length === 1 && data && data[0]) location.hash = `#${reportBase()}/${data[0].id}`; else render();
    toast(`${ids.length}명 리포트를 만들었어요`);
  };
}

// 기간의 출결 · 할 일 수행을 불러와요 (원장 · 강사만)
async function loadReportStats(r) {
  RP_STATS[r.id] = null;
  const [a, t] = await Promise.all([
    SB.from('attendance').select('status').eq('student_id', r.student_id).gte('day', r.period_from).lte('day', r.period_to),
    SB.from('student_todos').select('done_at').eq('student_id', r.student_id).gte('day', r.period_from).lte('day', r.period_to)
  ]);
  const at = a.data || [], td = t.data || [];
  const c = k => at.filter(x => x.status === k).length;
  RP_STATS[r.id] = { total: at.length, present: c('present'), late: c('late'), absent: c('absent'), early: c('early'), todos: td.length, todosDone: td.filter(x => x.done_at).length };
  if (location.hash.endsWith(r.id)) render();
}

function reportDetail(id) {
  const r = reportsData().find(x => x.id === id);
  if (!r) return notFound();
  const staff = isStaff() && REAL;
  if (staff && (r.status === 'draft' || rpEditing === r.id)) return reportEditor(r);
  const acts = `<button class="btn" data-act="printReport">${ic('doc')}인쇄 · PDF 저장</button>${staff ? `<button class="btn" data-act="copyReport">안내 문구</button><button class="btn" data-rp-edit="${r.id}">고치기</button>` : ''}`;
  return `<div class="rp-acts no-print">${acts}</div>` + reportDoc(r, r.stats);
}

// 발급된 리포트 문서 (화면 · 인쇄 같은 모양)
function reportDoc(r, st) {
  const rate = attRate(st), todoRate = st && st.todos ? Math.round(st.todosDone / st.todos * 100) : null;
  const ratings = RATING_ITEMS.filter(k => r.ratings && r.ratings[k]);
  const scores = (r.scores || []).filter(x => x.subject);
  const block = (t, v) => v ? `<section class="rp-sec"><h3>${t}</h3><p>${esc(v)}</p></section>` : '';
  return `
  <article class="report" id="reportDoc">
    <header class="rp-head">
      <div><span class="rp-acad">${esc(REAL ? REAL.academy.name : DATA.academy.name)}</span><h1>${esc(r.title)}</h1></div>
      <div class="rp-who"><b>${esc(r.student_name || '')}</b><span>${esc(r.class_name || '')}</span><span>${r.period_from.replaceAll('-', '.')} – ${r.period_to.replaceAll('-', '.')}</span></div>
    </header>
    <div class="rp-stats">
      <div><span>출석률</span><b>${rate === null ? '-' : `${rate}%`}</b><small>${st && st.total ? `수업 ${st.total}일 · 지각 ${st.late} · 결석 ${st.absent}${st.early ? ` · 조퇴 ${st.early}` : ''}` : '출결 기록 없음'}</small></div>
      <div><span>할 일 수행</span><b>${todoRate === null ? '-' : `${todoRate}%`}</b><small>${st && st.todos ? `${st.todos}개 중 ${st.todosDone}개 완료` : '할 일 기록 없음'}</small></div>
      ${ratings.length ? `<div><span>종합 평가</span><b>${(ratings.reduce((a, k) => a + r.ratings[k], 0) / ratings.length).toFixed(1)}</b><small>5점 만점</small></div>` : ''}
    </div>
    ${scores.length ? `<section class="rp-sec"><h3>과목 · 시험</h3><table class="rp-table"><thead><tr><th>과목</th><th>점수 · 등급</th><th>선생님 메모</th></tr></thead><tbody>${scores.map(x => `<tr><td>${esc(x.subject)}</td><td><b>${esc(x.score || '-')}</b></td><td>${esc(x.note || '')}</td></tr>`).join('')}</tbody></table></section>` : ''}
    ${ratings.length ? `<section class="rp-sec"><h3>학습 태도</h3><div class="rp-rates">${ratings.map(k => `<div><span>${k}</span>${stars(r.ratings[k])}<small>${RATING_WORD[r.ratings[k]]}</small></div>`).join('')}</div></section>` : ''}
    <div class="rp-two">${block('잘하고 있는 점', r.strengths)}${block('더 노력할 점', r.improve)}</div>
    ${block('선생님 종합 의견', r.comment)}
    ${block('다음 목표', r.goals)}
    <footer class="rp-foot">${r.issued_at ? `${r.issued_at.slice(0, 10).replaceAll('-', '.')} 발급` : '작성 중 (아직 발급 전)'} · 담당 ${esc(r.writer_name || '')} 선생님 · 학원지원센터</footer>
  </article>`;
}

function reportEditor(r) {
  if (!(r.id in RP_STATS)) loadReportStats(r);
  const st = RP_STATS[r.id];
  const scores = [...(r.scores || [])]; while (scores.length < 4) scores.push({});
  const area = (k, lab, ph, rows = 3) => `<label class="f">${lab}<textarea name="${k}" rows="${rows}" maxlength="${k === 'comment' ? 2000 : 1000}" placeholder="${ph}">${esc(r[k] || '')}</textarea></label>`;
  return head(`${esc(r.student_name || '')} 성장 리포트`, r.status === 'issued' ? '발급한 리포트를 고치는 중이에요. 저장하면 학부모 · 학생 화면에도 바로 바뀌어요.' : '작성 중이에요. 학부모에게는 "발급하기"를 눌러야 보여요.') + `
  <form class="card rp-form" id="rpForm" novalidate>
    <div class="two"><label class="f">제목<input name="title" maxlength="100" value="${esc(r.title)}"></label>
      <div class="two"><label class="f">기간 시작<input type="date" name="from" value="${r.period_from}"></label><label class="f">기간 끝<input type="date" name="to" value="${r.period_to}"></label></div></div>
    <div class="rp-auto"><b>저절로 채워지는 기록</b> ${st === null || st === undefined ? '<span class="muted small">불러오는 중…</span>'
      : `<span class="chip info">출석률 ${attRate(st) === null ? '-' : `${attRate(st)}%`} (수업 ${st.total}일 · 지각 ${st.late} · 결석 ${st.absent})</span><span class="chip info">할 일 ${st.todos}개 중 ${st.todosDone}개 완료</span>`}
      <span class="muted small">기간을 바꾸고 저장하면 다시 계산해요</span></div>
    <h3 class="rp-h">과목 · 시험</h3>
    <div class="rp-scores" id="rpScores">${scores.map((x, i) => `
      <div class="sc-row"><input name="sub${i}" maxlength="30" placeholder="과목 (예: 단어 시험)" value="${esc(x.subject || '')}"><input name="sco${i}" maxlength="10" placeholder="점수 · 등급" value="${esc(x.score || '')}"><input name="not${i}" maxlength="100" placeholder="메모 (예: 4주 연속 90점 이상)" value="${esc(x.note || '')}"></div>`).join('')}
    </div>
    <button type="button" class="btn sm" data-act="addScoreRow">${ic('plus')}과목 더 넣기</button>
    <h3 class="rp-h">학습 태도 <span class="muted small">눌러서 1~5점</span></h3>
    <div class="rp-rate-edit">${RATING_ITEMS.map(k => `<div><span>${k}</span><span class="stars edit" data-rate="${k}">${[1, 2, 3, 4, 5].map(i => `<button type="button" class="${i <= ((r.ratings || {})[k] || 0) ? 'on' : ''}" data-v="${i}" aria-label="${k} ${i}점">★</button>`).join('')}</span><input type="hidden" name="r_${k}" value="${(r.ratings || {})[k] || ''}"></div>`).join('')}</div>
    <div class="two">${area('strengths', '잘하고 있는 점', '예: 발표를 자주 하고 숙제를 빠짐없이 해 와요.')}${area('improve', '더 노력할 점', '예: 라이팅에서 문장을 길게 이어 쓰는 연습')}</div>
    ${area('comment', '선생님 종합 의견', '예: 한 달 동안 단어 시험 점수가 꾸준히 올랐어요. 집에서는 …', 5)}
    ${area('goals', '다음 목표', '예: 11월 목표 — 라이팅 한 문단 혼자 쓰기', 2)}
    <p class="msg" id="rpMsg" hidden></p>
    <div class="acts">${r.status === 'draft' || ROLE === 'owner' ? `<button type="button" class="btn danger" data-act="delReport">삭제</button>` : ''}<span style="flex:1"></span>
      ${r.status === 'issued' ? `<button type="button" class="btn" data-act="unissueReport">발급 취소</button><button class="btn primary" data-save="issued">저장</button>`
        : `<button class="btn" data-save="draft">임시 저장</button><button class="btn primary" data-save="issued">발급하기</button>`}</div>
  </form>
  <h2 class="sec-title">미리보기</h2>` + reportDoc(r, st || r.stats);
}

async function saveReport(r, status) {
  const f = $('#rpForm'), el = f.elements, msg = $('#rpMsg');
  const fail = t => { msg.textContent = t; msg.hidden = false; };
  const scores = [...f.querySelectorAll('.sc-row')].map((_, i) => ({ subject: el[`sub${i}`].value.trim(), score: el[`sco${i}`].value.trim(), note: el[`not${i}`].value.trim() })).filter(x => x.subject);
  const ratings = Object.fromEntries(RATING_ITEMS.map(k => [k, +el[`r_${k}`].value]).filter(([, v]) => v >= 1 && v <= 5));
  const title = el.title.value.trim(), from = el.from.value, to = el.to.value;
  if (!title) return fail('제목을 적어 주세요.');
  if (!from || !to || to < from) return fail('기간을 확인해 주세요.');
  if (status === 'issued' && r.status === 'draft' && !el.comment.value.trim() && !scores.length) return fail('발급하기 전에 과목 점수나 선생님 의견을 하나는 적어 주세요.');
  const changed = from !== r.period_from || to !== r.period_to;
  if (changed || !RP_STATS[r.id]) { r.period_from = from; r.period_to = to; await loadReportStats(r); }
  const row = { title, period_from: from, period_to: to, scores, ratings, strengths: el.strengths.value.trim() || null, improve: el.improve.value.trim() || null,
    comment: el.comment.value.trim() || null, goals: el.goals.value.trim() || null, stats: RP_STATS[r.id] || r.stats || {}, status };
  if (status === 'issued' && r.status === 'draft' && !confirm(`${r.student_name} 학생 리포트를 발급할까요? 연결된 학부모 · 학생 앱에 바로 보여요.`)) return;
  const { error } = await SB.from('growth_reports').update(row).eq('id', r.id);
  if (error) return fail('저장하지 못했어요. 잠시 후 다시 시도해 주세요.');
  rpEditing = null; await loadReports(); render();
  toast(status === 'issued' ? (r.status === 'draft' ? '발급했어요 · 학부모 · 학생 앱에 보여요' : '고쳤어요') : '임시 저장했어요');
}

/* ================= 자료실 (Supabase library_items + Storage 'library') =================
   원장 · 강사가 파일이나 링크를 올리고 누구에게 보일지 골라요. 원장은 모든 자료를 봐요(강사의 비공개 포함). */
const LIB_CATS = ['수업 자료', '교재 · 문제', '학부모 안내', '행정 서식', '강사 공유', '기타'];
const LIB_VIS = {
  private: ['🔒 나만 보기', 'mute', '올린 사람만 봐요 (원장님은 볼 수 있어요)'],
  staff: ['원장 · 강사', 'info', '원장님과 강사님만 봐요'],
  class: ['반 가족', 'warn', '원장 · 강사 + 고른 반 아이의 학부모 · 학생'],
  everyone: ['학원 모두', 'good', '원장 · 강사 · 학부모 · 학생 모두']
};
const LIB_MAX = 50 * 1024 * 1024;
let libCat = '전체', libVis = 'all';
const fileSize = n => n == null ? '' : n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))}KB` : `${(n / 1024 / 1024).toFixed(1)}MB`;
const fileIcon = it => it.link_url && !it.file_path ? 'ext' : /pdf/.test(it.mime || '') ? 'doc' : /image/.test(it.mime || '') ? 'page' : /video/.test(it.mime || '') ? 'video' : 'doc';
const visChip = it => { const [l, c] = LIB_VIS[it.visibility]; return `<span class="chip ${c}">${l}${it.visibility === 'class' ? ` · ${esc(it.target_class)}` : ''}</span>`; };
const libData = () => REAL ? REAL.library : DATA.library;
const canEditLib = it => REAL && (ROLE === 'owner' || it.uploaded_by === USER.id);

function libraryPage() {
  const all = libData(), staff = isStaff();
  const list = all.filter(it => (libCat === '전체' || it.category === libCat) && (libVis === 'all' || it.visibility === libVis));
  const cats = ['전체', ...LIB_CATS.filter(c => all.some(it => it.category === c))];
  const add = staff ? `<button class="btn primary" data-act="addLib">${ic('plus')}자료 올리기</button>` : '';
  const desc = ROLE === 'owner' ? '학원 자료를 한곳에 모아요. 올릴 때 누구에게 보일지 고를 수 있어요. 원장님은 강사님의 비공개 자료까지 모두 볼 수 있어요.'
    : ROLE === 'teacher' ? '수업 자료 · 서식을 올리고 함께 써요. "나만 보기"로 올린 자료는 나와 원장님만 볼 수 있어요.'
    : '학원에서 학부모 · 학생에게 공유한 자료예요. 눌러서 열거나 내려받을 수 있어요.';
  return head('자료실', desc, add) + `
  ${cats.length > 2 ? `<div class="filters">${cats.map(c => `<button class="${c === libCat ? 'on' : ''}" data-lib-cat="${esc(c)}">${esc(c)}</button>`).join('')}</div>` : ''}
  ${staff && all.length ? `<div class="filters">${[['all', '공유 범위 전체'], ...Object.entries(LIB_VIS).map(([k, v]) => [k, v[0]])].map(([k, l]) => `<button class="${k === libVis ? 'on' : ''}" data-lib-vis="${k}">${l} ${k === 'all' ? '' : all.filter(it => it.visibility === k).length}</button>`).join('')}</div>` : ''}
  ${list.length ? `<section class="card"><div class="list stack">${list.map(it => `
    <div class="li lib">
      <span class="av" style="background:var(--blue-50);color:var(--blue-600)">${ic(fileIcon(it))}</span>
      <div><div class="t">${canEditLib(it) ? `<span class="nm-link" data-edit-lib="${it.id}" role="button" tabindex="0">${esc(it.title)}</span>` : esc(it.title)} ${staff ? visChip(it) : ''}</div>
        <div class="d">${esc(it.category)} · ${esc(it.uploader_name || '학원')}${it.uploader_role === 'teacher' ? ' 선생님' : it.uploader_role === 'owner' ? ' 원장님' : ''} · ${md(it.created_at.slice(0, 10))}${it.file_name ? ` · ${esc(it.file_name)} ${fileSize(it.file_size)}` : ''}</div>
        ${it.description ? `<div class="d pre">${esc(it.description)}</div>` : ''}</div>
      <div class="r"><span class="btns">${it.file_path ? `<button class="btn sm" data-lib-open="${it.id}">열기</button><button class="btn sm primary" data-lib-down="${it.id}">내려받기</button>` : ''}${it.link_url ? `<a class="btn sm ${it.file_path ? '' : 'primary'}" href="${esc(it.link_url)}" target="_blank" rel="noopener">링크 열기 ${ic('ext')}</a>` : ''}</span></div>
    </div>`).join('')}</div></section>` : `
  <section class="card empty"><span class="tile-ic">${ic('doc')}</span><h2>${all.length ? '고른 조건에 맞는 자료가 없어요' : '아직 자료가 없어요'}</h2>
    <p class="muted">${staff ? '수업 자료 · 학부모 안내문 · 행정 서식을 올려 두면 필요한 사람만 볼 수 있어요. 파일은 50MB까지, 큰 영상은 링크로 넣어 주세요.' : '학원에서 자료를 공유하면 여기에 보여요.'}</p>${all.length ? '' : add}</section>`}`;
}

function libDialog(it) {
  if (!REAL) { toast('예시 계정에서는 올릴 수 없어요'); return; }
  const classes = allClasses(), d = dialogEl(), v = it ? it.visibility : 'staff';
  d.innerHTML = `
  <form method="dialog" class="dlg" id="libForm" novalidate>
    <h2>${it ? '자료 고치기' : '자료 올리기'}</h2>
    <label class="f">제목 *<input name="title" maxlength="100" value="${esc(it ? it.title : '')}" placeholder="예: 11월 초등 B반 단어장"></label>
    ${it ? (it.file_name ? `<p class="muted small" style="margin:0">파일: ${esc(it.file_name)} ${fileSize(it.file_size)} · 파일을 바꾸려면 지우고 다시 올려 주세요.</p>` : '') : `
    <label class="f">파일 (50MB까지)<input type="file" name="file"></label>`}
    <label class="f">${it ? '링크' : '또는 링크'}<input name="link" type="url" maxlength="500" value="${esc(it && it.link_url || '')}" placeholder="https:// (유튜브 · 구글 드라이브 등)"></label>
    <label class="f">분류<select name="cat">${LIB_CATS.map(c => `<option ${(it ? it.category : '수업 자료') === c ? 'selected' : ''}>${c}</option>`).join('')}</select></label>
    <fieldset class="vis-pick"><legend>누구에게 보일까요?</legend>${Object.entries(LIB_VIS).map(([k, [l, , dsc]]) => `
      <label><input type="radio" name="vis" value="${k}" ${v === k ? 'checked' : ''}><span><b>${l}</b><small>${k === 'private' && ROLE === 'owner' ? '나만 봐요' : dsc}</small></span></label>`).join('')}
      <label class="f" id="libClass" ${v === 'class' ? '' : 'hidden'}>어느 반?<select name="cls">${classes.map(c => `<option ${it && it.target_class === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></label>
    </fieldset>
    <label class="f">설명<textarea name="desc" rows="3" maxlength="1000" placeholder="예: 매주 월요일 단어 시험 범위">${esc(it && it.description || '')}</textarea></label>
    <p class="msg" id="dlgMsg" hidden></p>
    <div class="acts">${it ? '<button type="button" class="btn danger" id="dlgDel">삭제</button>' : ''}<span style="flex:1"></span><button type="button" class="btn" id="dlgCancel">취소</button><button class="btn primary">${it ? '저장' : '올리기'}</button></div>
  </form>`;
  d.showModal();
  const f = $('#libForm'), fail = t => { const m = $('#dlgMsg'); m.textContent = t; m.hidden = false; };
  $('#dlgCancel').onclick = () => d.close();
  f.querySelectorAll('[name="vis"]').forEach(r => r.onchange = () => { $('#libClass').hidden = f.elements.vis.value !== 'class'; });
  f.onsubmit = async e => {
    e.preventDefault();
    const el = f.elements, title = el.title.value.trim(), link = el.link.value.trim(), file = !it && el.file.files[0], vis = el.vis.value;
    if (!title) return fail('제목을 적어 주세요.');
    if (!it && !file && !link) return fail('파일을 고르거나 링크를 넣어 주세요.');
    if (it && !it.file_path && !link) return fail('링크를 넣어 주세요.');
    if (link && !/^https:\/\/\S+$/.test(link)) return fail('링크는 https:// 로 시작해야 해요.');
    if (file && file.size > LIB_MAX) return fail('파일이 50MB보다 커요. 큰 파일은 구글 드라이브 같은 곳에 올리고 링크로 넣어 주세요.');
    if (vis === 'class' && !el.cls.value) return fail('반을 골라 주세요. 반이 없으면 원생 명단에서 반을 먼저 정해 주세요.');
    const row = { title, category: el.cat.value, visibility: vis, target_class: vis === 'class' ? el.cls.value : null, description: el.desc.value.trim() || null, link_url: link || null };
    const btn = f.querySelector('button.primary'); btn.disabled = true; btn.textContent = file ? '올리는 중…' : '저장 중…';
    if (it) {
      const { error } = await SB.from('library_items').update(row).eq('id', it.id);
      btn.disabled = false; btn.textContent = '저장';
      if (error) return fail('저장하지 못했어요. 잠시 후 다시 시도해 주세요.');
    } else {
      let path = null;
      if (file) {
        const ext = (file.name.match(/\.([a-z0-9]{1,8})$/i) || [])[1];
        path = `${REAL.academy.id}/${crypto.randomUUID()}/file${ext ? `.${ext.toLowerCase()}` : ''}`;
        const up = await SB.storage.from('library').upload(path, file, { contentType: file.type || 'application/octet-stream' });
        if (up.error) { btn.disabled = false; btn.textContent = '올리기'; return fail('파일을 올리지 못했어요. 잠시 후 다시 시도해 주세요.'); }
      }
      const { error } = await SB.from('library_items').insert({ ...row, academy_id: REAL.academy.id, file_path: path, file_name: file ? file.name.slice(0, 200) : null, file_size: file ? file.size : null, mime: file ? (file.type || '').slice(0, 100) || null : null });
      if (error) { if (path) await SB.storage.from('library').remove([path]); btn.disabled = false; btn.textContent = '올리기'; return fail('저장하지 못했어요. 잠시 후 다시 시도해 주세요.'); }
    }
    d.close(); await loadLibrary(); render(); toast(it ? '고쳤어요' : `자료를 올렸어요 · ${LIB_VIS[vis][2]}`);
  };
  if (it) $('#dlgDel').onclick = async () => {
    if (!confirm(`${it.title} 자료를 삭제할까요?`)) return;
    const { error } = await SB.from('library_items').delete().eq('id', it.id);
    if (error) { toast('삭제하지 못했어요'); return; }
    if (it.file_path) await SB.storage.from('library').remove([it.file_path]);
    d.close(); await loadLibrary(); render(); toast('삭제했어요');
  };
}
// 비공개 버킷이라 잠깐 쓰는 주소(10분)를 받아서 열어요
async function openLib(id, download) {
  const it = REAL.library.find(x => x.id === id);
  const w = download ? null : window.open('about:blank', '_blank');
  const { data, error } = await SB.storage.from('library').createSignedUrl(it.file_path, 600, download ? { download: it.file_name || true } : undefined);
  if (error || !data) { if (w) w.close(); toast('파일을 열지 못했어요'); return; }
  if (w) w.location = data.signedUrl; else location.href = data.signedUrl;
}

/* ================= 메신저 (Supabase conversations · messages) =================
   1:1 대화. 누구와 대화할 수 있는지는 DB(private.message_academy)가 정해요:
   원장↔센터 관리자 · 강사 · 학부모 · 학생, 강사↔강사 · 학부모 · 학생, 학부모↔학생(같은 아이로 연결된 가족만).
   새 메시지는 5초마다 확인해요(대화방을 열어 둔 동안), 목록 · 안 읽은 수는 20초마다. */
const MSG = { convs: [], contacts: null, msgs: {}, loaded: false };
const WHO = { admin: '센터 관리자', owner: '원장', teacher: '강사', parent: '학부모', student: '학생' };
const DEMO_CONVS = [
  { id: 'dc1', other_name: '김민지', other_role: 'teacher', last_at: '2026-10-25T08:10:00Z', last_text: '내일 보강 수업 강의실 2번 써도 될까요?', unread: 1, can_send: true },
  { id: 'dc2', other_name: '김은정', other_role: 'parent', last_at: '2026-10-24T11:00:00Z', last_text: '서연이 다음 주 화요일 결석해요.', unread: 0, can_send: true },
  { id: 'dc3', other_name: '학원지원센터', other_role: 'admin', last_at: '2026-10-22T02:00:00Z', last_text: '제휴 연결이 완료됐어요.', unread: 0, can_send: true }
];
const convsData = () => USER ? MSG.convs : DEMO_CONVS;
const msgUnread = () => sum(convsData(), c => Number(c.unread) || 0);
const msgTime = s => { const d = new Date(s); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
const msgWhen = s => { const d = ymd(new Date(s)); return d === TODAY ? msgTime(s) : md(d); };

function messagesPage() {
  const list = convsData();
  const add = `<button class="btn primary" data-act="newChat">${ic('plus')}새 대화</button>`;
  const can = { owner: '센터 관리자 · 강사 · 학부모 · 학생', teacher: '원장님 · 다른 강사 · 학부모 · 학생', parent: '원장님 · 선생님 · 우리 아이', student: '원장님 · 선생님 · 부모님', admin: '원장님' }[ROLE] || '';
  return head('메신저', `${can}과 1:1로 이야기할 수 있어요.`, add) + (list.length ? `
  <section class="card"><div class="list">${list.map(c => `
    <a class="li link conv" href="#messages/${c.id}">
      <span class="av" style="background:${c.other_role === 'admin' ? 'var(--navy-700)' : c.other_role === 'teacher' ? 'var(--good)' : c.other_role === 'owner' ? 'var(--blue-600)' : 'var(--warn)'}">${esc((c.other_name || '?')[0])}</span>
      <div><div class="t">${esc(c.other_name)} <span class="muted small">${WHO[c.other_role] || ''}${c.academy_name && c.other_role === 'owner' && ROLE === 'admin' ? ` · ${esc(c.academy_name)}` : ''}</span></div><div class="d">${esc(c.last_text || '아직 메시지가 없어요')}</div></div>
      <div class="r">${c.last_at ? `<span class="time">${msgWhen(c.last_at)}</span>` : ''}${+c.unread ? `<span class="count-dot">${c.unread}</span>` : ''}</div>
    </a>`).join('')}</div></section>` : `
  <section class="card empty"><span class="tile-ic">${ic('chat')}</span><h2>아직 대화가 없어요</h2><p class="muted">"새 대화"를 눌러 이야기할 사람을 골라 주세요.</p>${add}</section>`);
}

function chatPage(id) {
  const c = convsData().find(x => x.id === id);
  if (!c) return notFound();
  if (USER && !(id in MSG.msgs)) loadMessages(id);
  const msgs = USER ? MSG.msgs[id] : [{ sender_id: 'o', body: c.last_text, created_at: c.last_at }];
  return `
  <section class="card chat">
    <div class="chat-head"><span class="av" style="background:var(--blue-600)">${esc(c.other_name[0])}</span><div><b>${esc(c.other_name)}</b><span class="muted small">${WHO[c.other_role] || ''}${c.academy_name ? ` · ${esc(c.academy_name)}` : ''}</span></div></div>
    <div class="chat-log" id="chatLog">${chatLog(msgs)}</div>
    ${c.can_send === false ? '<p class="muted small chat-off">학원을 나갔거나 연결이 끊겨서 더 이상 메시지를 보낼 수 없어요.</p>' : `
    <form class="chat-send" id="chatSend" novalidate><textarea name="body" rows="1" maxlength="2000" placeholder="메시지 입력 (Enter 보내기 · Shift+Enter 줄 바꿈)"></textarea><button class="btn primary">보내기</button></form>`}
  </section>`;
}
function chatLog(msgs) {
  if (msgs == null) return '<p class="muted small" style="text-align:center">불러오는 중…</p>';
  if (!msgs.length) return '<p class="muted small" style="text-align:center">첫 메시지를 보내 보세요.</p>';
  let day = '';
  return msgs.map(m => {
    const d = ymd(new Date(m.created_at)), sep = d !== day ? `<div class="chat-day">${d === TODAY ? '오늘' : `${+d.slice(5, 7)}월 ${+d.slice(8)}일`}</div>` : '';
    day = d;
    return `${sep}<div class="bubble ${USER && m.sender_id === USER.id ? 'mine' : ''}"><p>${esc(m.body)}</p><time>${msgTime(m.created_at)}</time></div>`;
  }).join('');
}

function newChatDialog() {
  if (!USER) { toast('예시 계정에서는 대화를 시작할 수 없어요'); return; }
  const d = dialogEl();
  const draw = () => {
    const q = ($('#ctQ') || { value: '' }).value.trim();
    const list = (MSG.contacts || []).filter(x => !q || x.name.includes(q) || (x.kids || '').includes(q));
    const groups = ['admin', 'owner', 'teacher', 'parent', 'student'].map(r => [r, list.filter(x => x.role === r)]).filter(([, l]) => l.length);
    $('#ctList').innerHTML = MSG.contacts === null ? '<p class="muted small">불러오는 중…</p>' : groups.length ? groups.map(([r, l]) => `
      <h3 class="ct-h">${WHO[r]} ${l.length}</h3>${l.map(x => `<button type="button" class="ct" data-ct="${x.user_id}"><span class="av">${esc(x.name[0])}</span><span><b>${esc(x.name)}</b><small>${x.kids ? `${esc(x.kids)} ${r === 'parent' ? '학부모' : ''}` : esc(x.academy_name || '')}</small></span></button>`).join('')}`).join('')
      : '<p class="muted small">대화할 수 있는 사람이 없어요. 학원에 합류한 사람만 보여요.</p>';
    $('#ctList').querySelectorAll('[data-ct]').forEach(b => b.onclick = async () => {
      const { data, error } = await SB.rpc('start_conversation', { p_other: b.dataset.ct });
      if (error) { toast('대화를 시작할 수 없는 사람이에요'); return; }
      d.close(); await loadConvs(); location.hash = `#messages/${data}`;
    });
  };
  d.innerHTML = `<div class="dlg"><h2>새 대화</h2><input id="ctQ" class="ct-q" placeholder="이름 · 아이 이름으로 찾기"><div class="ct-list" id="ctList"></div>
    <div class="acts"><span style="flex:1"></span><button type="button" class="btn" id="dlgCancel">닫기</button></div></div>`;
  d.showModal(); $('#dlgCancel').onclick = () => d.close(); $('#ctQ').oninput = draw; draw();
  if (MSG.contacts === null) SB.rpc('message_contacts').then(({ data }) => { MSG.contacts = data || []; if (d.open) draw(); });
}

async function loadConvs() {
  const { data } = await SB.rpc('my_conversations');
  MSG.convs = data || []; MSG.loaded = true;
}
async function loadMessages(id, since) {
  let q = SB.from('messages').select('id, sender_id, body, created_at').eq('conversation_id', id).order('created_at').limit(500);
  if (since) q = q.gt('created_at', since);
  const { data } = await q;
  const before = MSG.msgs[id];
  MSG.msgs[id] = since ? [...(before || []), ...(data || []).filter(m => !(before || []).some(x => x.id === m.id))] : (data || []);
  const c = MSG.convs.find(x => x.id === id);
  if (c && +c.unread) { c.unread = 0; SB.rpc('mark_conversation_read', { p_conv: id }); }
  else if (!since) SB.rpc('mark_conversation_read', { p_conv: id });
  const grew = !before || MSG.msgs[id].length !== before.length;
  if (grew) drawChatLog(id);
  return grew;
}
// 대화창만 다시 그려요 (쓰고 있던 글은 그대로)
function drawChatLog(id) {
  const log = $('#chatLog');
  if (!log || location.hash !== `#messages/${id}`) return;
  const atEnd = log.scrollHeight - log.scrollTop - log.clientHeight < 60;
  log.innerHTML = chatLog(MSG.msgs[id]);
  if (atEnd || log.dataset.first !== '1') { log.scrollTop = log.scrollHeight; log.dataset.first = '1'; }
  updateMsgBadge();
}
async function sendMessage(id, body) {
  const { data, error } = await SB.from('messages').insert({ conversation_id: id, body }).select('id, sender_id, body, created_at').single();
  if (error) { toast('보내지 못했어요. 잠시 후 다시 시도해 주세요.'); return false; }
  MSG.msgs[id] = [...(MSG.msgs[id] || []), data];
  const c = MSG.convs.find(x => x.id === id);
  if (c) { c.last_text = body.slice(0, 100); c.last_at = data.created_at; }
  drawChatLog(id);
  const log = $('#chatLog'); if (log) log.scrollTop = log.scrollHeight;
  return true;
}
const updateMsgBadge = () => {
  const a = document.querySelector('#nav a[href="#messages"]');
  if (!a) return;
  let b = a.querySelector('.badge'); const n = msgUnread();
  if (!n) { if (b) b.remove(); return; }
  if (!b) { b = document.createElement('span'); b.className = 'badge'; a.appendChild(b); }
  b.textContent = n > 99 ? '99+' : n;
};
let msgTick = 0;
setInterval(async () => {
  if (!USER || !SB || !MY) return;
  msgTick++;
  const m = (location.hash || '').match(/^#messages\/([0-9a-f-]{36})$/);
  if (m && document.visibilityState === 'visible') {
    const list = MSG.msgs[m[1]];
    await loadMessages(m[1], list && list.length ? list[list.length - 1].created_at : undefined);
  }
  if (msgTick % 4 === 0) {
    const before = msgUnread(); await loadConvs();
    if (location.hash === '#messages' && msgUnread() !== before) render(); else updateMsgBadge();
  }
}, 5000);

/* ================= 결재: 강사 → 원장 (Supabase approvals) =================
   강사가 물품 · 재정 지출을 올리면 원장이 승인 · 반려. 승인할 때 "지출에 바로 넣기"를 고르면 재정에 저절로 들어가요. */
const APV_KINDS = ['물품 구입', '재정 지출', '기타'];
const APV_STATE = { pending: ['warn', '결재 대기'], approved: ['good', '승인'], rejected: ['crit', '반려'] };
const APV_EXP = { '물품 구입': '교재비', '재정 지출': '기타', '기타': '기타' };
const apvData = () => REAL ? REAL.approvals : ROLE === 'teacher' ? DATA.approvals.filter(a => a.requester_name === ME.name) : DATA.approvals;
let apvFilter = 'pending';
const apvRow = (a, owner) => {
  const [c, l] = APV_STATE[a.status];
  return `
    <div class="li">
      <span class="av" style="background:${a.status === 'pending' ? 'var(--warn)' : a.status === 'approved' ? 'var(--good)' : 'var(--crit)'}">${ic(a.kind === '재정 지출' ? 'card' : 'doc')}</span>
      <div><div class="t">${owner || a.status !== 'pending' ? esc(a.title) : `<span class="nm-link" data-edit-apv="${a.id}" role="button" tabindex="0">${esc(a.title)}</span>`} <span class="chip mute">${esc(a.kind)}</span></div>
        <div class="d">${owner ? `${esc(a.requester_name || '강사')} · ` : ''}${md(a.created_at.slice(0, 10))} 올림${a.want_by ? ` · ${md(a.want_by)}까지 필요` : ''}${a.amount != null ? ` · <b>${won(a.amount)}</b>` : ''}</div>
        ${a.detail ? `<div class="d pre">${esc(a.detail)}</div>` : ''}
        ${a.owner_comment ? `<div class="d"><b>원장 의견</b> ${esc(a.owner_comment)}</div>` : ''}
        ${a.expense_id ? '<div class="d">재정 지출에 넣었어요</div>' : ''}</div>
      <div class="r"><span class="chip ${c}">${l}</span>${owner && a.status === 'pending' ? `<span class="btns"><button class="btn sm" data-apv="${a.id}:0">반려</button><button class="btn sm primary" data-apv="${a.id}:1">승인</button></span>`
        : !owner && a.status === 'pending' ? `<button class="btn sm" data-cancel-apv="${a.id}">취소</button>` : a.decided_at ? `<span class="time">${md(a.decided_at.slice(0, 10))} 결재</span>` : ''}</div>
    </div>`;
};
// 원장: 결재함
function approvalsOwnerPage() {
  const all = apvData(), list = all.filter(a => apvFilter === 'all' || a.status === apvFilter);
  const n = k => all.filter(a => a.status === k).length;
  return head('결재함', '강사님이 올린 물품 구입 · 재정 지출 결재예요. 승인할 때 "지출에 바로 넣기"를 고르면 재정에 저절로 들어가요.') + `
  <div class="stats">
    <div class="stat ${n('pending') ? 'crit' : ''}"><span>결재 대기</span><b class="num">${n('pending')}건</b></div>
    <div class="stat"><span>대기 금액</span><b class="num">${won(sum(all.filter(a => a.status === 'pending'), a => a.amount || 0))}</b></div>
    <div class="stat good"><span>이번 달 승인</span><b class="num">${all.filter(a => a.status === 'approved' && (a.decided_at || '').startsWith(TODAY.slice(0, 7))).length}건</b></div>
  </div>
  <div class="filters">${[['pending', `결재 대기 ${n('pending')}`], ['approved', '승인'], ['rejected', '반려'], ['all', '전체']].map(([k, l]) => `<button class="${apvFilter === k ? 'on' : ''}" data-apv-filter="${k}">${l}</button>`).join('')}</div>
  ${list.length ? `<section class="card"><div class="list stack">${list.map(a => apvRow(a, true)).join('')}</div></section>` : `
  <section class="card empty"><span class="tile-ic">${ic('check')}</span><h2>${apvFilter === 'pending' ? '기다리는 결재가 없어요' : '아직 없어요'}</h2>
    <p class="muted">강사님이 "결재 요청"에서 올리면 여기에 바로 나와요.</p></section>`}`;
}
// 강사: 결재 요청
function approvalsTeacherPage() {
  const all = apvData();
  const add = `<button class="btn primary" data-act="newApv">${ic('plus')}결재 올리기</button>`;
  return head('결재 요청', '수업에 필요한 물품이나 비용을 원장님께 결재받아요. 기다리는 동안에는 제목을 눌러 고치거나 취소할 수 있어요.', add) + (all.length ? `
  <section class="card"><div class="list stack">${all.map(a => apvRow(a, false)).join('')}</div></section>` : `
  <section class="card empty"><span class="tile-ic">${ic('check')}</span><h2>아직 올린 결재가 없어요</h2>
    <p class="muted">교재 · 수업 준비물 · 행사 비용처럼 원장님 확인이 필요한 걸 올려 주세요. 승인 · 반려되면 여기서 바로 보여요.</p>${add}</section>`);
}
function approvalDialog(a) {
  if (!REAL) { toast('예시 계정에서는 올릴 수 없어요'); return; }
  formDialog({
    title: a ? '결재 고치기' : '결재 올리기', table: 'approvals', row: a, after: loadApprovals, okText: a ? '저장' : '올리기',
    label: r => `${r.title} 결재를`, doneText: '결재를 올렸어요 · 원장님이 확인하면 알려 드려요',
    fields: [
      ['kind', '종류', { type: 'select', required: true, options: APV_KINDS, value: '물품 구입', half: true }],
      ['amount', '금액', { type: 'won', placeholder: '예: 45,000', half: true }],
      ['title', '무엇이 필요하세요?', { required: true, max: 100, placeholder: '예: 초등 B반 화이트보드 마커 12개' }],
      ['detail', '자세한 내용', { type: 'area', max: 2000, rows: 4, placeholder: '품목 · 수량 · 구입처(링크) · 필요한 이유를 적어 주세요.' }],
      ['want_by', '언제까지 필요해요?', { type: 'date' }]
    ]
  });
}
// 원장: 승인 · 반려 창
function decideDialog(a, ok) {
  const d = dialogEl();
  const canExp = ok && a.amount > 0;
  d.innerHTML = `
  <form method="dialog" class="dlg" id="apvForm" novalidate>
    <h2>${ok ? '결재 승인' : '결재 반려'}</h2>
    <p class="muted small" style="margin:0">${esc(a.requester_name || '강사')} · ${esc(a.title)}${a.amount != null ? ` · ${won(a.amount)}` : ''}</p>
    <label class="f">${ok ? '전할 말 (선택)' : '반려 이유'}<textarea name="comment" rows="3" maxlength="500" placeholder="${ok ? '예: 다음 주 월요일까지 구입해 주세요. 영수증은 꼭 챙겨 주세요.' : '예: 이번 달 예산을 넘어서 다음 달에 다시 올려 주세요.'}"></textarea></label>
    ${canExp ? `<label class="chk-line"><input type="checkbox" name="toExp" checked><span>재정에 지출로 바로 넣기</span></label>
    <label class="f">지출 항목<select name="cat">${EXP_CATS.map(c => `<option ${c === APV_EXP[a.kind] ? 'selected' : ''}>${c}</option>`).join('')}</select></label>` : ''}
    <p class="msg" id="dlgMsg" hidden></p>
    <div class="acts"><span style="flex:1"></span><button type="button" class="btn" id="dlgCancel">취소</button><button class="btn ${ok ? 'primary' : 'danger'}">${ok ? '승인' : '반려'}</button></div>
  </form>`;
  d.showModal();
  $('#dlgCancel').onclick = () => d.close();
  $('#apvForm').onsubmit = async e => {
    e.preventDefault();
    const el = e.target.elements, comment = el.comment.value.trim();
    if (!ok && !comment) { const m = $('#dlgMsg'); m.textContent = '반려 이유를 적어 주세요.'; m.hidden = false; return; }
    const cat = canExp && el.toExp.checked ? el.cat.value : null;
    const { error } = await SB.rpc('decide_approval', { p_id: a.id, p_ok: ok, p_comment: comment || null, p_category: cat });
    if (error) { const m = $('#dlgMsg'); m.textContent = /not_pending/.test(error.message) ? '이미 결재한 건이에요.' : '저장하지 못했어요. 잠시 후 다시 시도해 주세요.'; m.hidden = false; return; }
    d.close(); await Promise.all([loadApprovals(), cat ? loadExpenses() : null]); render();
    toast(ok ? `승인했어요${cat ? ' · 재정 지출에 넣었어요' : ''}` : '반려했어요');
  };
}

/* ================= 원장 · 강사 관리 ================= */
function staffPage() {
  const total = DATA.training.length;
  if (REAL && !DATA.staff.length) return head('우리 학원 강사', '센터 교육 이수 현황을 확인해요.') + `
  <section class="card empty">
    <span class="tile-ic">${ic('users')}</span>
    <h2>아직 합류한 강사님이 없어요</h2>
    <p class="muted">강사용 초대 코드로 가입하면 여기에 나오고, 센터 교육 이수 현황도 함께 보여요.</p>
    <a class="btn primary" href="#members/invite">초대 코드 보기</a>
  </section>`;
  return head('우리 학원 강사', REAL ? '센터 교육 이수 현황을 확인해요.' : '센터 교육 이수 현황과 담당 반을 확인해요.') + `
  <section class="card"><div class="list">
    ${DATA.staff.map(s => `
      <div class="li">
        <span class="av" style="background:var(--navy-700)">${s.name[0]}</span>
        <div><div class="t">${s.name} <span class="muted small">${s.cls}</span></div><div class="d">${REAL ? s.since : `근무 시작 ${s.since}`}</div></div>
        <div class="r"><span class="time">센터 교육 이수</span><b class="num">${DATA.training.filter(t => t.status[s.name] === 'done').length}/${total}</b></div>
      </div>`).join('')}
  </div></section>
  <a class="hint" href="#teachers/hire">${ic('brief')}<span>강사가 더 필요하세요? 센터 채용 게시판에 공고를 올릴 수 있어요</span><b>강사 채용 →</b></a>`;
}

function trainingList(base) {
  const me = teacherName();
  if (!DATA.training.length) return `
  <section class="card empty">
    <span class="tile-ic">${ic('video')}</span>
    <h2>아직 배부된 교육 영상이 없어요</h2>
    <p class="muted">학원지원센터 본부가 영상을 올리면 여기에 바로 나와요.</p>
  </section>`;
  return `
  <section class="card"><div class="list">
    ${DATA.training.map(t => {
      const sts = Object.values(t.status);
      const done = sts.filter(s => s === 'done').length;
      const right = me
        ? (t.status[me] === 'done' ? '<span class="chip good">이수 완료</span>' : `<span class="chip warn">마감 ${t.due}</span>`)
        : `${t.myRefl ? '<span class="chip good">나 이수</span>' : '<span class="chip mute">나 미이수</span>'}${sts.length ? `<span class="time">강사 ${done}/${sts.length}명</span>${bar(done / sts.length * 100, 'sm')}` : ''}`;
      return `
      <a class="li link" href="#${base}/${t.id}">
        <span class="thumb-sm">${ic('play')}</span>
        <div><div class="t">${t.title}</div><div class="d"><span class="chip ${t.cat === '필수' ? 'crit' : 'info'}">${t.cat}</span> ${t.len ? `${t.len} · ` : ''}마감 ${t.due}</div></div>
        <div class="r">${right}</div>
      </a>`;
    }).join('')}
  </div></section>`;
}

function trainingPage() {
  return head('강사 교육', '학원지원센터 본부가 매달 교육 영상을 배부해요. 원장님도 함께 보고 리플렉션을 쓸 수 있어요. 리플렉션은 쓴 사람만 보고, 강사 것은 원장님도 볼 수 있어요.') + trainingList('teachers/training');
}

// 내 리플렉션 칸 (강사 · 원장 모두): 쓰면 이수 완료, 내용은 나만(강사 것은 원장님도) 볼 수 있어요
function myReflectCard(t) {
  const mine = t.myRefl, done = mine && !editingReflect;
  const who = ROLE === 'teacher' ? '나와 원장님만' : '나만';
  return `
      <section class="card">
        <div class="card-head"><h2>내 리플렉션</h2>${mine ? '<span class="chip good">이수 완료</span>' : `<span class="chip warn">마감 ${t.due}</span>`}</div>
        ${done ? `<div class="reflect"><div class="who"><span class="muted small">${mine.at} 제출 · ${who} 볼 수 있어요</span></div><p>${esc(mine.text)}</p></div>
          <button class="btn sm" data-act="editReflect" style="margin-top:10px">리플렉션 고치기</button>` : `
        <p class="muted small" style="margin:0 0 10px">영상을 보고 배운 점, ${ROLE === 'teacher' ? '내 수업에' : '우리 학원 운영에'} 적용할 점을 적어 주세요. ${who} 볼 수 있어요.</p>
        <textarea id="reflectText" rows="6" maxlength="2000" placeholder="예: 활동 전환 신호를 정해 두는 방법을 다음 주 수업에 써 보려고 해요.">${editingReflect && mine ? esc(mine.text) : ''}</textarea>
        <button class="btn primary" id="reflectSubmit" style="margin-top:10px">${editingReflect ? '고쳐서 제출' : '제출하고 이수 완료'}</button>`}
      </section>`;
}

function trainingDetail(id, base) {
  const t = DATA.training.find(x => x.id === id);
  if (!t) return notFound();
  const me = teacherName();
  const notDone = Object.entries(t.status).filter(([, s]) => s !== 'done').map(([n]) => n);
  const player = videoPlayer(t.url, t.len);

  if (me) return head(t.title, t.desc) + `
    <div class="grid2">
      <div>${player}</div>
      ${myReflectCard(t)}
    </div>`;

  // 원장: 나도 듣고 쓰고, 우리 강사 이수 현황 · 리플렉션은 원장님만 봐요
  return head(t.title, t.desc, notDone.length && !REAL ? `<button class="btn" data-nudge="${t.id}">미이수 강사에게 알림</button>` : '') + `
  <div class="grid2">
    <div>${player}</div>
    ${myReflectCard(t)}
  </div>
  <div class="grid2">
    <section class="card">
      <div class="card-head"><h2>강사 리플렉션 ${t.reflections.length}개</h2><span class="sub">원장님만 볼 수 있어요</span></div>
      ${t.reflections.length ? `<div class="reflects">${t.reflections.map(r => `
        <div class="reflect"><div class="who"><b>${esc(r.who)}</b> <span class="muted small">${r.at}</span></div><p>${esc(r.text)}</p></div>`).join('')}</div>`
        : '<p class="muted small" style="margin:0">아직 강사가 쓴 리플렉션이 없어요.</p>'}
    </section>
    <section class="card">
      <div class="card-head"><h2>이수 현황</h2><span class="sub">마감 ${t.due}</span></div>
      ${Object.keys(t.status).length ? '' : '<p class="muted small" style="margin:0">아직 합류한 강사님이 없어요.</p>'}
      <div class="list">
        ${Object.entries(t.status).map(([n, s]) => `
          <div class="li"><span class="av" style="background:var(--navy-700)">${n[0]}</span><div class="t">${n}</div>
          <div class="r">${s === 'done' ? '<span class="chip good">이수</span>' : '<span class="chip mute">미이수</span>'}</div></div>`).join('')}
      </div>
    </section>
  </div>`;
}

// 유튜브 · 비메오 주소는 화면 안에서 재생, mp4는 바로 재생, 그 밖의 주소는 새 창으로
function embedUrl(u) {
  let m = (u || '').match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/);
  if (m) return `https://www.youtube.com/embed/${m[1]}`;
  m = (u || '').match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return m ? `https://player.vimeo.com/video/${m[1]}` : null;
}
function videoPlayer(url, len) {
  const em = embedUrl(url);
  if (em) return `<div class="player"><iframe src="${esc(em)}" title="교육 영상" allow="encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe></div>`;
  if (/^https:\/\/\S+\.(mp4|webm)(\?\S*)?$/i.test(url || '')) return `<div class="player"><video src="${esc(url)}" controls preload="metadata"></video></div>`;
  const inner = `<span class="play">${ic('play')}</span>${len ? `<span class="len num">${esc(len)}</span>` : ''}<span class="by">${url ? '눌러서 영상 열기' : REAL || CENTER ? '영상 주소 준비 중' : '학원지원센터 교육팀'}</span>`;
  return url ? `<a class="player" href="${esc(url)}" target="_blank" rel="noopener">${inner}</a>` : `<div class="player">${inner}</div>`;
}
let editingReflect = false;

function hirePage() {
  if (REAL) return realHirePage();
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
const P_STATE = { using: ['good', '이용 중'], applied: ['info', '신청 완료 · 센터 확인 중'],
  new: ['info', '신청 완료 · 센터 확인 중'], contacted: ['warn', '센터가 연락했어요'], connected: ['good', '연결 완료'], closed: ['mute', '종료'] };
// 실제 로그인이면 제휴 신청 기록에서, 데모면 예시 데이터에서 상태를 가져와요
const partnerState = p => {
  if (!REAL) return p.status;
  const a = REAL.partnerApps.find(x => x.partner_id === p.id && x.status !== 'closed');
  return a ? a.status : 'none';
};
function partnersPage() {
  const cats = ['전체', ...new Set(DATA.partners.map(p => p.cat))];
  const shown = DATA.partners.filter(p => partnerCat === '전체' || p.cat === partnerCat);
  return head('제휴처 둘러보기', '학원지원센터가 미리 MOU를 맺어 둔 곳이에요. 따로 협상하거나 계약서를 쓸 필요 없이 신청만 하면 바로 연결돼요.') + `
  <div class="banner">
    <div><span class="pill">유학 제휴 파트너</span><h2>유학은 인투유학과 함께해요</h2><p>방학 영어캠프 · 조기유학 · 어학연수 · 해외 대학 진학까지. 우리 학원 학생과 학부모에게 유학 프로그램을 연결해 드려요.</p></div>
    <a class="btn primary" href="${DATA.abroadUrl}" target="_blank" rel="noopener">인투유학 바로가기 ${ic('ext')}</a>
  </div>
  <div class="filters">${cats.map(c => `<button class="${c === partnerCat ? 'on' : ''}" data-cat="${c}">${c}</button>`).join('')}</div>
  <div class="grid3">
    ${shown.map(p => `
      <div class="perk ${partnerState(p) !== 'none' ? 'joined' : ''}">
        <span class="who">${p.cat} · ${p.name}</span>
        <span class="t">${p.benefit}</span>
        <span class="d">${p.desc}</span>
        <div class="row">${partnerState(p) === 'none' ? `<button class="btn sm primary" data-apply="${p.id}">바로 신청</button>` : `<span class="chip ${P_STATE[partnerState(p)][0]}">${P_STATE[partnerState(p)][1]}</span>`}</div>
      </div>`).join('')}
  </div>`;
}

function myPartnersPage() {
  if (REAL) return realMyPartnersPage();
  const mine = DATA.partners.filter(p => p.status !== 'none');
  const saved = mine.reduce((a, p) => a + (p.saved || 0), 0);
  return head('내 제휴', '신청하고 이용 중인 제휴예요. 유학 프로그램 참가 현황과 할인 내역을 함께 봐요.') + `
  <div class="stats">
    <div class="stat"><span>이용 · 신청</span><b class="num">${mine.length}곳</b></div>
    <div class="stat"><span>유학 제휴</span><b class="num">${mine.filter(p => p.cat === '유학').length}곳</b></div>
    <div class="stat good"><span>이번 달 아낀 비용</span><b class="num">${won(saved * 1e4)}</b></div>
  </div>
  <section class="card"><div class="list">
    ${mine.map(p => `
      <div class="li">
        <span class="av" style="background:var(--blue-600)">${ic('handshake')}</span>
        <div><div class="t">${p.name} <span class="muted small">${p.cat}</span></div><div class="d">${p.benefit}</div></div>
        <div class="r"><span class="chip ${P_STATE[p.status][0]}">${P_STATE[p.status][1]}</span>${p.saved ? `<span class="time">${won(p.saved * 1e4)} 절감</span>` : p.note ? `<span class="time">${p.note}</span>` : ''}</div>
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
  return head('홍보 서비스', ROLE === 'teacher' ? '맡은 반 특강 · 설명회 홍보가 필요하면 직접 의뢰할 수 있어요. 의뢰한 내용은 원장님도 함께 봐요.' : '필요한 서비스를 골라 의뢰하면 학원 정보가 인투마케팅에 함께 전달돼요. 강사님도 의뢰할 수 있고, 원장님은 모두 볼 수 있어요.') + mkBanner() + `
  <div class="grid2 even">
    ${DATA.promoServices.map(s => `
      <section class="card svc">
        <div class="svc-ic">${ic(s.icon)}</div>
        <h2>${s.name}</h2>
        <p>${s.desc}</p>
        <ul>${s.items.map(x => `<li>${x}</li>`).join('')}</ul>
        ${REAL ? `<button class="btn sm primary" data-mk-req="${esc(s.name)}">의뢰하기</button>` : `<a class="btn sm primary" href="${MK}" target="_blank" rel="noopener">의뢰하기 ${ic('ext')}</a>`}
      </section>`).join('')}
  </div>`;
}

/* ---------- 실제 데이터: 홍보 의뢰 (Supabase promo_requests) ---------- */
// 접수 → 인투마케팅 연결 → 작업 중 → 시안 확인 → 완료
const MK_STATE = { new: ['info', '접수', 10], contacted: ['info', '인투마케팅 연결', 30], working: ['warn', '작업 중', 60], review: ['warn', '시안 확인 필요', 85], done: ['good', '완료', 100] };
let mkWho = 'all';
const mkBy = r => r.requester_role === 'teacher' ? `${esc(r.requester_name || '강사')} 강사 의뢰` : r.requester_name ? `${esc(r.requester_name)} 원장 의뢰` : '원장 의뢰';
function realPromoRequestsPage() {
  const all = REAL.promoReqs, owner = ROLE === 'owner';
  const fromT = all.filter(r => r.requester_role === 'teacher');
  const list = all.filter(r => mkWho === 'all' || (mkWho === 'teacher' ? r.requester_role === 'teacher' : r.requester_role !== 'teacher'));
  const add = `<a class="btn primary" href="#promo/services">${ic('plus')}새 의뢰</a>`;
  if (!list.length) return head('의뢰 현황', '') + `
  <section class="card empty">
    <span class="tile-ic">${ic('megaphone')}</span>
    <h2>아직 맡긴 홍보 작업이 없어요</h2>
    <p class="muted">홍보 서비스에서 필요한 작업을 골라 의뢰하면, 센터가 인투마케팅 담당자와 연결하고 진행 상황을 여기에 적어 드려요.</p>
    ${add}
  </section>`;
  return head('의뢰 현황', owner ? '강사님이 맡긴 의뢰까지 모두 보여요. 센터가 인투마케팅에 연결하고 단계가 바뀔 때마다 여기에 적혀요. 접수 단계에서는 취소할 수 있어요.'
    : '내가 맡긴 의뢰예요. 원장님도 같이 봐요. 접수 단계에서는 취소할 수 있어요.', add) +
  (owner && fromT.length ? `<div class="filters">${[['all', `전체 ${all.length}`], ['owner', `원장 의뢰 ${all.length - fromT.length}`], ['teacher', `강사 의뢰 ${fromT.length}`]].map(([k, l]) => `<button class="${mkWho === k ? 'on' : ''}" data-mk-who="${k}">${l}</button>`).join('')}</div>` : '') + `
  <section class="card"><div class="list stack">
    ${list.map(r => {
      const [c, l, pct] = MK_STATE[r.status];
      return `
      <div class="li">
        <span class="av" style="background:${r.status === 'done' ? 'var(--good)' : 'var(--blue-600)'}">${ic('megaphone')}</span>
        <div><div class="t">${esc(r.title)}${owner ? ` <span class="chip ${r.requester_role === 'teacher' ? 'warn' : 'mute'}">${mkBy(r)}</span>` : ''}</div><div class="d">${esc(r.service)} · ${md(r.created_at.slice(0, 10))} 의뢰${r.want_by ? ` · ${md(r.want_by)}까지` : ''}</div>${bar(pct)}
          ${r.admin_memo ? `<div class="d"><b>센터 안내</b> ${esc(r.admin_memo)}</div>` : ''}</div>
        <div class="r"><span class="chip ${c}">${l}</span>${r.status === 'new' ? `<button class="btn sm" data-cancel-mk="${r.id}">취소</button>` : ''}</div>
      </div>`;
    }).join('')}
  </div></section>
  <a class="hint" href="${MK}" target="_blank" rel="noopener">${ic('megaphone')}<span>작업 사례와 가격은 인투마케팅 사이트에서 볼 수 있어요</span><b>인투마케팅 →</b></a>`;
}
function promoReqDialog(service) {
  formDialog({
    title: `${service} 의뢰`, table: 'promo_requests', extra: { service }, okText: '의뢰하기', doneText: '의뢰했어요 · 센터가 인투마케팅에 연결해 드려요',
    after: async () => { await loadPromoReqs(); location.hash = '#promo/requests'; },
    label: () => '',
    fields: [
      ['title', '무엇이 필요하세요?', { required: true, max: 100, placeholder: '예: 겨울방학 특강 블로그 포스팅 4건' }],
      ['detail', '자세한 내용', { type: 'area', max: 2000, placeholder: '대상 학년, 강조할 점, 참고할 자료나 원하는 분위기를 적어 주세요.' }],
      ['want_by', '언제까지', { type: 'date', half: true }], ['contact', '연락받을 번호', { type: 'tel', max: 50, placeholder: '010-0000-0000', half: true }]
    ]
  });
}

function requestsPage() {
  if (REAL) return realPromoRequestsPage();
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
  return head('상담·등록', `카드를 다음 단계로 끌어다 놓거나 버튼으로 옮기세요. 등록으로 옮기면 원생 명단에 추가돼요.${REAL ? ' 학생 이름을 누르면 고칠 수 있어요.' : ''}`, `<button class="btn primary" data-act="addLead">${ic('plus')}새 문의 추가</button>`) + `
  <div class="board">
    ${DATA.stages.map((st, si) => {
      const items = DATA.leads.filter(l => l.stage === st.id);
      return `
      <div class="col" data-stage="${st.id}">
        <div class="col-head"><b>${st.name}</b><span class="cnt">${items.length}</span></div>
        ${items.map(l => `
          <div class="lead" draggable="true" data-id="${l.id}">
            <div class="top"><span class="nm" ${REAL ? `data-edit-lead="${l.id}" role="button" tabindex="0"` : ''}>${esc(l.name)} <span class="muted small">${esc(l.grade)}</span></span>${l.urgent ? '<span class="chip crit">오늘</span>' : ''}</div>
            <div class="d">${esc(l.want)} · ${esc(l.src)}</div>
            <div class="bot"><span class="next">${esc(l.next)}</span>${si < 3 ? `<button class="mv" data-move="${l.id}">${DATA.stages[si + 1].name} →</button>` : '<span class="chip good">원생 등록</span>'}</div>
          </div>`).join('')}
        ${REAL && !items.length ? '<p class="col-empty">비어 있어요</p>' : ''}
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
  const add = `${canEdit ? `<button class="btn" data-import="students">${ic('doc')}엑셀로 올리기</button>` : ''}<button class="btn primary" data-act="addStudent">${ic('plus')}원생 추가</button>`;
  const by = x => x.added_by_role === 'teacher' ? `<span class="d small" style="display:block;margin-top:2px">${esc(x.added_by_name || '강사')} 선생님이 추가</span>` : '';
  const body = list.length ? `
  <section class="card"><div class="table">
    <div class="tr th sv"><span>학생</span><span>반</span><span>학부모</span><span>메모</span><span></span></div>
    ${list.map(s => `
      <div class="tr sv">
        <span><b>${esc(s.name)}</b> <span class="muted small">${esc(s.grade || '')}</span>${canEdit ? by(s) : ''}</span>
        <span>${esc(s.class_name || '-')}${planOf(s) ? `<span class="d small" style="display:block;margin-top:2px">${esc(planLabel(planOf(s)))}</span>` : ''}</span>
        <span>${esc(s.parent_name || '-')} <span class="muted small">${esc(s.parent_phone || '')}</span>${canEdit ? appLinked(s.id) : ''}</span>
        <span class="muted small">${esc(s.memo || '')}</span>
        <span class="btns">${canEdit ? `<button class="btn sm" data-link-student="${s.id}">앱 연결</button>` : ''}<button class="btn sm" data-edit-student="${s.id}">수정</button></span>
      </div>`).join('')}
  </div></section>` : `
  <section class="card empty">
    <span class="tile-ic">${ic('users')}</span>
    <h2>아직 원생이 없어요</h2>
    <p class="muted">원생을 추가하면 여기에 모여요. 학부모님은 초대 코드로 학부모 앱에 들어올 수 있어요.</p>
    ${add}
  </section>`;
  const waiting = canEdit ? REAL.family.filter(f => !f.students.length) : [];
  const wait = waiting.length && list.length ? `
  <section class="card" style="margin-bottom:16px">
    <div class="card-head"><h2>앱 연결을 기다리는 가족 ${waiting.length}명</h2></div>
    <p class="muted small" style="margin:0">학부모·학생용 코드로 가입했지만 아직 아이와 이어지지 않았어요. 아이 줄의 "앱 연결"을 눌러 이어 주면 그 아이의 출결 · 수납 · 반 공지가 앱에 보여요.</p>
    <div class="needs" style="margin-top:10px">${waiting.map(f => `<span class="chip warn">${esc(f.name)} · ${ROLE_NAMES[f.role]}</span>`).join('')}</div>
  </section>` : '';
  return head('원생 명단', `원생 ${list.length}명 · 학생과 학부모 연락처를 한곳에 모아요.${canEdit ? ' "앱 연결"로 학부모·학생 계정을 아이와 이어 주세요.' : ' 추가 · 수정한 내용은 원장님 명단에도 바로 보여요.'}`, list.length ? add : '') + wait + body +
    (canEdit ? `<a class="hint" href="#members/invite">${ic('users')}<span>강사님·학부모님을 학원에 초대하려면 초대 코드를 보내 주세요</span><b>초대 코드 →</b></a>` : '');
}

// 원생과 이어진 학부모·학생 계정
const linkedFamily = sid => REAL.family.filter(f => f.students.includes(sid));
const appLinked = sid => {
  const f = linkedFamily(sid);
  return `<span class="d small" style="display:block;margin-top:2px;color:${f.length ? 'var(--good)' : 'var(--muted)'}">${f.length ? `앱: ${f.map(x => esc(x.name)).join(', ')}` : '앱 연결 전'}</span>`;
};
function linkDialog(s) {
  const d = dialogEl(), fam = REAL.family;
  d.innerHTML = `
  <form method="dialog" class="dlg" id="dlgForm" novalidate>
    <h2>${esc(s.name)} 학생 앱 연결</h2>
    <p class="muted small" style="margin:0">학부모·학생용 초대 코드로 가입한 사람이에요. 이 아이의 가족을 골라 주세요. 연결하면 앱에서 이 아이의 출결 · 수납 · 반 공지를 볼 수 있어요. (학생 계정에는 수납이 보이지 않아요)</p>
    ${fam.length ? `<div class="checks">${fam.map(f => {
      const other = f.students.filter(x => x !== s.id).map(x => (REAL.students.find(y => y.id === x) || {}).name).filter(Boolean);
      return `<label class="chk"><input type="checkbox" name="fam" value="${f.user_id}" ${f.students.includes(s.id) ? 'checked' : ''}><span><b>${esc(f.name)} · ${ROLE_NAMES[f.role]}</b><small>${md(f.joined_at.slice(0, 10))} 가입${other.length ? ` · ${other.map(esc).join(', ')}와도 연결됨` : ''}</small></span></label>`;
    }).join('')}</div>` : `<p class="msg">아직 학부모·학생용 코드로 가입한 사람이 없어요. 초대 코드 화면의 학부모·학생용 코드를 먼저 보내 주세요.</p>`}
    <p class="msg" id="dlgMsg" hidden></p>
    <div class="acts"><span style="flex:1"></span><button type="button" class="btn" id="dlgCancel">${fam.length ? '취소' : '닫기'}</button>${fam.length ? '<button class="btn primary">저장</button>' : ''}</div>
  </form>`;
  d.showModal();
  $('#dlgCancel').onclick = () => d.close();
  $('#dlgForm').onsubmit = async e => {
    e.preventDefault();
    const want = new Set([...e.target.querySelectorAll('[name=fam]:checked')].map(x => x.value));
    const changes = fam.filter(f => want.has(f.user_id) !== f.students.includes(s.id));
    const res = await Promise.all(changes.map(f => SB.rpc('link_family', { p_student: s.id, p_user: f.user_id, p_on: want.has(f.user_id) })));
    if (res.some(r => r.error)) { const m = $('#dlgMsg'); m.textContent = '일부를 저장하지 못했어요. 다시 시도해 주세요.'; m.hidden = false; await loadFamilyMembers(); return; }
    d.close(); await loadFamilyMembers(); render(); toast(changes.length ? `${s.name} 학생 앱 연결을 저장했어요` : '바뀐 것이 없어요');
  };
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

/* ---------- 입력 창 (원생 · 상담 등에서 함께 씀) ----------
   fields: [이름, 라벨, { type, placeholder, max, required, half, options }]
   chips: 눌러서 채우는 예시 목록. half: 두 칸을 한 줄에. type: text(기본) · tel · date · month · number · select · check · area(여러 줄)
   options: 글자 목록, 또는 [저장값, 보이는 글자] 목록. blank: 고르지 않았을 때 보이는 글자. value: 새로 만들 때 기본값. createOnly: 새로 만들 때만 보이는 칸. url: https:// 주소만
   academy: 새로 만들 때 학원 id를 붙일지 (센터 자료는 false). noDelete: 삭제 버튼 숨김. check(data): 저장 전 확인, 문제가 있으면 안내 글 */
const dialogEl = () => $('#dlg') || document.body.appendChild(Object.assign(document.createElement('dialog'), { id: 'dlg' }));
function formDialog({ title, table, fields: all, row, extra = {}, okText, label, after, academy = true, noDelete = false, doneText, check }) {
  const d = dialogEl();
  const fields = all.filter(f => !(row && f[2] && f[2].createOnly));
  const cur = (k, o) => row ? row[k] : o.value;
  const input = ([k, lab, o = {}]) => {
    const v = cur(k, o);
    if (o.type === 'check') return `<label class="chk-line"><input type="checkbox" name="${k}" ${v ? 'checked' : ''}><span>${lab}</span></label>`;
    const ctl = o.type === 'select'
      ? `<select name="${k}"><option value="">${o.blank || '선택 안 함'}</option>${o.options.map(x => Array.isArray(x) ? x : [x, x]).map(([ov, ol]) => `<option value="${esc(ov)}" ${v === ov ? 'selected' : ''}>${esc(ol)}</option>`).join('')}</select>`
      : o.type === 'area'
      ? `<textarea name="${k}" rows="${o.rows || 5}" ${o.max ? `maxlength="${o.max}"` : ''} placeholder="${o.placeholder || ''}">${esc(v ?? '')}</textarea>`
      : o.type === 'won'
      ? `<span class="won-wrap"><input name="${k}" class="won-in" inputmode="numeric" autocomplete="off" value="${comma(v)}" placeholder="${o.placeholder || ''}"><i>원</i></span>`
      : `<input name="${k}" type="${o.type || 'text'}" value="${esc(v ?? '')}" ${o.max ? `maxlength="${o.max}"` : ''} ${o.type === 'number' ? 'min="0" inputmode="numeric"' : ''} placeholder="${o.placeholder || ''}">`;
    const lbl = `<label class="f">${lab}${o.required ? ' *' : ''}${ctl}</label>`;
    // chips: 예시를 눌러 바로 채우기 (직접 적어도 돼요)
    return o.chips ? `<div class="f-chips">${lbl}<div class="pick-chips">${o.chips.map(c => `<button type="button" class="${v === c ? 'on' : ''}" data-pick="${k}" data-v="${esc(c)}">${esc(c)}</button>`).join('')}</div></div>` : lbl;
  };
  // half 표시된 칸은 둘씩 묶어 한 줄로
  let html = '', pair = [];
  fields.forEach(f => {
    if (f[2] && f[2].half) { pair.push(input(f)); if (pair.length === 2) { html += `<div class="two">${pair.join('')}</div>`; pair = []; } }
    else { if (pair.length) { html += `<div class="two">${pair.join('')}</div>`; pair = []; } html += input(f); }
  });
  if (pair.length) html += `<div class="two">${pair.join('')}</div>`;
  d.innerHTML = `
  <form method="dialog" class="dlg" id="dlgForm" novalidate>
    <h2>${title}</h2>${html}
    <p class="msg" id="dlgMsg" hidden></p>
    <div class="acts">${row && !noDelete ? '<button type="button" class="btn danger" id="dlgDel">삭제</button>' : ''}<span style="flex:1"></span><button type="button" class="btn" id="dlgCancel">취소</button><button class="btn primary">${okText || '저장'}</button></div>
  </form>`;
  d.showModal();
  const fail = t => { const m = $('#dlgMsg'); m.textContent = t; m.hidden = false; };
  $('#dlgCancel').onclick = () => d.close();
  d.querySelectorAll('[data-pick]').forEach(b => b.onclick = () => {
    const inp = d.querySelector(`[name="${b.dataset.pick}"]`);
    inp.value = b.dataset.v;
    b.parentNode.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
  });
  $('#dlgForm').onsubmit = async e => {
    e.preventDefault();
    const el = e.target.elements, data = {};
    for (const [k, lab, o = {}] of fields) {
      if (o.type === 'check') { data[k] = el.namedItem(k).checked; continue; }
      const v = el.namedItem(k).value.trim();
      if (o.required && !v) return fail(`${lab}을(를) ${o.type === 'select' ? '골라' : '적어'} 주세요.`);
      if (o.type === 'number' && v !== '' && !(Number(v) >= 0)) return fail(`${lab}은(는) 0 이상의 숫자로 적어 주세요.`);
      if (o.type === 'won' && v !== '' && !(numOf(v) >= 0)) return fail(`${lab}은(는) 숫자로 적어 주세요.`);
      if (o.url && v && !/^https:\/\/\S+$/.test(v)) return fail(`${lab}은(는) https:// 로 시작하는 주소로 넣어 주세요.`);
      data[k] = v === '' ? null : o.type === 'number' ? Math.round(Number(v)) : o.type === 'won' ? Math.round(numOf(v)) : v;
    }
    const bad = check && check(data);
    if (bad) return fail(bad);
    const q = row ? SB.from(table).update(data).eq('id', row.id) : SB.from(table).insert({ ...data, ...extra, ...(academy ? { academy_id: REAL.academy.id } : {}) });
    const { error } = await q;
    if (error) return fail('저장하지 못했어요. 입력한 내용을 확인하고 다시 시도해 주세요.');
    d.close(); await after(); render(); toast(row ? '고쳤어요' : doneText || `${label(data)} 추가했어요`);
  };
  if (row && !noDelete) $('#dlgDel').onclick = async () => {
    if (!confirm(`${label(row)} 삭제할까요?`)) return;
    const { error } = await SB.from(table).delete().eq('id', row.id);
    if (error) { toast('삭제하지 못했어요'); return; }
    d.close(); await after(); render(); toast('삭제했어요');
  };
}

// 원생 추가·수정
function studentDialog(s) {
  formDialog({
    title: s ? '원생 정보 고치기' : '원생 추가', table: 'students', row: s, after: loadStudents, noDelete: ROLE !== 'owner',
    label: r => `${r.name} 학생을`, doneText: ROLE === 'teacher' ? '원생을 추가했어요 · 원장님 명단에도 바로 보여요' : undefined,
    fields: [
      ['name', '이름', { required: true, max: 50, half: true }], ['grade', '학년', { max: 20, placeholder: '예: 초5', half: true }],
      ['class_name', '반', { max: 50, placeholder: '예: 초등 B반', half: true, chips: allClassNames().slice(0, 6) }],
      ['tuition_plan_id', '수강료', { type: 'select', options: REAL.plans.map(p => [p.id, planLabel(p)]), blank: REAL.plans.length ? '정하지 않음' : '수납·청구에서 수강료를 먼저 정해 두세요', half: true }],
      ['parent_name', '학부모 이름', { max: 50, half: true }], ['parent_phone', '학부모 연락처', { type: 'tel', max: 30, placeholder: '010-0000-0000', half: true }],
      ['memo', '메모', { max: 500 }]
    ]
  });
}

// 상담 카드 추가·수정
const LEAD_SOURCES = ['네이버 플레이스', '인스타그램', '블로그', '재원생 추천', '전단지', '지자체·기관', '직접 방문', '전화', '기타'];
function leadDialog(l) {
  formDialog({
    title: l ? '상담 정보 고치기' : '새 문의 추가', table: 'leads', row: l && l.raw, after: loadLeads,
    label: r => `${r.student_name} 학생 문의를`,
    fields: [
      ['student_name', '학생 이름', { required: true, max: 50, half: true }], ['grade', '학년', { max: 20, placeholder: '예: 초3', half: true }],
      ['want', '희망 반', { max: 50, placeholder: '예: 초등 A반', half: true }], ['source', '문의 경로', { type: 'select', options: LEAD_SOURCES, half: true }],
      ['parent_name', '학부모 이름', { max: 50, half: true }], ['parent_phone', '학부모 연락처', { type: 'tel', max: 30, placeholder: '010-0000-0000', half: true }],
      ['next_action', '다음 할 일', { max: 100, placeholder: '예: 상담 10/28 16:00' }],
      ['memo', '메모', { max: 500 }],
      ['urgent', '오늘 꼭 연락해야 해요', { type: 'check' }]
    ]
  });
}

/* ---------- 실제 데이터: 학부모 공지 (Supabase notices · notice_reads) ---------- */
const noticeTo = n => n.target_class ? `${esc(n.target_class)} 가족` : '전체 학부모·학생';
function realNoticesPage() {
  const list = REAL.notices;
  const add = `<button class="btn primary" data-act="newNotice">${ic('plus')}새 공지 쓰기</button>`;
  if (!list.length) return head('학부모 공지', '') + `
  <section class="card empty">
    <span class="tile-ic">${ic('chat')}</span>
    <h2>아직 보낸 공지가 없어요</h2>
    <p class="muted">공지를 쓰면 학부모·학생 앱의 "학원 소식"에 바로 올라가요. 반을 고르면 그 반 아이와 연결된 가족에게만 가요. 누가 읽었는지도 여기서 확인할 수 있어요.</p>
    ${add}
  </section>`;
  return head('학부모 공지', '보낸 공지는 학부모·학생 앱 "학원 소식"에 올라가요. 제목을 누르면 누가 읽었는지 볼 수 있어요.', add) + `
  <section class="card"><div class="list stack">
    ${list.map(n => {
      const st = REAL.noticeStats[n.id] || { total: 0, read: 0 };
      return `
      <a class="li link" href="#members/notices/${n.id}">
        <span class="av" style="background:var(--blue-500)">${ic('chat')}</span>
        <div><div class="t">${esc(n.title)}</div><div class="d">${noticeTo(n)} · ${md(n.created_at.slice(0, 10))}</div>${st.total ? bar(st.read / st.total * 100) : ''}</div>
        <div class="r"><span class="time">읽음</span><b class="num">${st.read}/${st.total}</b></div>
      </a>`;
    }).join('')}
  </div></section>` + (REAL.family.length ? '' : `<a class="hint" href="#members/invite">${ic('users')}<span>아직 앱에 가입한 가족이 없어요. 학부모·학생용 초대 코드를 먼저 보내 주세요</span><b>초대 코드 →</b></a>`);
}
let READERS = {}; // 공지 id → 받는 사람과 읽은 시각 (열 때 불러와요)
function noticeDetail(id) {
  const n = REAL.notices.find(x => x.id === id);
  if (!n) return notFound();
  if (!(id in READERS)) loadReaders(id);
  const rs = READERS[id];
  const read = rs ? rs.filter(r => r.read_at) : [], unread = rs ? rs.filter(r => !r.read_at) : [];
  const person = r => `<div class="li"><span class="av" style="background:${r.read_at ? 'var(--good)' : 'var(--blue-100)'}">${esc(r.name[0])}</span><div class="t">${esc(r.name)} <span class="muted small">${ROLE_NAMES[r.role]}</span></div><div class="r">${r.read_at ? `<span class="time">${md(r.read_at.slice(0, 10))} ${r.read_at.slice(11, 16)}</span>` : '<span class="chip mute">안 읽음</span>'}</div></div>`;
  return head(esc(n.title), `${noticeTo(n)} · ${md(n.created_at.slice(0, 10))} 보냄`, `<button class="btn" data-edit-notice="${n.id}">고치기</button>`) + `
  <div class="grid2">
    <section class="card"><div class="card-head"><h2>내용</h2></div><p style="margin:0;white-space:pre-wrap">${esc(n.body || '(내용 없음)')}</p></section>
    <section class="card">
      <div class="card-head"><h2>읽음 확인</h2><span class="sub">${rs ? `${read.length}/${rs.length}명` : '불러오는 중'}</span></div>
      ${!rs ? '<p class="muted">불러오는 중…</p>' : !rs.length ? `<p class="muted" style="margin:0">${n.target_class ? `${esc(n.target_class)} 아이와 앱으로 연결된 가족이 아직 없어요. 원생 명단에서 "앱 연결"을 해 주세요.` : '아직 앱에 가입한 가족이 없어요.'}</p>` : `
      <div class="list">${unread.map(person).join('')}${read.map(person).join('')}</div>`}
      ${unread.length ? `<button class="btn sm" data-copy-notice="${n.id}" style="margin-top:12px">안 읽은 가족에게 보낼 문구 복사</button>` : ''}
    </section>
  </div>`;
}
async function loadReaders(id) {
  READERS[id] = null;
  const { data } = await SB.rpc('notice_readers', { p_notice: id });
  READERS[id] = data || [];
  if (location.hash === `#members/notices/${id}`) render();
}
function noticeDialog(n) {
  const classes = [...new Set(REAL.students.map(s => s.class_name).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ko'));
  formDialog({
    title: n ? '공지 고치기' : '새 공지 쓰기', table: 'notices', row: n, okText: n ? '저장' : '보내기', doneText: '학부모 앱으로 공지를 보냈어요',
    after: async () => { READERS = {}; await loadNotices(); if (!n) location.hash = '#members/notices'; },
    label: r => `"${r.title}" 공지를`,
    fields: [
      ['title', '제목', { required: true, max: 100, placeholder: '예: 11월 학부모 설명회 안내' }],
      ['target_class', '받는 사람', { type: 'select', blank: '전체 학부모·학생', options: classes.map(c => [c, `${c} 가족만`]) }],
      ['body', '내용', { type: 'area', max: 3000, rows: 7, placeholder: '날짜 · 시간 · 준비물처럼 꼭 알아야 할 내용을 적어 주세요.' }]
    ]
  });
}

function noticesPage() {
  if (REAL) return realNoticesPage();
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
  if (JOBS) return realJobsPage();
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

/* ================= 채용 · 제휴 · 유학 (실제 데이터) ================= */
const JOB_TYPES = ['파트타임', '전임', '주말', '방학 특강'];
// 원장이 보는 지원 상태 · 강사가 보는 지원 상태
const APP_STATE = { applied: ['info', '새 지원'], interview: ['warn', '면접 제안'], hired: ['good', '채용 확정'], declined: ['mute', '진행 안 함'] };
const MY_APP_STATE = { applied: ['info', '지원 완료'], interview: ['warn', '면접 제안을 받았어요'], hired: ['good', '채용 확정'], declined: ['mute', '다른 분과 진행해요'] };
const jobLine = j => [j.job_type, j.subject, j.pay, j.hours].filter(Boolean).map(esc).join(' · ');
// 학원 분야 예시 (공고 쓸 때 눌러서 고르고, 강사는 분야로 골라 봐요)
const ACADEMY_FIELDS = ['영어', '수학', '국어 · 논술', '과학', '사회 · 역사', '초등 종합', '입시 · 내신', '독서 · 글쓰기', '코딩 · SW', '제2외국어', '유아 · 놀이', '미술', '음악', '체육 · 태권도', '예체능 입시', '자격증 · 성인'];
const fieldChip = j => j.academy_field ? `<span class="chip info">${esc(j.academy_field)}</span> ` : '';
let jobField = '전체';

function realHirePage() {
  const add = `<button class="btn primary" data-act="newJob">${ic('plus')}새 공고 올리기</button>`;
  if (!REAL.jobs.length) return head('강사 채용', '공고는 센터 강사 채용 게시판에 올라가고, 센터에 가입한 강사들이 바로 지원해요.') + `
  <section class="card empty">
    <span class="tile-ic">${ic('brief')}</span>
    <h2>첫 채용 공고를 올려 보세요</h2>
    <p class="muted">지원자의 이름 · 경력 · 센터 교육 이수 기록이 함께 들어와요.</p>
    ${add}
  </section>`;
  const appRow = a => {
    const [c, l] = APP_STATE[a.status];
    const key = `${a.job_id}:${a.user_id}`;
    const acts = a.status === 'applied' ? `<button class="btn sm" data-app-step="${key}:declined">진행 안 함</button><button class="btn sm primary" data-app-step="${key}:interview">면접 제안</button>`
      : a.status === 'interview' ? `<button class="btn sm" data-app-step="${key}:declined">진행 안 함</button><button class="btn sm primary" data-app-step="${key}:hired">채용 확정</button>` : '';
    return `
      <div class="li">
        <span class="av" style="background:var(--blue-500)">${esc(a.name[0])}</span>
        <div><div class="t">${esc(a.name)} <span class="chip ${a.trainings_done ? 'good' : 'mute'}">센터 교육 ${a.trainings_done}개 이수</span></div>
          <div class="d">${esc(a.career || '경력 미입력')} · ${md(a.applied_at.slice(0, 10))} 지원${a.phone ? ` · <a href="tel:${esc(a.phone)}" style="color:var(--blue-600)">${esc(a.phone)}</a>` : ''}</div>
          ${a.message ? `<div class="d">"${esc(a.message)}"</div>` : ''}</div>
        <div class="r"><span class="chip ${c}">${l}</span>${acts ? `<span class="btns">${acts}</span>` : ''}</div>
      </div>`;
  };
  return head('강사 채용', '공고는 센터 강사 채용 게시판에 올라가요. 공고 제목을 누르면 고치거나 마감할 수 있어요.', add) + REAL.jobs.map(j => {
    const as = REAL.applicants.filter(a => a.job_id === j.id);
    return `
  <section class="card" style="margin-bottom:16px">
    <div class="card-head"><div><h2><span class="nm-link" data-edit-job="${j.id}" role="button" tabindex="0">${esc(j.title)}</span></h2><div class="sub">${fieldChip(j)}${jobLine(j)}${j.due ? ` · 마감 ${md(j.due)}` : ''}</div></div>
      <span class="btns">${j.status === 'open' ? '<span class="chip good">모집 중</span>' : '<span class="chip mute">마감</span>'}<span class="chip info">지원자 ${as.length}명</span></span></div>
    ${as.length ? `<div class="list stack">${as.map(appRow).join('')}</div>` : '<p class="muted small" style="margin:0">아직 지원자가 없어요. 센터에 가입한 강사들에게 바로 보여요.</p>'}
  </section>`;
  }).join('');
}

function jobDialog(j) {
  formDialog({
    title: j ? '채용 공고 고치기' : '새 채용 공고', table: 'job_posts', row: j, after: loadJobs, okText: j ? '저장' : '올리기',
    label: r => `${r.title} 공고를`, doneText: '센터 채용 게시판에 공고를 올렸어요',
    fields: [
      ['title', '공고 제목', { required: true, max: 100, placeholder: '예: 초등부 영어 강사 (파트타임)' }],
      ['academy_field', '학원 분야', { max: 30, chips: ACADEMY_FIELDS, placeholder: '아래 예시를 누르거나 직접 적어 주세요' }],
      ['job_type', '근무 형태', { type: 'select', required: true, options: JOB_TYPES, value: '파트타임', half: true }], ['subject', '과목', { max: 50, placeholder: '예: 초등 영어', half: true }],
      ['pay', '급여', { max: 50, placeholder: '예: 시급 2.2만 원', half: true }], ['hours', '근무 시간', { max: 50, placeholder: '예: 평일 15–20시', half: true }],
      ['area', '지역', { max: 100, value: REAL.academy.region || '', half: true }], ['due', '모집 마감', { type: 'date', half: true }],
      ['description', '하는 일 · 우대 사항', { max: 2000 }],
      ['status', '상태', { type: 'select', required: true, value: 'open', options: [['open', '모집 중'], ['closed', '마감']] }]
    ]
  });
}

async function stepApplicant(jobId, userId, status) {
  const a = REAL.applicants.find(x => x.job_id === jobId && x.user_id === userId), before = a.status;
  a.status = status; render();
  const { error } = await SB.from('job_applications').update({ status }).eq('job_id', jobId).eq('user_id', userId);
  if (error) { a.status = before; render(); toast('저장하지 못했어요'); return; }
  toast(status === 'interview' ? `${a.name} 님께 연락해 면접 일정을 잡아 주세요` : status === 'hired' ? `${a.name} 님 채용을 확정했어요 · 강사용 초대 코드를 보내 주세요` : '진행 안 함으로 바꿨어요');
}

// 강사: 센터 채용 게시판
function realJobsPage() {
  const mine = id => JOBS.mine.find(a => a.job_id === id);
  const fields = [...new Set(JOBS.posts.map(j => j.academy_field).filter(Boolean))];
  if (!fields.includes(jobField)) jobField = '전체';
  const posts = JOBS.posts.filter(j => jobField === '전체' || j.academy_field === jobField);
  return head('채용 공고', '센터에 가입한 학원들의 강사 채용 공고예요. 지원하면 이름 · 경력과 센터 교육 이수 기록이 원장님께 전달돼요.') +
    (SEEKER ? `<a class="hint" href="#" data-act="joinAcademy" style="margin:0 0 16px">${ic('users')}<span>학원에서 강사용 초대 코드를 받았나요?</span><b>학원 연결하기 →</b></a>` : '') +
    (JOBS.posts.length ? `${fields.length ? `
  <div class="filters">${['전체', ...fields].map(f => `<button class="${f === jobField ? 'on' : ''}" data-job-field="${esc(f)}">${esc(f)}${f === '전체' ? '' : ` ${JOBS.posts.filter(j => j.academy_field === f).length}`}</button>`).join('')}</div>` : ''}
  <section class="card"><div class="list stack">
    ${posts.map(j => {
      const a = mine(j.id);
      return `
      <div class="li">
        <span class="av" style="background:var(--navy-700)">${esc((j.academy_name || '학')[0])}</span>
        <div><div class="t">${esc(j.title)}</div><div class="d">${fieldChip(j)}${esc(j.academy_name || '')}${j.area ? ` · ${esc(j.area)}` : ''} · ${jobLine(j)}</div>${j.description ? `<div class="d">${esc(j.description)}</div>` : ''}</div>
        <div class="r">${a ? `<span class="chip ${MY_APP_STATE[a.status][0]}">${MY_APP_STATE[a.status][1]}</span>${a.status === 'applied' ? `<button class="btn sm" data-cancel-app="${j.id}">지원 취소</button>` : ''}`
          : `<button class="btn sm primary" data-applyjob="${j.id}">지원하기</button>`}${j.due ? `<span class="time">마감 ${md(j.due)}</span>` : ''}</div>
      </div>`;
    }).join('')}
  </div></section>` : `
  <section class="card empty"><span class="tile-ic">${ic('brief')}</span><h2>지금 모집 중인 공고가 없어요</h2><p class="muted">학원이 공고를 올리면 여기에 바로 나와요.</p></section>`);
}

function applyJobDialog(j) {
  formDialog({
    title: `${j.academy_name || ''} · ${j.title} 지원`, table: 'job_applications', academy: false, extra: { job_id: j.id }, after: loadJobBoard, okText: '지원하기',
    label: () => '지원서를', doneText: `${j.academy_name || '학원'}에 지원서를 보냈어요`,
    fields: [
      ['career', '경력', { max: 200, placeholder: '예: 경력 3년 · 초등 영어 · 파닉스' }],
      ['phone', '연락처', { type: 'tel', max: 30, placeholder: '010-0000-0000' }],
      ['message', '원장님께 한마디', { max: 1000, placeholder: '예: 평일 오후 모두 가능해요.' }]
    ]
  });
}

// 원장: 내 제휴 신청
function realMyPartnersPage() {
  const list = REAL.partnerApps, open = list.filter(a => a.status !== 'closed');
  return head('내 제휴', '신청한 제휴의 진행 상황이에요. 센터가 제휴처와 연결해 드리고, 안내를 여기에 남겨요.') + `
  <div class="stats">
    <div class="stat"><span>진행 중 신청</span><b class="num">${open.filter(a => a.status !== 'connected').length}건</b></div>
    <div class="stat good"><span>연결 완료</span><b class="num">${list.filter(a => a.status === 'connected').length}곳</b></div>
    <div class="stat"><span>유학 제휴</span><b class="num">${open.filter(a => a.partner_id.startsWith('a')).length}곳</b></div>
  </div>` + (list.length ? `
  <section class="card"><div class="list stack">
    ${list.map(a => `
      <div class="li">
        <span class="av" style="background:var(--blue-600)">${ic(a.partner_id.startsWith('a') ? 'globe' : 'handshake')}</span>
        <div><div class="t">${esc(a.partner_name)} <span class="muted small">${md(a.created_at.slice(0, 10))} 신청</span></div>
          ${a.memo ? `<div class="d">"${esc(a.memo)}"</div>` : ''}${a.admin_memo ? `<div class="d"><b>센터 안내</b> ${esc(a.admin_memo)}</div>` : ''}</div>
        <div class="r"><span class="chip ${P_STATE[a.status][0]}">${P_STATE[a.status][1]}</span>${a.status === 'new' ? `<button class="btn sm" data-cancel-partner="${a.id}">신청 취소</button>` : ''}</div>
      </div>`).join('')}
  </div></section>` : `
  <section class="card empty"><span class="tile-ic">${ic('handshake')}</span><h2>아직 신청한 제휴가 없어요</h2><p class="muted">센터가 미리 맺어 둔 제휴처에 신청만 하면 연결해 드려요.</p><a class="btn primary" href="#mou/partners">제휴처 둘러보기</a></section>`) +
  `<a class="hint" href="#mou/partners">${ic('plus')}<span>다른 제휴처도 둘러보세요</span><b>제휴처 둘러보기 →</b></a>`;
}

function partnerApplyDialog(p) {
  formDialog({
    title: `${p.name} 제휴 신청`, table: 'partner_applications', extra: { partner_id: p.id, partner_name: p.name }, after: loadPartnerApps, okText: '신청하기',
    label: () => '제휴 신청을', doneText: `${p.name} 제휴를 신청했어요 · 센터가 연락드려요`,
    fields: [['memo', '센터에 남길 말', { max: 1000, placeholder: p.cat === '유학' ? '예: 겨울캠프에 재원생 10명 정도 생각 중이에요.' : '예: 다음 달부터 쓰고 싶어요.' }]]
  });
}

// 유학 상담: 원장 화면 (예시 계정에서는 예시 데이터로 보여 줘요)
const ABROAD_PROGRAMS = ['방학 해외 영어캠프', '초·중·고 조기유학', '단기 어학연수', '해외 대학 진학', '유학 설명회', '기타'];
const AB_STATE = { new: ['crit', '새 신청'], confirmed: ['warn', '원장 확인'], forwarded: ['info', '센터 연결 중'], done: ['good', '상담 연결 완료'] };
const AB_PARENT_STATE = { new: ['info', '신청 완료'], confirmed: ['warn', '학원이 확인했어요'], forwarded: ['info', '유학 상담사 연결 중'], done: ['good', '상담 연결 완료'] };
const abroadData = () => REAL ? REAL.abroad : DATA.abroad;
function abroadOwnerPage() {
  const { promos, requests } = abroadData();
  const cnt = st => requests.filter(r => r.status === st).length;
  const reqRow = r => {
    const [c, l] = AB_STATE[r.status];
    const act = r.status === 'new' ? `<button class="btn sm" data-ab-step="${r.id}:confirmed">확인했어요</button>`
      : r.status === 'confirmed' ? `<button class="btn sm primary" data-ab-step="${r.id}:forwarded">인투유학 연결 요청</button>` : '';
    return `
      <div class="li">
        <span class="av" style="background:${r.status === 'done' ? 'var(--good)' : 'var(--navy-700)'}">${esc(r.parent_name[0])}</span>
        <div><div class="t"><span class="nm-link" data-edit-ab="${r.id}" role="button" tabindex="0">${esc(r.parent_name)}</span> <span class="muted small">${esc([r.student_name, r.student_grade].filter(Boolean).join(' '))}</span></div>
          <div class="d">${esc(r.program)} · <a href="tel:${esc(r.phone)}" style="color:var(--blue-600)">${esc(r.phone)}</a> · ${md(r.created_at.slice(0, 10))} 신청</div>
          ${r.memo ? `<div class="d">"${esc(r.memo)}"</div>` : ''}${r.owner_memo ? `<div class="d"><b>내 메모</b> ${esc(r.owner_memo)}</div>` : ''}${r.admin_memo ? `<div class="d"><b>센터 안내</b> ${esc(r.admin_memo)}</div>` : ''}</div>
        <div class="r"><span class="chip ${c}">${l}</span>${act}</div>
      </div>`;
  };
  return head('유학 상담', '유학 프로그램을 학부모 앱에 안내하면 학부모님이 상담을 신청해요. 확인한 뒤 "인투유학 연결 요청"을 누르면 센터가 유학 상담사를 연결해 드려요.', `<button class="btn primary" data-act="addPromo">${ic('plus')}학부모에게 안내하기</button>`) + `
  <div class="stats">
    <div class="stat crit"><span>새 신청</span><b class="num">${cnt('new')}건</b></div>
    <div class="stat"><span>확인함</span><b class="num">${cnt('confirmed')}건</b></div>
    <div class="stat good"><span>센터 연결</span><b class="num">${cnt('forwarded') + cnt('done')}건</b></div>
  </div>
  <div class="grid2">
    <section class="card">
      <div class="card-head"><h2>상담 신청</h2><span class="sub">이름을 누르면 메모를 남길 수 있어요</span></div>
      ${requests.length ? `<div class="list stack">${requests.map(reqRow).join('')}</div>` : '<p class="muted small" style="margin:0">아직 신청이 없어요. 학부모에게 프로그램을 안내해 보세요.</p>'}
    </section>
    <section class="card">
      <div class="card-head"><h2>학부모에게 안내 중</h2><span class="sub">누르면 고칠 수 있어요</span></div>
      ${promos.length ? `<div class="list">${promos.map(p => `
        <a class="li link" href="#mou/abroad" data-edit-promo="${p.id}">
          <span class="av" style="background:var(--blue-600)">${ic('globe')}</span>
          <div><div class="t">${esc(p.title)}</div><div class="d">${esc(p.program)}${p.event_date ? ` · ${md(p.event_date)}` : ''} · 신청 ${requests.filter(r => r.promo_id === p.id).length}건</div></div>
          <div class="r">${p.active ? '<span class="chip good">안내 중</span>' : '<span class="chip mute">숨김</span>'}</div>
        </a>`).join('')}</div>` : '<p class="muted small" style="margin:0">아직 안내한 프로그램이 없어요.</p>'}
    </section>
  </div>
  <a class="hint" href="${DATA.abroadUrl}" target="_blank" rel="noopener">${ic('globe')}<span>유학 프로그램 내용은 인투유학에서 자세히 볼 수 있어요</span><b>인투유학 →</b></a>`;
}

function promoDialog(pr) {
  if (!REAL) return toast('예시 계정에서는 저장되지 않아요');
  formDialog({
    title: pr ? '유학 안내 고치기' : '학부모에게 유학 프로그램 안내', table: 'abroad_promos', row: pr, after: loadAbroad, okText: pr ? '저장' : '안내하기',
    label: r => `${r.title} 안내를`, doneText: '학부모 앱에 안내를 올렸어요',
    fields: [
      ['program', '프로그램', { type: 'select', required: true, options: ABROAD_PROGRAMS, value: '방학 해외 영어캠프', half: true }], ['event_date', '설명회 · 출발 날짜', { type: 'date', half: true }],
      ['title', '제목', { required: true, max: 100, placeholder: '예: 겨울방학 필리핀 영어캠프 (4주)' }],
      ['body', '안내 글', { max: 2000, placeholder: '예: 인솔 교사가 함께 가는 재원생 단체 캠프예요.' }],
      ['active', '학부모 앱에 보여 줘요 (끄면 숨겨져요)', { type: 'check', value: true }]
    ]
  });
}

function abroadMemoDialog(r) {
  if (!REAL) return toast('예시 계정에서는 저장되지 않아요');
  formDialog({
    title: `${r.parent_name} 님 유학 상담`, table: 'abroad_requests', row: r, academy: false, noDelete: true, after: loadAbroad,
    label: () => '신청을',
    fields: [['owner_memo', '내 메모', { max: 1000, placeholder: '예: 10/26 통화 · 겨울캠프 비용 문의' }]]
  });
}

async function stepAbroad(id, status, list, reload) {
  if (!REAL && !CENTER) return toast('예시 계정에서는 저장되지 않아요');
  const r = list.find(x => x.id === id), before = r.status;
  r.status = status; render();
  const { error } = await SB.from('abroad_requests').update({ status }).eq('id', id);
  if (error) { r.status = before; render(); toast('저장하지 못했어요'); return; }
  await reload(); render();
  toast(status === 'forwarded' ? '센터에 연결을 요청했어요 · 인투유학 상담사가 연락드려요' : status === 'done' ? '상담 연결 완료로 바꿨어요' : '확인했어요 · 학부모님께 연락해 주세요');
}

// 학부모: 유학 프로그램 보고 상담 신청
function parentAbroadPage() {
  const { promos, requests } = abroadData();
  const active = promos.filter(p => p.active);
  const mine = REAL ? requests : requests.filter(r => r.parent_name === ME.name);
  const asked = id => mine.some(r => r.promo_id === id && r.status !== 'done');
  return head('유학 프로그램', `${DATA.academy.name}에서 안내하는 유학 · 캠프 프로그램이에요. 상담을 신청하면 원장님이 확인하고, 유학 전문 상담사(인투유학)과 연결해 드려요.`) +
    (active.length ? `<div class="grid3">${active.map(p => `
      <div class="perk">
        <span class="who">${esc(p.program)}${p.event_date ? ` · ${md(p.event_date)}` : ''}</span>
        <span class="t">${esc(p.title)}</span>
        ${p.body ? `<span class="d">${esc(p.body)}</span>` : ''}
        <div class="row">${asked(p.id) ? '<span class="chip info">상담 신청함</span>' : `<button class="btn sm primary" data-ab-apply="${p.id}">상담 신청</button>`}</div>
      </div>`).join('')}</div>` : `
    <section class="card empty"><span class="tile-ic">${ic('globe')}</span><h2>아직 안내된 프로그램이 없어요</h2><p class="muted">궁금한 점이 있으면 바로 상담을 신청해도 돼요.</p></section>`) + `
    <section class="card" style="margin-top:16px">
      <div class="card-head"><h2>내 상담 신청</h2><button class="btn sm" data-ab-apply="">다른 유학 상담 신청</button></div>
      ${mine.length ? `<div class="list stack">${mine.map(r => `
        <div class="li">
          <span class="av" style="background:var(--blue-600)">${ic('globe')}</span>
          <div><div class="t">${esc(r.program)}</div><div class="d">${esc([r.student_name, r.student_grade].filter(Boolean).join(' '))} · ${md(r.created_at.slice(0, 10))} 신청</div></div>
          <div class="r"><span class="chip ${AB_PARENT_STATE[r.status][0]}">${AB_PARENT_STATE[r.status][1]}</span></div>
        </div>`).join('')}</div>` : '<p class="muted small" style="margin:0">아직 신청한 상담이 없어요.</p>'}
    </section>`;
}

function abroadApplyDialog(promo) {
  if (!REAL) return toast('예시 계정에서는 저장되지 않아요');
  formDialog({
    title: promo ? `${promo.title} 상담 신청` : '유학 상담 신청', table: 'abroad_requests', extra: { promo_id: promo ? promo.id : null }, after: loadAbroad, okText: '신청하기',
    label: () => '상담 신청을', doneText: '상담을 신청했어요 · 원장님이 확인하고 연락드려요',
    fields: [
      ['program', '관심 프로그램', { type: 'select', required: true, options: ABROAD_PROGRAMS, value: promo ? promo.program : '', createOnly: true }],
      ['parent_name', '학부모 이름', { required: true, max: 50, value: PROFILE.name || '', half: true }], ['phone', '연락처', { type: 'tel', required: true, max: 30, placeholder: '010-0000-0000', half: true }],
      ['student_name', '학생 이름', { max: 50, half: true }], ['student_grade', '학년', { max: 20, placeholder: '예: 초5', half: true }],
      ['memo', '궁금한 점', { max: 1000, placeholder: '예: 처음 보내는 거라 안전이 걱정돼요.' }]
    ]
  });
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
        <div class="r"><b class="num">${won(b.amount * 1e4)}</b>${b.paid ? '<span class="chip good">납부 완료</span>' : `<button class="btn sm primary" data-pay="${i}">결제하기</button>`}</div>
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

/* ---------- 실제 데이터: 학부모·학생 앱 (원장이 이어 준 아이의 출결 · 수납 · 학원 소식) ---------- */
let KID = null; // 보고 있는 아이 id (아이가 여럿이면 고를 수 있어요)
const kidNow = () => REAL.kids.find(k => k.id === KID) || REAL.kids[0];
const kidName = k => ROLE === 'student' ? '나' : `${esc(k.name)}`;
const kidPicker = () => REAL.kids.length > 1 ? `<div class="filters">${REAL.kids.map(k => `<button class="${k.id === kidNow().id ? 'on' : ''}" data-kid="${k.id}">${esc(k.name)}</button>`).join('')}</div>` : '';
const noKid = () => `
  <section class="card empty">
    <span class="tile-ic">${ic('users')}</span>
    <h2>아직 ${ROLE === 'student' ? '내 원생 정보와' : '아이와'} 연결되지 않았어요</h2>
    <p class="muted">${esc(REAL.academy.name)}에 "앱에 가입했어요"라고 알려 주세요. 원장님이 원생 명단에서 연결하면 ${ROLE === 'student' ? '내' : '아이의'} 출결${ROLE === 'parent' ? ' · 수납' : ''}이 바로 보여요.</p>
  </section>`;
const unreadNotices = () => REAL.notices.filter(n => !REAL.reads.has(n.id));

function kidAttendPage() {
  if (!REAL.kids.length) return head(ROLE === 'student' ? '내 출결' : '출결', '') + noKid();
  const k = kidNow();
  const rows = REAL.kidAttend.filter(a => a.student_id === k.id && a.day.startsWith(MONTH));
  const cnt = s => rows.filter(a => a.status === s).length;
  const came = rows.length - cnt('absent');
  return head(ROLE === 'student' ? '내 출결' : `${kidName(k)} 출결`, `${esc(REAL.academy.name)}${k.class_name ? ` · ${esc(k.class_name)}` : ''} · 선생님이 수업 중에 입력하면 바로 보여요.`) + kidPicker() + monthBar() + `
  <div class="stats">
    <div class="stat good"><span>출석률</span><b class="num">${rows.length ? Math.round(came / rows.length * 100) : 0}%</b></div>
    <div class="stat"><span>출석</span><b class="num">${cnt('present')}일</b></div>
    <div class="stat"><span>지각 · 조퇴</span><b class="num">${cnt('late') + cnt('early')}일</b></div>
    <div class="stat crit"><span>결석</span><b class="num">${cnt('absent')}일</b></div>
  </div>
  <section class="card">${rows.length ? `<div class="list">${rows.map(a => `
    <div class="li">
      <span class="av time-av num">${md(a.day)}</span>
      <div class="t">${'일월화수목금토'[day0(a.day).getDay()]}요일${a.day === TODAY ? ' <span class="chip info">오늘</span>' : ''}</div>
      <div class="r"><span class="chip ${ATT[a.status][1]}">${ATT[a.status][0]}</span></div>
    </div>`).join('')}</div>` : `<p class="muted" style="margin:0">${monthLabel(MONTH)} 출결 기록이 아직 없어요.</p>`}</section>`;
}

function realKidBillsPage() {
  if (!REAL.kids.length) return head('수납', '') + noKid();
  const k = kidNow();
  const list = REAL.kidBills.filter(i => i.student_id === k.id);
  const unpaid = list.filter(i => !i.paid_at), paid = list.filter(i => i.paid_at);
  const row = i => `
    <div class="li">
      <span class="av" style="background:${i.paid_at ? 'var(--good)' : 'var(--blue-500)'}">${ic('card')}</span>
      <div><div class="t">${+i.month.slice(5)}월 ${esc(i.title)}</div><div class="d">${i.paid_at ? `${md(i.paid_at)} 납부 확인${i.method ? ` · ${esc(i.method)}` : ''}` : i.due ? `납부 기한 ${md(i.due)}` : '납부 기한 없음'}</div></div>
      <div class="r"><b class="num">${won(i.amount)}</b>${i.paid_at ? '<span class="chip good">납부 완료</span>' : ddChip(i.due)}</div>
    </div>`;
  return head(`${kidName(k)} 수납`, `${esc(REAL.academy.name)}에서 보낸 청구예요. 학원 안내대로 내시면 학원이 확인한 뒤 "납부 완료"로 바뀌어요.`) + kidPicker() + `
  <div class="stats">
    <div class="stat ${unpaid.length ? 'crit' : 'good'}"><span>낼 금액</span><b class="num">${won(sum(unpaid, i => i.amount))}</b></div>
    <div class="stat"><span>납부 완료</span><b class="num">${paid.length}건</b></div>
  </div>` + (list.length ? `
  ${unpaid.length ? `<section class="card" style="margin-bottom:16px"><div class="card-head"><h2>낼 것</h2><span class="sub">${unpaid.length}건</span></div><div class="list stack">${unpaid.map(row).join('')}</div></section>` : ''}
  ${paid.length ? `<section class="card"><div class="card-head"><h2>낸 기록</h2></div><div class="list stack">${paid.map(row).join('')}</div></section>` : ''}` : `
  <section class="card"><p class="muted" style="margin:0">아직 받은 청구가 없어요.</p></section>`);
}

function realNewsPage() {
  const list = REAL.notices;
  return head('학원 소식', `${esc(REAL.academy.name)}에서 보낸 공지예요. 열어 보면 학원에 "읽음"으로 표시돼요.`) + (list.length ? `
  <section class="card"><div class="list">${list.map(n => {
    const fresh = !REAL.reads.has(n.id);
    return `
    <a class="li link" href="#news/${n.id}">
      <span class="av" style="background:${fresh ? 'var(--blue-500)' : 'var(--blue-100)'}">${ic('chat')}</span>
      <div><div class="t">${esc(n.title)}</div><div class="d">${n.target_class ? `${esc(n.target_class)} · ` : ''}${md(n.created_at.slice(0, 10))}</div></div>
      <div class="r">${fresh ? '<span class="chip crit">새 공지</span>' : '<span class="chip mute">읽음</span>'}</div>
    </a>`;
  }).join('')}</div></section>` : `<section class="card empty"><span class="tile-ic">${ic('chat')}</span><h2>아직 받은 공지가 없어요</h2><p class="muted">학원에서 공지를 보내면 여기에 올라와요.</p></section>`);
}
function newsDetail(id) {
  const n = REAL.notices.find(x => x.id === id);
  if (!n) return notFound();
  if (!REAL.reads.has(id)) {
    REAL.reads.add(id); // 화면은 바로 읽음으로, 저장은 뒤에서
    SB.rpc('mark_notice_read', { p_notice: id }).then(({ error }) => { if (error) REAL.reads.delete(id); });
  }
  return head(esc(n.title), `${esc(REAL.academy.name)} · ${n.target_class ? `${esc(n.target_class)} · ` : ''}${md(n.created_at.slice(0, 10))}`) + `
  <section class="card"><p style="margin:0;white-space:pre-wrap">${esc(n.body || '(내용 없음)')}</p></section>
  <a class="hint" href="#news">${ic('chat')}<span>다른 공지도 확인해 보세요</span><b>학원 소식 →</b></a>`;
}

// 학부모·학생 홈 "오늘 챙길 일"
function familyTodo() {
  const items = [];
  unreadNotices().slice(0, 3).forEach(n => items.push([esc(n.title), `${esc(REAL.academy.name)} 공지`, `#news/${n.id}`, '<span class="chip crit">새 공지</span>']));
  if (ROLE === 'parent') REAL.kidBills.filter(i => !i.paid_at).slice(0, 3).forEach(i => {
    const k = REAL.kids.find(x => x.id === i.student_id);
    items.push([`${+i.month.slice(5)}월 ${esc(i.title)} ${won(i.amount)}`, `${k ? `${esc(k.name)} · ` : ''}${i.due ? `기한 ${md(i.due)}` : '기한 없음'}`, '#kid/bills', ddChip(i.due)]);
  });
  REAL.kids.forEach(k => {
    const a = REAL.kidAttend.find(x => x.student_id === k.id && x.day === TODAY);
    if (a) items.push([`오늘 ${ROLE === 'student' ? '' : `${esc(k.name)} `}${ATT[a.status][0]}`, `${esc(REAL.academy.name)}${k.class_name ? ` · ${esc(k.class_name)}` : ''}`, ROLE === 'student' ? '#attend' : '#kid/attend', `<span class="chip ${ATT[a.status][1]}">${ATT[a.status][0]}</span>`]);
  });
  if (ROLE === 'parent') abroadData().promos.filter(p => p.active).slice(0, 1)
    .forEach(p => items.push([esc(p.title), `${esc(p.program)} · 학원에서 안내한 유학 프로그램`, '#abroad', '<span class="chip info">상담 신청</span>']));
  items.push(...scheduleTodo());
  REAL.reports.filter(r => r.issued_at && dday(r.issued_at.slice(0, 10)) >= -7).slice(0, 2)
    .forEach(r => items.push([`${esc(r.title)} 발급`, `${esc(r.student_name || '')} · ${esc(r.writer_name || '')} 선생님`, `#${reportBase()}/${r.id}`, '<span class="chip good">성장 리포트</span>']));
  if (!REAL.kids.length) items.unshift([ROLE === 'student' ? '학원에 앱 가입을 알려 주세요' : '아이 연결을 기다리고 있어요', '원장님이 원생 명단에서 연결하면 출결이 보여요', ROLE === 'student' ? '#attend' : '#kid', '<span class="chip warn">연결 전</span>']);
  if (!items.length) items.push(['새로 챙길 일이 없어요', '공지 · 수납 · 오늘 출결을 살펴봤어요', '#news', '<span class="chip good">여유</span>']);
  return items;
}

function homeworkList() {
  return `<div class="checks">${DATA.child.homework.map((h, i) => `
    <label class="chk ${h.done ? 'done' : ''}"><input type="checkbox" data-hw="${i}" ${h.done ? 'checked' : ''}><span><b>${h.what}</b><small>${h.acad}</small></span></label>`).join('')}</div>`;
}

/* ================= 센터 관리 (센터 관리자만) ================= */
const VIDEO_CATS = ['필수', '수업', '상담', '운영'];
function centerVideosPage() {
  const list = CENTER.videos;
  const add = `<button class="btn primary" data-act="addVideo">${ic('plus')}영상 올리기</button>`;
  return head('강사 교육 영상', '여기 올린 영상은 센터에 가입한 모든 학원의 원장·강사에게 배부돼요. 원장·강사가 보고 리플렉션을 쓰면 이수 완료예요. 리플렉션 내용은 쓴 사람과 그 학원 원장님만 봐요.', list.length ? add : '') + (list.length ? `
  <section class="card"><div class="list">
    ${list.map(v => `
      <a class="li link" href="#center/videos/${v.id}">
        <span class="thumb-sm">${ic('play')}</span>
        <div><div class="t">${esc(v.title)}</div><div class="d"><span class="chip ${v.category === '필수' ? 'crit' : 'info'}">${esc(v.category)}</span> ${v.length ? `${esc(v.length)} · ` : ''}마감 ${v.due ? md(v.due) : '없음'}${v.video_url ? '' : ' · <b style="color:var(--warn)">영상 주소 없음</b>'}</div></div>
        <div class="r"><b class="num">이수 ${CENTER.done[v.id] || 0}명</b>${v.published ? '<span class="chip good">배부 중</span>' : '<span class="chip mute">숨김</span>'}</div>
      </a>`).join('')}
  </div></section>` : `
  <section class="card empty">
    <span class="tile-ic">${ic('video')}</span>
    <h2>첫 교육 영상을 올려 주세요</h2>
    <p class="muted">유튜브(일부 공개)나 비메오에 영상을 올린 뒤 주소를 넣으면 화면 안에서 바로 재생돼요.</p>
    ${add}
  </section>`) + `
  <a class="hint" href="https://studio.youtube.com" target="_blank" rel="noopener">${ic('video')}<span>영상은 유튜브에 "일부 공개"로 올리면 주소를 아는 사람만 볼 수 있어요</span><b>유튜브 스튜디오 →</b></a>`;
}

function centerVideoDetail(id) {
  const v = CENTER.videos.find(x => x.id === id);
  if (!v) return notFound();
  if (!(id in CENTER.refl)) loadVideoRefl(id);
  const refl = CENTER.refl[id];
  return head(esc(v.title), esc(v.description || ''), `<button class="btn" data-edit-video="${v.id}">고치기</button>`) + `
  <div class="grid2">
    <div>${videoPlayer(v.video_url, v.length)}</div>
    <section class="card">
      <div class="card-head"><h2>배부 정보</h2>${v.published ? '<span class="chip good">배부 중</span>' : '<span class="chip mute">숨김 · 원장·강사에게 안 보여요</span>'}</div>
      <div class="list">
        <div class="li"><span class="av time-av">분류</span><div class="t">${esc(v.category)}</div><span></span></div>
        <div class="li"><span class="av time-av">마감</span><div class="t">${v.due ? `${md(v.due)} ${ddChip(v.due)}` : '없음'}</div><span></span></div>
        <div class="li"><span class="av time-av">주소</span><div class="t small" style="word-break:break-all">${v.video_url ? `<a href="${esc(v.video_url)}" target="_blank" rel="noopener" style="color:var(--blue-600)">${esc(v.video_url)}</a>` : '없음'}</div><span></span></div>
      </div>
    </section>
  </div>
  <section class="card">
    <div class="card-head"><h2>이수한 사람 ${refl ? `${refl.length}명` : ''}</h2><span class="sub">리플렉션 내용은 쓴 사람과 그 학원 원장님만 볼 수 있어요</span></div>
    ${!refl ? '<p class="muted small" style="margin:0">불러오는 중…</p>' : refl.length ? `<div class="list">${refl.map(r => `
      <div class="li"><span class="av" style="background:var(--navy-700)">${esc(r.name[0])}</span><div><div class="t">${esc(r.name)}</div><div class="d">${esc(r.academies || '학원 없음')}</div></div><div class="r"><span class="time">${md(r.done_at.slice(0, 10))} 이수</span></div></div>`).join('')}</div>`
      : '<p class="muted small" style="margin:0">아직 이수한 사람이 없어요.</p>'}
  </section>`;
}

function videoDialog(v) {
  formDialog({
    title: v ? '교육 영상 고치기' : '교육 영상 올리기', table: 'training_videos', row: v, academy: false,
    after: async () => { await loadCenter(); if (REAL && (ROLE === 'owner' || ROLE === 'teacher')) await loadTraining(); if (v && !CENTER.videos.some(x => x.id === v.id)) location.hash = '#center/videos'; },
    label: r => `${r.title} 영상을`,
    fields: [
      ['title', '제목', { required: true, max: 100, placeholder: '예: 첫 상담에서 학부모 신뢰 얻는 법' }],
      ['video_url', '영상 주소', { url: true, max: 500, placeholder: 'https://youtu.be/…' }],
      ['category', '분류', { type: 'select', required: true, options: VIDEO_CATS, value: '수업', half: true }], ['length', '길이', { max: 10, placeholder: '예: 18:30', half: true }],
      ['due', '이수 마감', { type: 'date', half: true }],
      ['description', '설명', { max: 1000, placeholder: '강사에게 보이는 한두 줄 소개' }],
      ['published', '원장·강사에게 배부해요 (끄면 숨겨져요)', { type: 'check', value: true }]
    ]
  });
}

async function loadVideoRefl(id) {
  CENTER.refl[id] = null;
  const { data } = await SB.rpc('admin_video_reflections', { p_video: id });
  CENTER.refl[id] = data || [];
  if (location.hash === `#center/videos/${id}`) render();
}

// 지원 신청 (첫 화면 "지원받기"에서 들어온 것)
const REQ_STATE = { new: ['crit', '새 신청'], contacted: ['warn', '연락함'], done: ['good', '완료'] };
const REQ_NEXT = { new: ['contacted', '연락함으로'], contacted: ['done', '완료로'], done: ['new', '다시 열기'] };
let reqFilter = 'all';
function centerRequestsPage() {
  const all = CENTER.requests, list = all.filter(r => reqFilter === 'all' || r.status === reqFilter);
  return head('지원 신청', '첫 화면 "지원받기"에서 학원이 보낸 신청이에요. 연락하면 상태를 바꿔 두세요. 학원 이름을 누르면 메모를 남길 수 있어요.') + `
  <div class="filters">${[['all', '전체'], ...Object.entries(REQ_STATE).map(([k, [, l]]) => [k, l])].map(([k, l]) =>
    `<button class="${k === reqFilter ? 'on' : ''}" data-req-filter="${k}">${l} ${k === 'all' ? all.length : all.filter(r => r.status === k).length}</button>`).join('')}</div>
  ${list.length ? `<section class="card"><div class="list stack">
    ${list.map(r => {
      const [c, l] = REQ_STATE[r.status], [next, nl] = REQ_NEXT[r.status];
      return `
      <div class="li">
        <span class="av" style="background:${r.status === 'done' ? 'var(--good)' : 'var(--navy-700)'}">${esc(r.academy_name[0])}</span>
        <div><div class="t"><span class="nm-link" data-edit-req="${r.id}" role="button" tabindex="0">${esc(r.academy_name)}</span> <span class="muted small">${esc(r.region || '')}</span></div>
          <div class="d">${esc(r.owner_name)} 원장님 · <a href="tel:${esc(r.phone)}" style="color:var(--blue-600)">${esc(r.phone)}</a> · ${md(r.created_at.slice(0, 10))} 신청</div>
          <div class="needs">${(r.needs || []).map(n => `<span class="chip info">${esc(n)}</span>`).join('')}</div>
          ${r.memo ? `<div class="d">"${esc(r.memo)}"</div>` : ''}
          ${r.admin_memo ? `<div class="d"><b>센터 메모</b> ${esc(r.admin_memo)}</div>` : ''}</div>
        <div class="r"><span class="chip ${c}">${l}</span><button class="btn sm ${next === 'done' ? 'primary' : ''}" data-req-step="${r.id}:${next}">${nl}</button></div>
      </div>`;
    }).join('')}
  </div></section>` : `<section class="card empty"><span class="tile-ic">${ic('doc')}</span><h2>${reqFilter === 'all' ? '아직 들어온 신청이 없어요' : '여기에 해당하는 신청이 없어요'}</h2><p class="muted">첫 화면 왼쪽 "지원받기"에서 학원이 신청하면 여기에 쌓여요.</p></section>`}`;
}

function requestDialog(r) {
  formDialog({
    title: `${r.academy_name} 지원 신청`, table: 'support_requests', row: r, academy: false, noDelete: true, after: loadCenter,
    label: () => '신청을',
    fields: [
      ['status', '상태', { type: 'select', required: true, options: Object.entries(REQ_STATE).map(([k, [, l]]) => [k, l]) }],
      ['admin_memo', '센터 메모', { max: 1000, placeholder: '예: 10/26 통화 · 행정 컨설팅 일정 잡기' }]
    ]
  });
}

async function stepRequest(id, status) {
  const r = CENTER.requests.find(x => x.id === id), before = r.status;
  r.status = status; render();
  const { error } = await SB.from('support_requests').update({ status }).eq('id', id);
  if (error) { r.status = before; render(); toast('저장하지 못했어요'); return; }
  toast(`${r.academy_name} → ${REQ_STATE[status][1]}`);
}

// 관리자 추가 · 빼기
const ADMIN_ERRORS = {
  not_verified: '구글로 로그인했거나 아이디로 가입한 계정만 신청할 수 있어요.',
  already_pending: '이미 신청했어요. 관리자가 확인하고 있어요.',
  already_admin: '이미 센터 관리자예요.',
  not_pending: '이미 처리된 신청이에요.',
  no_such_id: '그 아이디로 가입한 회원이 없어요. 가입한 뒤에 추가해 주세요.',
  bad_id: '아이디는 영문 소문자·숫자·밑줄 4–20자예요.',
  bad_email: '이메일 주소를 다시 확인해 주세요.',
  cannot_remove_self: '나 자신은 뺄 수 없어요. 다른 관리자에게 부탁해 주세요.',
  admin_only: '센터 관리자만 할 수 있어요.'
};
const adminError = e => ADMIN_ERRORS[Object.keys(ADMIN_ERRORS).find(k => (e.message || '').includes(k))] || '문제가 생겼어요. 잠시 후 다시 시도해 주세요.';
function centerAdminsPage() {
  const me = (USER.email || '').toLowerCase();
  const apps = CENTER.adminApps, wait = apps.filter(a => a.status === 'pending'), done = apps.filter(a => a.status !== 'pending').slice(0, 5);
  const who = a => `${esc(a.name || a.email.split('@')[0])} <span class="muted small">${esc(a.email.replace('@id.academysupportcenter.app', ' (아이디)'))}</span>`;
  return head('관리자', '센터 관리 화면을 쓸 수 있는 사람이에요. 관리자는 누구나 다른 관리자를 추가하거나 빼고, 관리자 신청을 수락할 수 있어요.') + `
  <section class="card" style="margin-bottom:16px">
    <div class="card-head"><h2>관리자 신청</h2><span class="sub">${wait.length ? `기다리는 신청 ${wait.length}건` : '기다리는 신청 없음'}</span></div>
    ${wait.length ? `<div class="list stack">${wait.map(a => `
      <div class="li">
        <span class="av" style="background:var(--blue-500)">${esc((a.name || a.email)[0].toUpperCase())}</span>
        <div><div class="t">${who(a)}</div><div class="d">${md(a.created_at.slice(0, 10))} 신청${a.reason ? ` · "${esc(a.reason)}"` : ''}</div></div>
        <div class="r"><span class="btns"><button class="btn sm danger" data-adm-app="${a.id}:0">거절</button><button class="btn sm primary" data-adm-app="${a.id}:1">수락</button></span></div>
      </div>`).join('')}</div>` : '<p class="muted small" style="margin:0">로그인한 사람이 왼쪽 아래 "센터 관리자 신청"을 누르면 여기에 와요. 수락하면 바로 관리자가 돼요.</p>'}
    ${done.length ? `<details class="past"><summary>최근 처리한 신청 ${done.length}건</summary><div class="list">${done.map(a => `
      <div class="li"><span class="av" style="background:var(--blue-100)">${esc((a.name || a.email)[0].toUpperCase())}</span><div class="t">${who(a)}</div>
        <div class="r"><span class="chip ${a.status === 'approved' ? 'good' : 'mute'}">${a.status === 'approved' ? '수락' : '거절'}</span><span class="time">${a.decided_at ? md(a.decided_at.slice(0, 10)) : ''}</span></div></div>`).join('')}</div></details>` : ''}
  </section>` + `
  <section class="card" style="margin-bottom:16px">
    <div class="card-head"><h2>관리자 추가</h2></div>
    <form class="admin-add" id="adminAdd" novalidate>
      <label class="f">구글 이메일 또는 아이디<input name="who" maxlength="200" placeholder="예: someone@gmail.com 또는 daepyo01" autocapitalize="off"></label>
      <label class="f">이름 (선택)<input name="name" maxlength="50" placeholder="예: 김대표"></label>
      <button class="btn primary">추가하기</button>
    </form>
    <p class="msg" id="adminMsg" hidden></p>
    <p class="muted small" style="margin:10px 0 0">구글 이메일로 추가한 분은 그 구글 계정으로 "구글로 계속하기" 로그인을 해야 관리자로 인정돼요. 아이디는 이미 가입한 아이디만 추가할 수 있어요.</p>
  </section>
  <section class="card">
    <div class="card-head"><h2>지금 관리자</h2><span class="sub">${CENTER.admins.length}명</span></div>
    <div class="list">${CENTER.admins.map(a => `
      <div class="li">
        <span class="av" style="background:var(--navy-700)">${esc((a.name || a.email)[0].toUpperCase())}</span>
        <div><div class="t">${esc(a.name || a.email.split('@')[0])}${a.email === me ? ' <span class="chip info">나</span>' : ''}</div><div class="d">${esc(a.email.replace('@id.academysupportcenter.app', ' (아이디)'))}</div></div>
        <div class="r">${a.joined ? '<span class="chip good">가입함</span>' : '<span class="chip mute">아직 로그인 전</span>'}${a.email === me ? '' : `<button class="btn sm danger" data-rm-admin="${esc(a.email)}">빼기</button>`}</div>
      </div>`).join('')}
    </div>
  </section>`;
}

// 센터: 제휴 신청 처리
const PA_NEXT = { new: ['contacted', '연락함으로'], contacted: ['connected', '연결 완료로'], connected: ['closed', '종료'], closed: ['new', '다시 열기'] };
const PA_LABEL = { new: '새 신청', contacted: '연락함', connected: '연결 완료', closed: '종료' };
let paFilter = 'all';
const filterBar = (all, labels, cur, attr) => `<div class="filters">${[['all', '전체'], ...Object.entries(labels)].map(([k, l]) =>
  `<button class="${k === cur ? 'on' : ''}" data-${attr}="${k}">${l} ${k === 'all' ? all.length : all.filter(r => r.status === k).length}</button>`).join('')}</div>`;
function centerPartnersPage() {
  const all = CENTER.partnerApps, list = all.filter(a => paFilter === 'all' || a.status === paFilter);
  return head('제휴 신청', '원장님이 "바로 신청"한 제휴예요. 제휴처와 연결하면서 상태를 바꿔 두면 원장님 "내 제휴"에 그대로 보여요. 학원 이름을 누르면 안내를 남길 수 있어요.') +
    filterBar(all, PA_LABEL, paFilter, 'pa-filter') + (list.length ? `
  <section class="card"><div class="list stack">${list.map(a => {
    const [next, nl] = PA_NEXT[a.status];
    return `
    <div class="li">
      <span class="av" style="background:var(--navy-700)">${esc((a.academy_name || '학')[0])}</span>
      <div><div class="t"><span class="nm-link" data-edit-pa="${a.id}" role="button" tabindex="0">${esc(a.academy_name || '학원')}</span> <span class="muted small">${md(a.created_at.slice(0, 10))} 신청</span></div>
        <div class="d"><b>${esc(a.partner_name)}</b>${a.memo ? ` · "${esc(a.memo)}"` : ''}</div>
        ${a.admin_memo ? `<div class="d"><b>센터 안내</b> ${esc(a.admin_memo)}</div>` : ''}</div>
      <div class="r"><span class="chip ${P_STATE[a.status][0]}">${PA_LABEL[a.status]}</span><button class="btn sm ${next === 'connected' ? 'primary' : ''}" data-pa-step="${a.id}:${next}">${nl}</button></div>
    </div>`;
  }).join('')}</div></section>` : `<section class="card empty"><span class="tile-ic">${ic('handshake')}</span><h2>여기에 해당하는 신청이 없어요</h2><p class="muted">원장님이 제휴처 둘러보기에서 신청하면 여기에 쌓여요.</p></section>`);
}
function partnerAppDialog(a) {
  formDialog({
    title: `${a.academy_name || '학원'} · ${a.partner_name}`, table: 'partner_applications', row: a, academy: false, noDelete: true, after: loadCenter,
    label: () => '신청을',
    fields: [
      ['status', '상태', { type: 'select', required: true, options: Object.entries(PA_LABEL) }],
      ['admin_memo', '원장님께 남길 안내', { max: 1000, placeholder: '예: 인투유학 김OO 상담사가 10/28에 연락드려요' }]
    ]
  });
}
async function stepPartnerApp(id, status) {
  const a = CENTER.partnerApps.find(x => x.id === id), before = a.status;
  a.status = status; render();
  const { error } = await SB.from('partner_applications').update({ status }).eq('id', id);
  if (error) { a.status = before; render(); toast(error.code === '23505' ? '같은 제휴가 이미 진행 중이에요' : '저장하지 못했어요'); return; }
  toast(`${a.academy_name} · ${a.partner_name} → ${PA_LABEL[status]}`);
}

// 센터: 원장이 연결 요청한 유학 상담
function centerAbroadPage() {
  const list = CENTER.abroad.filter(r => r.status === 'forwarded' || r.status === 'done');
  return head('유학 상담', '학부모가 신청하고 원장님이 확인해서 넘긴 유학 상담이에요. 인투유학 상담사에게 연결한 뒤 "연결 완료"로 바꿔 주세요.') + (list.length ? `
  <section class="card"><div class="list stack">${list.map(r => `
    <div class="li">
      <span class="av" style="background:${r.status === 'done' ? 'var(--good)' : 'var(--navy-700)'}">${esc(r.parent_name[0])}</span>
      <div><div class="t"><span class="nm-link" data-edit-cab="${r.id}" role="button" tabindex="0">${esc(r.parent_name)}</span> <span class="muted small">${esc(r.academy_name || '')} · ${esc([r.student_name, r.student_grade].filter(Boolean).join(' '))}</span></div>
        <div class="d">${esc(r.program)} · <a href="tel:${esc(r.phone)}" style="color:var(--blue-600)">${esc(r.phone)}</a> · ${md(r.created_at.slice(0, 10))} 신청</div>
        ${r.memo ? `<div class="d">"${esc(r.memo)}"</div>` : ''}${r.owner_memo ? `<div class="d"><b>원장 메모</b> ${esc(r.owner_memo)}</div>` : ''}${r.admin_memo ? `<div class="d"><b>센터 메모</b> ${esc(r.admin_memo)}</div>` : ''}</div>
      <div class="r"><span class="chip ${AB_STATE[r.status][0]}">${AB_STATE[r.status][1]}</span>${r.status === 'forwarded' ? `<button class="btn sm primary" data-cab-step="${r.id}:done">연결 완료</button>` : ''}</div>
    </div>`).join('')}</div></section>` : `<section class="card empty"><span class="tile-ic">${ic('globe')}</span><h2>연결 요청된 상담이 아직 없어요</h2><p class="muted">원장님이 학부모 신청을 확인하고 "인투유학 연결 요청"을 누르면 여기에 와요.</p></section>`) +
  `<a class="hint" href="${DATA.abroadUrl}" target="_blank" rel="noopener">${ic('globe')}<span>유학 상담은 인투유학 상담사에게 연결해요</span><b>인투유학 →</b></a>`;
}
function centerAbroadDialog(r) {
  formDialog({
    title: `${r.parent_name} 님 유학 상담`, table: 'abroad_requests', row: r, academy: false, noDelete: true, after: loadCenter,
    label: () => '신청을',
    fields: [
      ['status', '상태', { type: 'select', required: true, options: [['forwarded', '센터 연결 중'], ['done', '상담 연결 완료']] }],
      ['admin_memo', '센터 메모 (원장님께 보여요)', { max: 1000, placeholder: '예: 10/27 김OO 상담사 배정' }]
    ]
  });
}

// 센터: 홍보 의뢰 → 인투마케팅 연결
const MK_NEXT = { new: ['contacted', '연결함으로'], contacted: ['working', '작업 중으로'], working: ['review', '시안 확인으로'], review: ['done', '완료로'], done: null };
let mkFilter = 'all';
function centerPromoPage() {
  const all = CENTER.promoReqs, list = all.filter(r => mkFilter === 'all' || r.status === mkFilter);
  return head('홍보 의뢰', '원장님이 맡긴 홍보 작업이에요. 인투마케팅 담당자에게 넘기고 단계를 바꿔 주면 원장님 "의뢰 현황"에 그대로 보여요. 학원 이름을 누르면 안내를 남길 수 있어요.') +
    filterBar(all, Object.fromEntries(Object.entries(MK_STATE).map(([k, [, l]]) => [k, l])), mkFilter, 'mk-filter') + (list.length ? `
  <section class="card"><div class="list stack">${list.map(r => {
    const next = MK_NEXT[r.status];
    return `
    <div class="li">
      <span class="av" style="background:${r.status === 'done' ? 'var(--good)' : 'var(--navy-700)'}">${esc((r.academy_name || '학')[0])}</span>
      <div><div class="t"><span class="nm-link" data-edit-mk="${r.id}" role="button" tabindex="0">${esc(r.academy_name || '학원')}</span> <span class="muted small">${r.requester_name ? `${esc(r.requester_name)} ${r.requester_role === 'teacher' ? '강사' : '원장'} · ` : ''}${md(r.created_at.slice(0, 10))} 의뢰${r.want_by ? ` · ${md(r.want_by)}까지` : ''}</span></div>
        <div class="d"><b>${esc(r.service)}</b> · ${esc(r.title)}${r.contact ? ` · <a href="tel:${esc(r.contact)}" style="color:var(--blue-600)">${esc(r.contact)}</a>` : ''}</div>
        ${r.detail ? `<div class="d" style="white-space:pre-wrap">"${esc(r.detail)}"</div>` : ''}
        ${r.admin_memo ? `<div class="d"><b>센터 안내</b> ${esc(r.admin_memo)}</div>` : ''}</div>
      <div class="r"><span class="chip ${MK_STATE[r.status][0]}">${MK_STATE[r.status][1]}</span>${next ? `<button class="btn sm ${next[0] === 'done' ? 'primary' : ''}" data-mk-step="${r.id}:${next[0]}">${next[1]}</button>` : ''}</div>
    </div>`;
  }).join('')}</div></section>` : `<section class="card empty"><span class="tile-ic">${ic('megaphone')}</span><h2>여기에 해당하는 의뢰가 없어요</h2><p class="muted">원장님이 홍보 서비스에서 의뢰하면 여기에 쌓여요.</p></section>`) +
  `<a class="hint" href="${MK}" target="_blank" rel="noopener">${ic('megaphone')}<span>홍보 작업은 인투마케팅 담당자에게 연결해요</span><b>인투마케팅 →</b></a>`;
}
function centerPromoDialog(r) {
  formDialog({
    title: `${r.academy_name || '학원'} · ${r.service}`, table: 'promo_requests', row: r, academy: false, noDelete: true, after: loadCenter,
    label: () => '의뢰를',
    fields: [
      ['status', '단계', { type: 'select', required: true, options: Object.entries(MK_STATE).map(([k, [, l]]) => [k, l]) }],
      ['admin_memo', '원장님께 남길 안내', { max: 1000, placeholder: '예: 인투마케팅 이OO 디자이너가 10/28까지 시안 보내 드려요' }]
    ]
  });
}
async function stepPromoReq(id, status) {
  const r = CENTER.promoReqs.find(x => x.id === id), before = r.status;
  r.status = status; render();
  const { error } = await SB.from('promo_requests').update({ status }).eq('id', id);
  if (error) { r.status = before; render(); toast('저장하지 못했어요'); return; }
  toast(`${r.academy_name} · ${r.service} → ${MK_STATE[status][1]}`);
}

const centerTodo = () => {
  const fresh = CENTER.requests.filter(r => r.status === 'new');
  const items = fresh.slice(0, 3).map(r => [`${esc(r.academy_name)} 지원 신청 연락하기`, `${esc(r.owner_name)} 원장님 · ${(r.needs || []).map(esc).join(' · ')}`, '#center/requests', '<span class="chip crit">새 신청</span>']);
  if (fresh.length > 3) items.push([`새 신청 ${fresh.length - 3}건 더 있어요`, '지원 신청에서 모두 보기', '#center/requests', '']);
  const pa = CENTER.partnerApps.filter(a => a.status === 'new').length;
  if (pa) items.push([`새 제휴 신청 ${pa}건`, '제휴처와 연결해 주세요', '#center/partners', '<span class="chip crit">새 신청</span>']);
  const ab = CENTER.abroad.filter(r => r.status === 'forwarded').length;
  if (ab) items.push([`유학 상담 연결 요청 ${ab}건`, '인투유학 상담사 연결', '#center/abroad', '<span class="chip warn">연결 필요</span>']);
  const mk = CENTER.promoReqs.filter(r => r.status === 'new');
  if (mk.length) items.push([`새 홍보 의뢰 ${mk.length}건`, mk.slice(0, 3).map(r => `${esc(r.academy_name || '학원')} · ${esc(r.service)}`).join(' / '), '#center/promo', '<span class="chip crit">새 의뢰</span>']);
  const adm = CENTER.adminApps.filter(a => a.status === 'pending');
  if (adm.length) items.push([`관리자 신청 ${adm.length}건`, adm.slice(0, 3).map(a => esc(a.name || a.email.split('@')[0])).join(' · '), '#center/admins', '<span class="chip crit">수락 필요</span>']);
  const noUrl = CENTER.videos.filter(v => v.published && !v.video_url).length;
  if (noUrl) items.push([`영상 주소가 없는 교육 ${noUrl}개`, '강사에게 재생 버튼이 안 보여요', '#center/videos', '<span class="chip warn">확인</span>']);
  if (!items.length) items.push(['새로 처리할 일이 없어요', '지원 신청 · 교육 영상을 살펴봤어요', '#center', '<span class="chip good">여유</span>']);
  return items;
};

const CENTER_AREA = { name: '센터 관리', icon: 'star', desc: '교육 영상 · 지원 · 제휴 · 유학 상담 · 홍보 의뢰 · 관리자',
  stat: () => `새 신청 ${CENTER.requests.filter(r => r.status === 'new').length + CENTER.partnerApps.filter(a => a.status === 'new').length + CENTER.promoReqs.filter(r => r.status === 'new').length}건 · 유학 연결 ${CENTER.abroad.filter(r => r.status === 'forwarded').length}건`,
  subs: {
    videos: { name: '강사 교육 영상', icon: 'video', desc: '영상 올리기 · 배부 · 이수 현황', stat: () => `영상 ${CENTER.videos.length}개 · 이수 ${Object.values(CENTER.done).reduce((a, n) => a + n, 0)}건`,
      render: centerVideosPage, detail: centerVideoDetail, title: id => (CENTER.videos.find(v => v.id === id) || {}).title },
    requests: { name: '지원 신청', icon: 'doc', desc: '첫 화면에서 들어온 학원 지원 신청', stat: () => `새 신청 ${CENTER.requests.filter(r => r.status === 'new').length}건`, render: centerRequestsPage },
    partners: { name: '제휴 신청', icon: 'handshake', desc: '원장님이 신청한 제휴 연결', stat: () => `새 신청 ${CENTER.partnerApps.filter(a => a.status === 'new').length}건`, render: centerPartnersPage },
    abroad: { name: '유학 상담', icon: 'globe', desc: '원장님이 넘긴 학부모 유학 상담 연결', stat: () => `연결 요청 ${CENTER.abroad.filter(r => r.status === 'forwarded').length}건`, render: centerAbroadPage },
    promo: { name: '홍보 의뢰', icon: 'megaphone', desc: '원장님 홍보 작업을 인투마케팅에 연결', stat: () => `새 의뢰 ${CENTER.promoReqs.filter(r => r.status === 'new').length}건`, render: centerPromoPage },
    admins: { name: '관리자', icon: 'shield', desc: '관리자 신청 수락 · 추가 · 빼기', stat: () => { const n = CENTER.adminApps.filter(a => a.status === 'pending').length; return `${CENTER.admins.length}명${n ? ` · 신청 ${n}건` : ''}`; }, render: centerAdminsPage }
  } };

function applicantStat() {
  if (!REAL) return `지원자 ${DATA.jobs.filter(j => j.mine).reduce((a, j) => a + (j.applicants || []).length, 0)}명`;
  return `새 지원자 ${REAL.applicants.filter(a => a.status === 'applied').length}명`;
}
function attendStat() {
  if (!REAL) { const s = DATA.attendance.reduce((a, c) => [a[0] + c.present, a[1] + c.total], [0, 0]); return `오늘 ${s[0]}/${s[1]}명`; }
  const { day, map } = REAL.attend;
  return `${day === TODAY ? '오늘' : md(day)} 출석 ${Object.values(map).filter(s => s === 'present' || s === 'late').length}/${REAL.students.length}명`;
}

/* ================= 역할별 메뉴 구조 =================
   영역(area) → 세부(subs) 두 단계. subs가 없으면 영역 화면이 바로 열려요. */
// 예시 일정 날짜를 이번 달로 맞춰요
DATA.events.forEach(e => { const m = TODAY.slice(0, 7), dd = n => `${m}-${String(Math.min(n, 28)).padStart(2, '0')}`; e.day = dd(e.d); e.end_day = e.end ? dd(e.end) : null; });
const MESSAGES_AREA = { name: '메신저', icon: 'chat', desc: '원장 · 강사 · 학부모 · 학생 1:1 대화', stat: () => { const n = msgUnread(); return n ? `안 읽은 메시지 ${n}개` : `대화 ${convsData().length}개`; },
  render: messagesPage, detail: chatPage, title: id => (convsData().find(c => c.id === id) || {}).other_name };
const LIBRARY_AREA = { name: '자료실', icon: 'doc', desc: '학원 자료 · 서식 · 안내문 모아 보기', stat: () => `자료 ${libData().length}개`, render: libraryPage };
const REPORT_AREA = { name: '성장 리포트', icon: 'doc', desc: '학생기록부처럼 쓰고 발급하기', stat: () => { const l = reportsData(); return isStaff() ? `작성 중 ${l.filter(r => r.status === 'draft').length}개 · 발급 ${l.filter(r => r.status === 'issued').length}개` : `발급 ${l.length}개`; }, render: reportsPage, detail: reportDetail, title: id => (reportsData().find(r => r.id === id) || {}).title };
const SCHEDULE_AREA = { name: '일정 · 시간표', icon: 'cal', desc: '주간 시간표와 시험 · 행사 · 휴원 일정', stat: () => { const n = schData().ev.filter(e => e.day >= TODAY && dday(e.day) <= 7).length; return n ? `이번 주 일정 ${n}개` : `수업 ${schData().tt.length}개`; }, render: schedulePage };
const AREAS = {
  owner: {
    admin: { name: '행정 지원', icon: 'shield', desc: '출결·수납·재정·서류 처리를 한곳에서',
      stat: () => REAL ? `서류 마감 2주 안 ${REAL.paperwork.filter(p => p.status !== 'done' && p.due && dday(p.due) <= 14).length}건 · 미납 ${REAL.invoices.filter(i => !i.paid_at).length}건` : `행정 마감 D-0 · 미납 ${DATA.unpaid.length}건`,
      subs: {
        attend: { name: '출결 관리', icon: 'attend', desc: '반별 출석 체크와 결석 확인', stat: attendStat, render: attendPage },
        billing: { name: '수납·청구', icon: 'card', desc: '청구서 만들기와 미납 안내', stat: () => REAL ? `${+MONTH.slice(5)}월 미납 ${REAL.invoices.filter(i => i.month === MONTH && !i.paid_at).length}건` : `미납 ${DATA.unpaid.filter(u => !u.sent).length}건`, render: billingPage },
        finance: { name: '재정', icon: 'chart', desc: '기간별 매출 · 지출 · 순이익', stat: () => {
          if (!REAL) return `이번 달 +${won((DATA.finance.income - DATA.finance.expense) * 1e4)}`;
          const m = TODAY.slice(0, 7), t = finTotals(ledger().filter(e => e.day.startsWith(m)));
          return `${+m.slice(5)}월 순이익 ${signWon(t.net)}`;
        }, render: financePage },
        approvals: { name: '결재함', icon: 'check', desc: '강사가 올린 물품 · 재정 결재', stat: () => `결재 대기 ${apvData().filter(a => a.status === 'pending').length}건`, render: approvalsOwnerPage },
        paper: { name: '서류·행정', icon: 'doc', desc: '챙길 서류 자동 찾기 · 명부 · 출석부 · 원천세 바로 만들기', stat: () => REAL ? `작성 필요 ${REAL.paperwork.filter(p => p.status === 'todo').length}건${paperSuggestions().length ? ` · 자동 ${paperSuggestions().length}건` : ''}` : `작성 필요 ${DATA.paperwork.filter(p => p.status === 'todo').length}건`, render: paperPage }
      } },
    teachers: { name: '강사 관리', icon: 'grad', desc: '센터 강사 교육과 채용까지', stat: () => `교육 미이수 ${DATA.training.reduce((a, t) => a + Object.values(t.status).filter(s => s !== 'done').length, 0)}건 · ${applicantStat()}`,
      subs: {
        staff: { name: '우리 학원 강사', icon: 'users', desc: '담당 반과 교육 이수 현황', stat: () => `${DATA.staff.length}명`, render: staffPage },
        training: { name: '강사 교육', icon: 'video', desc: '본부 교육 영상 · 나와 강사 리플렉션', stat: () => `영상 ${DATA.training.length}개`, render: trainingPage, detail: id => trainingDetail(id, 'teachers/training') },
        hire: { name: '강사 채용', icon: 'brief', desc: '공고 올리기와 지원자 관리', stat: applicantStat, render: hirePage }
      } },
    members: { name: '학생·학부모 관리', icon: 'users', desc: '상담·등록부터 원생 명단, 학부모 공지까지', stat: () => `새 문의 ${DATA.leads.filter(l => l.stage === 'inquiry').length}건`,
      subs: {
        leads: { name: '상담·등록', icon: 'leads', desc: '문의 → 상담 → 체험수업 → 등록', stat: () => `진행 중 ${DATA.leads.filter(l => l.stage !== 'enrolled').length}명`, render: leadsPage },
        students: { name: '원생 명단', icon: 'users', desc: '학생·학부모 연락처, 출석, 수납', stat: () => `원생 ${DATA.academy.students}명`, render: studentsPage },
        invite: { name: '초대 코드', icon: 'plus', desc: '원장·강사·학부모를 우리 학원에 초대', stat: () => REAL ? `함께하는 사람 ${REAL.members.length}명` : '코드 3종류', render: invitePage },
        todos: { name: '학생 할 일', icon: 'check', desc: '반 · 학생에게 오늘 할 일 주기', stat: todoStat, render: todosPage },
        reports: REPORT_AREA,
        notices: { name: '학부모 공지', icon: 'chat', desc: '공지 보내고 읽음 확인', stat: () => REAL ? `보낸 공지 ${REAL.notices.length}건` : `이번 달 ${DATA.notices.length}건`, render: noticesPage,
          detail: noticeDetail, title: id => (REAL.notices.find(n => n.id === id) || {}).title }
      } },
    messages: MESSAGES_AREA,
    schedule: SCHEDULE_AREA,
    library: LIBRARY_AREA,
    mou: { name: '제휴(MOU)', icon: 'handshake', desc: '유학·캠프 등 센터가 맺어 둔 제휴를 바로 신청 · 학부모 유학 상담', stat: () => REAL
        ? `진행 중 제휴 ${REAL.partnerApps.filter(a => a.status !== 'closed').length}건 · 유학 상담 새 신청 ${REAL.abroad.requests.filter(r => r.status === 'new').length}건`
        : `이용 중 ${DATA.partners.filter(p => p.status === 'using').length}곳 · 신청 가능 ${DATA.partners.filter(p => p.status === 'none').length}곳`,
      subs: {
        partners: { name: '제휴처 둘러보기', icon: 'handshake', desc: '유학 · 캠프 · 어학연수와 그 밖의 제휴', stat: () => `${DATA.partners.length}곳`, render: partnersPage },
        abroad: { name: '유학 상담', icon: 'globe', desc: '학부모에게 유학 프로그램 안내 · 상담 신청 확인', stat: () => `새 신청 ${abroadData().requests.filter(r => r.status === 'new').length}건`, render: abroadOwnerPage },
        mine: { name: '내 제휴', icon: 'check', desc: REAL ? '신청한 제휴의 진행 상황' : '이용 중인 제휴와 아낀 비용', stat: () => REAL ? `${REAL.partnerApps.filter(a => a.status !== 'closed').length}건` : `${DATA.partners.filter(p => p.status !== 'none').length}곳`, render: myPartnersPage }
      } },
    promo: { name: '홍보 지원', icon: 'megaphone', desc: '블로그·디자인·영상을 인투마케팅이 지원', stat: () => `진행 중 의뢰 ${promoOpen()}건`,
      subs: {
        services: { name: '홍보 서비스', icon: 'megaphone', desc: '블로그 · 디자인 · 영상 · SNS 광고', stat: () => '인투마케팅 연결', render: servicesPage },
        requests: { name: '의뢰 현황', icon: 'check', desc: '맡긴 작업의 진행 상황', stat: () => `진행 중 ${promoOpen()}건`, render: requestsPage }
      } }
  },
  teacher: {
    attend: { name: '출결 입력', icon: 'attend', desc: '수업 중에 우리 반 출석 체크', stat: attendStat, render: attendPage },
    students: { name: '원생 명단', icon: 'users', desc: '원생 추가 · 정보 고치기', stat: () => `원생 ${REAL ? REAL.students.length : DATA.academy.students}명`, render: studentsPage },
    messages: MESSAGES_AREA,
    schedule: SCHEDULE_AREA,
    todos: { name: '학생 할 일', icon: 'check', desc: '반 · 학생에게 오늘 할 일 주기', stat: todoStat, render: todosPage },
    reports: REPORT_AREA,
    library: LIBRARY_AREA,
    learn: { name: '강사 교육', icon: 'video', desc: '본부 교육 영상 시청과 리플렉션', stat: () => `남은 교육 ${DATA.training.filter(t => t.status[ME.name] !== 'done').length}개`,
      render: () => head('강사 교육', '학원지원센터 본부에서 배부한 교육 영상이에요. 시청하고 리플렉션을 쓰면 이수 완료돼요.') + trainingList('learn'), detail: id => trainingDetail(id, 'learn') },
    jobs: { name: '채용 공고', icon: 'brief', desc: '센터 가입 학원들의 강사 채용', stat: () => `공고 ${JOBS ? JOBS.posts.length : DATA.jobs.length}건`, render: jobsPage },
    approvals: { name: '결재 요청', icon: 'check', desc: '물품 · 비용을 원장님께 결재받기', stat: () => { const n = apvData().filter(a => a.status === 'pending').length; return n ? `결재 대기 ${n}건` : `올린 결재 ${apvData().length}건`; }, render: approvalsTeacherPage },
    promo: null // 아래에서 원장 홍보 지원을 같이 써요
  },
  parent: {
    kid: { name: '우리 아이', icon: 'grad', desc: '일정·숙제, 기록, 수납을 한 번에', stat: () => `${DATA.child.name} · 학원 ${DATA.child.academies}곳`,
      subs: {
        schedule: { name: '일정·숙제', icon: 'cal', desc: '오늘 일정과 숙제', stat: () => `오늘 ${DATA.child.today.length}개`, render: kidSchedulePage },
        record: { name: '기록·성적', icon: 'doc', desc: '출석률·시험·선생님 코멘트', stat: () => `출석 ${DATA.child.record.attend}%`, render: kidRecordPage },
        reports: { ...REPORT_AREA, desc: '선생님이 발급한 성장 기록' },
        bills: { name: '수납', icon: 'card', desc: '학원별 수강료 결제', stat: () => { const n = DATA.child.bills.filter(b => !b.paid).length; return n ? `낼 금액 ${n}건` : '모두 납부'; }, render: kidBillsPage }
      } },
    schedule: SCHEDULE_AREA,
    news: { name: '학원 소식', icon: 'chat', desc: '학원 공지와 안내', stat: () => '새 공지 2건', render: newsPage },
    messages: MESSAGES_AREA,
    library: LIBRARY_AREA,
    abroad: { name: '유학 프로그램', icon: 'globe', desc: '학원이 안내하는 유학 · 캠프 상담 신청', stat: () => `안내 ${abroadData().promos.filter(p => p.active).length}건`, render: parentAbroadPage }
  },
  student: { todos: { name: '오늘 할 일', icon: 'check', desc: '할 일 체크하기', stat: todoStat, render: todosPage }, messages: MESSAGES_AREA, schedule: SCHEDULE_AREA, reports: { ...REPORT_AREA, desc: '선생님이 발급한 내 성장 기록' } }
};
AREAS.teacher.promo = { ...AREAS.owner.promo, desc: '특강 · 설명회 홍보를 인투마케팅에 의뢰' };
const promoOpen = () => REAL ? REAL.promoReqs.filter(r => r.status !== 'done').length : DATA.promoRequests.length;
// 실제 로그인한 학부모·학생: 원장이 이어 준 아이의 출결 · 수납 · 학원 소식
const kidStat = () => REAL.kids.length ? REAL.kids.map(k => esc(k.name)).join(' · ') : '아이 연결 전';
const newsArea = { name: '학원 소식', icon: 'chat', desc: '학원 공지와 안내', stat: () => { const n = unreadNotices().length; return n ? `새 공지 ${n}건` : `공지 ${REAL.notices.length}건`; },
  render: realNewsPage, detail: newsDetail, title: id => (REAL.notices.find(n => n.id === id) || {}).title };
const FAMILY_AREAS = {
  parent: {
    kid: { name: '우리 아이', icon: 'grad', desc: '할 일 · 출결 · 수납을 한 번에', stat: kidStat,
      subs: {
        attend: { name: '출결', icon: 'attend', desc: '날짜별 출석 · 지각 · 결석', stat: () => `${+MONTH.slice(5)}월 ${REAL.kidAttend.filter(a => a.day.startsWith(MONTH) && (!REAL.kids.length || a.student_id === kidNow().id)).length}일 기록`, render: kidAttendPage },
        todos: { name: '오늘 할 일', icon: 'check', desc: '학원 · 부모님이 정한 할 일과 체크', stat: todoStat, render: todosPage },
        reports: { ...REPORT_AREA, desc: '선생님이 발급한 성장 기록' },
        bills: { name: '수납', icon: 'card', desc: '학원 청구와 납부 확인', stat: () => { const n = REAL.kidBills.filter(b => !b.paid_at).length; return n ? `낼 금액 ${n}건` : '모두 납부'; }, render: realKidBillsPage }
      } },
    schedule: SCHEDULE_AREA,
    news: newsArea,
    messages: MESSAGES_AREA,
    library: LIBRARY_AREA,
    abroad: AREAS.parent.abroad
  },
  student: {
    todos: { name: '오늘 할 일', icon: 'check', desc: '학원 · 부모님이 정한 할 일 체크하기', stat: todoStat, render: todosPage },
    schedule: SCHEDULE_AREA,
    reports: { ...REPORT_AREA, desc: '선생님이 발급한 내 성장 기록' },
    attend: { name: '내 출결', icon: 'attend', desc: '날짜별 출석 · 지각 · 결석', stat: () => `${+MONTH.slice(5)}월 ${REAL.kidAttend.filter(a => a.day.startsWith(MONTH)).length}일 기록`, render: kidAttendPage },
    news: newsArea,
    messages: MESSAGES_AREA,
    library: LIBRARY_AREA
  }
};
let MY = AREAS[ROLE];

/* ---------- 새 소식 빨간 점: 메뉴마다 마지막으로 본 뒤에 남이 올린 게 있으면 점, 열어 보면 사라져요 ---------- */
let SEEN = {};          // 메뉴 경로 → 마지막으로 본 시각 (user_seen, 예시 계정은 sessionStorage)
const SEEN_WROTE = {};  // 방금 저장한 시각 (같은 화면을 다시 그릴 때 매번 저장하지 않게)
const SEEN_BASE = new Date(Date.now() - 3 * 864e5).toISOString(); // 처음엔 최근 3일 것만 새 소식
const notMine = (rows, who, at = 'created_at') => (rows || []).filter(r => !USER || !who || r[who] !== USER.id).map(r => r[at]).filter(Boolean);
const NEWS = {
  owner: {
    'admin/approvals': () => notMine(apvData().filter(a => a.status === 'pending'), 'requested_by'),
    'members/leads': () => DATA.leads.map(l => l.raw && l.raw.created_at),
    'members/students': () => REAL.students.filter(x => x.added_by_role === 'teacher').map(x => x.created_at),
    'teachers/hire': () => (REAL.applicants || []).map(a => a.applied_at),
    'teachers/training': () => DATA.training.map(t => t.created_at),
    'mou/abroad': () => REAL.abroad.requests.map(r => r.created_at),
    'mou/mine': () => REAL.partnerApps.map(r => r.updated_at),
    'promo/requests': () => REAL.promoReqs.map(r => r.requested_by === USER.id ? r.updated_at : r.created_at),
    schedule: () => notMine(REAL.events, 'created_by'),
    library: () => notMine(REAL.library, 'uploaded_by')
  },
  teacher: {
    approvals: () => apvData().map(a => a.decided_at),
    learn: () => DATA.training.map(t => t.created_at),
    jobs: () => (JOBS ? JOBS.posts : []).map(p => p.created_at),
    schedule: () => notMine(REAL.events, 'created_by'),
    library: () => notMine(REAL.library, 'uploaded_by'),
    reports: () => notMine(REAL.reports, 'written_by', 'updated_at')
  },
  parent: {
    'kid/todos': () => notMine(REAL.todos, 'created_by'),
    'kid/reports': () => REAL.reports.map(r => r.issued_at),
    'kid/bills': () => REAL.kidBills.filter(b => !b.paid_at).map(b => b.created_at),
    news: () => REAL.notices.map(n => n.created_at),
    library: () => notMine(REAL.library, 'uploaded_by'),
    abroad: () => REAL.abroad.promos.filter(p => p.active).map(p => p.created_at).concat(REAL.abroad.requests.map(r => r.updated_at))
  },
  student: {
    todos: () => notMine(REAL.todos, 'created_by'),
    reports: () => REAL.reports.map(r => r.issued_at),
    news: () => REAL.notices.map(n => n.created_at),
    library: () => notMine(REAL.library, 'uploaded_by')
  },
  center: {
    'center/requests': () => CENTER.requests.map(r => r.created_at),
    'center/partners': () => CENTER.partnerApps.map(r => r.created_at),
    'center/abroad': () => CENTER.abroad.map(r => r.updated_at),
    'center/promo': () => CENTER.promoReqs.map(r => r.created_at),
    'center/admins': () => CENTER.adminApps.filter(a => a.status === 'pending').map(a => a.created_at)
  }
};
// 예시 계정: 처음 들어오면 몇 곳에 점이 보이고, 열어 보면 사라져요
const DEMO_NEWS = { owner: ['admin/approvals', 'members/leads', 'mou/abroad', 'promo/requests'], teacher: ['approvals', 'learn', 'jobs'],
  parent: ['news', 'kid/bills', 'abroad'], student: ['todos', 'reports'] };
function newsKeys() {
  if (!REAL && !CENTER) return DEMO && !USER ? Object.fromEntries((DEMO_NEWS[ROLE] || []).map(k => [k, () => [`${TODAY}T00:00:00`]])) : {};
  return { ...(REAL ? NEWS[ROLE] || {} : {}), ...(CENTER ? NEWS.center : {}) };
}
// 경로(영역 또는 영역/세부)에 새 소식이 있는지: 영역이면 그 아래 세부 중 하나라도
function hasNews(path) {
  const keys = newsKeys();
  return Object.keys(keys).some(k => (k === path || k.startsWith(`${path}/`)) && newsIn(k, keys[k]));
}
function newsIn(k, fn) {
  let list = [];
  try { list = fn() || []; } catch (e) { return false; }
  const seen = SEEN[k] || SEEN_BASE;
  return list.some(t => t && new Date(t) > new Date(seen));
}
// 종 모양: 새 소식이 있는 메뉴 모아 보기
function newsList() {
  const keys = newsKeys();
  return Object.keys(keys).filter(k => newsIn(k, keys[k])).map(k => {
    const [aid, sid] = k.split('/'), a = MY && MY[aid];
    if (!a) return null;
    const s = sid && a.subs ? a.subs[sid] : null;
    if (sid && !s) return null;
    return [k, s ? `${a.name} › ${s.name}` : a.name, (s || a).icon];
  }).filter(Boolean);
}
function renderBell() {
  const bell = $('#bell'), pop = $('#bellPop');
  if (!bell) return;
  const list = newsList();
  bell.querySelector('.dot').hidden = !list.length && !msgUnread();
  const items = (msgUnread() ? [['messages', `메신저 · 안 읽은 메시지 ${msgUnread()}개`, 'chat']] : []).concat(list);
  pop.innerHTML = `<b class="bp-title">새 소식</b>${items.length ? items.map(([k, l, i]) => `<a href="#${k}">${ic(i)}<span>${esc(l)}</span><span class="ndot"></span></a>`).join('')
    : '<p class="muted small">새 소식이 없어요. 새로 올라오면 메뉴 옆에 빨간 점이 생겨요.</p>'}`;
  bell.onclick = e => { e.stopPropagation(); pop.hidden = !pop.hidden; };
  pop.onclick = e => { if (e.target.closest('a')) pop.hidden = true; };
  if (!document.bellClose) { document.bellClose = true; document.addEventListener('click', e => { if (!e.target.closest('#bellPop')) $('#bellPop').hidden = true; }); }
}
const ndot = path => hasNews(path) ? '<span class="ndot" title="새 소식"></span>' : '';
async function loadSeen() {
  if (USER) {
    const { data } = await SB.from('user_seen').select('key, seen_at');
    SEEN = Object.fromEntries((data || []).map(r => [r.key, r.seen_at]));
  } else {
    try { SEEN = JSON.parse(sessionStorage.getItem('asc-seen') || '{}'); } catch (e) { SEEN = {}; }
  }
}
// 연 화면의 점을 지워요 (영역 첫 화면은 세부가 따로 있으면 그대로 두고, 세부를 열어야 지워져요)
function markSeen(path) {
  const keys = newsKeys();
  if (!keys[path]) return;
  const now = new Date().toISOString(), had = newsIn(path, keys[path]);
  SEEN[path] = now;
  if (!had && SEEN_WROTE[path] && Date.now() - SEEN_WROTE[path] < 60e3) return;
  SEEN_WROTE[path] = Date.now();
  if (USER) SB.from('user_seen').upsert({ key: path, seen_at: now }).then(() => {});
  else try { sessionStorage.setItem('asc-seen', JSON.stringify(SEEN)); } catch (e) { /* 저장 못 해도 이번 화면에선 사라져요 */ }
}

/* ---------- 홈 ---------- */
function tiles() {
  return `<div class="tiles ${Object.keys(MY).length === 5 ? 'five' : ''}">${Object.entries(MY).map(([id, a]) => `
    <a class="tile" href="#${id}">
      <span class="tile-ic">${ic(a.icon)}</span>
      <b>${a.name}${ndot(id)}</b>
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
  if (ROLE === 'admin') {
    return head(`${ME.name} 님, 안녕하세요`, `${DATA.today} · 학원지원센터 본부 화면이에요.`) + todo(centerTodo()) +
      `<h2 class="sec-title">센터 관리</h2>` + subTiles('center', CENTER_AREA) +
      `<a class="hint" href="#" data-act="pickRole">${ic('users')}<span>원장·강사로 학원 프로그램도 쓰시려면 학원을 연결해 주세요</span><b>학원 연결하기 →</b></a>`;
  }
  if (ROLE === 'owner') {
    const urgent = DATA.leads.filter(l => l.urgent).length;
    return head(`안녕하세요, ${ME.name} 원장님`, `${DATA.today} · 학원 운영에 필요한 지원을 다섯 가지로 묶었어요.`) +
      todo(REAL ? realOwnerTodo() : [
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
        .concat(apvData().filter(a => a.status !== 'pending' && a.decided_at && dday(a.decided_at.slice(0, 10)) >= -3).slice(0, 2)
          .map(a => [`결재 ${APV_STATE[a.status][1]}: ${esc(a.title)}`, a.owner_comment ? esc(a.owner_comment) : '원장님이 결재했어요', '#approvals', `<span class="chip ${APV_STATE[a.status][0]}">${APV_STATE[a.status][1]}</span>`]))
        .concat(REAL ? scheduleTodo() : [])
        .concat([['오늘 수업 출결 입력', REAL ? `원생 ${REAL.students.length}명 · 수업 중에 바로 체크해 주세요` : '초등 B반 17:00 · 수업 중에 입력해 주세요', '#attend', '<span class="chip info">오늘</span>']])) +
      `<h2 class="sec-title">바로 가기</h2>` + tiles();
  }
  if (REAL && (ROLE === 'parent' || ROLE === 'student')) {
    const names = REAL.kids.map(k => `${esc(k.name)}${k.grade ? `(${esc(k.grade)})` : ''}`).join(' · ');
    return head(ROLE === 'student' ? `${ME.name}, 오늘도 힘내요!` : `${ME.name} 님, 안녕하세요`,
      `${DATA.today} · ${esc(REAL.academy.name)}${names && ROLE === 'parent' ? ` · ${names}` : ''}`) +
      todayTodoCard() + todo(familyTodo()) + `<h2 class="sec-title">바로 가기</h2>` + tiles();
  }
  if (ROLE === 'parent') {
    const c = DATA.child;
    const promos = abroadData().promos.filter(p => p.active).slice(0, 1)
      .map(p => [esc(p.title), `${esc(p.program)} · 학원에서 안내한 유학 프로그램`, '#abroad', '<span class="chip info">상담 신청</span>']);
    return head(`${ME.name} 님, 안녕하세요`, `${DATA.today} · ${c.name}(${c.grade})의 학원 ${c.academies}곳을 한 화면에서 봐요.`) +
      todo([...promos,
        ['10월 하늘영어학원 수강료', '300,000원 · 오늘까지', '#kid/bills', '<span class="chip crit">D-0</span>'],
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
  const intro = AREA_INTRO[id];
  return head(a.name, a.desc) + subTiles(id, a) + (intro ? intro() : '');
}

/* ---------- 분야 설명: 제휴(MOU) · 홍보 지원은 어떻게 쓰는지 프로그램 안에서도 자세히 ---------- */
const flowSteps = steps => `<ol class="flow">${steps.map(([t, d], i) => `<li><span class="n">${i + 1}</span><b>${t}</b><span>${d}</span></li>`).join('')}</ol>`;
const qaList = qs => `<div class="qa">${qs.map(([q, a]) => `<details><summary>${q}</summary><p>${a}</p></details>`).join('')}</div>`;
const AREA_INTRO = {
  mou: () => `
  <h2 class="sec-title">제휴(MOU)는 이렇게 써요</h2>
  <section class="card intro">
    <p class="intro-lead">학원지원센터가 유학 · 캠프 · 교재 · 결제 · 보험 업체와 <b>미리 제휴를 맺어 두었어요.</b> 원장님은 따로 협상하거나 계약서를 쓸 필요 없이 신청만 하면 센터가 담당자와 이어 드려요.</p>
    ${flowSteps([['제휴처 둘러보기', '분야별로 혜택과 조건을 봐요'], ['바로 신청', '학원 이름 · 연락처가 함께 전달돼요'], ['센터가 연결', '센터 담당자가 확인하고 제휴처와 이어 드려요'], ['이용 · 혜택', '진행 상황은 "내 제휴"에서 봐요']])}
  </section>
  <section class="card intro partner-intro">
    <div class="p-head"><img src="assets/brand/intoyuhak-logo.png" alt="인투유학" class="p-logo"><div><span class="chip info">유학 제휴 파트너</span><h3>인투유학</h3><p class="muted small">방학 영어캠프부터 해외 대학 진학까지, 학원 학생 · 학부모의 유학을 상담해요.</p></div></div>
    <div class="prog">${[['plane', '방학 영어캠프', '여름 · 겨울 방학 단기 캠프'], ['grad', '조기유학', '초 · 중 · 고 학기 유학'], ['globe', '어학연수', '단기 · 장기 어학연수'], ['star', '해외 대학 진학', '지원 전략 · 서류 준비'], ['chat', '유학 설명회', '학원에서 여는 학부모 설명회']].map(([i, t, d]) => `<div><span class="ic">${ic(i)}</span><b>${t}</b><span>${d}</span></div>`).join('')}</div>
    <h4>학부모 유학 상담은 이렇게 이어져요</h4>
    ${flowSteps([['원장님이 안내 올리기', '"유학 상담 → 안내 올리기"로 학부모 앱에 보여요'], ['학부모가 상담 신청', '학부모 · 학생 앱 "유학 프로그램"에서 신청'], ['원장님 확인', '신청 내용을 보고 센터로 넘겨요'], ['인투유학 상담', '센터가 인투유학 상담사와 바로 연결해요']])}
    <div class="row-btns"><a class="btn primary" href="#mou/abroad">유학 상담 열기</a><a class="btn" href="${DATA.abroadUrl}" target="_blank" rel="noopener">인투유학 사이트 ${ic('ext')}</a></div>
  </section>
  ${qaList([['제휴 신청에 돈이 드나요?', '센터를 통한 연결은 따로 비용이 없어요. 제휴처를 이용할 때의 가격 · 할인은 제휴처마다 달라서 "제휴처 둘러보기"에 적어 두었어요.'],
    ['신청하면 얼마나 걸려요?', '센터 담당자가 확인하고 보통 1~2일 안에 연락드려요. 단계가 바뀌면 "내 제휴"에 바로 보여요.'],
    ['원하는 제휴처가 없어요', '센터 담당 매니저에게 말씀해 주세요. 원장님들이 많이 찾는 곳은 센터가 새로 제휴를 맺어요.']])}`,
  promo: () => `
  <h2 class="sec-title">홍보 지원은 이렇게 써요</h2>
  <section class="card intro partner-intro">
    <div class="p-head"><span class="p-word">인투<b>마케팅</b></span><div><span class="chip info">공식 홍보 파트너</span><h3>인투마케팅</h3><p class="muted small">학원 홍보를 전문으로 하는 마케팅 팀이에요. 블로그 · 디자인 · 영상 · SNS 광고를 맡아요.</p></div></div>
    <div class="prog">${DATA.promoServices.map(x => `<div><span class="ic">${ic(x.icon)}</span><b>${x.name}</b><span>${x.items.slice(0, 2).join(' · ')}</span></div>`).join('')}</div>
    ${flowSteps([['서비스 골라 의뢰', '필요한 작업 · 원하는 날짜를 적어요'], ['센터가 연결', '센터가 확인하고 인투마케팅 담당자와 이어 드려요'], ['상담 · 견적', '담당자가 연락해 내용과 비용을 정해요'], ['작업 · 시안 확인', '시안이 나오면 "의뢰 현황"에서 확인해요'], ['완료', '결과물을 받고 마무리해요']])}
    <div class="row-btns"><a class="btn primary" href="#promo/services">의뢰하러 가기</a><a class="btn" href="${MK}" target="_blank" rel="noopener">인투마케팅 사이트 ${ic('ext')}</a></div>
  </section>
  ${qaList([['강사도 의뢰할 수 있나요?', '네. 강사님도 맡은 반 특강 · 설명회 홍보를 직접 의뢰할 수 있어요. 원장님은 강사님이 무엇을 의뢰했는지 "의뢰 현황"에서 모두 볼 수 있어요.'],
    ['비용은 어떻게 정해져요?', '작업 내용에 따라 달라서, 인투마케팅 담당자가 상담하면서 견적을 안내해요. 견적을 보고 진행 여부를 정하면 돼요.'],
    ['의뢰를 취소할 수 있나요?', '센터가 연결하기 전(접수 단계)이면 "의뢰 현황"에서 바로 취소할 수 있어요.']])}`
};
function subTiles(id, a) {
  return `<div class="tiles">${Object.entries(a.subs).map(([sid, s]) => `
    <a class="tile" href="#${id}/${sid}">
      <span class="tile-ic">${ic(s.icon)}</span>
      <b>${s.name}${ndot(`${id}/${sid}`)}</b>
      <span class="d">${s.desc}</span>
      <span class="stat-line">${s.stat()}</span>
      <span class="go">열기 →</span>
    </a>`).join('')}</div>`;
}

const trainingTitle = id => { const t = DATA.training.find(x => x.id === id); return t ? t.rawTitle || t.title : ''; };
const notFound = () => head('페이지를 찾을 수 없어요', '') + '<a class="btn" href="#home">홈으로</a>';

/* ---------- 경로 해석 ---------- */
function resolve(parts) {
  const [aid, sid, item] = parts;
  const crumbs = [['홈', '#home']];
  if (SEEKER && (aid === 'home' || !aid)) return resolve(['jobs']);
  if (aid === 'home' || !aid) return { html: home(), crumbs: [], area: 'home' };
  const a = MY[aid];
  if (!a) return { html: notFound(), crumbs, area: '' };
  crumbs.push([a.name, `#${aid}`]);
  if (!a.subs) {
    // 하위 메뉴가 없는 영역: #영역 → #영역/항목
    if (sid && a.detail) {
      crumbs.push([(a.title || trainingTitle)(sid) || '', '']);
      return { html: a.detail(sid), crumbs, area: aid };
    }
    return { html: a.render(), crumbs, area: aid };
  }
  if (!sid) return { html: areaIndex(aid, a), crumbs, area: aid };
  const s = a.subs[sid];
  if (!s) return { html: notFound(), crumbs, area: aid };
  crumbs.push([s.name, `#${aid}/${sid}`]);
  if (item && s.detail) {
    crumbs.push([(s.title || trainingTitle)(item) || '', '']);
    return { html: s.detail(item), crumbs, area: aid };
  }
  return { html: s.render(), crumbs, area: aid };
}

function renderChrome(area) {
  $('#acad').innerHTML = ROLE === 'admin'
    ? '<span class="dot">센</span><div><b>학원지원센터 본부</b><span>센터 관리자</span></div>'
    : SEEKER ? '<span class="dot">강</span><div><b>학원 연결 전</b><span>채용 공고를 볼 수 있어요</span></div>'
    : REAL && (ROLE === 'parent' || ROLE === 'student')
    ? (REAL.kids.length ? `<span class="dot">${esc(kidNow().name[0])}</span><div><b>${esc(kidNow().name)}${kidNow().grade ? ` (${esc(kidNow().grade)})` : ''}</b><span>${DATA.academy.name}${REAL.kids.length > 1 ? ` · 아이 ${REAL.kids.length}명` : ''}</span></div>`
      : `<span class="dot">${DATA.academy.short}</span><div><b>${DATA.academy.name}</b><span>아이 연결 전</span></div>`)
    : ROLE === 'parent' || ROLE === 'student'
    ? `<span class="dot">${DATA.child.name[1]}</span><div><b>${DATA.child.name} (${DATA.child.grade})</b><span>학원 ${DATA.child.academies}곳</span></div>`
    : `<span class="dot">${DATA.academy.short}</span><div><b>${DATA.academy.name}</b><span>${DATA.academy.area} · 원생 ${DATA.academy.students}명</span></div>`;
  // 숫자 배지는 아직 예시 데이터라 실제 로그인에서는 숨겨요
  const badge = REAL || USER ? { messages: msgUnread() } : {
    members: DATA.leads.filter(l => l.urgent).length,
    learn: DATA.training.filter(t => t.status[ME.name] !== 'done').length,
    messages: msgUnread()
  };
  const items = [...(SEEKER ? [] : [['home', '홈', 'home']]), ...Object.entries(MY).map(([id, a]) => [id, a.name, a.icon])];
  $('#nav').innerHTML = items.map(([id, label, icon]) => `
    <a class="nav-item ${id === area ? 'on' : ''}" href="#${id}">${ic(icon)}<span>${label}</span>${badge[id] && (ROLE !== 'parent' || id === 'messages') ? `<span class="badge">${badge[id]}</span>` : id !== 'home' && hasNews(id) ? '<span class="ndot nav-dot" title="새 소식"></span>' : ''}</a>`).join('');
  $('#me').innerHTML = `<span class="av" style="background:${ME.color}">${ME.av}</span><div><b>${ME.name}</b><span>${ME.label}</span></div><a href="index.html" id="logout">로그아웃</a>`;
  $('#logout').onclick = async e => {
    if (!PROFILE || !SB) return;
    e.preventDefault(); await SB.auth.signOut(); location.href = 'index.html';
  };
  renderBell();
  const foot = $('#adminApply');
  if (foot) { foot.hidden = !(PROFILE && USER && !CENTER); foot.innerHTML = adminApplyLink(true); bindAdminApplyLink(); }
  document.title = `${ROLE === 'admin' ? '센터 관리' : ROLE === 'owner' || ROLE === 'teacher' ? DATA.academy.name : ME.name} — 학원지원센터`;
}

function render() {
  const parts = (location.hash || '#home').slice(1).split('/');
  const r = resolve(parts);
  markSeen(parts.slice(0, 2).join('/'));
  renderChrome(r.area);
  // "← 이전": 바로 전에 본 화면으로 한 단계만 (처음 연 화면이면 한 단계 위로)
  const up = r.crumbs.length > 1 ? r.crumbs[r.crumbs.length - 2][1] : '';
  const crumbs = r.crumbs.length ? `<div class="crumb-row"><button class="btn sm back-btn" type="button" data-back="${up}">‹ 이전</button><nav class="crumbs">${r.crumbs.map(([l, h], i) =>
    i < r.crumbs.length - 1 ? `<a href="${h}" data-up>${esc(l)}</a><span>›</span>` : `<b>${esc(l)}</b>`).join('')}</nav></div>` : '';
  // 실제 데이터로 연결된 화면이 아니면 "예시"라고 알려 줘요
  const REAL_PAGES = {
    owner: ['home', 'admin', 'teachers', 'members', 'messages', 'schedule', 'library', 'mou', 'promo', 'center'],
    teacher: ['home', 'attend', 'students', 'messages', 'schedule', 'todos', 'reports', 'library', 'learn', 'jobs', 'approvals', 'promo', 'center'], parent: ['home', 'kid', 'schedule', 'news', 'messages', 'library', 'abroad', 'center'], student: ['home', 'todos', 'messages', 'schedule', 'reports', 'attend', 'news', 'library', 'center'], admin: ['home', 'center', 'messages']
  };
  const path = parts.join('/') || 'home';
  const isReal = path === 'members' || (REAL_PAGES[ROLE] || []).some(p => path === p || path.startsWith(`${p}/`));
  const note = PROFILE && !isReal ? `<div class="demo-note">${ROLE === 'owner'
    ? '이 화면은 아직 예시예요.'
    : '지금 보이는 내용은 아직 예시예요. 실제 데이터는 차례로 연결돼요.'}</div>` : '';
  $('#view').innerHTML = note + crumbs + r.html;
  bind();
  $('#side').classList.remove('open');
}

/* ---------- 버튼 동작 ---------- */
function on(sel, fn) { document.querySelectorAll(sel).forEach(el => el.onclick = e => fn(el, e)); }

function bind() {
  // 원생 명단 · 초대 코드 (실제 데이터)
  on('[data-act="addStudent"]', () => REAL ? studentDialog(null) : toast('예시 계정에서는 추가할 수 없어요'));
  on('[data-edit-student]', b => studentDialog(REAL.students.find(s => s.id === b.dataset.editStudent)));
  on('[data-copy]', b => navigator.clipboard.writeText(b.dataset.copy).then(() => toast('코드를 복사했어요'), () => toast(b.dataset.copy)));
  // 행정 지원 (실제 데이터)
  on('[data-month]', b => { const n = +b.dataset.month; MONTH = n ? shiftMonth(MONTH, n) : TODAY.slice(0, 7); render(); });
  const goDay = async d => { if (!d) return; await loadAttendance(d); render(); };
  on('[data-day]', b => { const n = +b.dataset.day, d = day0(REAL.attend.day); d.setDate(d.getDate() + n); goDay(n ? ymd(d) : TODAY); });
  const dayInput = $('#attDay');
  if (dayInput) dayInput.onchange = () => goDay(dayInput.value);
  on('[data-att]', b => { const [id, k] = b.dataset.att.split(':'); markAttendance([id], REAL.attend.map[id] === k ? null : k); });
  on('[data-att-rest]', b => markAttendance(REAL.students.filter(s => (s.class_name || '반 미지정') === b.dataset.attRest && !REAL.attend.map[s.id]).map(s => s.id), 'present'));
  on('[data-act="billMonth"]', billMonthDialog);
  on('[data-act="addPlan"]', () => planDialog(null));
  on('[data-edit-plan]', b => planDialog(REAL.plans.find(p => p.id === b.dataset.editPlan)));
  on('[data-act="applyPlan"]', () => REAL.students.length ? applyPlanDialog() : toast('먼저 원생을 추가해 주세요'));
  on('[data-act="addInvoice"]', () => REAL.students.length ? invoiceDialog(null) : billMonthDialog());
  on('[data-edit-inv]', b => invoiceDialog(REAL.invoices.find(i => i.id === b.dataset.editInv)));
  on('[data-pay-inv]', b => payInvoice(b.dataset.payInv));
  on('[data-copy-inv]', b => copyText(invNotice(REAL.invoices.find(i => i.id === b.dataset.copyInv)), '안내 문구를 복사했어요 · 문자나 카톡에 붙여 넣으세요'));
  on('[data-act="copyAllInv"]', () => {
    const list = REAL.invoices.filter(i => i.month === MONTH && !i.paid_at);
    copyText(list.map(invNotice).join('\n\n'), `미납 ${list.length}건 안내 문구를 복사했어요`);
  });
  on('[data-act="addExpense"]', () => expenseDialog(null));
  on('[data-import]', b => REAL ? importDialog(b.dataset.import) : toast('예시 계정에서는 올릴 수 없어요'));
  on('[data-act="addIncome"]', () => incomeDialog(null));
  on('[data-act="finXlsx"]', finXlsx);
  on('[data-fin]', b => { FIN = b.dataset.fin; render(); });
  const ff = $('#finFrom'), ft = $('#finTo');
  if (ff) ff.onchange = () => { if (!ff.value) return; FIN_FROM = ff.value; const r = customRange(); FIN_TO = r.to; render(); };
  if (ft) ft.onchange = () => { if (!ft.value) return; FIN_TO = ft.value; const r = customRange(); if (r.to !== ft.value) toast('최대 1년까지 볼 수 있어서 끝 날을 맞췄어요'); FIN_TO = r.to; render(); };
  on('[data-ledger]', (b, e) => {
    e.preventDefault();
    const [src, id] = b.dataset.ledger.split(':');
    if (src === 'exp') expenseDialog(REAL.expenses.find(x => x.id === id));
    else if (src === 'inc') incomeDialog(REAL.incomes.find(x => x.id === id));
    else invoiceDialog(REAL.invoices.find(x => x.id === id));
  });
  on('[data-act="addPaper"]', () => paperDialog(null));
  on('[data-act="presetPaper"]', addPaperPresets);
  on('[data-add-sug]', b => addSuggestions([b.dataset.addSug]));
  on('[data-act="addAllSug"]', () => addSuggestions(paperSuggestions().map(x => x[0])));
  on('[data-make-doc]', b => REAL ? makePaperDoc(b.dataset.makeDoc) : toast('예시 계정에서는 만들 수 없어요'));
  on('[data-edit-paper]', b => paperDialog(REAL.paperwork.find(p => p.id === b.dataset.editPaper)));
  on('[data-paper-step]', b => { const [id, s] = b.dataset.paperStep.split(':'); stepPaper(id, s); });
  // 수납 (데모)
  on('[data-remind]', b => { DATA.unpaid[b.dataset.remind].sent = true; render(); toast('납부 안내를 보냈어요'); });
  on('[data-act="remindAll"]', () => { DATA.unpaid.forEach(u => u.sent = true); render(); toast(`미납 ${DATA.unpaid.length}가정에 안내를 보냈어요`); });
  // 서류
  on('[data-paper]', b => { const p = DATA.paperwork[b.dataset.paper]; p.status = 'done'; render(); toast(`${p.title} 서류를 제출했어요`); });
  // 강사 교육
  on('[data-nudge]', () => toast('미이수 강사에게 알림을 보냈어요'));
  const submit = $('#reflectSubmit');
  if (submit) submit.onclick = async () => {
    const text = $('#reflectText').value.trim();
    if (!text) { toast('리플렉션을 적어 주세요'); return; }
    const t = DATA.training.find(x => x.id === location.hash.split('/').pop());
    if (REAL) {
      const again = !!t.myRefl;
      submit.disabled = true;
      const { error } = again
        ? await SB.from('training_reflections').update({ body: text }).eq('video_id', t.id).eq('user_id', USER.id)
        : await SB.from('training_reflections').insert({ video_id: t.id, body: text });
      submit.disabled = false;
      if (error) { toast('제출하지 못했어요. 다시 시도해 주세요.'); return; }
      editingReflect = false; await loadTraining(); render(); toast(again ? '리플렉션을 고쳤어요' : '제출했어요 · 이수 완료');
      return;
    }
    t.myRefl = { at: md(TODAY), text };
    if (ROLE === 'teacher') t.status[ME.name] = 'done';
    editingReflect = false; render(); toast('제출했어요 · 이수 완료');
  };
  // 채용 (실제 데이터)
  on('[data-edit-job]', b => jobDialog(REAL.jobs.find(j => j.id === b.dataset.editJob)));
  on('[data-app-step]', b => { const [j, u, st] = b.dataset.appStep.split(':'); stepApplicant(j, u, st); });
  on('[data-cancel-app]', async b => {
    if (!confirm('지원을 취소할까요?')) return;
    const { error } = await SB.from('job_applications').delete().eq('job_id', b.dataset.cancelApp).eq('user_id', USER.id);
    if (error) { toast('취소하지 못했어요'); return; }
    await loadJobBoard(); render(); toast('지원을 취소했어요');
  });
  on('[data-act="joinAcademy"]', (b, e) => { e.preventDefault(); onboarding(USER); });
  // 제휴 · 유학 (실제 데이터)
  on('[data-cancel-partner]', async b => {
    if (!confirm('제휴 신청을 취소할까요?')) return;
    const { error } = await SB.from('partner_applications').delete().eq('id', b.dataset.cancelPartner);
    if (error) { toast('취소하지 못했어요'); return; }
    await loadPartnerApps(); render(); toast('신청을 취소했어요');
  });
  on('[data-act="addPromo"]', () => promoDialog(null));
  on('[data-edit-promo]', (b, e) => { e.preventDefault(); promoDialog(abroadData().promos.find(p => p.id === b.dataset.editPromo)); });
  on('[data-edit-ab]', b => abroadMemoDialog(abroadData().requests.find(r => r.id === b.dataset.editAb)));
  on('[data-ab-step]', b => { const [id, st] = b.dataset.abStep.split(':'); stepAbroad(id, st, abroadData().requests, loadAbroad); });
  on('[data-ab-apply]', b => abroadApplyDialog(abroadData().promos.find(p => p.id === b.dataset.abApply) || null));
  // 센터: 제휴 신청 · 유학 상담
  on('[data-pa-filter]', b => { paFilter = b.dataset.paFilter; render(); });
  on('[data-pa-step]', b => { const [id, st] = b.dataset.paStep.split(':'); stepPartnerApp(id, st); });
  on('[data-edit-pa]', b => partnerAppDialog(CENTER.partnerApps.find(a => a.id === b.dataset.editPa)));
  on('[data-cab-step]', b => { const [id, st] = b.dataset.cabStep.split(':'); stepAbroad(id, st, CENTER.abroad, loadCenter); });
  on('[data-edit-cab]', b => centerAbroadDialog(CENTER.abroad.find(r => r.id === b.dataset.editCab)));
  on('[data-act="editReflect"]', () => { editingReflect = true; render(); });
  // 센터 관리
  on('[data-act="addVideo"]', () => videoDialog(null));
  on('[data-edit-video]', b => videoDialog(CENTER.videos.find(v => v.id === b.dataset.editVideo)));
  on('[data-req-filter]', b => { reqFilter = b.dataset.reqFilter; render(); });
  on('[data-req-step]', b => { const [id, st] = b.dataset.reqStep.split(':'); stepRequest(id, st); });
  on('[data-edit-req]', b => requestDialog(CENTER.requests.find(r => r.id === b.dataset.editReq)));
  on('[data-rm-admin]', async b => {
    if (!confirm(`${b.dataset.rmAdmin} 님을 관리자에서 뺄까요?`)) return;
    const { error } = await SB.rpc('remove_center_admin', { p_email: b.dataset.rmAdmin });
    if (error) { toast(adminError(error)); return; }
    await loadCenter(); render(); toast('관리자에서 뺐어요');
  });
  const adminAdd = $('#adminAdd');
  if (adminAdd) adminAdd.onsubmit = async e => {
    e.preventDefault();
    const el = adminAdd.elements, who = el.who.value.trim(), msg = $('#adminMsg');
    if (!who) { msg.textContent = '이메일이나 아이디를 적어 주세요.'; msg.hidden = false; return; }
    const { error } = await SB.rpc('add_center_admin', { p_who: who, p_name: el.name.value.trim() || null });
    if (error) { msg.textContent = adminError(error); msg.hidden = false; return; }
    await loadCenter(); render(); toast(`${who} 님을 관리자로 추가했어요`);
  };
  on('[data-adm-app]', async b => {
    const [id, ok] = b.dataset.admApp.split(':'), a = CENTER.adminApps.find(x => x.id === id);
    const nm = a.name || a.email.split('@')[0];
    if (!confirm(ok === '1' ? `${nm} 님을 센터 관리자로 수락할까요? 수락하면 센터 관리 화면을 모두 쓸 수 있어요.` : `${nm} 님의 신청을 거절할까요?`)) return;
    const { error } = await SB.rpc('decide_admin_application', { p_id: id, p_ok: ok === '1' });
    if (error) { toast(adminError(error)); return; }
    await loadCenter(); render(); toast(ok === '1' ? `${nm} 님이 관리자가 됐어요` : '신청을 거절했어요');
  });
  on('[data-act="pickRole"]', (b, e) => { e.preventDefault(); PROFILE.role ? onboarding(USER) : rolePicker(USER); });
  // 채용
  on('[data-act="newJob"]', () => {
    if (REAL) return jobDialog(null);
    const title = prompt('공고 제목을 입력하세요', '중등 영어 강사 (파트타임)');
    if (!title) return;
    DATA.jobs.unshift({ id: 'j' + Date.now(), academy: DATA.academy.name, mine: true, title, area: DATA.academy.area, type: '파트타임', pay: '협의', hours: '협의', due: '11/25', applicants: [] });
    render(); toast('센터 채용 게시판에 공고를 올렸어요');
  });
  on('[data-interview]', b => { const [jid, i] = b.dataset.interview.split(':'); const a = DATA.jobs.find(j => j.id === jid).applicants[i]; a.step = '면접 제안 보냄'; render(); toast(`${a.name} 님께 면접을 제안했어요`); });
  on('[data-applyjob]', b => {
    if (JOBS) return applyJobDialog(JOBS.posts.find(x => x.id === b.dataset.applyjob));
    const j = DATA.jobs.find(x => x.id === b.dataset.applyjob); j.applied = true; render(); toast(`${j.academy}에 지원서를 보냈어요`); });
  // 제휴
  on('[data-cat]', b => { partnerCat = b.dataset.cat; render(); });
  on('[data-job-field]', b => { jobField = b.dataset.jobField; render(); });
  on('[data-apply]', b => { const p = DATA.partners.find(x => x.id === b.dataset.apply); if (REAL) return partnerApplyDialog(p); p.status = 'applied'; render(); toast(`${p.name} 제휴를 신청했어요 · 센터가 1일 안에 연결해 드려요`); });
  // 학생·학부모
  on('[data-link-student]', b => linkDialog(REAL.students.find(s => s.id === b.dataset.linkStudent)));
  on('[data-edit-notice]', b => noticeDialog(REAL.notices.find(n => n.id === b.dataset.editNotice)));
  on('[data-copy-notice]', b => {
    const n = REAL.notices.find(x => x.id === b.dataset.copyNotice);
    copyText(`[${REAL.academy.name}] "${n.title}" 공지를 학원지원센터 앱 "학원 소식"에 올렸어요. 꼭 확인해 주세요!`, '안내 문구를 복사했어요 · 문자나 카톡에 붙여 넣으세요');
  });
  // 홍보 의뢰 (실제 데이터)
  on('[data-mk-req]', b => promoReqDialog(b.dataset.mkReq));
  on('[data-cancel-mk]', async b => {
    if (!confirm('홍보 의뢰를 취소할까요?')) return;
    const { error } = await SB.from('promo_requests').delete().eq('id', b.dataset.cancelMk);
    if (error) { toast('취소하지 못했어요'); return; }
    await loadPromoReqs(); render(); toast('의뢰를 취소했어요');
  });
  on('[data-mk-filter]', b => { mkFilter = b.dataset.mkFilter; render(); });
  on('[data-mk-who]', b => { mkWho = b.dataset.mkWho; render(); });
  // 메신저
  on('[data-act="newChat"]', newChatDialog);
  const chatForm = $('#chatSend');
  if (chatForm) {
    const id = location.hash.split('/')[1], ta = chatForm.elements.body;
    const go = async () => { const t = ta.value.trim(); if (!t) return; ta.disabled = true; const ok = await sendMessage(id, t); ta.disabled = false; if (ok) ta.value = ''; ta.focus(); };
    chatForm.onsubmit = e => { e.preventDefault(); if (USER) go(); else toast('예시 계정에서는 보낼 수 없어요'); };
    ta.onkeydown = e => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); chatForm.requestSubmit(); } };
    ta.oninput = () => { ta.style.height = 'auto'; ta.style.height = `${Math.min(140, ta.scrollHeight)}px`; };
    const log = $('#chatLog'); if (log) log.scrollTop = log.scrollHeight;
  }
  // 자료실
  on('[data-act="addLib"]', () => libDialog(null));
  on('[data-edit-lib]', b => libDialog(REAL.library.find(x => x.id === b.dataset.editLib)));
  on('[data-lib-cat]', b => { libCat = b.dataset.libCat; render(); });
  on('[data-lib-vis]', b => { libVis = b.dataset.libVis; render(); });
  on('[data-lib-open]', b => REAL ? openLib(b.dataset.libOpen, false) : toast('예시 자료예요'));
  on('[data-lib-down]', b => REAL ? openLib(b.dataset.libDown, true) : toast('예시 자료예요'));
  // 성장 리포트
  on('[data-act="newReport"]', newReportDialog);
  on('[data-act="printReport"]', () => window.print());
  on('[data-rp-edit]', b => { rpEditing = b.dataset.rpEdit; render(); });
  const rpForm = $('#rpForm');
  if (rpForm) {
    const r = REAL.reports.find(x => location.hash.endsWith(x.id));
    rpForm.onsubmit = e => { e.preventDefault(); saveReport(r, e.submitter ? e.submitter.dataset.save : 'draft'); };
    rpForm.querySelectorAll('[data-rate]').forEach(g => g.querySelectorAll('button').forEach(btn => btn.onclick = () => {
      const v = +btn.dataset.v, inp = rpForm.elements[`r_${g.dataset.rate}`], nv = +inp.value === v ? 0 : v;
      inp.value = nv || ''; g.querySelectorAll('button').forEach(x => x.classList.toggle('on', +x.dataset.v <= nv));
    }));
    on('[data-act="addScoreRow"]', () => {
      const box = $('#rpScores'), i = box.children.length;
      if (i >= 20) return;
      box.insertAdjacentHTML('beforeend', `<div class="sc-row"><input name="sub${i}" maxlength="30" placeholder="과목"><input name="sco${i}" maxlength="10" placeholder="점수 · 등급"><input name="not${i}" maxlength="100" placeholder="메모"></div>`);
    });
    on('[data-act="delReport"]', async () => {
      if (!confirm('이 리포트를 삭제할까요?')) return;
      const { error } = await SB.from('growth_reports').delete().eq('id', r.id);
      if (error) { toast('삭제하지 못했어요'); return; }
      await loadReports(); location.hash = `#${reportBase()}`; toast('삭제했어요');
    });
    on('[data-act="unissueReport"]', async () => {
      if (!confirm('발급을 취소할까요? 학부모 · 학생 화면에서 사라져요.')) return;
      const { error } = await SB.from('growth_reports').update({ status: 'draft' }).eq('id', r.id);
      if (error) { toast('바꾸지 못했어요'); return; }
      rpEditing = null; await loadReports(); render(); toast('발급을 취소했어요 · 작성 중으로 돌아갔어요');
    });
  }
  on('[data-act="copyReport"]', () => {
    const r = REAL.reports.find(x => location.hash.endsWith(x.id));
    copyText(`[${REAL.academy.name}] ${r.student_name} 학생 "${r.title}"를 발급했어요. 학원지원센터 앱 "성장 리포트"에서 확인하고 PDF로 저장할 수 있어요.`, '안내 문구를 복사했어요 · 문자나 카톡에 붙여 넣으세요');
  });
  // 학생 할 일
  document.querySelectorAll('[data-todo]').forEach(c => c.onchange = () => checkTodo(c.dataset.todo, c.checked));
  on('[data-del-todo]', async (b, e) => {
    e.preventDefault();
    const { error } = await SB.from('student_todos').delete().eq('id', b.dataset.delTodo);
    if (error) { toast('지우지 못했어요'); return; }
    await loadTodos(REAL.todoDay); render(); toast('지웠어요');
  });
  const goTodo = async d => { if (!d) return; await loadTodos(d); render(); };
  on('[data-todo-day]', b => { const n = +b.dataset.todoDay; goTodo(n ? addDays(REAL.todoDay, n) : TODAY); });
  const todoDayIn = $('#todoDay');
  if (todoDayIn) todoDayIn.onchange = () => goTodo(todoDayIn.value);
  on('[data-todo-pick]', b => { const i = $('#todoAdd [name="title"]'); i.value = b.dataset.todoPick; i.focus(); });
  const todoAdd = $('#todoAdd');
  if (todoAdd) todoAdd.onsubmit = async e => {
    e.preventDefault();
    const el = todoAdd.elements, title = el.title.value.trim();
    if (!title) { toast('할 일을 적어 주세요'); return; }
    await addTodos(el.who ? el.who.value : '', title);
  };
  // 일정 · 시간표
  on('[data-sch-view]', b => { SCH_VIEW = b.dataset.schView; render(); });
  on('[data-sch-week]', b => { const n = +b.dataset.schWeek; SCH_WEEK = n ? addDays(SCH_WEEK || mondayOf(TODAY), n * 7) : null; render(); });
  const wp = $('#schWeekPick');
  if (wp) wp.onchange = () => { if (wp.value) { SCH_WEEK = mondayOf(wp.value); render(); } };
  on('[data-sch-class]', b => { SCH_CLASS = b.dataset.schClass; render(); });
  on('[data-act="addTT"]', () => REAL ? ttDialog(null) : toast('예시 계정에서는 추가할 수 없어요'));
  on('[data-act="addEv"]', () => REAL ? evDialog(null) : toast('예시 계정에서는 추가할 수 없어요'));
  on('[data-edit-tt]', b => REAL && ttDialog(REAL.timetable.find(t => t.id === b.dataset.editTt)));
  on('[data-edit-ev]', (b, e) => { e.preventDefault(); if (REAL) evDialog(REAL.events.find(x => x.id === b.dataset.editEv)); });
  // 결재
  on('[data-act="newApv"]', () => approvalDialog(null));
  on('[data-edit-apv]', b => approvalDialog(REAL.approvals.find(a => a.id === b.dataset.editApv)));
  on('[data-apv-filter]', b => { apvFilter = b.dataset.apvFilter; render(); });
  on('[data-apv]', b => {
    const [id, ok] = b.dataset.apv.split(':'), a = apvData().find(x => x.id === id);
    if (!REAL) { a.status = ok === '1' ? 'approved' : 'rejected'; a.decided_at = new Date().toISOString(); render(); toast(ok === '1' ? '승인했어요' : '반려했어요'); return; }
    decideDialog(a, ok === '1');
  });
  on('[data-cancel-apv]', async b => {
    if (!confirm('결재 요청을 취소할까요?')) return;
    const { error } = await SB.from('approvals').delete().eq('id', b.dataset.cancelApv);
    if (error) { toast('취소하지 못했어요'); return; }
    await loadApprovals(); render(); toast('결재 요청을 취소했어요');
  });
  on('[data-mk-step]', b => { const [id, st] = b.dataset.mkStep.split(':'); stepPromoReq(id, st); });
  on('[data-edit-mk]', b => centerPromoDialog(CENTER.promoReqs.find(r => r.id === b.dataset.editMk)));
  // 학부모·학생 (실제 데이터)
  on('[data-kid]', b => { KID = b.dataset.kid; render(); });
  on('[data-act="newNotice"]', () => {
    if (REAL) return noticeDialog(null);
    const title = prompt('공지 제목을 입력하세요');
    if (!title) return;
    DATA.notices.unshift({ title, to: '전체 학부모', at: '10/25', read: 0, total: DATA.academy.students });
    render(); toast('학부모 앱으로 공지를 보냈어요');
  });
  on('[data-edit-lead]', b => leadDialog(DATA.leads.find(x => String(x.id) === b.dataset.editLead)));
  on('[data-act="addLead"]', () => {
    if (REAL) return leadDialog(null);
    const name = prompt('학생 이름을 입력하세요');
    if (!name) return;
    DATA.leads.unshift({ id: Date.now(), name, grade: '-', want: '희망 반 미정', src: '직접 입력', stage: 'inquiry', next: '오늘 전화 필요', urgent: true });
    render(); toast('새 문의를 추가했어요');
  });
  on('[data-move]', b => {
    const l = DATA.leads.find(x => String(x.id) === b.dataset.move);
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

async function moveLead(id, stage) {
  const l = DATA.leads.find(x => String(x.id) === String(id));
  if (!l || l.stage === stage) return;
  const before = { stage: l.stage, urgent: l.urgent, next: l.next };
  l.stage = stage; l.urgent = false;
  l.next = stage === 'enrolled' ? '첫 수업 일정 잡기' : stage === 'trial' ? '체험수업 일정 잡기' : '상담 일정 잡기';
  render();
  if (REAL) {
    const { error } = await SB.from('leads').update({ stage, urgent: false, next_action: l.next }).eq('id', l.id);
    if (error) { Object.assign(l, before); render(); toast('옮기지 못했어요. 다시 시도해 주세요.'); return; }
    if (stage === 'enrolled' && ROLE === 'owner') await loadStudents(); // 등록하면 원생 명단에 자동 추가돼요
    render();
  }
  toast(stage === 'enrolled' ? `${l.name} 학생이 원생으로 등록됐어요` : `${l.name} → ${DATA.stages.find(s => s.id === stage).name} 단계로 옮겼어요`);
}

$('#menuBtn').onclick = () => $('#side').classList.toggle('open');
$('#side').addEventListener('click', e => { if (e.target === $('#side')) $('#side').classList.remove('open'); });
window.addEventListener('hashchange', () => { trackTrail(); if (MY) { editingReflect = false; rpEditing = null; render(); window.scrollTo(0, 0); } });

/* ---------- 뒤로 가기: 왼쪽 메뉴를 오가도 기록이 쌓이지 않게 ----------
   메뉴 · 위치 표시(홈 › 분야)는 지금 기록을 바꿔치기(replace)해서, 브라우저 뒤로 가기와 "‹ 이전"이 바로 전 화면 한 단계로만 가요. */
const curHash = () => location.hash || '#home';
const TRAIL = [curHash()]; // 이 탭에서 지나온 화면 (메뉴로 바꾼 건 덮어써요)
let replacing = false;
function trackTrail() {
  const h = curHash();
  if (replacing) { TRAIL[TRAIL.length - 1] = h; replacing = false; }
  else if (TRAIL[TRAIL.length - 2] === h) TRAIL.pop(); // 뒤로 가기
  else if (TRAIL[TRAIL.length - 1] !== h) TRAIL.push(h);
}
function goReplace(h) {
  if (curHash() === h) return;
  replacing = true; location.replace(h);
}
document.addEventListener('click', e => {
  const a = e.target.closest('#nav a.nav-item, .crumbs a[data-up]');
  if (a) { e.preventDefault(); goReplace(a.getAttribute('href')); return; }
  const b = e.target.closest('[data-back]');
  if (b) { if (TRAIL.length > 1) history.back(); else goReplace(b.dataset.back || '#home'); }
});

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

// 센터 관리자 신청: 로그인한 누구나 신청 → 지금 관리자가 센터 관리 → 관리자에서 수락
const adminApplyLink = (short = false) => `<a class="admin-apply-link" href="app.html#apply-admin" data-apply-admin>${ic('shield')}${short ? '' : '센터 본부 직원이세요? '}<b>센터 관리자 신청</b></a>`;
const bindAdminApplyLink = () => document.querySelectorAll('[data-apply-admin]').forEach(a => a.onclick = e => { e.preventDefault(); location.hash = '#apply-admin'; location.reload(); });
async function adminApplyScreen(user) {
  MY = null;
  const { data } = await SB.rpc('my_admin_application');
  const last = (data || [])[0], m = user.user_metadata || {};
  const name = PROFILE.name || m.full_name || m.name || '';
  const back = `<a class="btn" href="app.html" id="aaBack">돌아가기</a>`;
  $('.layout').style.display = 'block';
  $('.layout').innerHTML = `
  <div class="picker"><div class="card">
    <span class="logo"><span class="logo-mark">${ic('shield')}</span>학원지원센터 · 센터 관리자 신청</span>
    ${last && last.status === 'pending' ? `
    <h1>신청을 받았어요</h1>
    <p class="muted">${md(last.created_at.slice(0, 10))}에 신청했어요. 지금 센터 관리자가 확인하고 수락하면, 이 화면에서 "다시 확인"을 누르거나 다시 로그인하면 센터 관리 화면이 열려요.</p>
    <div class="row-btns"><button class="btn primary" id="aaCheck">다시 확인</button>${back}</div>` : `
    <h1>센터 관리자 신청</h1>
    <p class="muted">센터 관리자는 강사 교육 영상, 지원 신청, 제휴 · 유학 · 홍보 연결을 처리해요. 학원지원센터 본부 직원만 신청해 주세요. 지금 관리자가 수락하면 바로 쓸 수 있어요.</p>
    ${last && last.status === 'rejected' ? `<p class="msg">${last.decided_at ? md(last.decided_at.slice(0, 10)) : '지난번'} 신청은 수락되지 않았어요. 필요하면 본부에 먼저 이야기하고 다시 신청해 주세요.</p>` : ''}
    <form class="f-stack" id="aaForm" novalidate>
      <label class="f">이름<input name="nm" value="${esc(name)}" maxlength="50" placeholder="예: 김대표"></label>
      <label class="f">소속 · 하는 일<textarea name="reason" rows="3" maxlength="500" placeholder="예: 본부 운영팀 · 학원 지원 신청 연락 담당"></textarea></label>
      <p class="muted small">로그인한 계정: <b>${esc((user.email || '').replace('@id.academysupportcenter.app', ' (아이디)'))}</b>${/@id\.academysupportcenter\.app$/.test(user.email || '') ? '' : ' · 구글로 로그인한 계정만 관리자로 인정돼요'}</p>
      <p class="msg" id="aaMsg" hidden></p>
      <div class="row-btns"><button class="btn primary">신청하기</button>${back}</div>
    </form>`}
  </div></div>`;
  $('#aaBack').onclick = e => { e.preventDefault(); history.replaceState(null, '', 'app.html'); location.reload(); };
  if ($('#aaCheck')) $('#aaCheck').onclick = async () => {
    const { data: ok } = await SB.rpc('am_center_admin');
    if (ok) { history.replaceState(null, '', 'app.html#center/admins'); location.reload(); }
    else toast('아직 확인 중이에요. 조금 뒤에 다시 눌러 주세요.');
  };
  if ($('#aaForm')) $('#aaForm').onsubmit = async e => {
    e.preventDefault();
    const el = e.target.elements, nm = el.nm.value.trim(), msg = $('#aaMsg');
    if (!nm) { msg.textContent = '이름을 적어 주세요.'; msg.hidden = false; return; }
    const { error } = await SB.rpc('apply_center_admin', { p_name: nm, p_reason: el.reason.value.trim() || null });
    if (error) { msg.textContent = adminError(error); msg.hidden = false; return; }
    adminApplyScreen(user);
  };
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
    ${adminApplyLink()}
  </form></div>`;
  bindAdminApplyLink();
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
// 상담 카드: 화면이 쓰는 모양(name · src · next)으로 바꿔 DATA.leads에 넣어요
async function loadLeads() {
  const { data } = await SB.from('leads').select('*').eq('academy_id', REAL.academy.id).order('created_at', { ascending: false });
  DATA.leads = (data || []).map(r => ({
    id: r.id, raw: r, name: r.student_name, grade: r.grade || '', want: r.want || '희망 반 미정',
    src: r.source || '경로 미입력', stage: r.stage, next: r.next_action || '', urgent: r.urgent
  }));
}
// 행정 지원: 출결은 날짜별로, 수납·지출·서류는 학원 것을 모두 불러와요
async function loadAttendance(day = TODAY) {
  const { data } = await SB.from('attendance').select('student_id, status').eq('academy_id', REAL.academy.id).eq('day', day);
  REAL.attend = { day, map: Object.fromEntries((data || []).map(r => [r.student_id, r.status])) };
}
async function loadRows(table, order, ascending = true) {
  const { data } = await SB.from(table).select('*').eq('academy_id', REAL.academy.id).order(order, { ascending });
  REAL[table] = data || [];
}
const loadInvoices = () => loadRows('invoices', 'created_at');
const loadExpenses = () => loadRows('expenses', 'day', false);
const loadIncomes = () => loadRows('incomes', 'day', false);
const loadApprovals = () => loadRows('approvals', 'created_at', false);
const loadLibrary = () => loadRows('library_items', 'created_at', false).then(() => { REAL.library = REAL.library_items; });
const loadReports = () => loadRows('growth_reports', 'created_at', false).then(() => { REAL.reports = REAL.growth_reports; });
// 학생 할 일: 보고 있는 날 하나씩 (원장 · 강사는 학원 전체, 가족은 연결된 아이 것만 RLS가 걸러 줘요)
async function loadTodos(day = TODAY) {
  const { data } = await SB.from('student_todos').select('*').eq('academy_id', REAL.academy.id).eq('day', day).order('created_at');
  REAL.todoDay = day; REAL.todos = data || [];
}
// 일정 · 시간표: 원장 · 강사는 표를 바로, 가족은 세부 사항을 뺀 RPC로 (지난 6개월 ~ 앞으로 1년)
async function loadSchedule() {
  if (isStaff()) {
    const [t, e] = await Promise.all([
      SB.from('timetable').select('*').eq('academy_id', REAL.academy.id).order('start_time'),
      SB.from('academy_events').select('*').eq('academy_id', REAL.academy.id).order('day')
    ]);
    REAL.timetable = t.data || []; REAL.events = e.data || [];
  } else {
    const [t, e] = await Promise.all([
      SB.rpc('family_timetable', { p_academy: REAL.academy.id }),
      SB.rpc('family_events', { p_academy: REAL.academy.id, p_from: addDays(TODAY, -183), p_to: addDays(TODAY, 365) })
    ]);
    REAL.timetable = t.data || []; REAL.events = e.data || [];
  }
}
const loadPaperwork = () => loadRows('paperwork', 'created_at');
const loadPlans = () => loadRows('tuition_plans', 'amount').then(() => { REAL.plans = REAL.tuition_plans; });
// 강사 교육: 배부된 영상 + 내 리플렉션 (원장은 우리 강사 이수 현황까지) → 화면이 쓰는 DATA.training · DATA.staff 모양으로
async function loadTraining() {
  const [v, mine, rep] = await Promise.all([
    SB.from('training_videos').select('*').eq('published', true).order('due', { ascending: true, nullsFirst: false }),
    SB.from('training_reflections').select('video_id, body, created_at').eq('user_id', USER.id),
    ROLE === 'owner' ? SB.rpc('academy_training_report', { p_academy: REAL.academy.id }) : Promise.resolve({ data: [] })
  ]);
  const own = mine.data || [], report = rep.data || [];
  const teachers = [...new Map(report.map(r => [r.teacher_id, { id: r.teacher_id, name: esc(r.teacher_name), raw: r.teacher_name, joined: r.joined_at }])).values()];
  DATA.staff = teachers.map(t => ({ name: t.name, cls: '', since: `${md(t.joined.slice(0, 10))} 합류` }));
  DATA.training = (v.data || []).map(x => {
    const status = {}, reflections = [];
    const m = own.find(r => r.video_id === x.id);
    const myRefl = m ? { at: md(m.created_at.slice(0, 10)), text: m.body } : null;
    if (ROLE === 'teacher') status[ME.name] = m ? 'done' : 'todo';
    else teachers.forEach(t => {
      const r = report.find(y => y.teacher_id === t.id && y.video_id === x.id);
      status[t.name] = r ? 'done' : 'todo';
      if (r) reflections.push({ who: t.raw, at: md(r.done_at.slice(0, 10)), text: r.body });
    });
    return { id: x.id, title: esc(x.title), rawTitle: x.title, cat: esc(x.category), len: esc(x.length || ''), due: x.due ? md(x.due) : '없음',
      desc: esc(x.description || ''), url: x.video_url, status, reflections, myRefl, created_at: x.created_at };
  });
}
// 센터 관리자: 모든 영상 · 리플렉션 수 · 지원 신청 · 제휴 신청 · 유학 연결 요청 · 관리자 명단
async function loadCenter() {
  const newest = t => SB.from(t).select('*').order('created_at', { ascending: false });
  const [v, r, q, a, pa, ab, mk, aa] = await Promise.all([
    newest('training_videos'), SB.rpc('admin_training_progress'), newest('support_requests'),
    SB.rpc('list_center_admins'), newest('partner_applications'), newest('abroad_requests').in('status', ['forwarded', 'done']),
    newest('promo_requests'), SB.rpc('list_admin_applications')
  ]);
  const done = {};
  (r.data || []).forEach(x => { done[x.video_id] = Number(x.done) || 0; });
  CENTER = { videos: v.data || [], done, requests: q.data || [], admins: a.data || [], refl: CENTER ? CENTER.refl : {},
    partnerApps: pa.data || [], abroad: ab.data || [], promoReqs: mk.data || [], adminApps: aa.data || [] };
}
// 원장: 우리 공고 + 지원자
async function loadJobs() {
  const [j, a] = await Promise.all([
    SB.from('job_posts').select('*').eq('academy_id', REAL.academy.id).order('created_at', { ascending: false }),
    SB.rpc('list_job_applicants', { p_academy: REAL.academy.id })
  ]);
  REAL.jobs = j.data || []; REAL.applicants = a.data || [];
}
// 강사: 모집 중인 공고 전체 + 내 지원
async function loadJobBoard() {
  const [j, a] = await Promise.all([
    SB.from('job_posts').select('*').eq('status', 'open').order('created_at', { ascending: false }),
    SB.from('job_applications').select('job_id, status, created_at').eq('user_id', USER.id)
  ]);
  JOBS = { posts: j.data || [], mine: a.data || [] };
}
const loadPartnerApps = async () => {
  const { data } = await SB.from('partner_applications').select('*').eq('academy_id', REAL.academy.id).order('created_at', { ascending: false });
  REAL.partnerApps = data || [];
};
// 유학: 원장은 우리 학원 홍보 · 신청 전부, 학부모는 안내 중인 홍보 · 내 신청
async function loadAbroad() {
  const [p, r] = await Promise.all([
    SB.from('abroad_promos').select('*').eq('academy_id', REAL.academy.id).order('created_at', { ascending: false }),
    ROLE === 'owner'
      ? SB.from('abroad_requests').select('*').eq('academy_id', REAL.academy.id).order('created_at', { ascending: false })
      : SB.from('abroad_requests').select('*').eq('user_id', USER.id).order('created_at', { ascending: false })
  ]);
  REAL.abroad = { promos: p.data || [], requests: r.data || [] };
}
// 원장: 학부모·학생 계정과 연결된 원생 · 보낸 공지와 읽음 수 · 홍보 의뢰
async function loadFamilyMembers() {
  const { data } = await SB.rpc('list_family_members', { p_academy: REAL.academy.id });
  REAL.family = data || [];
}
async function loadNotices() {
  const [n, st] = await Promise.all([
    SB.from('notices').select('*').eq('academy_id', REAL.academy.id).order('created_at', { ascending: false }),
    SB.rpc('notice_report', { p_academy: REAL.academy.id })
  ]);
  REAL.notices = n.data || [];
  REAL.noticeStats = Object.fromEntries((st.data || []).map(x => [x.notice_id, x]));
}
const loadPromoReqs = () => loadRows('promo_requests', 'created_at', false).then(() => { REAL.promoReqs = REAL.promo_requests; });
// 학부모·학생: 연결된 아이 · 출결 · (학부모만) 청구 · 받은 공지와 내 읽음
async function loadFamily() {
  const [k, b, n, r] = await Promise.all([
    SB.rpc('my_children'),
    ROLE === 'parent' ? SB.rpc('my_child_invoices') : Promise.resolve({ data: [] }),
    SB.from('notices').select('*').eq('academy_id', REAL.academy.id).order('created_at', { ascending: false }),
    SB.from('notice_reads').select('notice_id').eq('user_id', USER.id)
  ]);
  REAL.kids = (k.data || []).filter(x => x.academy_id === REAL.academy.id);
  const ids = REAL.kids.map(x => x.id);
  const a = ids.length ? await SB.from('attendance').select('student_id, day, status').in('student_id', ids).order('day', { ascending: false }).limit(1000) : { data: [] };
  REAL.kidAttend = a.data || [];
  REAL.kidBills = (b.data || []).filter(i => ids.includes(i.student_id));
  REAL.notices = n.data || [];
  REAL.reads = new Set((r.data || []).map(x => x.notice_id));
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
  DATA.today = todayText();
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
    <p class="muted">학원에서 받은 <b>${PROFILE.role === 'teacher' ? '강사용' : '학부모·학생용'} 초대 코드</b>를 넣어 주세요.</p>
    <p class="muted small">초대 코드는 영어·숫자 8자리예요. 원장님 화면 "학생·학부모 관리 → 초대 코드"에 있으니, 코드가 없으면 학원에 요청해 주세요.${PROFILE.role === 'teacher' ? '' : ' 합류한 뒤 원장님이 아이와 연결해 주면 출결 · 수납 · 공지가 보여요.'}</p>`}
    <form class="f-stack" id="joinForm" novalidate>
      <label class="f">초대 코드<input name="code" maxlength="20" placeholder="예: K7P2QX9M" autocapitalize="characters" style="text-transform:uppercase"></label>
      <p class="msg" id="joinMsg" hidden></p>
      <button class="btn ${owner ? '' : 'primary'}">코드로 합류하기</button>
    </form>
    ${PROFILE.role === 'teacher' ? `<a class="btn" href="app.html#jobs" id="seeJobs">아직 코드가 없어요 · 채용 공고 먼저 보기</a>` : ''}
    ${adminApplyLink()}
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
  bindAdminApplyLink();
  // 같은 페이지 주소라 해시만 바뀌니, 새로 열어서 채용 공고 화면으로 시작해요
  if ($('#seeJobs')) $('#seeJobs').onclick = e => { e.preventDefault(); location.hash = '#jobs'; location.reload(); };
}

async function boot() {
  if (!DEMO) {
    if (!SB) { location.replace('index.html'); return; }
    const { data } = await SB.auth.getSession(); // 구글 로그인으로 돌아온 경우 ?code= 를 여기서 세션으로 바꿔요
    if (params.has('code')) history.replaceState(null, '', 'app.html' + location.hash);
    if (!data.session) { location.replace('index.html'); return; }
    const user = USER = data.session.user;
    const [{ data: p }, { data: admin }] = await Promise.all([
      SB.from('profiles').select('username, name, role, academy_name').eq('id', user.id).maybeSingle(),
      SB.rpc('am_center_admin')
    ]);
    PROFILE = p || {};
    if (admin) await loadCenter();
    await loadConvs();
    if (location.hash === '#apply-admin') { if (admin) history.replaceState(null, '', 'app.html#center/admins'); else { adminApplyScreen(user); return; } }
    if (!PROFILE.role && !CENTER) { rolePicker(user); return; }

    // 소속 학원 (여러 곳이면 먼저 들어간 곳)
    const { data: mem } = await SB.from('academy_members').select('role, academies(id, name, region)')
      .eq('user_id', user.id).order('created_at').limit(1);
    if (!mem || !mem.length) {
      // 학원 코드를 아직 못 받은 강사는 채용 공고부터 볼 수 있어요
      if (!CENTER && PROFILE.role === 'teacher' && location.hash.startsWith('#jobs')) {
        useProfile(); SEEKER = true; MY = { jobs: AREAS.teacher.jobs };
        await loadJobBoard(); render(); return;
      }
      if (!CENTER) { onboarding(user); return; }
      // 학원 없이 센터 관리만 하는 관리자
      ROLE = 'admin'; MY = { center: CENTER_AREA, messages: MESSAGES_AREA };
      const nm = esc(PROFILE.name || user.user_metadata?.full_name || PROFILE.username || (user.email || '관리자').split('@')[0]);
      ME = { name: nm, av: nm[0], label: '센터 관리자', color: 'var(--navy-700)' };
      DATA.today = todayText();
      await loadSeen(); render(); return;
    }
    PROFILE.role = mem[0].role; // 실제 역할은 초대 코드로 정해진 소속 역할
    useProfile();
    REAL = { academy: mem[0].academies, role: mem[0].role, students: [], codes: [], members: [],
      attend: { day: TODAY, map: {} }, plans: [], invoices: [], expenses: [], incomes: [], paperwork: [],
      jobs: [], applicants: [], partnerApps: [], abroad: { promos: [], requests: [] },
      approvals: [], reports: [], library: [], timetable: [], events: [], todos: [], todoDay: TODAY, family: [], notices: [], noticeStats: {}, promoReqs: [], kids: [], kidAttend: [], kidBills: [], reads: new Set() };
    useAcademy();
    if (ROLE === 'owner' || ROLE === 'teacher') await Promise.all([loadStudents(), loadLeads(), loadAttendance(), loadTraining(), loadApprovals(), loadPlans()]);
    if (ROLE === 'owner') await Promise.all([loadInvite(), loadInvoices(), loadExpenses(), loadIncomes(), loadPaperwork(), loadJobs(), loadPartnerApps(),
      loadFamilyMembers(), loadNotices(), loadPromoReqs()]);
    if (ROLE === 'teacher') await Promise.all([loadJobBoard(), loadPromoReqs()]);
    if (ROLE === 'parent' || ROLE === 'student') { await loadFamily(); MY = FAMILY_AREAS[ROLE]; }
    await Promise.all([loadAbroad(), loadSchedule(), loadTodos(), loadReports(), loadLibrary(), loadSeen()]);
    if (CENTER) MY = { ...MY, center: CENTER_AREA }; // 센터 관리자이면서 원장·강사인 분은 메뉴에 "센터 관리"가 더 생겨요
  } else await loadSeen();
  render();
}
boot();
