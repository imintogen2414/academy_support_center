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
  if (!items.length) items.push(['오늘 급하게 챙길 일은 없어요', '서류 마감 · 미납 · 출결 · 급한 문의를 살펴봤어요', '#admin', '<span class="chip good">여유</span>']);
  return items;
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

/* ---------- 입력 창 (원생 · 상담 등에서 함께 씀) ----------
   fields: [이름, 라벨, { type, placeholder, max, required, half, options }]
   half: 두 칸을 한 줄에. type: text(기본) · tel · date · month · number · select · check
   options: 글자 목록, 또는 [저장값, 보이는 글자] 목록. value: 새로 만들 때 기본값. createOnly: 새로 만들 때만 보이는 칸 */
const dialogEl = () => $('#dlg') || document.body.appendChild(Object.assign(document.createElement('dialog'), { id: 'dlg' }));
function formDialog({ title, table, fields: all, row, extra = {}, okText, label, after }) {
  const d = dialogEl();
  const fields = all.filter(f => !(row && f[2] && f[2].createOnly));
  const cur = (k, o) => row ? row[k] : o.value;
  const input = ([k, lab, o = {}]) => {
    const v = cur(k, o);
    if (o.type === 'check') return `<label class="chk-line"><input type="checkbox" name="${k}" ${v ? 'checked' : ''}><span>${lab}</span></label>`;
    const ctl = o.type === 'select'
      ? `<select name="${k}"><option value="">선택 안 함</option>${o.options.map(x => Array.isArray(x) ? x : [x, x]).map(([ov, ol]) => `<option value="${esc(ov)}" ${v === ov ? 'selected' : ''}>${esc(ol)}</option>`).join('')}</select>`
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
    <div class="acts">${row ? '<button type="button" class="btn danger" id="dlgDel">삭제</button>' : ''}<span style="flex:1"></span><button type="button" class="btn" id="dlgCancel">취소</button><button class="btn primary">${okText || '저장'}</button></div>
  </form>`;
  d.showModal();
  const fail = t => { const m = $('#dlgMsg'); m.textContent = t; m.hidden = false; };
  $('#dlgCancel').onclick = () => d.close();
  $('#dlgForm').onsubmit = async e => {
    e.preventDefault();
    const el = e.target.elements, data = {};
    for (const [k, lab, o = {}] of fields) {
      if (o.type === 'check') { data[k] = el[k].checked; continue; }
      const v = el[k].value.trim();
      if (o.required && !v) return fail(`${lab}을(를) ${o.type === 'select' ? '골라' : '적어'} 주세요.`);
      if (o.type === 'number' && v !== '' && !(Number(v) >= 0)) return fail(`${lab}은(는) 0 이상의 숫자로 적어 주세요.`);
      data[k] = v === '' ? null : o.type === 'number' ? Math.round(Number(v)) : v;
    }
    const q = row ? SB.from(table).update(data).eq('id', row.id) : SB.from(table).insert({ ...data, ...extra, academy_id: REAL.academy.id });
    const { error } = await q;
    if (error) return fail('저장하지 못했어요. 입력한 내용을 확인하고 다시 시도해 주세요.');
    d.close(); await after(); render(); toast(row ? '고쳤어요' : `${label(data)} 추가했어요`);
  };
  if (row) $('#dlgDel').onclick = async () => {
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
    attend: { name: '출결 입력', icon: 'attend', desc: '수업 중에 우리 반 출석 체크', stat: attendStat, render: attendPage },
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
  const realPages = ['members/students', 'members/invite', 'members/leads', 'admin', 'admin/attend', 'admin/billing', 'admin/finance', 'admin/paper', 'attend'];
  const isReal = realPages.includes(parts.slice(0, 2).join('/'));
  const note = PROFILE && !isReal ? `<div class="demo-note">${ROLE === 'owner'
    ? '행정 지원(출결·수납·재정·서류) · 상담·등록 · 원생 명단 · 초대 코드는 실제 데이터예요. 나머지 화면은 아직 예시예요.'
    : ROLE === 'teacher' ? '출결 입력은 실제 데이터예요. 나머지 화면은 아직 예시예요.'
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
  const t = day0(TODAY);
  DATA.today = `${t.getFullYear()}년 ${t.getMonth() + 1}월 ${t.getDate()}일 (${'일월화수목금토'[t.getDay()]})`;
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
    REAL = { academy: mem[0].academies, role: mem[0].role, students: [], codes: [], members: [],
      attend: { day: TODAY, map: {} }, invoices: [], expenses: [], paperwork: [] };
    useAcademy();
    if (ROLE === 'owner' || ROLE === 'teacher') await Promise.all([loadStudents(), loadLeads(), loadAttendance()]);
    if (ROLE === 'owner') await Promise.all([loadInvite(), loadInvoices(), loadExpenses(), loadPaperwork()]);
  }
  render();
}
boot();
