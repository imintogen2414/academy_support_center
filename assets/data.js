// 시안용 예시 데이터 — 나중에 Supabase 테이블로 옮길 구조 그대로 둡니다
const DATA = {
  today: '', // app.js가 실제 오늘 날짜로 채워요
  academy: { name: '하늘영어학원', short: '하', area: '수원 영통구', students: 53,
    pay: { bank: '국민', account: '000000-00-000000 (예시)', holder: '하늘영어학원', note: '아이 이름으로 보내 주세요 · 매달 10일까지' } },

  users: {
    owner: { name: '정수민', label: '원장', av: '정', color: 'var(--r-owner)' },
    teacher: { name: '김민지', label: '강사', av: '김', color: 'var(--r-teacher)' },
    parent: { name: '김은정', label: '학부모', av: '김', color: 'var(--r-parent)' },
    student: { name: '이서연', label: '학생 · 초5', av: '서', color: 'var(--r-student)' }
  },

  /* ---------- 행정 지원 ---------- */
  // 반별 오늘 출결 예시 — app.js가 오늘 요일에 수업이 있는 반만 남겨요(시각은 시간표에서)
  attendance: [
    { cls: '초등 A반', total: 12, present: 12, absent: 0 },
    { cls: '초등 B반', total: 14, present: 12, absent: 1 },
    { cls: '중등 기초반', total: 15, present: 14, absent: 1 },
    { cls: '고등 심화반', total: 12, present: 10, absent: 0 }
  ],
  billing: { month: '10월', total: 53 }, // 원생마다 한 건. 납부 · 미납 수와 미납 금액은 아래 unpaid 목록으로 계산해요 (days 0 = 오늘 마감)
  unpaid: [
    { name: '최지호', cls: '중등 기초반', amount: 32, days: 12 },
    { name: '한서윤', cls: '초등 B반', amount: 30, days: 8 },
    { name: '오준서', cls: '고등 심화반', amount: 38, days: 5 },
    { name: '김도하', cls: '초등 A반', amount: 30, days: 3 },
    { name: '윤채아', cls: '고등 심화반', amount: 38, days: 2 },
    { name: '박시우', cls: '초등 A반', amount: 30, days: 1 },
    { name: '이서연', cls: '초등 B반', amount: 30, days: 0 }
  ],
  finance: { income: 1480, expense: 960, items: [['강사 급여', 620], ['임대료', 220], ['교재비', 95], ['공과금·기타', 25]] },
  paperwork: [
    { title: '강사 채용 통보', org: '교육청', due: 'D-0', status: 'todo', desc: '신규 강사 채용 후 14일 안에 신고해요. 서식은 자동으로 채워져 있어요.' },
    { title: '교습비 변경 신고', org: '교육청', due: '11/15', status: 'doing', desc: '겨울학기 교습비 조정분을 신고해요.' },
    { title: '10월 원생 현황 보고', org: '교육청', due: '11/05', status: 'done', desc: '원생 수·반 편성 현황 보고서' },
    { title: '강사 4대보험 신고', org: '4대보험 공단', due: '11/10', status: 'todo', desc: '신규 강사 1명 취득 신고' }
  ],

  /* ---------- 강사 관리 ---------- */
  staff: [
    { name: '정하윤', cls: '중등 기초반', since: '2024.03' },
    { name: '이도현', cls: '고등 심화반', since: '2023.09' },
    { name: '김민지', cls: '초등 A·B반', since: '2026.09 · 수습' }
  ],
  // 학원지원센터 본부가 배부하는 강사 교육 영상
  training: [
    { id: 't1', title: '첫 상담에서 학부모 신뢰 얻는 법', cat: '상담', len: '18:30', due: '10/31', desc: '체험수업 뒤 학부모 상담에서 꼭 전해야 할 세 가지와 피해야 할 말.',
      status: { '정하윤': 'done', '이도현': 'done', '김민지': 'todo' },
      reflections: [
        { who: '정하윤', at: '10/22', text: '아이의 현재 수준을 먼저 구체적으로 말하는 순서가 인상적이었어요. 다음 상담부터 레벨테스트 결과를 한 장으로 정리해 보여드리려고 해요.' },
        { who: '이도현', at: '10/23', text: '"성적을 올려드릴게요" 같은 약속 대신 수업 계획을 보여주라는 부분이 와닿았습니다.' }
      ] },
    { id: 't2', title: '집중력이 짧은 초등 수업 설계', cat: '수업', len: '22:10', due: '11/07', desc: '10분 단위 활동 전환과 참여를 끌어내는 질문법.',
      status: { '정하윤': 'done', '이도현': 'todo', '김민지': 'todo' },
      reflections: [{ who: '정하윤', at: '10/24', text: '활동 전환 신호를 정해 두는 방법을 중등반에도 적용해 볼 생각이에요.' }] },
    { id: 't3', title: '아동학대 예방 · 안전 교육 (필수)', cat: '필수', len: '30:00', due: '11/30', desc: '학원 종사자 필수 이수 교육. 이수증이 자동으로 발급돼요.',
      status: { '정하윤': 'done', '이도현': 'done', '김민지': 'done' },
      reflections: [] },
    { id: 't4', title: '숙제 피드백, 짧고 정확하게', cat: '수업', len: '15:45', due: '11/14', desc: '학생이 다시 읽고 싶어지는 피드백 문장 만들기.',
      status: { '정하윤': 'todo', '이도현': 'todo', '김민지': 'todo' },
      reflections: [] }
  ],
  // 강사 채용 공고 (mine = 우리 학원 공고)
  // 수강료 할인 예시 [이름, 받는 학생 수] · [학생, 반, 원가, 실제 받은 금액, 할인 내역]
  discounts: [['형제 할인 10%', 3], ['장기 등록 20,000원', 5], ['재원생 추천 5%', 1]],
  discountSamples: [['이서연', '초등 B반', 300000, 270000, '형제 할인 10%'], ['박준호', '중등 A반', 350000, 330000, '장기 등록 20,000원']],
  jobs: [
    { id: 'j1', academy: '하늘영어학원', mine: true, title: '초등부 영어 강사 (파트타임)', area: '수원 영통구', type: '파트타임', pay: '시급 2.2만 원', hours: '평일 15–20시', due: '11/10',
      applicants: [
        { name: '박지수', career: '경력 3년 · 초등 영어', at: '10/24', step: '면접 예정 10/28' },
        { name: '윤가람', career: '신입 · 영어교육과 졸업', at: '10/23', step: '서류 검토' },
        { name: '서하늘', career: '경력 5년 · 파닉스 전문', at: '10/21', step: '서류 검토' }
      ] },
    { id: 'j2', academy: '바른수학학원', title: '중등 수학 전임 강사', area: '수원 영통구', type: '전임', pay: '월 280만 원~', hours: '평일 14–22시', due: '11/03' },
    { id: 'j3', academy: '새봄국어논술', title: '초등 독서논술 강사', area: '용인 수지구', type: '파트타임', pay: '시급 2.5만 원', hours: '화·목 16–20시', due: '11/15' },
    { id: 'j4', academy: '하늘영어학원 동탄점', title: '고등 영어 강사 (주말)', area: '화성 동탄', type: '파트타임', pay: '시급 3만 원', hours: '토·일 10–18시', due: '11/20' }
  ],

  /* ---------- 제휴(MOU) — 센터가 미리 맺어 둔 제휴처. 중심은 유학(인투유학) ---------- */
  abroadUrl: 'https://intoabroad.com',
  partners: [
    { id: 'a1', cat: '유학', name: '방학 해외 영어캠프', benefit: '재원생 단체 참가 · 인솔 교사 동행', desc: '여름·겨울방학 2~4주 해외 캠프. 학원 이름으로 단체 모집해요.', status: 'using', note: '겨울캠프 참가 6명' },
    { id: 'a2', cat: '유학', name: '초·중·고 조기유학', benefit: '학부모 1:1 유학 상담 연결', desc: '국가·학교 선택부터 홈스테이, 현지 관리까지 전문 상담사가 함께해요.', status: 'none' },
    { id: 'a3', cat: '유학', name: '단기 어학연수', benefit: '재원생 · 학부모 특별 조건', desc: '학원에서 배운 영어를 현지에서 써 보는 1~12주 연수예요.', status: 'none' },
    { id: 'a4', cat: '유학', name: '해외 대학 진학', benefit: '고등부 진학 상담 연계', desc: '해외 대학 · 파운데이션 과정 진학 설계와 서류 준비를 도와요.', status: 'none' },
    { id: 'a5', cat: '유학', name: '유학 설명회 공동 개최', benefit: '학원에서 설명회 · 전문가 파견', desc: '학부모 대상 설명회를 학원에서 함께 열어 신규 상담으로 이어지게 해요.', status: 'none' },
    { id: 'p1', cat: '그 밖의 제휴', name: '교재 공동구매', benefit: '교재 구입비 할인', desc: '주요 출판사 교재를 센터 단가로 주문해요.', status: 'using', saved: 20 },
    { id: 'p2', cat: '그 밖의 제휴', name: '카드 결제(PG)', benefit: '카드 수수료 인하', desc: '수납 화면과 바로 연결돼요.', status: 'none' },
    { id: 'p3', cat: '그 밖의 제휴', name: '학원 배상책임보험', benefit: '단체 가입 할인', desc: '원생 상해 · 시설 배상을 한 번에 보장해요.', status: 'none' }
  ],

  // 학부모 유학 상담: 원장이 안내 → 학부모가 신청 → 원장 확인 → 센터(인투유학)에 연결 요청
  abroad: {
    promos: [
      { id: 'ap1', program: '방학 해외 영어캠프', title: '겨울방학 필리핀 영어캠프 (4주)', body: '인솔 교사가 함께 가는 재원생 단체 캠프예요. 오전 1:1 수업, 오후 액티비티로 진행해요.', event_date: '2027-01-04', active: true },
      { id: 'ap2', program: '유학 설명회', title: '11월 조기유학 · 어학연수 설명회', body: '인투유학 유학 상담사가 학원에 직접 와서 국가별 비용과 준비 과정을 설명해 드려요.', event_date: '2026-11-15', active: true }
    ],
    requests: [
      { id: 'ar1', promo_id: 'ap1', program: '방학 해외 영어캠프', parent_name: '김은정', phone: '010-0000-2481', student_name: '이서연', student_grade: '초5', memo: '처음 보내는 거라 안전이 걱정돼요.', status: 'new', created_at: '2026-10-24' },
      { id: 'ar2', promo_id: 'ap2', program: '유학 설명회', parent_name: '박상훈', phone: '010-0000-7710', student_name: '박하은', student_grade: '중1', memo: null, status: 'forwarded', owner_memo: '설명회 전에 개별 상담 원하심', created_at: '2026-10-21' }
    ]
  },

  /* ---------- 홍보 지원 (인투마케팅 연결) ---------- */
  marketingUrl: 'https://intomarketing.co.kr',
  /* ---------- 일정 · 시간표 (예시: 날짜는 app.js가 이번 달로 맞춰요) ---------- */
  timetable: [
    { id: 'tt1', class_name: '초등 A반', weekday: 1, start_time: '15:00', end_time: '16:20', subject: '파닉스', room: '1강의실', teacher_name: '김민지' },
    { id: 'tt2', class_name: '초등 B반', weekday: 1, start_time: '16:30', end_time: '18:00', subject: '리딩', room: '2강의실', teacher_name: '김민지', note: '단어 시험' },
    { id: 'tt3', class_name: '중등 기초반', weekday: 2, start_time: '18:00', end_time: '19:30', subject: '문법', room: '1강의실', teacher_name: '정하윤' },
    { id: 'tt8', class_name: '고등 심화반', weekday: 2, start_time: '20:00', end_time: '21:30', subject: '수능 독해', room: '3강의실', teacher_name: '이도현' },
    { id: 'tt4', class_name: '초등 B반', weekday: 3, start_time: '16:30', end_time: '18:00', subject: '라이팅', room: '2강의실', teacher_name: '김민지' },
    { id: 'tt5', class_name: '초등 A반', weekday: 4, start_time: '15:00', end_time: '16:20', subject: '파닉스', room: '1강의실', teacher_name: '김민지' },
    { id: 'tt6', class_name: '중등 기초반', weekday: 4, start_time: '18:00', end_time: '19:30', subject: '독해', room: '1강의실', teacher_name: '정하윤', note: '교재 3단원' },
    { id: 'tt9', class_name: '고등 심화반', weekday: 4, start_time: '20:00', end_time: '21:30', subject: '어법 · 어휘', room: '3강의실', teacher_name: '이도현' },
    { id: 'tt7', class_name: '초등 B반', weekday: 5, start_time: '16:30', end_time: '18:00', subject: '스피킹', room: '2강의실', teacher_name: '김민지' },
    { id: 'tt10', class_name: '고등 심화반', weekday: 6, start_time: '10:00', end_time: '12:00', subject: '모의고사 풀이', room: '3강의실', teacher_name: '이도현' }
  ],
  events: [
    { id: 'ev1', d: 3, kind: '시험', title: '월말 평가', target_class: null, start_time: '16:00', detail: '시험지 반별 출력 · 결과는 다음 날 학부모 공지' },
    { id: 'ev2', d: 9, kind: '설명회', title: '겨울방학 특강 설명회', start_time: '19:00', end_time: '20:00', detail: '인투마케팅 전단지 배포' },
    { id: 'ev3', d: 15, end: 17, kind: '휴원', title: '학원 정기 휴원' },
    { id: 'ev4', d: 22, kind: '행사', title: '할로윈 영어 파티', target_class: '초등 B반', detail: '간식 결재 완료' }
  ],

  /* ---------- 자료실 (예시) ---------- */
  libraryFolders: [{ id: 'f1', name: '초등 B반', sort: 0 }, { id: 'f2', name: '학부모 안내', sort: 1 }, { id: 'f3', name: '행정 서식', sort: 2 }],
  library: [
    { id: 'l1', folder_id: 'f1', title: '11월 초등 B반 단어장', category: '수업 자료', visibility: 'class', target_class: '초등 B반', uploader_name: '김민지', uploader_role: 'teacher', created_at: '2026-10-24T09:00:00Z', file_path: 'x', file_name: '11월_단어장.pdf', file_size: 820000, mime: 'application/pdf', description: '매주 월요일 단어 시험 범위예요.' },
    { id: 'l2', folder_id: 'f2', title: '겨울방학 특강 안내문', category: '학부모 안내', visibility: 'everyone', uploader_name: '정수민', uploader_role: 'owner', created_at: '2026-10-22T09:00:00Z', file_path: 'x', file_name: '겨울특강_안내.pdf', file_size: 1400000, mime: 'application/pdf' },
    { id: 'l3', folder_id: 'f3', title: '수업 일지 양식', category: '행정 서식', visibility: 'staff', uploader_name: '정수민', uploader_role: 'owner', created_at: '2026-10-20T09:00:00Z', file_path: 'x', file_name: '수업일지.xlsx', file_size: 24000, mime: 'application/vnd.ms-excel' },
    { id: 'l4', title: '리딩 수업 아이디어 모음', category: '강사 공유', visibility: 'private', uploader_name: '김민지', uploader_role: 'teacher', created_at: '2026-10-18T09:00:00Z', link_url: 'https://docs.google.com' }
  ],

  /* ---------- 결재 (강사 → 원장) ---------- */
  approvals: [
    { id: 'a1', kind: '물품 구입', title: '초등 B반 화이트보드 마커 12개', amount: 28000, requester_name: '김민지', detail: '검정 6 · 파랑 3 · 빨강 3\n쿠팡 링크로 주문할게요.', want_by: '2026-10-28', status: 'pending', created_at: '2026-10-25T09:00:00Z' },
    { id: 'a2', kind: '재정 지출', title: '할로윈 특강 간식비', amount: 60000, requester_name: '정하윤', detail: '20명 · 쿠키와 음료', status: 'pending', created_at: '2026-10-24T09:00:00Z' },
    { id: 'a3', kind: '물품 구입', title: '중등 문법 교재 15권', amount: 210000, requester_name: '이도현', status: 'approved', owner_comment: '이번 주 안에 주문해 주세요.', decided_at: '2026-10-22T09:00:00Z', created_at: '2026-10-21T09:00:00Z' }
  ],

  promoServices: [
    { id: 'blog', name: '블로그 지원', icon: 'doc', desc: '학원 소개·수업 후기·설명회 포스팅을 전문 작가가 써 드려요.', items: ['네이버 블로그 정기 포스팅', '지역 키워드 상위 노출', '설명회·특강 홍보 글'] },
    { id: 'design', name: '디자인 지원', icon: 'page', desc: '전단지·현수막·카드뉴스까지 학원 이미지에 맞춰 만들어요.', items: ['전단지 · 현수막 · 배너', 'SNS 카드뉴스', '학원 로고 · 간판 시안'] },
    { id: 'video', name: '영상 지원', icon: 'video', desc: '학원 소개 영상과 숏폼을 촬영·편집해 드려요.', items: ['학원 소개 영상 촬영', '릴스 · 쇼츠 숏폼 편집', '설명회 영상'] },
    { id: 'sns', name: 'SNS · 광고 운영', icon: 'megaphone', desc: '인스타그램 운영과 지역 광고를 맡아 성과를 보고해요.', items: ['인스타그램 계정 운영', '네이버 · 메타 지역 광고', '월간 성과 리포트'] }
  ],
  promoRequests: [
    { svc: '블로그 지원', title: '겨울방학 특강 포스팅 4건', at: '10/20', step: '진행 중', progress: 50 },
    { svc: '디자인 지원', title: '11월 설명회 전단지', at: '10/18', step: '시안 확인 필요', progress: 80 }
  ],

  /* ---------- 학생·학부모 관리 ---------- */
  stages: [
    { id: 'inquiry', name: '문의' },
    { id: 'consult', name: '상담' },
    { id: 'trial', name: '체험수업' },
    { id: 'enrolled', name: '등록' }
  ],
  leads: [
    { id: 1, name: '박하은', grade: '중1', want: '중등 기초반', src: '네이버 플레이스', stage: 'enrolled', next: '첫 수업 10/27 (월)' },
    { id: 2, name: '이도윤', grade: '초3', want: '초등 A반', src: '재원생 추천', stage: 'trial', next: '체험수업 오늘 17:00' },
    { id: 3, name: '최서준', grade: '초5', want: '초등 B반', src: '인스타그램', stage: 'trial', next: '체험 후 연락 필요' },
    { id: 4, name: '한유진', grade: '중2', want: '중등 기초반', src: '네이버 플레이스', stage: 'consult', next: '상담 10/26 (월) 16:00' },
    { id: 5, name: '오지민', grade: '고1', want: '고등 심화반', src: '블로그', stage: 'consult', next: '레벨테스트 예약' },
    { id: 6, name: '윤채원', grade: '초2', want: '초등 A반', src: '네이버 플레이스', stage: 'inquiry', next: '오늘 전화 필요', urgent: true },
    { id: 7, name: '송민호', grade: '중3', want: '중등 기초반', src: '전단지', stage: 'inquiry', next: '오늘 전화 필요', urgent: true }
  ],
  students: [
    { name: '이서연', grade: '초5', cls: '초등 B반', parent: '김은정', phone: '010-0000-2481', attend: 98, paid: false },
    { name: '박하은', grade: '중1', cls: '중등 기초반', parent: '박상훈', phone: '010-0000-7710', attend: 100, paid: true },
    { name: '최지호', grade: '중2', cls: '중등 기초반', parent: '이미영', phone: '010-0000-3092', attend: 86, paid: false },
    { name: '한서윤', grade: '초4', cls: '초등 B반', parent: '한지원', phone: '010-0000-5521', attend: 92, paid: false },
    { name: '오준서', grade: '고1', cls: '고등 심화반', parent: '오세훈', phone: '010-0000-1187', attend: 95, paid: false },
    { name: '김도하', grade: '초2', cls: '초등 A반', parent: '김나래', phone: '010-0000-6634', attend: 97, paid: false },
    { name: '정예린', grade: '고2', cls: '고등 심화반', parent: '정민수', phone: '010-0000-9045', attend: 99, paid: true },
    { name: '임서아', grade: '초6', cls: '초등 B반', parent: '임하나', phone: '010-0000-2210', attend: 94, paid: true }
  ],
  notices: [
    { title: '11월 학부모 설명회 안내', to: '전체 학부모', at: '10/24', read: 41, total: 53 },
    { title: '10월 수강료 납부 안내', to: '미납 가정', at: '10/20', read: 5, total: 6 },
    { title: '중등 기초반 단어시험 범위', to: '중등 기초반', at: '10/18', read: 15, total: 15 }
  ],

  /* ---------- 학부모 · 학생 화면 ---------- */
  child: {
    name: '이서연', grade: '초5', cls: '초등 B반', academies: 3,
    // 요일마다 다니는 학원 (0 일 ~ 6 토) — app.js가 오늘 요일 것만 "오늘 일정"으로 보여 줘요
    week: [
      { days: [1, 2, 3, 4, 5], time: '15:00', what: '한빛태권도', where: '같은 건물 2층' },
      { days: [1, 3, 5], time: '16:30', what: '하늘영어학원 · 초등 B반', where: '단어시험 있음' },
      { days: [2, 4], time: '19:00', what: '바른수학학원', where: '숙제 확인' },
      { days: [6], time: '11:00', what: '바른수학학원 · 주말 보충', where: '선택 수업' }
    ],
    today: [],
    homework: [
      { what: 'Unit 7 단어 20개 외우기', acad: '하늘영어학원', done: true },
      { what: '수학 익힘책 42–45쪽', acad: '바른수학학원', done: false },
      { what: '리딩 워크북 p.30', acad: '하늘영어학원', done: false }
    ],
    bills: [
      { acad: '하늘영어학원', month: '10월', amount: 30, due: 'D-0', paid: false },
      { acad: '한빛태권도', month: '10월', amount: 15, due: '완료', paid: true },
      { acad: '바른수학학원', month: '10월', amount: 32, due: '완료', paid: true }
    ],
    record: { attend: 98, lastTest: 'Unit 6 단어시험 19/20', comment: '리딩 속도가 눈에 띄게 빨라졌어요. 이번 달엔 쓰기 연습을 늘려 볼게요. — 김민지 선생님' }
  }
};

