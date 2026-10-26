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
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
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
  if (REAL) return realFinancePage();
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
  return head('수납·청구', `${monthLabel(MONTH)} 청구 ${list.length}건 중 ${paid.length}건 납부 완료`, acts) + monthBar() + `
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
      ['amount', '금액(원)', { type: 'number', required: true, placeholder: '예: 300000', half: true }], ['due', '납부 기한', { type: 'date', half: true }],
      ['paid_at', '납부한 날', { type: 'date', half: true }], ['method', '결제 방법', { type: 'select', options: PAY_METHODS, half: true }],
      ['memo', '메모', { max: 300 }]
    ]
  });
}

// 반별 금액으로 이 달 청구서를 한 번에 만들어요
function billMonthDialog() {
  if (!REAL.students.length) { location.hash = '#members/students'; toast('먼저 원생을 추가해 주세요'); return; }
  const groups = byClass(REAL.students);
  const last = {}; // 지난번 수강료를 반별로 미리 채워 줘요
  [...REAL.invoices].filter(i => i.title === '수강료').sort((a, b) => a.month.localeCompare(b.month)).forEach(i => { last[i.class_name || '반 미지정'] = i.amount; });
  // 납부 기한 기본값: 그달 10일, 이번 달인데 10일이 지났으면 말일
  const due = `${MONTH}-10` < TODAY && MONTH === TODAY.slice(0, 7) ? ymd(new Date(+MONTH.slice(0, 4), +MONTH.slice(5), 0)) : `${MONTH}-10`;
  const d = dialogEl();
  d.innerHTML = `
  <form method="dialog" class="dlg" id="billForm" novalidate>
    <h2>${monthLabel(MONTH)} 청구서 만들기</h2>
    <p class="muted small" style="margin:0">반마다 금액을 넣으면 그 반 학생 모두에게 청구가 만들어져요. 같은 달에 같은 항목이 이미 있는 학생은 건너뛰어요. 금액이 다른 학생은 만든 뒤에 이름을 눌러 고치면 돼요.</p>
    <div class="two"><label class="f">항목<input name="title" value="수강료" maxlength="50"></label><label class="f">납부 기한<input name="due" type="date" value="${due}"></label></div>
    ${groups.map(([cls, ss], n) => `<label class="f">${esc(cls)} <span class="muted small">${ss.length}명 · 비워 두면 건너뛰어요</span><input name="c${n}" type="number" min="0" step="1000" placeholder="금액(원)" value="${last[cls] ?? ''}"></label>`).join('')}
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
    for (const [n, [, ss]] of groups.entries()) {
      const v = el[`c${n}`].value.trim();
      if (v === '') continue;
      const amount = Math.round(Number(v));
      if (!(amount >= 0)) return fail('금액은 숫자로 적어 주세요.');
      ss.forEach(s => {
        if (REAL.invoices.some(x => x.student_id === s.id && x.month === MONTH && x.title === title)) skipped++;
        else rows.push({ academy_id: REAL.academy.id, student_id: s.id, month: MONTH, title, amount, due });
      });
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

/* ---------- 실제 데이터: 재정 = 받은 수납 + 지출 (Supabase expenses) ---------- */
const EXP_CATS = ['강사 급여', '임대료', '교재비', '공과금', '홍보비', '차량·간식', '기타'];
function realFinancePage() {
  const inc = REAL.invoices.filter(i => i.paid_at && i.paid_at.slice(0, 7) === MONTH);
  const exp = REAL.expenses.filter(x => x.day.slice(0, 7) === MONTH);
  const income = sum(inc, i => i.amount), expense = sum(exp, x => x.amount), left = income - expense;
  const cats = Object.entries(exp.reduce((a, x) => (a[x.category] = (a[x.category] || 0) + x.amount, a), {})).sort((a, b) => b[1] - a[1]);
  const max = Math.max(1, ...cats.map(c => c[1]));
  return head('재정', `${monthLabel(MONTH)} · 수입은 수납·청구에서 납부 확인한 금액이 저절로 들어와요.`, `<button class="btn primary" data-act="addExpense">${ic('plus')}지출 추가</button>`) + monthBar() + `
  <div class="stats">
    <div class="stat"><span>수입 (납부 ${inc.length}건)</span><b class="num">${won(income)}</b></div>
    <div class="stat"><span>지출 ${exp.length}건</span><b class="num">${won(expense)}</b></div>
    <div class="stat ${left < 0 ? 'crit' : 'good'}"><span>남은 금액</span><b class="num">${left < 0 ? '-' : ''}${won(Math.abs(left))}</b></div>
  </div>
  <div class="grid2 even">
    <section class="card">
      <div class="card-head"><h2>지출 항목</h2></div>
      ${cats.length ? `<div class="rows">${cats.map(([n, v]) => `<div class="row-bar wide"><span>${esc(n)}</span>${bar(v / max * 100)}<b class="num">${won(v)}</b></div>`).join('')}</div>`
        : '<p class="muted small" style="margin:0">이 달에 적은 지출이 없어요. 급여·임대료부터 넣어 보세요.</p>'}
    </section>
    <section class="card">
      <div class="card-head"><h2>지출 내역</h2><span class="sub">누르면 고칠 수 있어요</span></div>
      ${exp.length ? `<div class="list">${exp.map(x => `
        <a class="li link" href="#admin/finance" data-edit-exp="${x.id}">
          <span class="av time-av num">${md(x.day)}</span>
          <div><div class="t">${esc(x.category)}</div><div class="d">${esc(x.memo || '')}</div></div>
          <div class="r"><b class="num">${won(x.amount)}</b></div>
        </a>`).join('')}</div>` : '<p class="muted small" style="margin:0">아직 없어요.</p>'}
    </section>
  </div>
  <a class="hint" href="#admin/billing">${ic('card')}<span>수입은 수납·청구에서 "납부 확인"한 금액이에요</span><b>수납·청구 →</b></a>`;
}

function expenseDialog(x) {
  formDialog({
    title: x ? '지출 고치기' : '지출 추가', table: 'expenses', row: x, after: loadExpenses,
    label: r => `${r.category} 지출을`,
    fields: [
      ['day', '날짜', { type: 'date', required: true, value: MONTH === TODAY.slice(0, 7) ? TODAY : `${MONTH}-01`, half: true }],
      ['category', '항목', { type: 'select', required: true, options: EXP_CATS, half: true }],
      ['amount', '금액(원)', { type: 'number', required: true, placeholder: '예: 2000000' }],
      ['memo', '메모', { max: 200, placeholder: '예: 10월 김민지 강사 급여' }]
    ]
  });
}

/* ---------- 실제 데이터: 서류·행정 마감 (Supabase paperwork) ---------- */
// 다음에 돌아오는 "매달 dd일" (month를 주면 매년 그 달 dd일)
function nextDue(dd, month = null) {
  const t = day0(TODAY);
  let x = new Date(t.getFullYear(), month ?? t.getMonth(), dd);
  if (x < t) x = month == null ? new Date(t.getFullYear(), t.getMonth() + 1, dd) : new Date(t.getFullYear() + 1, month, dd);
  return ymd(x);
}
// 학원이 자주 내는 서류 (지역 교육청마다 서식·기한이 다를 수 있어요)
const PAPER_PRESETS = () => [
  ['원천세 신고·납부', '세무서', nextDue(10), '강사 급여에서 뗀 세금을 다음 달 10일까지 신고하고 내요.'],
  ['4대보험 취득·상실 신고', '4대보험 공단', nextDue(15), '강사가 새로 오거나 그만두면 다음 달 15일까지 신고해요.'],
  ['강사 채용·해임 통보', '교육청', null, '강사를 새로 뽑거나 내보내면 교육청에 알려요. 기한은 관할 교육청에 확인해 주세요.'],
  ['교습비 변경 신고', '교육청', null, '교습비(수강료)를 바꾸려면 미리 교육청에 신고해요.'],
  ['사업장현황신고', '세무서', nextDue(10, 1), '면세사업자인 학원은 매년 2월 10일까지 지난해 수입을 신고해요.']
];
const PAPER_NEXT = { todo: ['doing', '준비 시작'], doing: ['done', '제출 완료'], done: ['todo', '되돌리기'] };
function realPaperPage() {
  const list = [...REAL.paperwork].sort((a, b) => (a.status === 'done') - (b.status === 'done') || (a.due || '9999').localeCompare(b.due || '9999'));
  const acts = `<button class="btn primary" data-act="addPaper">${ic('plus')}서류 추가</button>`;
  if (!list.length) return head('서류·행정', '교육청·세무서·공단에 낼 서류를 마감 순서로 챙겨요.') + `
  <section class="card empty">
    <span class="tile-ic">${ic('doc')}</span>
    <h2>챙길 서류를 넣어 주세요</h2>
    <p class="muted">원천세 · 4대보험 · 교육청 신고처럼 학원이 자주 내는 서류를 한 번에 넣을 수 있어요. 마감일은 넣은 뒤에 고칠 수 있어요.</p>
    <span class="btns"><button class="btn primary" data-act="presetPaper">자주 내는 서류 넣기</button>${acts.replace('btn primary', 'btn')}</span>
  </section>`;
  return head('서류·행정', '마감이 가까운 순서예요. 제목을 누르면 고칠 수 있어요.', acts) + `
  <section class="card"><div class="list stack">
    ${list.map(p => {
      const [c, l] = STEP_CHIP[p.status], [next, nl] = PAPER_NEXT[p.status];
      return `
      <div class="li">
        <span class="av" style="background:${p.status === 'done' ? 'var(--good)' : 'var(--navy-700)'}">${ic('doc')}</span>
        <div><div class="t"><span class="nm-link" data-edit-paper="${p.id}" role="button" tabindex="0">${esc(p.title)}</span> <span class="muted small">${esc(p.org || '')}</span></div><div class="d">${esc(p.memo || '')}</div></div>
        <div class="r"><span class="btns"><span class="chip ${c}">${l}</span>${p.status !== 'done' ? ddChip(p.due) : ''}</span>${p.due ? `<span class="time">마감 ${md(p.due)}</span>` : ''}<button class="btn sm ${next === 'done' ? 'primary' : ''}" data-paper-step="${p.id}:${next}">${nl}</button></div>
      </div>`;
    }).join('')}
  </div></section>
  <p class="muted small">기한과 서식은 지역 교육청·기관마다 다를 수 있어요. 헷갈리면 센터 담당 매니저에게 물어보세요.</p>`;
}

function paperDialog(p) {
  formDialog({
    title: p ? '서류 고치기' : '서류 추가', table: 'paperwork', row: p, after: loadPaperwork,
    label: r => `${r.title} 서류를`,
    fields: [
      ['title', '서류 이름', { required: true, max: 100, placeholder: '예: 교습비 변경 신고' }],
      ['org', '내는 곳', { max: 50, placeholder: '예: 교육청', half: true }], ['due', '마감일', { type: 'date', half: true }],
      ['status', '상태', { type: 'select', required: true, value: 'todo', options: Object.entries(STEP_CHIP).map(([k, [, l]]) => [k, l]) }],
      ['memo', '메모', { max: 500 }]
    ]
  });
}

async function addPaperPresets() {
  const have = new Set(REAL.paperwork.map(p => p.title));
  const rows = PAPER_PRESETS().filter(([t]) => !have.has(t)).map(([title, org, due, memo]) => ({ academy_id: REAL.academy.id, title, org, due, memo }));
  const { error } = await SB.from('paperwork').insert(rows);
  if (error) { toast('넣지 못했어요. 잠시 후 다시 시도해 주세요.'); return; }
  await loadPaperwork(); render(); toast(`서류 ${rows.length}건을 넣었어요`);
}

async function stepPaper(id, status) {
  const p = REAL.paperwork.find(x => x.id === id), before = p.status;
  p.status = status; render();
  const { error } = await SB.from('paperwork').update({ status }).eq('id', id);
  if (error) { p.status = before; render(); toast('저장하지 못했어요'); return; }
  toast(status === 'done' ? `${p.title} 제출 완료로 표시했어요` : '상태를 바꿨어요');
}

// 원장 홈 "오늘 챙길 일" — 실제 데이터에서 골라요
function realOwnerTodo() {
  const items = [];
  REAL.paperwork.filter(p => p.status !== 'done' && p.due && dday(p.due) <= 14).sort((a, b) => a.due.localeCompare(b.due)).slice(0, 3)
    .forEach(p => items.push([`${esc(p.title)} 제출`, `${esc(p.org || '서류·행정')} · 마감 ${md(p.due)}`, '#admin/paper', ddChip(p.due)]));
  const late = REAL.invoices.filter(i => !i.paid_at && i.due && i.due < TODAY);
  if (late.length) items.push([`기한 지난 미납 ${late.length}건 안내하기`, `합계 ${won(sum(late, i => i.amount))}`, '#admin/billing', '<span class="chip crit">미납</span>']);
  const left = REAL.attend.day === TODAY && day0(TODAY).getDay() !== 0 ? REAL.students.filter(s => !REAL.attend.map[s.id]).length : 0;
  if (left) items.push([`오늘 출결 ${left}명 입력 전`, '강사님이 수업 중에 입력해도 돼요', '#admin/attend', '<span class="chip warn">오늘</span>']);
  const urgent = DATA.leads.filter(l => l.urgent);
  if (urgent.length) items.push([`급한 문의 ${urgent.length}건에 연락하기`, urgent.slice(0, 3).map(l => esc(l.name)).join(' · '), '#members/leads', '<span class="chip crit">오늘</span>']);
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
        : sts.length ? `<b class="num">${done}/${sts.length}명</b>${bar(done / sts.length * 100, 'sm')}` : '<span class="time">강사 없음</span>';
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
  return head('강사 교육', '학원지원센터 본부가 매달 교육 영상을 배부해요. 강사가 시청하고 리플렉션을 쓰면 여기서 확인할 수 있어요.') + trainingList('teachers/training');
}

function trainingDetail(id, base) {
  const t = DATA.training.find(x => x.id === id);
  if (!t) return notFound();
  const me = teacherName();
  const notDone = Object.entries(t.status).filter(([, s]) => s !== 'done').map(([n]) => n);
  const player = videoPlayer(t.url, t.len);
  const reflections = `
    <section class="card">
      <div class="card-head"><h2>리플렉션 ${t.reflections.length}개</h2></div>
      ${t.reflections.length ? `<div class="reflects">${t.reflections.map(r => `
        <div class="reflect"><div class="who"><b>${esc(r.who)}</b> <span class="muted small">${r.at}</span></div><p>${esc(r.text)}</p></div>`).join('')}</div>`
        : '<p class="muted small" style="margin:0">아직 작성된 리플렉션이 없어요.</p>'}
    </section>`;

  if (me) {
    const mine = t.reflections.find(r => r.mine);
    const done = t.status[me] === 'done' && !editingReflect;
    return head(t.title, t.desc) + `
    <div class="grid2">
      <div>${player}</div>
      <section class="card">
        <div class="card-head"><h2>내 리플렉션</h2>${done ? '<span class="chip good">이수 완료</span>' : `<span class="chip warn">마감 ${t.due}</span>`}</div>
        ${done ? `<p class="muted" style="margin:0">제출했어요. 원장님과 센터 교육팀이 확인해요.</p>${REAL && mine ? '<button class="btn sm" data-act="editReflect" style="margin-top:10px">리플렉션 고치기</button>' : ''}` : `
        <p class="muted small" style="margin:0 0 10px">영상을 보고 배운 점, 내 수업에 적용할 점을 적어 주세요.</p>
        <textarea id="reflectText" rows="6" maxlength="2000" placeholder="예: 활동 전환 신호를 정해 두는 방법을 다음 주 수업에 써 보려고 해요.">${editingReflect && mine ? esc(mine.text) : ''}</textarea>
        <button class="btn primary" id="reflectSubmit" style="margin-top:10px">${editingReflect ? '고쳐서 제출' : '제출하고 이수 완료'}</button>`}
      </section>
    </div>` + reflections;
  }

  return head(t.title, t.desc, notDone.length && !REAL ? `<button class="btn" data-nudge="${t.id}">미이수 강사에게 알림</button>` : '') + `
  <div class="grid2">
    <div>${player}</div>
    <section class="card">
      <div class="card-head"><h2>이수 현황</h2><span class="sub">마감 ${t.due}</span></div>
      ${Object.keys(t.status).length ? '' : '<p class="muted small" style="margin:0">아직 합류한 강사님이 없어요.</p>'}
      <div class="list">
        ${Object.entries(t.status).map(([n, s]) => `
          <div class="li"><span class="av" style="background:var(--navy-700)">${n[0]}</span><div class="t">${n}</div>
          <div class="r">${s === 'done' ? '<span class="chip good">이수</span>' : '<span class="chip mute">미이수</span>'}</div></div>`).join('')}
      </div>
    </section>
  </div>` + reflections;
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
        ${REAL ? `<button class="btn sm primary" data-mk-req="${esc(s.name)}">의뢰하기</button>` : `<a class="btn sm primary" href="${MK}" target="_blank" rel="noopener">의뢰하기 ${ic('ext')}</a>`}
      </section>`).join('')}
  </div>`;
}

/* ---------- 실제 데이터: 홍보 의뢰 (Supabase promo_requests) ---------- */
// 접수 → 인투마케팅 연결 → 작업 중 → 시안 확인 → 완료
const MK_STATE = { new: ['info', '접수', 10], contacted: ['info', '인투마케팅 연결', 30], working: ['warn', '작업 중', 60], review: ['warn', '시안 확인 필요', 85], done: ['good', '완료', 100] };
function realPromoRequestsPage() {
  const list = REAL.promoReqs;
  const add = `<a class="btn primary" href="#promo/services">${ic('plus')}새 의뢰</a>`;
  if (!list.length) return head('의뢰 현황', '') + `
  <section class="card empty">
    <span class="tile-ic">${ic('megaphone')}</span>
    <h2>아직 맡긴 홍보 작업이 없어요</h2>
    <p class="muted">홍보 서비스에서 필요한 작업을 골라 의뢰하면, 센터가 인투마케팅 담당자와 연결하고 진행 상황을 여기에 적어 드려요.</p>
    ${add}
  </section>`;
  return head('의뢰 현황', '센터가 인투마케팅에 연결하고 단계가 바뀔 때마다 여기에 보여요. 접수 단계에서는 취소할 수 있어요.', add) + `
  <section class="card"><div class="list stack">
    ${list.map(r => {
      const [c, l, pct] = MK_STATE[r.status];
      return `
      <div class="li">
        <span class="av" style="background:${r.status === 'done' ? 'var(--good)' : 'var(--blue-600)'}">${ic('megaphone')}</span>
        <div><div class="t">${esc(r.title)}</div><div class="d">${esc(r.service)} · ${md(r.created_at.slice(0, 10))} 의뢰${r.want_by ? ` · ${md(r.want_by)}까지` : ''}</div>${bar(pct)}
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
  const add = canEdit ? `<button class="btn primary" data-act="addStudent">${ic('plus')}원생 추가</button>` : '';
  const body = list.length ? `
  <section class="card"><div class="table">
    <div class="tr th sv"><span>학생</span><span>반</span><span>학부모</span><span>메모</span><span></span></div>
    ${list.map(s => `
      <div class="tr sv">
        <span><b>${esc(s.name)}</b> <span class="muted small">${esc(s.grade || '')}</span></span>
        <span>${esc(s.class_name || '-')}</span>
        <span>${esc(s.parent_name || '-')} <span class="muted small">${esc(s.parent_phone || '')}</span>${canEdit ? appLinked(s.id) : ''}</span>
        <span class="muted small">${esc(s.memo || '')}</span>
        <span class="btns">${canEdit ? `<button class="btn sm" data-link-student="${s.id}">앱 연결</button><button class="btn sm" data-edit-student="${s.id}">수정</button>` : ''}</span>
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
  return head('원생 명단', `원생 ${list.length}명 · 학생과 학부모 연락처를 한곳에 모아요.${canEdit ? ' "앱 연결"로 학부모·학생 계정을 아이와 이어 주세요.' : ''}`, list.length ? add : '') + wait + body +
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
   half: 두 칸을 한 줄에. type: text(기본) · tel · date · month · number · select · check · area(여러 줄)
   options: 글자 목록, 또는 [저장값, 보이는 글자] 목록. blank: 고르지 않았을 때 보이는 글자. value: 새로 만들 때 기본값. createOnly: 새로 만들 때만 보이는 칸. url: https:// 주소만
   academy: 새로 만들 때 학원 id를 붙일지 (센터 자료는 false). noDelete: 삭제 버튼 숨김 */
const dialogEl = () => $('#dlg') || document.body.appendChild(Object.assign(document.createElement('dialog'), { id: 'dlg' }));
function formDialog({ title, table, fields: all, row, extra = {}, okText, label, after, academy = true, noDelete = false, doneText }) {
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
      : `<input name="${k}" type="${o.type || 'text'}" value="${esc(v ?? '')}" ${o.max ? `maxlength="${o.max}"` : ''} ${o.type === 'number' ? 'min="0" inputmode="numeric"' : ''} placeholder="${o.placeholder || ''}">`;
    return `<label class="f">${lab}${o.required ? ' *' : ''}${ctl}</label>`;
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
  $('#dlgForm').onsubmit = async e => {
    e.preventDefault();
    const el = e.target.elements, data = {};
    for (const [k, lab, o = {}] of fields) {
      if (o.type === 'check') { data[k] = el.namedItem(k).checked; continue; }
      const v = el.namedItem(k).value.trim();
      if (o.required && !v) return fail(`${lab}을(를) ${o.type === 'select' ? '골라' : '적어'} 주세요.`);
      if (o.type === 'number' && v !== '' && !(Number(v) >= 0)) return fail(`${lab}은(는) 0 이상의 숫자로 적어 주세요.`);
      if (o.url && v && !/^https:\/\/\S+$/.test(v)) return fail(`${lab}은(는) https:// 로 시작하는 주소로 넣어 주세요.`);
      data[k] = v === '' ? null : o.type === 'number' ? Math.round(Number(v)) : v;
    }
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
    title: s ? '원생 정보 고치기' : '원생 추가', table: 'students', row: s, after: loadStudents,
    label: r => `${r.name} 학생을`,
    fields: [
      ['name', '이름', { required: true, max: 50, half: true }], ['grade', '학년', { max: 20, placeholder: '예: 초5', half: true }],
      ['class_name', '반', { max: 50, placeholder: '예: 초등 B반' }],
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
    <div class="card-head"><div><h2><span class="nm-link" data-edit-job="${j.id}" role="button" tabindex="0">${esc(j.title)}</span></h2><div class="sub">${jobLine(j)}${j.due ? ` · 마감 ${md(j.due)}` : ''}</div></div>
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
  return head('채용 공고', '센터에 가입한 학원들의 강사 채용 공고예요. 지원하면 이름 · 경력과 센터 교육 이수 기록이 원장님께 전달돼요.') +
    (SEEKER ? `<a class="hint" href="#" data-act="joinAcademy" style="margin:0 0 16px">${ic('users')}<span>학원에서 강사용 초대 코드를 받았나요?</span><b>학원 연결하기 →</b></a>` : '') +
    (JOBS.posts.length ? `
  <section class="card"><div class="list stack">
    ${JOBS.posts.map(j => {
      const a = mine(j.id);
      return `
      <div class="li">
        <span class="av" style="background:var(--navy-700)">${esc((j.academy_name || '학')[0])}</span>
        <div><div class="t">${esc(j.title)}</div><div class="d">${esc(j.academy_name || '')}${j.area ? ` · ${esc(j.area)}` : ''} · ${jobLine(j)}</div>${j.description ? `<div class="d">${esc(j.description)}</div>` : ''}</div>
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
  return head('강사 교육 영상', '여기 올린 영상은 센터에 가입한 모든 학원의 원장·강사에게 배부돼요. 강사가 보고 리플렉션을 쓰면 이수 완료예요.', list.length ? add : '') + (list.length ? `
  <section class="card"><div class="list">
    ${list.map(v => `
      <a class="li link" href="#center/videos/${v.id}">
        <span class="thumb-sm">${ic('play')}</span>
        <div><div class="t">${esc(v.title)}</div><div class="d"><span class="chip ${v.category === '필수' ? 'crit' : 'info'}">${esc(v.category)}</span> ${v.length ? `${esc(v.length)} · ` : ''}마감 ${v.due ? md(v.due) : '없음'}${v.video_url ? '' : ' · <b style="color:var(--warn)">영상 주소 없음</b>'}</div></div>
        <div class="r"><b class="num">리플렉션 ${CENTER.done[v.id] || 0}개</b>${v.published ? '<span class="chip good">배부 중</span>' : '<span class="chip mute">숨김</span>'}</div>
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
    <div class="card-head"><h2>리플렉션 ${refl ? `${refl.length}개` : ''}</h2><span class="sub">강사가 쓴 소감 · 쓰면 이수 완료</span></div>
    ${!refl ? '<p class="muted small" style="margin:0">불러오는 중…</p>' : refl.length ? `<div class="reflects">${refl.map(r => `
      <div class="reflect"><div class="who"><b>${esc(r.name)}</b> <span class="muted small">${esc(r.academies || '')} · ${md(r.done_at.slice(0, 10))}</span></div><p>${esc(r.body)}</p></div>`).join('')}</div>`
      : '<p class="muted small" style="margin:0">아직 작성된 리플렉션이 없어요.</p>'}
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
      <div><div class="t"><span class="nm-link" data-edit-mk="${r.id}" role="button" tabindex="0">${esc(r.academy_name || '학원')}</span> <span class="muted small">${md(r.created_at.slice(0, 10))} 의뢰${r.want_by ? ` · ${md(r.want_by)}까지` : ''}</span></div>
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
    videos: { name: '강사 교육 영상', icon: 'video', desc: '영상 올리기 · 배부 · 리플렉션 보기', stat: () => `영상 ${CENTER.videos.length}개 · 리플렉션 ${Object.values(CENTER.done).reduce((a, n) => a + n, 0)}개`,
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
const AREAS = {
  owner: {
    admin: { name: '행정 지원', icon: 'shield', desc: '출결·수납·재정·서류 처리를 한곳에서',
      stat: () => REAL ? `서류 마감 2주 안 ${REAL.paperwork.filter(p => p.status !== 'done' && p.due && dday(p.due) <= 14).length}건 · 미납 ${REAL.invoices.filter(i => !i.paid_at).length}건` : `행정 마감 D-0 · 미납 ${DATA.unpaid.length}건`,
      subs: {
        attend: { name: '출결 관리', icon: 'attend', desc: '반별 출석 체크와 결석 확인', stat: attendStat, render: attendPage },
        billing: { name: '수납·청구', icon: 'card', desc: '청구서 만들기와 미납 안내', stat: () => REAL ? `${+MONTH.slice(5)}월 미납 ${REAL.invoices.filter(i => i.month === MONTH && !i.paid_at).length}건` : `미납 ${DATA.unpaid.filter(u => !u.sent).length}건`, render: billingPage },
        finance: { name: '재정', icon: 'chart', desc: '수입·지출과 남은 금액', stat: () => {
          if (!REAL) return `이번 달 +${DATA.finance.income - DATA.finance.expense}만 원`;
          const n = sum(REAL.invoices.filter(i => i.paid_at && i.paid_at.startsWith(MONTH)), i => i.amount) - sum(REAL.expenses.filter(x => x.day.startsWith(MONTH)), x => x.amount);
          return `${+MONTH.slice(5)}월 ${n < 0 ? '-' : '+'}${won(Math.abs(n))}`;
        }, render: financePage },
        paper: { name: '서류·행정', icon: 'doc', desc: '교육청·세무서·공단 신고 서류', stat: () => `작성 필요 ${(REAL ? REAL.paperwork : DATA.paperwork).filter(p => p.status === 'todo').length}건`, render: paperPage }
      } },
    teachers: { name: '강사 관리', icon: 'grad', desc: '센터 강사 교육과 채용까지', stat: () => `교육 미이수 ${DATA.training.reduce((a, t) => a + Object.values(t.status).filter(s => s !== 'done').length, 0)}건 · ${applicantStat()}`,
      subs: {
        staff: { name: '우리 학원 강사', icon: 'users', desc: '담당 반과 교육 이수 현황', stat: () => `${DATA.staff.length}명`, render: staffPage },
        training: { name: '강사 교육', icon: 'video', desc: '본부 교육 영상과 강사 리플렉션', stat: () => `영상 ${DATA.training.length}개`, render: trainingPage, detail: id => trainingDetail(id, 'teachers/training') },
        hire: { name: '강사 채용', icon: 'brief', desc: '공고 올리기와 지원자 관리', stat: applicantStat, render: hirePage }
      } },
    members: { name: '학생·학부모 관리', icon: 'users', desc: '상담·등록부터 원생 명단, 학부모 공지까지', stat: () => `새 문의 ${DATA.leads.filter(l => l.stage === 'inquiry').length}건`,
      subs: {
        leads: { name: '상담·등록', icon: 'leads', desc: '문의 → 상담 → 체험수업 → 등록', stat: () => `진행 중 ${DATA.leads.filter(l => l.stage !== 'enrolled').length}명`, render: leadsPage },
        students: { name: '원생 명단', icon: 'users', desc: '학생·학부모 연락처, 출석, 수납', stat: () => `원생 ${DATA.academy.students}명`, render: studentsPage },
        invite: { name: '초대 코드', icon: 'plus', desc: '원장·강사·학부모를 우리 학원에 초대', stat: () => REAL ? `함께하는 사람 ${REAL.members.length}명` : '코드 3종류', render: invitePage },
        notices: { name: '학부모 공지', icon: 'chat', desc: '공지 보내고 읽음 확인', stat: () => REAL ? `보낸 공지 ${REAL.notices.length}건` : `이번 달 ${DATA.notices.length}건`, render: noticesPage,
          detail: noticeDetail, title: id => (REAL.notices.find(n => n.id === id) || {}).title }
      } },
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
    learn: { name: '강사 교육', icon: 'video', desc: '본부 교육 영상 시청과 리플렉션', stat: () => `남은 교육 ${DATA.training.filter(t => t.status[ME.name] !== 'done').length}개`,
      render: () => head('강사 교육', '학원지원센터 본부에서 배부한 교육 영상이에요. 시청하고 리플렉션을 쓰면 이수 완료돼요.') + trainingList('learn'), detail: id => trainingDetail(id, 'learn') },
    jobs: { name: '채용 공고', icon: 'brief', desc: '센터 가입 학원들의 강사 채용', stat: () => `공고 ${JOBS ? JOBS.posts.length : DATA.jobs.length}건`, render: jobsPage }
  },
  parent: {
    kid: { name: '우리 아이', icon: 'grad', desc: '일정·숙제, 기록, 수납을 한 번에', stat: () => `${DATA.child.name} · 학원 ${DATA.child.academies}곳`,
      subs: {
        schedule: { name: '일정·숙제', icon: 'cal', desc: '오늘 일정과 숙제', stat: () => `오늘 ${DATA.child.today.length}개`, render: kidSchedulePage },
        record: { name: '기록·성적', icon: 'doc', desc: '출석률·시험·선생님 코멘트', stat: () => `출석 ${DATA.child.record.attend}%`, render: kidRecordPage },
        bills: { name: '수납', icon: 'card', desc: '학원별 수강료 결제', stat: () => { const n = DATA.child.bills.filter(b => !b.paid).length; return n ? `낼 금액 ${n}건` : '모두 납부'; }, render: kidBillsPage }
      } },
    news: { name: '학원 소식', icon: 'chat', desc: '학원 공지와 안내', stat: () => '새 공지 2건', render: newsPage },
    abroad: { name: '유학 프로그램', icon: 'globe', desc: '학원이 안내하는 유학 · 캠프 상담 신청', stat: () => `안내 ${abroadData().promos.filter(p => p.active).length}건`, render: parentAbroadPage }
  },
  student: {}
};
const promoOpen = () => REAL ? REAL.promoReqs.filter(r => r.status !== 'done').length : DATA.promoRequests.length;
// 실제 로그인한 학부모·학생: 원장이 이어 준 아이의 출결 · 수납 · 학원 소식
const kidStat = () => REAL.kids.length ? REAL.kids.map(k => esc(k.name)).join(' · ') : '아이 연결 전';
const newsArea = { name: '학원 소식', icon: 'chat', desc: '학원 공지와 안내', stat: () => { const n = unreadNotices().length; return n ? `새 공지 ${n}건` : `공지 ${REAL.notices.length}건`; },
  render: realNewsPage, detail: newsDetail, title: id => (REAL.notices.find(n => n.id === id) || {}).title };
const FAMILY_AREAS = {
  parent: {
    kid: { name: '우리 아이', icon: 'grad', desc: '출결과 수납을 한 번에', stat: kidStat,
      subs: {
        attend: { name: '출결', icon: 'attend', desc: '날짜별 출석 · 지각 · 결석', stat: () => `${+MONTH.slice(5)}월 ${REAL.kidAttend.filter(a => a.day.startsWith(MONTH) && (!REAL.kids.length || a.student_id === kidNow().id)).length}일 기록`, render: kidAttendPage },
        bills: { name: '수납', icon: 'card', desc: '학원 청구와 납부 확인', stat: () => { const n = REAL.kidBills.filter(b => !b.paid_at).length; return n ? `낼 금액 ${n}건` : '모두 납부'; }, render: realKidBillsPage }
      } },
    news: newsArea,
    abroad: AREAS.parent.abroad
  },
  student: {
    attend: { name: '내 출결', icon: 'attend', desc: '날짜별 출석 · 지각 · 결석', stat: () => `${+MONTH.slice(5)}월 ${REAL.kidAttend.filter(a => a.day.startsWith(MONTH)).length}일 기록`, render: kidAttendPage },
    news: newsArea
  }
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
        .concat([['오늘 수업 출결 입력', REAL ? `원생 ${REAL.students.length}명 · 수업 중에 바로 체크해 주세요` : '초등 B반 17:00 · 수업 중에 입력해 주세요', '#attend', '<span class="chip info">오늘</span>']])) +
      `<h2 class="sec-title">바로 가기</h2>` + tiles();
  }
  if (REAL && (ROLE === 'parent' || ROLE === 'student')) {
    const names = REAL.kids.map(k => `${esc(k.name)}${k.grade ? `(${esc(k.grade)})` : ''}`).join(' · ');
    return head(ROLE === 'student' ? `${ME.name}, 오늘도 힘내요!` : `${ME.name} 님, 안녕하세요`,
      `${DATA.today} · ${esc(REAL.academy.name)}${names && ROLE === 'parent' ? ` · ${names}` : ''}`) +
      todo(familyTodo()) + `<h2 class="sec-title">바로 가기</h2>` + tiles();
  }
  if (ROLE === 'parent') {
    const c = DATA.child;
    const promos = abroadData().promos.filter(p => p.active).slice(0, 1)
      .map(p => [esc(p.title), `${esc(p.program)} · 학원에서 안내한 유학 프로그램`, '#abroad', '<span class="chip info">상담 신청</span>']);
    return head(`${ME.name} 님, 안녕하세요`, `${DATA.today} · ${c.name}(${c.grade})의 학원 ${c.academies}곳을 한 화면에서 봐요.`) +
      todo([...promos,
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
  return head(a.name, a.desc) + subTiles(id, a);
}
function subTiles(id, a) {
  return `<div class="tiles">${Object.entries(a.subs).map(([sid, s]) => `
    <a class="tile" href="#${id}/${sid}">
      <span class="tile-ic">${ic(s.icon)}</span>
      <b>${s.name}</b>
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
  const badge = REAL ? {} : {
    members: DATA.leads.filter(l => l.urgent).length,
    learn: DATA.training.filter(t => t.status[ME.name] !== 'done').length
  };
  const items = [...(SEEKER ? [] : [['home', '홈', 'home']]), ...Object.entries(MY).map(([id, a]) => [id, a.name, a.icon])];
  $('#nav').innerHTML = items.map(([id, label, icon]) => `
    <a class="nav-item ${id === area ? 'on' : ''}" href="#${id}">${ic(icon)}<span>${label}</span>${badge[id] && ROLE !== 'parent' ? `<span class="badge">${badge[id]}</span>` : ''}</a>`).join('');
  $('#me').innerHTML = `<span class="av" style="background:${ME.color}">${ME.av}</span><div><b>${ME.name}</b><span>${ME.label}</span></div><a href="index.html" id="logout">로그아웃</a>`;
  $('#logout').onclick = async e => {
    if (!PROFILE || !SB) return;
    e.preventDefault(); await SB.auth.signOut(); location.href = 'index.html';
  };
  const foot = $('#adminApply');
  if (foot) { foot.hidden = !(PROFILE && USER && !CENTER); foot.innerHTML = adminApplyLink(); bindAdminApplyLink(); }
  document.title = `${ROLE === 'admin' ? '센터 관리' : ROLE === 'owner' || ROLE === 'teacher' ? DATA.academy.name : ME.name} — 학원지원센터`;
}

function render() {
  const parts = (location.hash || '#home').slice(1).split('/');
  const r = resolve(parts);
  renderChrome(r.area);
  // "← 이전": 바로 전에 본 화면으로 한 단계만 (처음 연 화면이면 한 단계 위로)
  const up = r.crumbs.length > 1 ? r.crumbs[r.crumbs.length - 2][1] : '';
  const crumbs = r.crumbs.length ? `<div class="crumb-row"><button class="btn sm back-btn" type="button" data-back="${up}">‹ 이전</button><nav class="crumbs">${r.crumbs.map(([l, h], i) =>
    i < r.crumbs.length - 1 ? `<a href="${h}" data-up>${esc(l)}</a><span>›</span>` : `<b>${esc(l)}</b>`).join('')}</nav></div>` : '';
  // 실제 데이터로 연결된 화면이 아니면 "예시"라고 알려 줘요
  const REAL_PAGES = {
    owner: ['home', 'admin', 'teachers', 'members', 'mou', 'promo', 'center'],
    teacher: ['home', 'attend', 'learn', 'jobs', 'center'], parent: ['home', 'kid', 'news', 'abroad', 'center'], student: ['home', 'attend', 'news', 'center'], admin: ['home', 'center']
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
  on('[data-act="addInvoice"]', () => REAL.students.length ? invoiceDialog(null) : billMonthDialog());
  on('[data-edit-inv]', b => invoiceDialog(REAL.invoices.find(i => i.id === b.dataset.editInv)));
  on('[data-pay-inv]', b => payInvoice(b.dataset.payInv));
  on('[data-copy-inv]', b => copyText(invNotice(REAL.invoices.find(i => i.id === b.dataset.copyInv)), '안내 문구를 복사했어요 · 문자나 카톡에 붙여 넣으세요'));
  on('[data-act="copyAllInv"]', () => {
    const list = REAL.invoices.filter(i => i.month === MONTH && !i.paid_at);
    copyText(list.map(invNotice).join('\n\n'), `미납 ${list.length}건 안내 문구를 복사했어요`);
  });
  on('[data-act="addExpense"]', () => expenseDialog(null));
  on('[data-edit-exp]', (b, e) => { e.preventDefault(); expenseDialog(REAL.expenses.find(x => x.id === b.dataset.editExp)); });
  on('[data-act="addPaper"]', () => paperDialog(null));
  on('[data-act="presetPaper"]', addPaperPresets);
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
      const again = t.reflections.some(r => r.mine);
      submit.disabled = true;
      const { error } = again
        ? await SB.from('training_reflections').update({ body: text }).eq('video_id', t.id).eq('user_id', USER.id)
        : await SB.from('training_reflections').insert({ video_id: t.id, body: text });
      submit.disabled = false;
      if (error) { toast('제출하지 못했어요. 다시 시도해 주세요.'); return; }
      editingReflect = false; await loadTraining(); render(); toast(again ? '리플렉션을 고쳤어요' : '제출했어요 · 이수 완료');
      return;
    }
    t.reflections.push({ who: ME.name, at: '10/25', text });
    t.status[ME.name] = 'done';
    render(); toast('제출했어요 · 이수 완료');
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
window.addEventListener('hashchange', () => { trackTrail(); if (MY) { editingReflect = false; render(); window.scrollTo(0, 0); } });

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
const adminApplyLink = () => `<a class="admin-apply-link" href="app.html#apply-admin" data-apply-admin>${ic('shield')}센터 본부 직원이세요? <b>센터 관리자 신청</b></a>`;
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
const loadPaperwork = () => loadRows('paperwork', 'created_at');
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
    if (ROLE === 'teacher') {
      const m = own.find(r => r.video_id === x.id);
      status[ME.name] = m ? 'done' : 'todo';
      if (m) reflections.push({ who: PROFILE.name || PROFILE.username || '나', at: md(m.created_at.slice(0, 10)), text: m.body, mine: true });
    } else teachers.forEach(t => {
      const r = report.find(y => y.teacher_id === t.id && y.video_id === x.id);
      status[t.name] = r ? 'done' : 'todo';
      if (r) reflections.push({ who: t.raw, at: md(r.done_at.slice(0, 10)), text: r.body });
    });
    return { id: x.id, title: esc(x.title), rawTitle: x.title, cat: esc(x.category), len: esc(x.length || ''), due: x.due ? md(x.due) : '없음',
      desc: esc(x.description || ''), url: x.video_url, status, reflections };
  });
}
// 센터 관리자: 모든 영상 · 리플렉션 수 · 지원 신청 · 제휴 신청 · 유학 연결 요청 · 관리자 명단
async function loadCenter() {
  const newest = t => SB.from(t).select('*').order('created_at', { ascending: false });
  const [v, r, q, a, pa, ab, mk, aa] = await Promise.all([
    newest('training_videos'), SB.from('training_reflections').select('video_id'), newest('support_requests'),
    SB.rpc('list_center_admins'), newest('partner_applications'), newest('abroad_requests').in('status', ['forwarded', 'done']),
    newest('promo_requests'), SB.rpc('list_admin_applications')
  ]);
  const done = {};
  (r.data || []).forEach(x => { done[x.video_id] = (done[x.video_id] || 0) + 1; });
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
      ROLE = 'admin'; MY = { center: CENTER_AREA };
      const nm = esc(PROFILE.name || user.user_metadata?.full_name || PROFILE.username || (user.email || '관리자').split('@')[0]);
      ME = { name: nm, av: nm[0], label: '센터 관리자', color: 'var(--navy-700)' };
      DATA.today = todayText();
      render(); return;
    }
    PROFILE.role = mem[0].role; // 실제 역할은 초대 코드로 정해진 소속 역할
    useProfile();
    REAL = { academy: mem[0].academies, role: mem[0].role, students: [], codes: [], members: [],
      attend: { day: TODAY, map: {} }, invoices: [], expenses: [], paperwork: [],
      jobs: [], applicants: [], partnerApps: [], abroad: { promos: [], requests: [] },
      family: [], notices: [], noticeStats: {}, promoReqs: [], kids: [], kidAttend: [], kidBills: [], reads: new Set() };
    useAcademy();
    if (ROLE === 'owner' || ROLE === 'teacher') await Promise.all([loadStudents(), loadLeads(), loadAttendance(), loadTraining()]);
    if (ROLE === 'owner') await Promise.all([loadInvite(), loadInvoices(), loadExpenses(), loadPaperwork(), loadJobs(), loadPartnerApps(),
      loadFamilyMembers(), loadNotices(), loadPromoReqs()]);
    if (ROLE === 'teacher') await loadJobBoard();
    if (ROLE === 'parent' || ROLE === 'student') { await loadFamily(); MY = FAMILY_AREAS[ROLE]; }
    await loadAbroad();
    if (CENTER) MY = { ...MY, center: CENTER_AREA }; // 센터 관리자이면서 원장·강사인 분은 메뉴에 "센터 관리"가 더 생겨요
  }
  render();
}
boot();
