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
  - 제휴(MOU): 원장이 직접 맺는 게 아니라 센터가 미리 맺어 둔 제휴처에 신청만 하면 연결. 중심은 유학 제휴(인투유학 https://intoabroad.com): 방학 영어캠프, 조기유학, 어학연수, 해외 대학 진학, 유학 설명회. 교재·결제·보험은 "그 밖의 제휴"로 뒤에 둔다.
  - 홍보 지원: 인투마케팅(https://intomarketing.co.kr)에 연결. 블로그·디자인·영상·SNS 광고
- 메뉴 묶음: `app.js`의 `NAV_GROUPS`(역할별 묶음 이름 · 설명 · 메뉴들). 왼쪽 메뉴(접고 펴기, 접은 묶음은 localStorage `asc-nav`) · 홈 타일 · 전체 메뉴 안내(`#guide`)가 같은 묶음을 써요. 새 메뉴를 만들면 여기에 넣기.
- 홈 순서: 오늘 챙길 일(급한 일) → 자주 쓰는 메뉴(`favCard`, "바꾸기"로 최대 8개 고르기, 이 기기 localStorage `asc-fav-역할-…`, 기본은 `FAV_DEFAULT`) → "처음이세요? 이렇게 시작해요"(`startSteps`, 휴대폰에선 접혀 있음 · 실제 데이터로 저절로 체크 · 다 하거나 숨기면 사라짐) → 전체 메뉴 타일.
- 위쪽 검색창: 원장 · 강사는 학생 이름 · 반 · 학부모 · 연락처(`searchPeople`, 누르면 원생 명단이 그 이름으로 걸러짐 `STU_Q`)와 상담 학생, 그리고 메뉴(`searchMenus` + 비슷한 말 `SEARCH_WORDS`). 휴대폰에서도 보여요.
- 메뉴 이름은 역할이 달라도 같은 기능이면 같은 이름: 출결 · 수납 · 오늘 할 일 · 공지 · 결재 · 유학 상담 · 일정·시간표 · 내 제휴 · 내 의뢰 · 강사 채용.
- 분야별 이용(`academy_services`): 원생 · 출결 · 일정 · 채팅 같은 기본 프로그램은 누구나 쓰고, 센터가 직접 해 주는 지원만 학원마다 분야(행정 · 강사 · 학생·학부모 · 제휴 · 홍보)가 "이용 중"(active)일 때 열려요. 상담 중(consulting) · 이용 끝남(ended) · 줄 없음(신청 전)이면 `app.js`의 `SVC_GATE` 화면 대신 `svcLockPage`(신청 안내)가 보이고, 신청 · 의뢰 버튼은 `svcGuard`가 막아요. DB도 `private.has_service(학원, 분야)` · `private.my_service(분야)`로 제휴 신청 · 유학 안내/상담 · 홍보 의뢰 · 채용 공고 · 강사 교육 영상 · 리플렉션 · 센터에 맡기기를 막아요. 이 기능 전에 있던 학원은 다섯 분야 모두 이용 중으로 넣어 뒀고, 새로 만든 학원은 신청 전부터 시작해요.
  - 원장: `#services`(이용 중인 센터 지원 · 분야 더 신청하기 `request_academy_services` → 센터 "지원 신청"에 학원과 이어진 채로 들어가고 그 분야는 상담 중), 첫 화면 접수 번호로 잇기 `claim_support_request(학원, 번호)`. 홈에 안 쓰는 분야가 있으면 한 줄 안내(`svcHint`), `#help` 위에도 요약.
  - 관리자: 센터 관리 → 학원 · 이용 분야(`#center/academies`, `admin_academies()` · `set_academy_service(학원, 분야, 상태|null)`). 학원마다 다섯 분야 칸을 눌러 고르면 바로 저장, 상담 중인 학원이 맨 위 + "모두 이용 중으로 열기".
  - 학부모 · 학생: 제휴가 꺼져 있으면 유학 메뉴가 안 보여요.
- 신청한 분야만 열기: 첫 화면에서 지원 신청한 휴대폰과 원장 프로필 휴대폰이 같으면 `create_academy`가 그 신청을 학원과 잇고 신청한 분야만 "이용 중"으로 열어요(`private.open_services`). 접수 번호로 잇기(`claim_support_request`)도 바로 이용 중. 이용 중이 아닌 센터 지원은 메뉴 · 타일에서 숨겨요(`tailorMenus`, 제휴 · 홍보는 통째로 `SVC_WHOLE`). 주소로 들어오면 신청 안내.
- 성인 학원(`academies.family` = false): 학원 만들 때 "어린이 · 청소년 / 성인" 고르기, 원장 설정 "학부모 기능"으로 바꾸기. 끄면 학부모 칸(`personFields`) · 학부모 말이 빠지고 "수강생 관리 · 수강생 명단 · 연락처(students.phone)"로 보여요. 학부모·학생용 코드는 "수강생용"으로. `famOn()`.
- 파트너 계정(`partner_members`, 관리자가 센터 관리 → 관리자 "파트너 담당자"에서 `add_partner_member(아이디|이메일, 회사)` · `remove_partner_member`): 인투마케팅 담당자는 홍보 의뢰, 인투유학 담당자는 유학 상담(원장이 넘긴 것) · 유학 제휴 신청(a1~a5)을 센터를 거치지 않고 바로 받아 단계 · 안내를 바꿔요(`private.my_partner()` 정책). 로그인하면 `ROLE = 'partner'`, 센터 화면(`centerPromoPage` 등)을 우리 회사 몫만 채운 `CENTER`(`loadPartner`, `CENTER.partner`)로 같이 써요. 센터장은 전부 보고 문제 있을 때만 개입.
- 센터에 맡기기(`center_tasks`, 행정 · 강사 관리 · 학생·학부모 관리 아래 `…/center`): 원장이 서류 대신 작성 · 명단 옮기기 · 채용 대행 · 설명회 준비 같은 일(`TASK_KINDS`)을 맡기면, 관리자가 센터 관리 → 맡긴 일(`#center/tasks`)에서 접수 → 진행 중 → 완료 + 센터 메모(원장 화면에 보여요). 원장은 접수 단계에서만 고치기 · 취소, 상태 · 메모는 트리거가 관리자만 바꾸게 해요.
- 설정(`#settings`, 모든 역할 · 오른쪽 위 내 이름이나 왼쪽 메뉴 "설정"): 내 정보(이름 · 아이디 · 휴대폰 · 로그인 방법, 고치기는 `profileDialog`, 아이디 로그인은 비밀번호 바꾸기), 우리 학원, 이용 중인 센터 지원, 결제 정보(원장: 센터 이용료 · 결제 수단 자리, 학부모: 낼 수강료), 화면 밝기(`setThemeMode` 기기 설정 · 밝게 · 어둡게) · 로그인 유지 · 자주 쓰는 메뉴 · 처음 안내 · 메뉴 묶음 펼치기, 로그아웃 · 관리자 신청 · 탈퇴 안내. 휴대폰이 없으면 홈에 한 줄 안내(`phoneHint`).
- 학생 한 명 보기(원장 `#members/students/학생` · 강사 `#students/학생`, `studentDetail`): 학부모 연락(전화 · 문자 · 번호 복사) · 최근 3개월 출결 · 수납(원장만) · 상담 기록(`leads.student_id`) · 최근 2주 할 일 · 성장 리포트 · 기본 정보. 원생 명단의 이름이나 위쪽 검색의 학생을 누르면 열려요. 학부모 번호는 원장 · 강사 화면에서 가리지 않고 누르면 전화가 걸려요(`telLink`).
- 학부모 수강료 내기: 원장이 설정 → 결제 정보에서 학원 입금 계좌(`academies.pay_bank` · `pay_account` · `pay_holder` · `pay_note`)를 넣으면, 학부모 수납 화면 "내기"(`payDialog`)에 계좌와 복사 버튼이 나와요. 보낸 뒤 "보냈어요" → `report_invoice_paid(청구, 메모, 취소?)`가 `invoices.reported_at`을 남기고, 원장 수납 · 홈 "오늘 챙길 일"에 "입금 확인"으로 떠요. 납부 확인(`paid_at`)은 그대로 원장이. 카드 결제(PG)는 아직 없어요.
- 결재함(`#admin/approvals`) 아래에 강사가 올린 홍보 의뢰 · 제휴 신청(원장 결재 대기)도 모아 보여요(`otherApvCard`).
- 센터 관리 → 회원(`#center/members`, `admin_members()`): 가입한 사람 이름 · 아이디/이메일 · 로그인 방법 · 역할 · 휴대폰 · 학원 · 가입일 · 마지막 로그인. 보기만 해요. 사람을 누르면 `#center/members/회원`(`memberDetail`, `admin_member_detail(회원)`): 학원 · 역할 · 이용 분야 · 자동 처리 · 연결된 아이 · 최근 연 메뉴(`user_seen`) · 쓴 기록 수 · 첫 화면 지원 신청.
- 센터 관리자 홈(`centerHome`): 숫자 한 줄(새 신청 · 열어 줄 분야 · 답할 문의 · 맡긴 일 · 연결 중) → 지금 처리할 일(`centerTodo`) · 가입 현황 → 메뉴 묶음(`CENTER_GROUPS`).
- 예시 원생은 `data.js` 끝에서 반별 출결 인원(`attendance.total`)만큼 채워요 — 원생 수 · 강사 담당 반 원생 · 출결 · 수납 숫자가 서로 맞아요. 예시 연락처는 `010-0000-`으로 시작하는 가짜 번호.
- 시간 칸(`formDialog`의 `type: 'time'`): 지역 고르기처럼 오전/오후 · 시 · 분(5분 단위) 드롭다운(`clockPicker` · `bindClockPickers`, 값은 hidden 칸에 "16:00"). 시간표 추가는 요일을 여러 개 고르면 요일마다 한 줄씩(`type: 'multi'` + `expand`), 시작을 바꾸면 끝이 수업 길이만큼 따라와요(`timePickers` · `setClock`).
- 가로 스크롤 없애기: 표(`.table .tr`)는 좁은 화면에서 두 칸 카드로, 칸반(`.board`)은 줄바꿈, 입력 창은 옆으로 안 밀려요(`dialog` overflow-x hidden). 넓은 서류 편집도 줄마다 카드(`sheetEditor`).
- 오늘 할 일: 반 전체 · 학생 한 명 · "학생 여러 명 골라서"(`todoPicker`, 반 이름을 누르면 그 반 모두).
- 상담·등록: 학년(선택) · 생년월일(`birth`, 선택) · 학생 본인 연락처(`phone`, 성인 · 고등학생) · 학부모는 선택. 등록하면 트리거가 원생으로 함께 옮겨요. 강사도 메뉴 `#leads`(삭제는 원장만).
- 현장 결제(`onsitePayDialog`): 원장이 상담에서 "등록"으로 옮기면 그 자리에서 받은 수강료 · 교재비 · 기타를 "납부 완료" 청구로 바로 남기고 영수증(`printReceipt`, 인쇄 · PDF)을 뽑아요. 수납 화면 "현장에서 받기", 납부 완료 줄의 "영수증"도 같아요. 학생 고르기의 "명단에 없는 사람 · 직접 적기"로 웹을 안 쓰는 사람도 이름만 적어 받아요(`invoices.student_id` 없이 `student_name`, "원생 명단에도 넣기" 선택).
- 원생 들고 남(`students.status` active 다니는 중 · paused 쉬는 중 · left 그만둠, `joined_on` · `left_on`): 원생 명단 위 이번 달 · 최근 7일 새로 옴 · 그만둠 · 그만둘 예정(`rosterSummary`), 상태 거르기(`STU_ST`), "원생 정리"(`rosterDialog`)에서 여러 명 골라 반 옮기기 · 쉬기 · 그만두기(오늘 · 이번 달 말 · 날짜) · 다시 다니기. `REAL.allStudents`는 명단용 전부, `REAL.students`는 다니는 중만(출결 · 청구 · 할 일 · 숫자). 그만두는 날이 지나면 매일 아침 저절로 그만둠.
- 학부모 기능 스위치(`famSwitch`): 설정 → 우리 학원, 학생·학부모 관리 첫 화면, 원생 명단 위. 예시 계정도 눌러 볼 수 있어요(sessionStorage `asc-demo-family`).
- 프로그램마다 "이렇게 써요"(`assets/howto.js`의 `HOWTO`, 화면 제목 아래 `addHowto`): "다시 보지 않기"를 누를 때까지 계속 보여요(localStorage `asc-howto-역할-주소`). 숨긴 뒤엔 제목 옆 "사용법" 버튼 · 전체 메뉴 안내 아래 "메뉴마다 이렇게 써요" · 설정 "메뉴 사용법 안내"에서 다시 봐요. 새 화면을 만들면 `HOWTO`에 넣기.
- 단계 설명(`STATE_GUIDE` · `STATE_PAGES`, `stateGuide`): 제휴 · 홍보 · 유학 · 지원 신청 · 문의 · 맡긴 일 · 이용 분야 · 결재 화면 위 "단계가 무슨 뜻이에요?"에 단계마다 센터 관리자 쪽 · 원장님 쪽 뜻을 함께(내 쪽이 진하게).
- 원천세 계산(`#admin/payroll`, `payroll` 원장만): 강사마다 구분(프리랜서 3.3% · 일용직 (일당-15만원)×2.7% 소액부징수 · 근로소득 · 직접) · 지급액만 넣으면 소득세 · 지방소득세 · 실지급액(`calcTax`), "재정 지출에도 넣기"(`expense_id`), 지난달 불러오기, 신고 서류로 넣기(`wht:월`), 엑셀. 서류 바로 만들기는 바로 받지 않고 `sheetEditor`에서 칸을 고치고 줄을 더한 뒤 엑셀로 받아요(합계는 다시 계산).
- 자동으로 처리(`#admin/auto`, `academies.auto` = { bill: {on, day}, unpaid: {on, days}, paper: {on} }, 기록 `auto_logs`): pg_cron `asc-automations`가 매일 한국 9시 10분 `private.run_automations()` — 매달 day일 정해 둔 수강료로 청구서, 기한 지난 미납에 학부모(성인 학원은 수강생)께 원장 이름 채팅 한 번(`invoices.reminded_at`, `private.auto_message`), 지난달 지급이 있으면 원천세 · 1월엔 사업장현황 서류. "지금 한 번 해 보기"는 `run_my_automations(학원)`. 서류 자동이 켜져 있으면 앱을 열 때 `paperSuggestions`도 저절로 넣어요(`autoPaperOnOpen`). 원장 홈에 "저절로 처리한 일".
- 첫 화면 진행 상황 보기(`#check`): 접수 번호 + 남긴 연락처 → `check_my_request(번호, 연락처)`(가입 안 해도 돼요). 접수 완료 화면 · 오른쪽 아래 링크에서 바로.
- 공유 미리보기 이미지 `assets/og.png`는 Pretendard 굵은 글씨로 첫 화면 문구 그대로. 이미지를 바꾸면 메신저가 새로 읽도록 html의 `og.png?v=` 숫자를 올리기.
- 센터에 문의하기(`#help`, 원장 · 강사만 — 왼쪽 아래 카드): `submit_inquiry`로 보내고 내 문의 · 답변을 봐요. 관리자는 센터 관리 → 문의(`#center/inquiries`)에서 `answer_inquiry`. 학부모 · 학생 화면에는 센터 카드가 없어요.
- 예시 계정의 날짜는 실제 오늘(`DATA.today = todayText()`), 오늘 출결 · 아이 오늘 일정은 오늘 요일에 수업이 있는 것만(일요일엔 없음). 예시 수납은 미납 목록(`DATA.unpaid`)으로 미납 수 · 금액을 계산해서 홈 · 목록 · 메뉴 숫자가 같아요.
- 입력 칸은 되도록 눌러서 고르게: `chips`(학년 `GRADES`, 과목 `SUBJECTS`, 반, 강사 `staffNames()`, 서류 이름 · 내는 곳, 다음 할 일 …), 지역은 `regionPicker`, 전화번호 칸(type tel)은 치는 동안 하이픈이 저절로.
- 화면은 한 번에 다 보여주지 않고 "홈 → 분야 → 세부 → 항목"처럼 한 단계씩 들어가게 정돈한다.
- 디자인: 남색·파란 계열(진한 남색 배경, 세로 빛줄기, 반투명 카드, 밝은 파란 버튼). 색 토큰은 `assets/base.css`의 `:root`에 모여 있다.
- 다크 모드: 기기 설정을 따르고, 해 · 달 버튼(`[data-theme-toggle]`, `assets/theme.js`)으로 고정하면 localStorage `asc-theme`. 어두운 색은 `base.css`의 같은 토큰을 덮어써요 — 새 화면은 `#fff` 대신 `var(--surface)` · `var(--ink)` 같은 토큰을 쓰기. 성장 리포트 · 파트너 카드처럼 종이 느낌인 곳만 흰색 고정.
- 역할 색: `--r-owner`(파랑) · `--r-teacher`(초록) · `--r-parent`(주황) · `--r-student`(분홍) · `--r-admin`. 클래스 `.r-owner` 등이 `--rc`를 정해요.
- 정적 HTML + 작은 빌드 단계 + Supabase. 화면을 React로 다시 짤 때가 오면 Next.js로 옮긴다.
- 로그인 후 화면의 학원 수치는 아직 예시 데이터(`assets/data.js`)다. 실제 데이터는 단계별로 Supabase 테이블로 옮긴다.

# 빌드 · Supabase
- `npm run build` → `dist/`를 만든다(Vercel도 같은 명령, `vercel.json`). 화면 파일 복사 + supabase-js 브라우저 파일(`assets/vendor/supabase.js`) + 환경변수로 `assets/env.js` 생성.
- 환경변수: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (Vercel에 등록됨). 없으면 로그인·신청 저장 없이 데모로만 동작.
- 로컬 확인: 환경변수 넣고 `npm run build` 후 `dist/`를 웹서버로 연다. `dist/`, `node_modules/`는 커밋하지 않는다.
- `assets/supa.js`: Supabase 연결(`SB`), 아이디 → 내부 이메일(`아이디@id.academysupportcenter.app`) 변환, 오류 문구.
- 로그인: 아이디+비밀번호(내부 이메일 방식, Supabase "Confirm email" 꺼 둠), 구글(OAuth, pkce). "로그인 유지하기"를 끄면(`asc-keep-login`=0) 세션을 sessionStorage에 둬서 창을 닫으면 로그아웃(`supa.js`의 `authStore`). 구글로 처음 오면 `app.html`에서 역할을 한 번 고른다.
- 주소: 로그인 후 화면은 `/app`, 예시 계정은 `/demo/owner` · `/demo/teacher` · `/demo/parent` · `/demo/student`(`vercel.json` rewrites → `app.html`). 예전 `app.html?demo=1&role=…`로 와도 열리고 주소창은 새 모양으로 바뀌어요. 구글 로그인 돌아오는 주소만 Supabase에 등록된 `/app.html` 그대로. 그래서 `app.html`의 파일 주소도 `/assets/…`처럼 `/`로 시작해요.
- 테이블(`supabase/migrations/`에 SQL 보관, 모두 RLS):
  - `support_requests`: 학원 → 센터 지원 신청. 첫 화면은 `submit_support_request(...)` RPC로 넣어요(필수 항목 · 전화번호 형식 · 개인정보 동의 `privacy_agreed_at` · 연락 받을 시간 `contact_time`을 서버에서도 확인, 접수 번호 8자리를 돌려줌). 읽기는 관리자만.
  - `inquiries`: 문의. 가입 전(`guest`, 이름 · 연락처 · 동의 필수)과 프로그램 사용자(`member`, 학원 · 역할이 저절로)를 `submit_inquiry(이름, 연락처, 분류, 내용, 동의)` 하나로 받아요. 본인 것과 관리자만 읽고, 답변은 관리자 `answer_inquiry(문의, 답변, 상태)`.
  - `profiles`: 아이디·이름·역할·학원·휴대폰(`phone`, 숫자만). 가입 시 트리거로 자동 생성, 본인 것만 보기·고치기. 이름(띄어쓰기 · 대소문자 빼고 비교 `private.norm_name`) · 아이디 · 휴대폰은 다른 회원과 겹치지 않아요(유일 인덱스 `profiles_name_uniq` · `profiles_phone_uniq` · `profiles_username_uniq`). 가입 · 고치기 전에 `check_profile_taken(아이디, 이름, 전화)`로 겹치는 것을 알려 주고("이미 있는 이름이에요!"), 서버도 막아요. 구글로 처음 올 때 이름이 겹치면 이름을 비워 두고 앱이 이름을 다시 정하게 해요(`rolePicker(user, true)`). 학생은 휴대폰을 비워 둘 수 있어요.
  - `academies`, `academy_members`(한 학원에 원장 여러 명 가능), `academy_codes`(원장용·강사용·학부모·학생용 초대 코드, 원장만 RPC로 조회), `students`(원장 · 강사 추가 · 수정, 삭제는 원장만, 강사는 담당 반 학생 + 내가 추가한 학생만 — `private.can_see_student` · `private.my_classes`(원장이 정한 `academy_members.classes` + 시간표에서 담당 강사가 나인 반). 출결 · 할 일 · 성장 리포트도 같은 기준. 원장은 강사 관리 → 우리 학원 강사 "강사 담당 반"에서 `list_teacher_classes` · `set_teacher_classes`, 강사 화면 안내는 `my_teacher_classes`, 추가한 사람 `added_by_name` · `added_by_role`은 트리거, 수강료 `tuition_plan_id`).
  - 역할은 스스로 고른 게 아니라 "어떤 초대 코드로 들어왔는지"로 정해진다. 원장은 `create_academy`(지역은 시·도 → 시·군·구 고르기, 꼭 골라야 해요), 나머지는 `join_academy(코드)`.
  - 정책용 도우미 함수는 API에 안 보이는 `private` 스키마(`private.academy_role`).
  - `leads`: 상담·등록(문의→상담→체험수업→등록). 원장·강사 읽기·쓰기, 원장만 삭제. "등록"으로 옮기면 트리거가 `students`에 자동 추가.
  - 수강료 할인: 청구마다 원가 `invoices.list_amount` · 실제 받을 금액 `amount` · 할인 내역 `discount_note`(원가 ≥ 금액). 자주 쓰는 할인 `discount_presets`(원장만, % 또는 원), 학생마다 늘 받는 할인 `students.discount_id` → "이 달 청구서 만들기" · 자동 청구(`private.apply_discount`) · 현장 결제 · 영수증에 원가와 할인이 함께. 화면: 수납 "정해 둔 수강료" 카드 아래 "자주 쓰는 할인", 청구 창에서 할인을 누르면 금액 계산(`bindDiscount`), 목록은 `discLine`.
  - 수강료 미리 정하기: `tuition_plans`(이름 · 한 달 금액 · 주로 쓰는 반, 원장 쓰기 · 원장·강사 읽기). 수납·청구 화면 위 "정해 둔 수강료"에서 만들고 "학생에게 붙이기"(반 전체 한 번에). "이 달 청구서 만들기"는 수강료가 붙은 학생을 그 금액으로 저절로 만들어요. 강사 메뉴에도 "원생 명단"(`#students`).
  - 행정 지원: `attendance`(학생·날짜마다 출석/지각/결석/조퇴, 원장·강사 읽기, 쓰기는 `mark_attendance(학생들, 날짜, 상태|null)` RPC만), `invoices`(수납·청구, 금액은 원 단위, 학생 이름·반은 트리거가 채움), `expenses`(지출), `incomes`(수납 밖의 수입: 교재 판매·특강 등), `paperwork`(서류 마감, `repeat` 매달·매년이면 제출 완료할 때 다음 회차를 화면이 만들어요, `auto_key`는 자동으로 찾아 준 서류 표시). 돈·서류는 원장만.
  - 서류 자동 처리(`#admin/paper`): `paperSuggestions()`가 강사 급여 → 원천세(3.3% 예상 세액), 새 강사 → 채용 통보 · 4대보험, 반 수강료 변경 → 교습비 변경 신고, 1월~2월 10일 → 사업장현황신고를 찾아 줘요. `makePaperDoc()`로 원생 명부 · 출석부 · 수강료 납부 내역 · 교습비 표 · 강사 명단 · 원천세 계산표 · 사업장현황 수입 요약을 엑셀로 만들어요.
  - 센터 관리: `center_admins`(이메일 목록, RPC로만: `am_center_admin` `list_center_admins` `add_center_admin(이메일|아이디)` `remove_center_admin`, 나 자신은 못 뺌). 판정은 `private.is_center_admin()` — 구글로 확인된 이메일이거나 센터 아이디일 때만. 첫 관리자: `yunji040615@gmail.com`, `imintogen2414@gmail.com`.
  - 강사 교육: `training_videos`(관리자만 쓰기, 원장·강사는 배부된 것만 보기, 영상은 유튜브·비메오 주소), `training_reflections`(영상당 한 사람 하나, 쓰면 이수 완료). 원장도 듣고 써요. 리플렉션 내용은 본인만 바로 읽고, 원장은 `academy_training_report(학원)`로 우리 강사 것까지 봐요. 관리자는 내용 없이 `admin_training_progress()`(이수 수) · `admin_video_reflections(영상)`(이름·학원·날짜)만.
  - 관리자 신청: `admin_applications`(RPC로만: `apply_center_admin(이름, 소속)` `my_admin_application()` `list_admin_applications()` `decide_admin_application(신청, 수락?)`). 구글로 확인된 이메일이나 센터 아이디만 신청 가능, 수락하면 `center_admins`에 들어가요. 거절돼도 다시 신청할 수 있어요.
  - `support_requests`: 관리자는 보기 + `status`·`admin_memo` 고치기. `academy_id`는 학원과 이어진 신청(프로그램에서 신청 · 접수 번호로 잇기).
  - 채용 게시판(사람인처럼, `assets/jobs.js` · `jobs.css`를 첫 화면 `/jobs`와 프로그램 `#jobs`가 함께 써요): 검색 · 지역(시·도) · 분야 · 근무 형태 · 경력 · 최신/마감 임박순(`JB`, `jbBoard`), 공고 카드(`jbCard`) · 상세(`jbDetail`: 지원 자격 · 근무 조건 · 하는 일 · 자격 요건 · 우대 · 복리후생 · 전형 절차 · 학원 정보) · 가입한 학원 탭(`jbAcademies`). `job_posts`에 `career_level` · `career_years` · `education` · `headcount` · `work_days` · `requirements` · `preferred` · `benefits[]` · `process`. 학원 소개는 `academies.intro` · `field` · `homepage` · `listed`(공고 없어도 공개), 원장 "강사 채용" 위 `acadIntroCard`. 강사 이력서 `teacher_profiles`(본인만, `open_to_offers`면 센터 강사풀 `admin_teacher_pool()`), 지원자 목록 `list_job_applicants`가 `profile`도 돌려줘요. 강사 화면 `#jobs` · `#jobs/공고` · `#jobs/profile` 내 이력서 · `#jobs/mine` 지원 현황. 예시 계정 `/demo/seeker`(`DEMO_SEEKER`, `DEMO_JOBS`).
  - 채용: 공고 게시판(`JOBS_AREA`)은 학원에 아직 연결 안 된 강사(`SEEKER`)만 봐요 — 학원 강사 메뉴에는 없어요. `job_posts`(원장 쓰기, `academy_field` 학원 분야는 `ACADEMY_FIELDS` 예시를 눌러 고르기 → 강사 게시판에서 분야로 거르기, 모집 중 공고는 강사·원장 누구나 보기 — 학원 없는 강사도), `job_applications`(강사 지원·지원 단계에서 취소, 공고 올린 원장이 상태 변경), 원장은 `list_job_applicants(학원)`로 이름·교육 이수 수와 함께 봐요.
  - 제휴: `partner_applications`(원장 · 강사 신청, 신청한 사람은 트리거. 강사가 올리면 `owner_review` → 원장이 `decide_partner_request(신청, 승인?, 의견)`으로 승인하면 new, 반려하면 closed. 관리자는 owner_review를 못 보고 new→contacted→connected→closed 처리). 강사 메뉴 `#mou`(제휴처 · 유학 안내 · 내 제휴 신청). 제휴처 목록 자체는 `data.js`의 `partners`.
  - 유학: `abroad_promos`(원장이 학부모에게 안내, 강사도 봐요), `abroad_requests`(학부모·학생 신청 · 강사가 학부모 대신 신청하면 `via_name`·`via_role` → 원장 confirmed → forwarded → 관리자 done). 관리자는 forwarded·done만 봐요.
  - 학부모·학생 앱: `student_links`(원생 ↔ 학부모·학생 계정, 원장이 `link_family(원생, 사람, 켬/끔)`으로 연결, 대상은 `list_family_members(학원)`). 학부모·학생은 `my_children()`, 학부모만 `my_child_invoices()`(원장 메모 뺌), 출결은 연결된 아이 것만 바로 읽기.
  - 학부모 공지: `notices`(원장 쓰기, `target_class`가 비면 전체·있으면 그 반 아이와 연결된 가족만), `notice_reads`(읽음은 `mark_notice_read(공지)`로만). 원장은 `notice_report(학원)` 읽음 수, `notice_readers(공지)` 읽은·안 읽은 사람.
  - 홍보 의뢰: `promo_requests`(원장·강사 의뢰, 의뢰한 사람 `requested_by`·이름·역할은 트리거가 채움. 강사가 올리면 `owner_review` → 원장이 "내 의뢰"에서 `decide_promo_request(의뢰, 승인?, 의견)` — 승인하면 new, 반려하면 rejected(`owner_comment`). 관리자는 owner_review · rejected를 못 봐요. 원장은 우리 학원 것 전부, 강사는 내 것만. 접수 단계에서 취소, 관리자가 new→contacted→working→review→done + `admin_memo`).
  - 결재: `approvals`(강사·원장이 올림, 올린 사람은 트리거가 채움, 올린 사람과 원장만 보기, 기다리는 동안 올린 사람이 고치기·취소). 원장은 `decide_approval(결재, 승인?, 의견, 지출 항목|null)` — 항목을 넣으면 `expenses`에 저절로 들어가요. 원장 `#admin/approvals` 결재함, 강사 `#approvals`.
  - 일정 · 시간표: `timetable`(반 · 요일 · 시간 · 과목 + 세부 강의실 · 담당 강사 · 메모, 원장 쓰기), `academy_events`(시험 · 행사 · 휴원 …, 원장 · 강사 쓰기, 강사는 내 것만 고침, 세부는 `detail`). 두 표 모두 원장 · 강사만 바로 읽고, 학부모 · 학생은 세부를 뺀 `family_timetable(학원)` · `family_events(학원, 부터, 까지)`. 화면 `#schedule`(모든 역할, 주간 시간표는 주를 넘기거나 날짜로 고르고 그 주 일정도 함께 · 월간 달력).
  - 학생 할 일: `student_todos`(학생 · 날짜 · 할 일, 만든 사람 · 역할은 트리거가 채움). 원장 · 강사는 반 전체나 학생 한 명에게, 학부모 · 학생은 연결된 아이에게만 넣기. 체크는 `check_todo(할 일, 했음?)`. 만든 사람이 고치고, 만든 사람과 원장이 지워요. 화면: 원장 `#members/todos`, 강사 `#todos`, 학부모 `#kid/todos`, 학생 `#todos`(홈 맨 위에도 카드).
  - 성장 리포트: `growth_reports`(학생 · 기간 · 과목 점수 `scores` · 학습 태도 `ratings` · 잘하는 점 · 노력할 점 · 종합 의견 · 다음 목표, 출결 · 할 일 수행 `stats`는 저장할 때 화면이 계산). 원장 · 강사가 쓰고 `status`를 issued로 바꾸면 연결된 가족이 봐요(발급 시각은 트리거). 인쇄 · PDF는 브라우저 인쇄(`@media print`). 화면: 원장 `#members/reports`, 강사 `#reports`, 학부모 `#kid/reports`, 학생 `#reports`.
  - 자료실 폴더: `library_folders`(원장 · 강사 누구나 만들기 · 이름 바꾸기 · 지우기, 학부모 · 학생은 보기만 — 자료가 있는 폴더만 보여요), `library_items.folder_id`, 옮기기는 `move_library_items(자료들, 폴더|null)`(볼 수 있는 자료면 누가 올렸든). 예시 계정 자료실도 역할마다 볼 수 있는 것만(`libData`).
  - 자료실: `library_items`(제목 · 분류 · 파일 또는 링크 · 공유 범위 `visibility` private 나만 / staff 원장·강사 / class 반 가족 / everyone 모두, 올린 사람은 트리거). 판정은 `private.can_see_library` — 원장은 전부(강사 비공개 포함). 파일은 Storage 비공개 버킷 `library`(50MB, 경로 `학원 id/무작위/file.확장자`), 읽기는 그 자료를 볼 수 있을 때만, 올리기는 원장·강사만. 열기 · 내려받기는 10분짜리 서명 주소. 화면 `#library`(모든 역할).
  - 채팅(카톡처럼, 예전 이름 메신저): 친구 · 채팅 두 화면. 예시 계정 친구 · 대화도 역할마다 대화할 수 있는 사람만(`DEMO_PEOPLE` · `DEMO_CHAT`). `friends`(내가 추가한 사람, RPC `find_people(검색어)` — 한 글자 이상 쳐야 나와요 · `add_friend` `remove_friend` `my_friends`). `conversations`(kind direct 1:1 `user_a < user_b` / group 방 이름 `title`, 마지막 메시지는 트리거), `conversation_members`(방 사람), `messages`(방 사람만 읽기 · 쓰기, 1:1은 보낼 때도 아직 대화할 수 있는 사이인지 `private.can_send`), `conversation_reads`. 누가 누구와: `private.message_academy(a, b)` — 원장↔관리자·강사·학부모·학생, 강사↔강사·학부모·학생, 학부모↔학생(같은 아이로 연결됐을 때만). 그룹은 `create_group(이름, 사람들)` `add_group_members` `rename_group` `leave_conversation` `conversation_people`. 목록은 `my_chats()`(안 읽은 수, 예전 `my_conversations` · `message_contacts`는 안 써요). 프로필 사진 · 상태 메시지는 `profiles.avatar_url` · `status_msg`, 사진은 공개 버킷 `avatars/내 id/…`(5MB). 화면 `#messages`(모든 역할 · 관리자 포함), 열어 둔 대화는 5초, 목록은 20초마다 새로 확인.
  - 새 소식 빨간 점: `user_seen`(메뉴 경로마다 마지막으로 본 시각, 본인 것만). `app.js`의 `NEWS`(역할별 경로 → 남이 올린 것의 시각 목록)보다 새로운 게 있으면 메뉴 · 타일 · 종 모양에 점, 그 화면을 열면 `markSeen`이 지워요. 처음엔 최근 3일 것만. 예시 계정은 `DEMO_NEWS` + sessionStorage.
  - `academy_name`은 트리거가 채워요(학원 표는 그 학원 사람만 읽을 수 있어서).
- 실제 데이터로 연결된 화면: 행정 지원 전체(`#admin/*`, 강사는 `#attend`), 강사 관리 전체(`#teachers/staff` `training` `hire`, 강사 `#learn` `#jobs`), 제휴 전체(`#mou/partners` `abroad` `mine`), 학부모 `#abroad`, 센터 관리(`#center/videos` `requests` `partners` `abroad` `admins`), 원장 홈 "오늘 챙길 일", 학생·학부모 관리 전체(상담·등록, 원생 명단 + 앱 연결, 초대 코드, 학부모 공지 `#members/notices/공지`), 홍보 지원(`#promo/*`, 센터 `#center/promo`). 학부모 `#kid/attend` `#kid/bills` `#news/공지` `#abroad`, 학생 `#attend` `#news`. 데모에만 있는 것: 학부모·학생 일정·숙제·기록(실제 로그인에선 메뉴에서 빠져요).
- 학원 코드가 없는 강사: 학원 연결 화면의 "채용 공고 먼저 보기" → `SEEKER` 모드(채용 공고만).
- 관리자 신청 화면: `app.html#apply-admin`(왼쪽 아래 "센터 관리자 신청", 역할 고르기·학원 연결 화면에도 링크). 수락은 센터 관리 → 관리자.
- 센터 관리자: 학원에 속해 있으면 메뉴에 "센터 관리"가 더 생기고, 학원 없이 관리자만이면 `ROLE = 'admin'`으로 센터 화면만 봐요(역할 고르기도 건너뜀).
- 재정: 매출 = "납부 확인"한 청구(납부한 날 기준) + `incomes`, 순이익 = 매출 - `expenses`. 기간(오늘·최근 7일·월별·3·6개월·1년·직접 고르기 — 시작일부터 최대 1년, `customRange`)마다 그래프 · 표 · 거래 내역 · 엑셀 내려받기(`app.js`의 `finRange` `ledger`). 학원에 아직 속하지 않은 회원은 `app.html`에서 학원 만들기/코드 합류 화면을 먼저 본다.
- 뒤로 가기: 왼쪽 메뉴와 위치 표시(홈 › 분야) 링크는 기록을 바꿔치기(`goReplace`)해서 쌓이지 않아요. 화면 위 "‹ 이전"은 바로 전 화면 한 단계(처음 연 화면이면 한 단계 위).
- 사용자에게 보이는 말: "데모" 대신 "예시 계정", 유학 제휴처 이름은 "인투유학".
- 엑셀로 올리기: `assets/sheet.js`(바깥 라이브러리 없이 .xlsx·.csv 읽기 `readSheet`, 양식 만들기 `downloadXlsx`) + `app.js`의 `IMPORTS`·`importDialog`(원생 명단 · 재정에 "엑셀로 올리기"). 칸 이름은 여러 표현을 알아듣고(`alias`), "예시)" 줄·빈 줄은 건너뛰고, 이미 있는 줄은 건너뛰어요. .xls(예전 형식)는 .xlsx로 저장해 달라고 안내.
- 금액 칸은 `type: 'won'`(치는 동안 쉼표, 저장할 땐 `numOf`로 숫자). 화면에 보이는 금액은 모두 `won()`(1,000 단위 쉼표 + 원). 입력 창은 화면보다 길면 안에서 스크롤되고 저장 버튼은 아래에 붙어 있어요.
- 입력 창은 `app.js`의 `formDialog`(필드 목록만 넘기면 추가·수정·삭제까지)를 쓴다. 예시를 눌러 채우는 칸은 `chips`, 저장 전 확인은 `check`.
- 정책(policy) 이름은 63바이트에서 잘려요(한글 한 글자 3바이트). 같은 표에서 앞부분이 같으면 부딪히니 짧게 짓는다.
- 제휴(`#mou`) · 홍보(`#promo`) 첫 화면 아래에 쓰는 법 · 파트너 소개 · 자주 묻는 질문(`AREA_INTRO`).

# 다음 할 일 (순서대로, PR 하나씩)
1. ~~행정 지원을 실제 데이터로~~ (완료: 출결·수납·재정·서류)
2. ~~센터 관리 + 강사 교육~~ (완료: 관리자 추가·빼기, 교육 영상 배부, 리플렉션, 지원 신청 처리)
3. ~~강사 채용 → 제휴 신청 · 학부모 유학 상담 신청~~ (완료)
4. ~~학부모 공지 · 홍보 의뢰 · 학부모·학생 앱~~ (완료)
5. ~~로그인 유지하기 · 초대 코드 설명 · "예시 계정 들어가보기" · 인투유학 이름 · 이전 버튼~~ (완료)
6. ~~센터 관리자 신청 → 수락·거절~~ (완료)
7. ~~엑셀로 원생 · 지출 한꺼번에 올리기~~ (완료)
8. ~~첫 화면 분야 상세페이지 디자인~~ (완료 · 인투마케팅 로고와 실제 사진은 사용자가 보내 주면 넣기)
9. ~~재정: 기간별 매출 · 수입 직접 넣기 · 순이익~~ (완료)
10. ~~채용 공고 학원 분야 · 원장도 강사 교육 · 리플렉션 비공개 · 강사도 홍보 의뢰 · 홍보·제휴 설명 보강~~ (완료)
11. ~~강사 → 원장 결재 (물품 · 재정)~~ (완료)
12. ~~학원 일정 · 시간표~~ (완료)
13. ~~학생 오늘 할 일~~ (완료)
14. ~~성장 리포트 발급~~ (완료)
15. ~~자료실~~ (완료)
16. ~~서류·행정 자동 처리~~ (완료)
17. ~~채팅(메신저)~~ (완료 · 친구 · 그룹 · 프로필까지)
18. ~~새 소식 빨간 점 (확인하면 사라짐)~~ (완료)
19. ~~4라운드: 시간 드롭다운 · 가로 스크롤 · 원생 들고 남 · 단계 설명 · 회원 상세 · 이용 분야 간결 · 채팅 · 자료실 폴더 · 관리자 홈 · 사용법 안내 · 현장 결제 직접 입력 · 원천세 계산 · 학부모 스위치 · 자동 처리~~ (완료)
20. ~~5라운드: 첫 화면 개편(운영 프로그램 + 추가 서비스 3) · 사람인 같은 채용 게시판 · /jobs · 강사 이력서 · 수강료 할인 · 홈 목록 깨짐 · 학부모 바로 내기~~ (완료)

# 작업 메모
- 이 클라우드 환경에서는 Supabase·jsdelivr에 직접 접속이 막혀 있다. DB는 Supabase MCP(apply_migration, execute_sql로 `set local role authenticated` + `request.jwt.claims` 시나리오 시험 후 rollback)로, 화면은 가짜 env로 빌드한 `dist/`를 Playwright로 열고 Supabase 응답을 흉내 내서 시험한다. 실제 동작은 Vercel 미리보기에서 사용자가 확인.
- 회원: 테스트 계정 `test_owner`(홍길동), 구글 계정 박윤지(인투어학원 원장).

# 파일 구조
- `index.html`: 첫 화면. 전체 너비 남색 + 위쪽 머리글(로고 · 운영 프로그램 · 추가 서비스 · 이용 사례 · 강사 채용 · [로그인] [무료로 시작하기]). 문구는 원장님 기준.
  - 구조는 "운영 프로그램 1개(무료로 시작) + 필요할 때만 붙이는 추가 서비스 3개(상담 후 진행)". `areas.js`의 `SITE_AREAS`에 `kind: 'program'`(행정·재정 자동화 `admin` · 학생·학부모 관리 `members` · 강사와 함께 쓰기 `teachers`) / `'service'`(홍보 대행 `promo` · 유학·캠프 제휴 `mou` · 강사 구하기 `hire`), `PROGRAM_AREAS` · `SERVICE_AREAS`. 프로그램은 "무료로 시작하기 · 예시 계정", 서비스는 "상담 신청하기". 행정 자동화를 "신청 → 매니저 연락 → 견적"으로 소개하지 않는다. 파트너 이름은 카드 제목이 아니라 "공식 파트너 ○○"로 작게.
  - 처음 화면 순서(`homeView`): 메인 메시지(역할별 화면 그림 `roleScreens`) → ① 운영 프로그램 + 각자 자기 화면(역할 카드 → /demo/역할) → ② 추가 서비스 3개 → 이용 사례 → 자주 묻는 질문 4개(`SITE_FAQ` 세 번째 값 true) → 시작하기 띠. 자세한 설명 · 질문 전체 · 비용은 분야 상세(`/area/…`)와 `#faq`로.
  - 해시 화면(`VIEWS`): `#apply/분야` 추가 서비스 상담 신청(서비스 3개 + "프로그램 도입 도움"), `#done`, `#ask`, `#check`, `#faq`(질문 전체 · 비용 · 사업자 정보), `#demo`(예시 계정 고르기, `/demo/seeker` 구직 강사 포함), `#login` · `#signup`(로그인 패널 `#program`을 보여 주고 소개는 숨김, `#signup/teacher`는 강사로 골라 두고 가입 뒤 `/app#jobs`). 그 밖의 해시(`#program-sec` 등)는 처음 화면의 그 자리로.
  - 강사로 일하고 싶은 분: `/jobs`(빌드가 `dist/jobs.html`, `vercel.json` rewrite). `public_job_board()`(가입 안 해도 됨)로 공고 · 가입한 학원, 공고가 없으면 예시 공고(`JOB_SAMPLES`)에 "예시" 표시. 상세는 `/jobs#job/공고`.
  - (예전) 분야 상세 흐름: `/area/admin` 분야 상세 → 프로그램이면 가입, 서비스면 `#apply/분야` → `#done` 접수 완료. 분야 내용은 `assets/areas.js`
  - 분야 상세페이지: 그림(`HERO_ART`) · 핵심 포인트 · 지원 내용 아이콘 · 분야 색(`AREA_LOOK.accent` → CSS `--ac`). 제휴 · 홍보는 공식 파트너 칸(`PARTNERS`: 로고 · 소개 · 연결 4단계). 인투유학 로고 `assets/brand/intoyuhak-logo.png`, 인투마케팅 로고 `assets/brand/intomarketing-logo.png`(가로) · `intomarketing-mark.png`(세로, 앱 제휴 · 홍보 소개 칸).
  - 로그인 패널(`#login` · `#signup`, 예전 `?signup=1`도): 아이디 로그인·회원가입, 구글로 계속하기, "예시 계정 들어가보기"(`DEMO_ROLES`), "초대 코드가 뭐예요?" 설명, "로그인 유지하기"
  - 비용 안내(`SITE_PRICE`, 운영 프로그램 · 채용 공고 무료) · 이용 사례(예시, `SITE_STORIES`) · 자주 묻는 질문(`SITE_FAQ`) · 운영 정보(예시, `SITE_ORG` — 실제 정보가 정해지면 여기만 바꾸기). 모두 `assets/areas.js`.
  - 분야 상세 주소는 `/area/admin`처럼 진짜 주소(검색 노출용). 빌드가 분야마다 제목 · 설명 · canonical이 들어간 `dist/area/분야.html`과 `robots.txt` · `sitemap.xml`을 만들고, `vercel.json` rewrites가 `/area/:id`를 이어 줘요. 화면 안에서 분야 · 처음 링크는 pushState로 바뀌고 탭 제목도 바뀌어요(`setMeta`). 예전 `#area/…` 주소는 저절로 바꿔 줘요. 그래서 `index.html`의 파일 주소는 `/assets/…`처럼 `/`로 시작해요.
  - 연락 예정(`etaText`): 고른 연락 시간대(`CONTACT_SLOT`) 기준으로, 주말 · 공휴일(`HOLIDAYS`, 해마다 다음 해 것 더하기)은 건너뛰어요.
  - 사업자 정보: `areas.js`의 `SITE_ORG`(상호 · 대표자 · 사업자등록번호 · 통신판매업 · 주소 · 고객센터 · 이메일 · 개인정보 보호책임자). 지금은 예시, 실제 정보로 바꾸고 `ready: true`.
  - 상담 신청서(`#apply`) · 가입 전 문의(`#ask`): 필수 표시 *, 전화번호 자동 하이픈 · 형식 확인, 지역은 시·도 → 시·군·구 고르기(`assets/regions.js`의 `regionPicker`), 개인정보 수집 · 이용 동의(필수), 끝나면 `#done`에 접수 번호 · 연락 예정 시각(`etaText`: 평일 16:30 전이면 오늘 오후 6시 전, 아니면 다음 평일 오전).
  - 스타일은 `assets/site.css`
- `login.html`, `service.html`: 예전 주소. 첫 화면으로 넘겨 주기만 한다.
- 공유 미리보기: 각 페이지의 og 메타 태그 + `assets/og.png`(1200×630), 탭 아이콘 `assets/favicon.svg`
- `app.html` + `assets/app.js`: 로그인 후 화면. `?role=owner|teacher|parent|student`, 페이지는 `#home` → `#admin` → `#admin/attend` 같은 해시로 바뀐다. 메뉴 구조는 `app.js`의 `AREAS`.
- `assets/base.css`: 공통 색·버튼, `assets/app.css`: 로그인 후 화면 스타일
