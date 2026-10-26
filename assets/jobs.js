// 강사 채용 게시판 — 첫 화면 "강사로 일하고 싶으세요?"(/jobs)와 프로그램 안 강사 "채용 공고"(#jobs)가 함께 써요
// 공고 모양은 DB public_job_board()가 돌려주는 줄과 같아요. 예시 공고(JOB_SAMPLES)도 같은 모양.
const JOB_TYPES = ['파트타임', '전임', '주말', '방학 특강'];
const ACADEMY_FIELDS = ['영어', '수학', '국어 · 논술', '과학', '사회 · 역사', '초등 종합', '입시 · 내신', '독서 · 글쓰기', '코딩 · SW', '제2외국어', '유아 · 놀이', '미술', '음악', '체육 · 태권도', '예체능 입시', '자격증 · 성인'];
const JOB_CAREERS = [['무관', '경력 무관'], ['신입', '신입'], ['경력', '경력']];
const JOB_EDU = ['학력 무관', '대학 재학 이상', '대졸 이상', '관련 전공', '석사 이상'];
const JOB_BENEFITS = ['4대보험', '퇴직금', '교재 · 커리큘럼 제공', '신입 연수', '센터 교육 지원', '식대 지원', '주차 가능', '방학 휴가', '성과급', '명절 상여', '경력 인정', '정규직 전환'];
const JOB_PROCESS = ['서류', '면접', '시범 강의', '최종 합격'];

const jbEsc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const jbYmd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const jbDays = due => due ? Math.round((new Date(`${due}T00:00`) - new Date(`${jbYmd(new Date())}T00:00`)) / 864e5) : null;
const jbDday = due => { const n = jbDays(due); return n == null ? '상시 모집' : n === 0 ? '오늘 마감' : n > 0 ? `D-${n}` : '마감'; };
const jbMd = s => s ? `${+s.slice(5, 7)}/${+s.slice(8, 10)}` : '';
const jbSido = area => String(area || '').split(' ')[0];
const jbCareer = j => j.career_level === '경력' ? `경력 ${j.career_years ? `${j.career_years}년↑` : ''}`.trim() : j.career_level === '신입' ? '신입' : '경력 무관';
const jbNew = j => j.created_at && (Date.now() - new Date(j.created_at)) / 864e5 < 3;

// 거르기 · 검색 · 정렬 (화면을 다시 그려도 기억해요)
const JB = { q: '', sido: '', field: '', type: '', career: '', sort: 'new', tab: 'jobs' };
function jbFilter(list) {
  const q = JB.q.trim().toLowerCase();
  return list.filter(j => (!JB.sido || jbSido(j.area) === JB.sido) && (!JB.field || j.academy_field === JB.field) && (!JB.type || j.job_type === JB.type)
      && (!JB.career || (j.career_level || '무관') === JB.career || (JB.career !== '경력' && (j.career_level || '무관') === '무관'))
      && (!q || [j.title, j.academy_name, j.subject, j.area, j.academy_field, j.description].some(x => String(x || '').toLowerCase().includes(q))))
    .sort((a, b) => JB.sort === 'due' ? (a.due || '9999').localeCompare(b.due || '9999') : String(b.created_at || '').localeCompare(String(a.created_at || '')));
}

// 공고 카드 한 줄 (사람인처럼: 학원 · 제목 · 조건 태그 · 급여 · 마감)
// o.href(j): 상세 주소, o.side(j): 오른쪽 버튼(지원하기 · 지원 완료 …)
function jbCard(j, o = {}) {
  const dd = jbDays(j.due);
  const tags = [jbSido(j.area) && j.area, jbCareer(j), j.education && j.education !== '학력 무관' ? j.education : '학력 무관', j.job_type].filter(Boolean);
  return `
  <article class="jb-card">
    <div class="jb-main">
      <span class="jb-acad">${jbEsc(j.academy_name || '')}${j.academy_field ? ` <i>${jbEsc(j.academy_field)}</i>` : ''}</span>
      <a class="jb-title" href="${o.href ? o.href(j) : '#'}">${jbEsc(j.title)}${jbNew(j) ? ' <em class="jb-new">NEW</em>' : ''}</a>
      <div class="jb-tags">${tags.map(t => `<span>${jbEsc(t)}</span>`).join('')}</div>
      <div class="jb-sub">${[j.subject, j.work_days, j.hours].filter(Boolean).map(jbEsc).join(' · ')}${(j.benefits || []).length ? ` · ${(j.benefits || []).slice(0, 3).map(jbEsc).join(', ')}` : ''}</div>
    </div>
    <div class="jb-side">
      <b class="jb-pay">${jbEsc(j.pay || '급여 협의')}</b>
      <span class="jb-dd ${dd != null && dd <= 3 ? 'soon' : ''}">${jbDday(j.due)}${j.due ? ` <small>~${jbMd(j.due)}</small>` : ''}</span>
      ${o.side ? o.side(j) : ''}
    </div>
  </article>`;
}