// 예시 원생: 위에 적은 학생 + 반별 오늘 출결 인원(attendance의 total)만큼 이름을 채워요.
// 그래서 원생 수 · 담당 반 원생 · 출결 · 수납(미납 목록) 숫자가 어느 화면에서나 서로 맞아요. 연락처는 010-0000-으로 시작하는 가짜 번호예요.
(() => {
  const fam = '김이박최정강조윤장임한오서신권황안송류홍', given = ['민준', '서준', '하준', '도윤', '지우', '하윤', '지아', '수아', '예준', '시윤', '주원', '유나', '채원', '지민', '은우', '하린', '윤서', '도현', '다은', '건우', '소율', '시아', '태윤', '나은'];
  const grades = { '초등 A반': ['초2', '초3'], '초등 B반': ['초4', '초5', '초6'], '중등 기초반': ['중1', '중2'], '고등 심화반': ['고1', '고2'] };
  const owed = new Set(DATA.unpaid.map(u => u.name)), used = new Set(DATA.students.map(x => x.name));
  // 미납 목록에만 있는 학생도 명단에 넣어요
  DATA.unpaid.filter(u => !used.has(u.name)).forEach(u => { DATA.students.push({ name: u.name, grade: grades[u.cls][0], cls: u.cls, attend: 93 }); used.add(u.name); });
  let k = 0;
  DATA.attendance.forEach(c => {
    while (DATA.students.filter(x => x.cls === c.cls).length < c.total) {
      const nm = fam[k % fam.length] + given[(k * 7) % given.length]; k++;
      if (used.has(nm)) continue;
      used.add(nm);
      DATA.students.push({ name: nm, grade: grades[c.cls][k % grades[c.cls].length], cls: c.cls, attend: 85 + (k * 7) % 15 });
    }
  });
  DATA.students.forEach((x, i) => {
    x.id = x.id || `st${i + 1}`;
    x.parent = x.parent || fam[(i * 3 + 5) % fam.length] + ['정희', '미경', '성호', '지현', '수진', '동훈', '은영', '재훈'][i % 8];
    x.phone = x.phone || `010-0000-${String(3100 + i * 37).slice(-4)}`;
    x.paid = !owed.has(x.name);
  });
  DATA.academy.students = DATA.students.length;
  DATA.billing.total = DATA.students.length;
})();
