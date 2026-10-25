// 시안용 예시 데이터 — 나중에 Supabase 테이블로 옮길 구조 그대로 둡니다
const DATA = {
  today: '2026년 10월 25일 (일)',
  academy: { name: '하늘영어학원', short: '하', area: '수원 영통구', students: 53 },

  users: {
    owner: { name: '정수민', label: '원장', av: '정', color: 'var(--blue-600)' },
    teacher: { name: '김민지', label: '강사', av: '김', color: '#17a06b' },
    parent: { name: '김은정', label: '학부모', av: '김', color: '#c98a12' }
  },

  stages: [
    { id: 'inquiry', name: '문의' },
    { id: 'consult', name: '상담' },
    { id: 'trial', name: '체험수업' },
    { id: 'enrolled', name: '등록' }
  ],

  // 상담·등록 관리 (문의 → 상담 → 체험수업 → 등록)
  leads: [
    { id: 1, name: '박하은', grade: '중1', want: '중등 기초반', src: '네이버 플레이스', stage: 'enrolled', at: '10/24', next: '첫 수업 10/27 (월)' },
    { id: 2, name: '이도윤', grade: '초3', want: '초등 A반', src: '재원생 추천', stage: 'trial', at: '10/23', next: '체험수업 오늘 17:00' },
    { id: 3, name: '최서준', grade: '초5', want: '초등 B반', src: '인스타그램', stage: 'trial', at: '10/22', next: '체험 후 연락 필요' },
    { id: 4, name: '한유진', grade: '중2', want: '중등 기초반', src: '네이버 플레이스', stage: 'consult', at: '10/24', next: '상담 10/26 (월) 16:00' },
    { id: 5, name: '오지민', grade: '고1', want: '고등 심화반', src: '블로그', stage: 'consult', at: '10/23', next: '레벨테스트 예약' },
    { id: 6, name: '정우진', grade: '초4', want: '초등 B반', src: '재원생 추천', stage: 'consult', at: '10/21', next: '학부모 회신 대기' },
    { id: 7, name: '윤채원', grade: '초2', want: '초등 A반', src: '네이버 플레이스', stage: 'inquiry', at: '10/25', next: '오늘 전화 필요', urgent: true },
    { id: 8, name: '송민호', grade: '중3', want: '중등 기초반', src: '전단지', stage: 'inquiry', at: '10/25', next: '오늘 전화 필요', urgent: true },
    { id: 9, name: '강하린', grade: '성인', want: '성인 토익반', src: '지자체 청년 지원', stage: 'inquiry', at: '10/24', next: '지원금 자격 확인' },
    { id: 10, name: '임서아', grade: '초6', want: '초등 B반', src: '인스타그램', stage: 'enrolled', at: '10/20', next: '첫 수업 완료' }
  ],

  // 이번 달 누적 (위 목록은 진행 중인 건만 보여줌)
  funnel: { inquiry: 38, consult: 26, trial: 22, enrolled: 16, lastMonth: 27 },
  sources: [
    ['네이버 플레이스', 17, 7],
    ['재원생 추천', 8, 5],
    ['인스타그램', 7, 2],
    ['블로그', 3, 1],
    ['기타', 3, 1]
  ],

  // 강사 수업 영상
  videos: [
    { teacher: '김민지', cls: '초등 B반', title: 'Unit 7 리딩 도입', len: '14:20', at: '10/24', status: 'new', note: '수습 4주차' },
    { teacher: '이도현', cls: '고등 심화반', title: '모의고사 빈칸추론 해설', len: '18:05', at: '10/23', status: 'new' },
    { teacher: '정하윤', cls: '중등 기초반', title: '현재완료 개념 설명', len: '12:40', at: '10/22', status: 'new' },
    { teacher: '김민지', cls: '초등 A반', title: '파닉스 게임 활동', len: '10:12', at: '10/17', status: 'done', score: 4.2, comments: 5 }
  ],
  teachers: [
    { name: '정하윤', score: 4.6, trend: '+0.2', retention: 94 },
    { name: '이도현', score: 4.4, trend: '+0.1', retention: 91 },
    { name: '김민지', score: 4.2, trend: '첫 평가', retention: null }
  ],

  // 제휴 혜택
  perks: [
    { who: '교재사 MOU', title: '교재 구입비 최대 18% 할인', desc: '이번 달 교재 주문 115만 원 → 약 20만 원 절감 예상', joined: true },
    { who: 'PG사 MOU', title: '카드 결제 수수료 2.3% → 1.6%', desc: '월 수납 1,480만 원 기준 약 10만 원 절감', joined: false },
    { who: '학원 간 제휴 제안', title: '한빛태권도 · 영어+태권도 패키지', desc: '같은 건물 · 재원생 형제 할인 10% 제안이 왔어요', joined: false, proposal: true }
  ],

  // 운영 기반 요약
  ops: [
    { l: '오늘 출석', v: '48/53', d: '결석 2 · 미입력 3' },
    { l: '10월 수납', v: '42/48', d: '미납 6건 · 196만 원' },
    { l: '안 읽은 메시지', v: '3', d: '학부모 1 · 강사실 2' },
    { l: '행정 마감', v: 'D-0', d: '강사 채용 통보 (교육청)' }
  ]
};
