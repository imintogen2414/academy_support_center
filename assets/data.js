// 시안용 예시 데이터 — 나중에 Supabase 테이블로 옮길 구조 그대로 둡니다
const DATA = {
  today: '2026년 10월 25일 (일)',
  academy: { name: '하늘영어학원', short: '하', area: '수원 영통구', students: 53 },

  users: {
    owner: { name: '정수민', label: '원장', av: '정', color: 'var(--blue-600)' },
    teacher: { name: '김민지', label: '강사', av: '김', color: '#17a06b' },
    parent: { name: '김은정', label: '학부모', av: '김', color: '#c98a12' },
    student: { name: '이서연', label: '학생 · 초5', av: '서', color: '#7c85ff' }
  },

  /* ---------- 행정 지원 ---------- */
  attendance: [
    { cls: '초등 A반', time: '15:00', total: 12, present: 12, absent: 0 },
    { cls: '초등 B반', time: '17:00', total: 14, present: 12, absent: 1 },
    { cls: '중등 기초반', time: '18:30', total: 15, present: 14, absent: 1 },
    { cls: '고등 심화반', time: '20:00', total: 12, present: 10, absent: 0 }
  ],
  billing: { month: '10월', total: 48, paid: 42, unpaidAmount: 196 },
  unpaid: [
    { name: '최지호', cls: '중등 기초반', amount: 32, days: 12 },
    { name: '한서윤', cls: '초등 B반', amount: 30, days: 8 },
    { name: '오준서', cls: '고등 심화반', amount: 38, days: 5 },
    { name: '김도하', cls: '초등 A반', amount: 30, days: 3 }
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

  /* ---------- 제휴(MOU) — 센터가 미리 맺어 둔 제휴처 ---------- */
  partners: [
    { id: 'p1', cat: '교재', name: '교재 공동구매', benefit: '교재 구입비 최대 18% 할인', desc: '주요 출판사 교재를 센터 단가로 주문해요.', status: 'using', saved: 20 },
    { id: 'p2', cat: '결제', name: '카드 결제(PG)', benefit: '수수료 2.3% → 1.6%', desc: '수납 화면과 바로 연결돼요. 월 1,480만 원 기준 약 10만 원 절감.', status: 'none' },
    { id: 'p3', cat: '보험', name: '학원 배상책임보험', benefit: '단체 가입 보험료 25% 할인', desc: '원생 상해·시설 배상을 한 번에 보장해요.', status: 'none' },
    { id: 'p4', cat: '차량', name: '셔틀 차량 리스', benefit: '월 리스료 12% 할인', desc: '어린이 통학버스 신고 서류까지 함께 지원해요.', status: 'none' },
    { id: 'p5', cat: '세무', name: '학원 전문 세무사', benefit: '기장료 첫 3개월 무료', desc: '재정 화면 자료를 그대로 넘겨 신고해요.', status: 'using', saved: 0 },
    { id: 'p6', cat: '시설', name: '인테리어·간판', benefit: '시공비 10% 할인 · 무료 실측', desc: '학원 시설 기준에 맞춘 시공 업체를 연결해요.', status: 'none' }
  ],

  /* ---------- 홍보 지원 (인투마케팅 연결) ---------- */
  marketingUrl: 'https://intomarketing.co.kr',
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
    { name: '이서연', grade: '초5', cls: '초등 B반', parent: '김은정', phone: '010-****-2481', attend: 98, paid: true },
    { name: '박하은', grade: '중1', cls: '중등 기초반', parent: '박상훈', phone: '010-****-7710', attend: 100, paid: true },
    { name: '최지호', grade: '중2', cls: '중등 기초반', parent: '이미영', phone: '010-****-3092', attend: 86, paid: false },
    { name: '한서윤', grade: '초4', cls: '초등 B반', parent: '한지원', phone: '010-****-5521', attend: 92, paid: false },
    { name: '오준서', grade: '고1', cls: '고등 심화반', parent: '오세훈', phone: '010-****-1187', attend: 95, paid: false },
    { name: '김도하', grade: '초2', cls: '초등 A반', parent: '김나래', phone: '010-****-6634', attend: 97, paid: false },
    { name: '정예린', grade: '고2', cls: '고등 심화반', parent: '정민수', phone: '010-****-9045', attend: 99, paid: true },
    { name: '임서아', grade: '초6', cls: '초등 B반', parent: '임하나', phone: '010-****-2210', attend: 94, paid: true }
  ],
  notices: [
    { title: '11월 학부모 설명회 안내', to: '전체 학부모', at: '10/24', read: 41, total: 53 },
    { title: '10월 수강료 납부 안내', to: '미납 가정', at: '10/20', read: 5, total: 6 },
    { title: '중등 기초반 단어시험 범위', to: '중등 기초반', at: '10/18', read: 15, total: 15 }
  ],

  /* ---------- 학부모 · 학생 화면 ---------- */
  child: {
    name: '이서연', grade: '초5', academies: 3,
    today: [
      { time: '15:00', what: '한빛태권도', where: '같은 건물 2층' },
      { time: '17:00', what: '하늘영어학원 · 초등 B반', where: '단어시험 있음' },
      { time: '19:00', what: '바른수학학원', where: '숙제 확인' }
    ],
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