// 검색창 · 거르기 + 공고 목록
function jbBoard(posts, o = {}) {
  const sidos = [...new Set(posts.map(j => jbSido(j.area)).filter(Boolean))].sort();
  const fields = [...new Set(posts.map(j => j.academy_field).filter(Boolean))];
  const shown = jbFilter(posts);
  const sel = (k, label, opts) => `<select data-jb="${k}" aria-label="${label}"><option value="">${label}</option>${opts.map(x => Array.isArray(x) ? x : [x, x]).map(([v, l]) => `<option value="${jbEsc(v)}" ${JB[k] === v ? 'selected' : ''}>${jbEsc(l)}</option>`).join('')}</select>`;
  return `
  <div class="jb-bar">
    <label class="jb-search"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg><input data-jb="q" value="${jbEsc(JB.q)}" placeholder="학원 이름 · 과목 · 지역으로 찾기" enterkeyhint="search"></label>
    <div class="jb-filters">
      ${sel('sido', '지역 전체', sidos)}${sel('field', '분야 전체', fields)}${sel('type', '근무 형태', JOB_TYPES)}${sel('career', '경력', JOB_CAREERS)}
      ${sel('sort', '정렬', [['new', '최신순'], ['due', '마감 임박순']]).replace('<option value="">정렬</option>', '')}
    </div>
  </div>
  <div class="jb-count"><b>${shown.length}</b>건의 공고${shown.length !== posts.length ? ` <span>(전체 ${posts.length}건)</span> <button type="button" class="jb-reset" data-jb-reset>조건 지우기</button>` : ''}${o.note ? ` <span class="jb-note">${o.note}</span>` : ''}</div>
  <div class="jb-list">${shown.length ? shown.map(j => jbCard(j, o)).join('') : `<p class="jb-empty">${posts.length ? '조건에 맞는 공고가 없어요. 조건을 바꿔 보세요.' : '지금 모집 중인 공고가 없어요. 학원이 공고를 올리면 여기에 바로 나와요.'}</p>`}</div>`;
}

// 공고 상세: 모집 요강 · 하는 일 · 자격 요건 · 우대 · 복리후생 · 전형 절차 · 학원 정보
// o.cta: 지원 버튼 html, o.acad: 학원 정보 { name, region, field, intro, homepage }, o.others: 같은 학원 다른 공고, o.href
function jbDetail(j, o = {}) {
  const a = o.acad || {};
  const steps = j.process ? String(j.process).split(/\s*(?:→|>|,|·)\s*/).filter(Boolean) : JOB_PROCESS;
  const row = (k, v) => v ? `<div><dt>${k}</dt><dd>${v}</dd></div>` : '';
  const sec = (t, v) => v ? `<section class="jb-sec"><h3>${t}</h3><p>${jbEsc(v)}</p></section>` : '';
  return `
  <div class="jb-detail">
    <div class="jb-dhead">
      <span class="jb-acad">${jbEsc(j.academy_name || '')}${j.academy_field ? ` <i>${jbEsc(j.academy_field)}</i>` : ''}</span>
      <h2>${jbEsc(j.title)}</h2>
      <div class="jb-tags">${[j.area, jbCareer(j), j.education || '학력 무관', j.job_type].filter(Boolean).map(t => `<span>${jbEsc(t)}</span>`).join('')}</div>
      <div class="jb-dcta"><span class="jb-dd big">${jbDday(j.due)}</span>${o.cta || ''}</div>
    </div>
    <div class="jb-grid">
      <dl><h3>지원 자격</h3>${row('경력', jbEsc(jbCareer(j)))}${row('학력', jbEsc(j.education || '학력 무관'))}${row('모집 인원', j.headcount ? `${j.headcount}명` : '인원 미정')}${row('과목', jbEsc(j.subject))}</dl>
      <dl><h3>근무 조건</h3>${row('근무 형태', jbEsc(j.job_type))}${row('급여', jbEsc(j.pay || '협의'))}${row('근무 요일', jbEsc(j.work_days))}${row('근무 시간', jbEsc(j.hours))}${row('근무 지역', jbEsc(j.area))}</dl>
    </div>
    ${sec('하는 일', j.description)}${sec('자격 요건', j.requirements)}${sec('우대 사항', j.preferred)}
    ${(j.benefits || []).length ? `<section class="jb-sec"><h3>복리후생</h3><div class="jb-chips">${j.benefits.map(b => `<span>${jbEsc(b)}</span>`).join('')}</div></section>` : ''}
    <section class="jb-sec"><h3>전형 절차</h3><ol class="jb-steps">${steps.map(s => `<li>${jbEsc(s)}</li>`).join('')}</ol></section>
    <section class="jb-sec"><h3>접수 기간 · 방법</h3><p>${j.due ? `${j.due.replaceAll('-', '.')}까지 (${jbDday(j.due)})` : '채용될 때까지 상시 모집'} · 학원지원센터에서 바로 지원해요. 이력서와 센터 교육 이수 기록이 원장님께 함께 전달돼요.</p></section>
    ${a.name ? `<section class="jb-sec jb-acadbox"><h3>학원 정보</h3>
      <div class="jb-acad-head"><span class="jb-logo">${jbEsc(a.name[0])}</span><div><b>${jbEsc(a.name)}</b><small>${[a.region, a.field].filter(Boolean).map(jbEsc).join(' · ')}</small></div>${a.homepage ? `<a class="jb-link" href="${jbEsc(a.homepage)}" target="_blank" rel="noopener">홈페이지 ↗</a>` : ''}</div>
      ${a.intro ? `<p>${jbEsc(a.intro)}</p>` : '<p class="jb-muted">학원 소개가 아직 없어요.</p>'}
      ${(o.others || []).length ? `<div class="jb-others"><b>이 학원의 다른 공고</b>${o.others.map(x => `<a href="${o.href ? o.href(x) : '#'}">${jbEsc(x.title)} <small>${jbDday(x.due)}</small></a>`).join('')}</div>` : ''}
    </section>` : ''}
  </div>`;
}

