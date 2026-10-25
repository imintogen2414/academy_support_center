# 작업 규칙
- 항상 한국어로 답한다.
- 작업은 새 가지에서 하고, 끝나면 커밋·푸시 후 PR까지 올린다.
- main에 직접 올리지 않는다.
- 끝나면 바뀐 파일과 미리보기에서 확인할 곳을 알려 준다.
- 비밀 키는 코드에 쓰지 않고 환경변수로 받는다.

# 프로젝트
- 학원지원센터: 원장·강사·학부모·학생이 로그인해서 쓰는 학원 성장 플랫폼.
- 기획 방향: 행정만이 아니라 학원 운영 전체를 지원하는 센터. 다섯 가지 지원 분야로 나눈다.
  - 행정 지원: 출결, 수납·청구, 재정, 서류·교육청 행정
  - 강사 관리: 센터 본부가 강사 교육 영상을 배부 → 강사가 시청하고 리플렉션 작성. 강사 채용(원장은 공고, 강사는 지원)도 센터 안에서.
  - 학생·학부모 관리: 상담·등록, 원생 명단, 학부모 공지, 학부모·학생 앱
  - 제휴(MOU): 원장이 직접 맺는 게 아니라 센터가 미리 맺어 둔 제휴처에 신청만 하면 연결. 중심은 유학 제휴(인투어브로드 https://intoabroad.com): 방학 영어캠프, 조기유학, 어학연수, 해외 대학 진학, 유학 설명회. 교재·결제·보험은 "그 밖의 제휴"로 뒤에 둔다.
  - 홍보 지원: 인투마케팅(https://intomarketing.co.kr)에 연결. 블로그·디자인·영상·SNS 광고
- 화면은 한 번에 다 보여주지 않고 "홈 → 분야 → 세부 → 항목"처럼 한 단계씩 들어가게 정돈한다.
- 디자인: 남색·파란 계열(진한 남색 배경, 세로 빛줄기, 반투명 카드, 밝은 파란 버튼). 색 토큰은 `assets/base.css`의 `:root`에 모여 있다.
- 정적 HTML + 작은 빌드 단계 + Supabase. 화면을 React로 다시 짤 때가 오면 Next.js로 옮긴다.
- 로그인 후 화면의 학원 수치는 아직 예시 데이터(`assets/data.js`)다. 실제 데이터는 단계별로 Supabase 테이블로 옮긴다.

# 빌드 · Supabase
- `npm run build` → `dist/`를 만든다(Vercel도 같은 명령, `vercel.json`). 화면 파일 복사 + supabase-js 브라우저 파일(`assets/vendor/supabase.js`) + 환경변수로 `assets/env.js` 생성.
- 환경변수: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (Vercel에 등록됨). 없으면 로그인·신청 저장 없이 데모로만 동작.
- 로컬 확인: 환경변수 넣고 `npm run build` 후 `dist/`를 웹서버로 연다. `dist/`, `node_modules/`는 커밋하지 않는다.
- `assets/supa.js`: Supabase 연결(`SB`), 아이디 → 내부 이메일(`아이디@id.academysupportcenter.app`) 변환, 오류 문구.
- 로그인: 아이디+비밀번호(내부 이메일 방식, Supabase "Confirm email" 꺼 둠), 구글(OAuth, pkce). 구글로 처음 오면 `app.html`에서 역할을 한 번 고른다.
- `app.html`: `?demo=1&role=…`(또는 예전 `?role=…`)이면 데모, 아니면 로그인 필수.
- 테이블(`supabase/migrations/`에 SQL 보관, 모두 RLS):
  - `support_requests`: 학원 → 센터 지원 신청. 누구나 넣기만 가능, 읽기는 대시보드에서만.
  - `profiles`: 아이디·이름·역할·학원. 가입 시 트리거로 자동 생성, 본인 것만 보기·고치기.
  - `academies`, `academy_members`(한 학원에 원장 여러 명 가능), `academy_codes`(원장용·강사용·학부모·학생용 초대 코드, 원장만 RPC로 조회), `students`(원장 쓰기, 원장·강사 읽기).
  - 역할은 스스로 고른 게 아니라 "어떤 초대 코드로 들어왔는지"로 정해진다. 원장은 `create_academy`, 나머지는 `join_academy(코드)`.
  - 정책용 도우미 함수는 API에 안 보이는 `private` 스키마(`private.academy_role`).
  - `leads`: 상담·등록(문의→상담→체험수업→등록). 원장·강사 읽기·쓰기, 원장만 삭제. "등록"으로 옮기면 트리거가 `students`에 자동 추가.
  - 행정 지원: `attendance`(학생·날짜마다 출석/지각/결석/조퇴, 원장·강사 읽기, 쓰기는 `mark_attendance(학생들, 날짜, 상태|null)` RPC만), `invoices`(수납·청구, 금액은 원 단위, 학생 이름·반은 트리거가 채움), `expenses`(지출), `paperwork`(서류 마감). 돈·서류는 원장만.
- 실제 데이터로 연결된 화면: 행정 지원 전체(`#admin/attend` `#admin/billing` `#admin/finance` `#admin/paper`, 강사는 `#attend`), 원장 홈 "오늘 챙길 일", 상담·등록(`#members/leads`), 원생 명단(`#members/students`), 초대 코드(`#members/invite`). 나머지는 예시 + "예시예요" 안내.
- 재정의 수입 = 그 달에 "납부 확인"한 청구 합계. 지출은 `expenses`. 학원에 아직 속하지 않은 회원은 `app.html`에서 학원 만들기/코드 합류 화면을 먼저 본다.
- 입력 창은 `app.js`의 `formDialog`(필드 목록만 넘기면 추가·수정·삭제까지)를 쓴다.

# 다음 할 일 (순서대로, PR 하나씩)
1. ~~행정 지원을 실제 데이터로~~ (완료: 출결·수납·재정·서류)
2. **센터 관리 + 강사 교육**: 센터 관리자 = 대표님. 관리자가 다른 관리자를 추가할 수 있게(`center_admins` 같은 표). 관리자 화면에서 강사 교육 영상 올리기·관리, 지원 신청(`support_requests`) 보기. 강사는 시청·리플렉션, 원장은 우리 강사 이수 현황.
   - 첫 관리자 2명(사용자 지정): `yunji040615@gmail.com`, `imintogen2414@gmail.com`. 나중에 관리자 화면에서 더 추가.
   - 이메일로 관리자를 인정할 땐 구글 로그인으로 확인된 이메일만(비밀번호 가입은 이메일 확인이 꺼져 있어 남의 이메일로 가입할 수 있음).
3. 강사 채용 → 제휴 신청 · 학부모 유학 상담 신청(원장이 홍보 → 학부모 신청 → 원장 확인).

# 작업 메모
- 이 클라우드 환경에서는 Supabase·jsdelivr에 직접 접속이 막혀 있다. DB는 Supabase MCP(apply_migration, execute_sql로 `set local role authenticated` + `request.jwt.claims` 시나리오 시험 후 rollback)로, 화면은 가짜 env로 빌드한 `dist/`를 Playwright로 열고 Supabase 응답을 흉내 내서 시험한다. 실제 동작은 Vercel 미리보기에서 사용자가 확인.
- 회원: 테스트 계정 `test_owner`(홍길동), 구글 계정 박윤지(인투어학원 원장).

# 파일 구조
- `index.html`: 첫 화면. 홈페이지가 아니라 프로그램 입구처럼 반반으로 나눈다.
  - 왼쪽(남색) "지원받기": 분야 고르기 → `#area/admin` 분야 상세 → `#apply/admin` 지원 신청 → `#done` 접수 완료. 분야 내용은 `assets/areas.js`
  - 오른쪽(흰색) "프로그램 쓰기": 아이디 로그인·회원가입(`?signup=1`), 구글로 계속하기, 데모 계정 입장
  - 휴대폰에서는 위쪽 탭(지원받기 / 프로그램 이용하기)으로 바로 오간다.
  - 스타일은 `assets/site.css`
- `login.html`, `service.html`: 예전 주소. 첫 화면으로 넘겨 주기만 한다.
- 공유 미리보기: 각 페이지의 og 메타 태그 + `assets/og.png`(1200×630), 탭 아이콘 `assets/favicon.svg`
- `app.html` + `assets/app.js`: 로그인 후 화면. `?role=owner|teacher|parent|student`, 페이지는 `#home` → `#admin` → `#admin/attend` 같은 해시로 바뀐다. 메뉴 구조는 `app.js`의 `AREAS`.
- `assets/base.css`: 공통 색·버튼, `assets/app.css`: 로그인 후 화면 스타일