// 가입한 학원 둘러보기 (채용 중인 학원 · 소개를 공개한 학원)
function jbAcademies(list, o = {}) {
  if (!list.length) return '<p class="jb-empty">아직 소개를 공개한 학원이 없어요.</p>';
  return `<div class="jb-acads">${list.map(a => `
    <article class="jb-acad-card">
      <div class="jb-acad-head"><span class="jb-logo">${jbEsc((a.name || '학')[0])}</span><div><b>${jbEsc(a.name)}</b><small>${[a.region, a.field].filter(Boolean).map(jbEsc).join(' · ')}</small></div></div>
      <p>${a.intro ? jbEsc(a.intro) : '<span class="jb-muted">학원 소개가 아직 없어요.</span>'}</p>
      ${a.open_jobs ? `<button type="button" class="jb-pill" data-jb-acad="${jbEsc(a.name)}">채용 중 ${a.open_jobs}건 보기 ›</button>` : '<span class="jb-pill off">지금은 채용 중이 아니에요</span>'}
    </article>`).join('')}</div>`;
}

// 공고 · 가입한 학원 탭
const jbTabs = (nPosts, nAcads) => `<div class="jb-tabs" role="tablist"><button type="button" role="tab" data-jb-tab="jobs" aria-selected="${JB.tab === 'jobs'}">채용 공고 <b>${nPosts}</b></button><button type="button" role="tab" data-jb-tab="acads" aria-selected="${JB.tab === 'acads'}">가입한 학원 <b>${nAcads}</b></button></div>`;

// 검색 · 거르기를 고르면 JB를 바꾸고 다시 그려요
function jbBind(root, rerender) {
  root.querySelectorAll('[data-jb]').forEach(el => {
    if (el.tagName === 'INPUT') {
      let t; el.oninput = () => { clearTimeout(t); t = setTimeout(() => { JB.q = el.value; rerender(); const n = root.querySelector('[data-jb="q"]'); if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); } }, 250); };
    } else el.onchange = () => { JB[el.dataset.jb] = el.value; rerender(); };
  });
  root.querySelectorAll('[data-jb-reset]').forEach(b => b.onclick = () => { Object.assign(JB, { q: '', sido: '', field: '', type: '', career: '' }); rerender(); });
  root.querySelectorAll('[data-jb-tab]').forEach(b => b.onclick = () => { JB.tab = b.dataset.jbTab; rerender(); });
  root.querySelectorAll('[data-jb-acad]').forEach(b => b.onclick = () => { Object.assign(JB, { q: b.dataset.jbAcad, sido: '', field: '', type: '', career: '', tab: 'jobs' }); rerender(); });
}

/* ---------- 예시 공고 · 학원 (실제 공고가 없을 때 · 예시 계정) ---------- */
const jbAfter = n => jbYmd(new Date(Date.now() + n * 864e5));
const jbAgo = n => new Date(Date.now() - n * 864e5).toISOString();
const JOB_SAMPLE_ACADEMIES = [
  { id: 'sa1', name: '하늘영어학원', region: '경기 수원시 영통구', field: '영어', intro: '초등 · 중등 영어 전문, 원생 120명. 파닉스부터 리딩 · 문법까지 자체 커리큘럼으로 가르쳐요. 강사님마다 수업 준비 시간을 따로 드려요.', open_jobs: 2 },
  { id: 'sa2', name: '바른수학학원', region: '경기 수원시 영통구', field: '수학', intro: '중 · 고등 내신 수학 전문. 소수 정예(반 8명 이하)로 운영하고, 강사 교육과 교재를 모두 지원해요.', open_jobs: 1 },
  { id: 'sa3', name: '새봄국어논술', region: '경기 용인시 수지구', field: '국어 · 논술', intro: '초등 독서논술 · 중등 국어. 책 읽고 토론하는 수업을 좋아하는 선생님을 기다려요.', open_jobs: 1 },
  { id: 'sa4', name: '동탄코딩랩', region: '경기 화성시', field: '코딩 · SW', intro: '초 · 중등 블록코딩 · 파이썬. 방학마다 캠프를 열어요.', open_jobs: 0 }
];
const JOB_SAMPLES = [
  { id: 's1', academy_id: 'sa1', academy_name: '하늘영어학원', academy_field: '영어', title: '초등부 영어 강사 (파트타임)', job_type: '파트타임', subject: '초등 영어 · 파닉스', pay: '시급 22,000원', hours: '15:00~20:00', work_days: '월~금', area: '경기 수원시 영통구', due: jbAfter(14), career_level: '무관', education: '대졸 이상', headcount: 1,
    description: '초등 3~6학년 영어 수업 (반 6~8명)\n숙제 확인 · 단어 시험 · 학부모 상담 보조', requirements: '영어로 수업할 수 있는 분\n주 5일 근무 가능한 분', preferred: '파닉스 · 리딩 수업 경험\nTESOL 등 관련 자격', benefits: ['교재 · 커리큘럼 제공', '신입 연수', '센터 교육 지원', '방학 휴가'], process: '서류 → 면접 → 시범 강의', created_at: jbAgo(1) },
  { id: 's2', academy_id: 'sa2', academy_name: '바른수학학원', academy_field: '수학', title: '중등 수학 전임 강사', job_type: '전임', subject: '중등 수학', pay: '월 280만 원~', hours: '14:00~22:00', work_days: '월~금', area: '경기 수원시 영통구', due: jbAfter(6), career_level: '경력', career_years: 2, education: '대졸 이상', headcount: 1,
    description: '중1~3 내신 · 선행 수업, 반 담임', requirements: '중등 수학 강의 경력 2년 이상', preferred: '수학 · 수학교육 전공\n고등 수업 가능', benefits: ['4대보험', '퇴직금', '성과급', '명절 상여'], process: '서류 → 면접 → 시범 강의 → 최종 합격', created_at: jbAgo(4) },
  { id: 's3', academy_id: 'sa3', academy_name: '새봄국어논술', academy_field: '국어 · 논술', title: '초등 독서논술 강사', job_type: '파트타임', subject: '독서논술', pay: '시급 25,000원', hours: '16:00~20:00', work_days: '화 · 목', area: '경기 용인시 수지구', due: jbAfter(20), career_level: '신입', education: '대학 재학 이상', headcount: 2,
    description: '초등 독서 토론 · 글쓰기 첨삭', requirements: '책 읽기와 아이들을 좋아하는 분', preferred: '국문 · 교육 전공\n독서지도사 자격', benefits: ['신입 연수', '교재 · 커리큘럼 제공'], process: '서류 → 면접', created_at: jbAgo(2) },
  { id: 's4', academy_id: 'sa1', academy_name: '하늘영어학원', academy_field: '영어', title: '고등 영어 강사 (주말)', job_type: '주말', subject: '고등 영어 내신', pay: '시급 30,000원', hours: '10:00~18:00', work_days: '토 · 일', area: '경기 화성시', due: jbAfter(2), career_level: '경력', career_years: 1, education: '대졸 이상', headcount: 1,
    description: '고1~2 내신 대비 수업 · 질문 받기', requirements: '고등 영어 강의 경력 1년 이상', preferred: '수능 영어 1등급', benefits: ['식대 지원', '주차 가능'], process: '서류 → 면접 → 시범 강의', created_at: jbAgo(8) }
];
