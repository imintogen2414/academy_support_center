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
- 화면은 한 번에 다 보여주지 않고 "홈 → 분야 → 세부 → 항목"처럼 한 단계씩 들어가게 정돈한다.
- 디자인: 남색·파란 계열(진한 남색 배경, 세로 빛줄기, 반투명 카드, 밝은 파란 버튼). 색 토큰은 `assets/base.css`의 `:root`에 모여 있다.
- 정적 HTML + 작은 빌드 단계 + Supabase. 화면을 React로 다시 짤 때가 오면 Next.js로 옮긴다.
- 로그인 후 화면의 학원 수치는 아직 예시 데이터(`assets/data.js`)다. 실제 데이터는 단계별로 Supabase 테이블로 옮긴다.

# 빌드 · Supabase
- `npm run build` → `dist/`를 만든다(Vercel도 같은 명령, `vercel.json`). 화면 파일 복사 + supabase-js 브라우저 파일(`assets/vendor/supabase.js`) + 환경변수로 `assets/env.js` 생성.
- 환경변수: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (Vercel에 등록됨). 없으면 로그인·신청 저장 없이 데모로만 동작.
- 로컬 확인: 환경변수 넣고 `npm run build` 후 `dist/`를 웹서버로 연다. `dist/`, `node_modules/`는 커밋하지 않는다.
- `assets/supa.js`: Supabase 연결(`SB`), 아이디 → 내부 이메일(`아이디@id.academysupportcenter.app`) 변환, 오류 문구.
- 로그인: 아이디+비밀번호(내부 이메일 방식, Supabase "Confirm email" 꺼 둠), 구글(OAuth, pkce). "로그인 유지하기"를 끄면(`asc-keep-login`=0) 세션을 sessionStorage에 둬서 창을 닫으면 로그아웃(`supa.js`의 `authStore`). 구글로 처음 오면 `app.html`에서 역할을 한 번 고른다.
- `app.html`: `?demo=1&role=…`(또는 예전 `?role=…`)이면 데모, 아니면 로그인 필수.
- 테이블(`supabase/migrations/`에 SQL 보관, 모두 RLS):
  - `support_requests`: 학원 → 센터 지원 신청. 누구나 넣기만 가능, 읽기는 대시보드에서만.
  - `profiles`: 아이디·이름·역할·학원. 가입 시 트리거로 자동 생성, 본인 것만 보기·고치기.
  - `academies`, `academy_members`(한 학원에 원장 여러 명 가능), `academy_codes`(원장용·강사용·학부모·학생용 초대 코드, 원장만 RPC로 조회), `students`(원장 쓰기, 원장·강사 읽기).
  - 역할은 스스로 고른 게 아니라 "어떤 초대 코드로 들어왔는지"로 정해진다. 원장은 `create_academy`, 나머지는 `join_academy(코드)`.
  - 정책용 도우미 함수는 API에 안 보이는 `private` 스키마(`private.academy_role`).
  - `leads`: 상담·등록(문의→상담→체험수업→등록). 원장·강사 읽기·쓰기, 원장만 삭제. "등록"으로 옮기면 트리거가 `students`에 자동 추가.
  - 행정 지원: `attendance`(학생·날짜마다 출석/지각/결석/조퇴, 원장·강사 읽기, 쓰기는 `mark_attendance(학생들, 날짜, 상태|null)` RPC만), `invoices`(수납·청구, 금액은 원 단위, 학생 이름·반은 트리거가 채움), `expenses`(지출), `incomes`(수납 밖의 수입: 교재 판매·특강 등), `paperwork`(서류 마감). 돈·서류는 원장만.
  - 센터 관리: `center_admins`(이메일 목록, RPC로만: `am_center_admin` `list_center_admins` `add_center_admin(이메일|아이디)` `remove_center_admin`, 나 자신은 못 뺌). 판정은 `private.is_center_admin()` — 구글로 확인된 이메일이거나 센터 아이디일 때만. 첫 관리자: `yunji040615@gmail.com`, `imintogen2414@gmail.com`.
  - 강사 교육: `training_videos`(관리자만 쓰기, 원장·강사는 배부된 것만 보기, 영상은 유튜브·비메오 주소), `training_reflections`(영상당 한 사람 하나, 쓰면 이수 완료). 원장도 듣고 써요. 리플렉션 내용은 본인만 바로 읽고, 원장은 `academy_training_report(학원)`로 우리 강사 것까지 봐요. 관리자는 내용 없이 `admin_training_progress()`(이수 수) · `admin_video_reflections(영상)`(이름·학원·날짜)만.
  - 관리자 신청: `admin_applications`(RPC로만: `apply_center_admin(이름, 소속)` `my_admin_application()` `list_admin_applications()` `decide_admin_application(신청, 수락?)`). 구글로 확인된 이메일이나 센터 아이디만 신청 가능, 수락하면 `center_admins`에 들어가요. 거절돼도 다시 신청할 수 있어요.
  - `support_requests`: 관리자는 보기 + `status`·`admin_memo` 고치기.
  - 채용: `job_posts`(원장 쓰기, `academy_field` 학원 분야는 `ACADEMY_FIELDS` 예시를 눌러 고르기 → 강사 게시판에서 분야로 거르기, 모집 중 공고는 강사·원장 누구나 보기 — 학원 없는 강사도), `job_applications`(강사 지원·지원 단계에서 취소, 공고 올린 원장이 상태 변경), 원장은 `list_job_applicants(학원)`로 이름·교육 이수 수와 함께 봐요.
  - 제휴: `partner_applications`(원장 신청·확인 전 취소, 관리자가 new→contacted→connected→closed 처리). 제휴처 목록 자체는 `data.js`의 `partners`.
  - 유학: `abroad_promos`(원장이 학부모에게 안내), `abroad_requests`(학부모·학생 신청 → 원장 confirmed → forwarded → 관리자 done). 관리자는 forwarded·done만 봐요.
  - 학부모·학생 앱: `student_links`(원생 ↔ 학부모·학생 계정, 원장이 `link_family(원생, 사람, 켬/끔)`으로 연결, 대상은 `list_family_members(학원)`). 학부모·학생은 `my_children()`, 학부모만 `my_child_invoices()`(원장 메모 뺌), 출결은 연결된 아이 것만 바로 읽기.
  - 학부모 공지: `notices`(원장 쓰기, `target_class`가 비면 전체·있으면 그 반 아이와 연결된 가족만), `notice_reads`(읽음은 `mark_notice_read(공지)`로만). 원장은 `notice_report(학원)` 읽음 수, `notice_readers(공지)` 읽은·안 읽은 사람.
  - 홍보 의뢰: `promo_requests`(원장·강사 의뢰, 의뢰한 사람 `requested_by`·이름·역할은 트리거가 채움. 원장은 우리 학원 것 전부, 강사는 내 것만. 접수 단계에서 취소, 관리자가 new→contacted→working→review→done + `admin_memo`).
  - 결재: `approvals`(강사·원장이 올림, 올린 사람은 트리거가 채움, 올린 사람과 원장만 보기, 기다리는 동안 올린 사람이 고치기·취소). 원장은 `decide_approval(결재, 승인?, 의견, 지출 항목|null)` — 항목을 넣으면 `expenses`에 저절로 들어가요. 원장 `#admin/approvals` 결재함, 강사 `#approvals`.
  - 일정 · 시간표: `timetable`(반 · 요일 · 시간 · 과목 + 세부 강의실 · 담당 강사 · 메모, 원장 쓰기), `academy_events`(시험 · 행사 · 휴원 …, 원장 · 강사 쓰기, 강사는 내 것만 고침, 세부는 `detail`). 두 표 모두 원장 · 강사만 바로 읽고, 학부모 · 학생은 세부를 뺀 `family_timetable(학원)` · `family_events(학원, 부터, 까지)`. 화면 `#schedule`(모든 역할, 주간 시간표 · 월간 달력).
  - 학생 할 일: `student_todos`(학생 · 날짜 · 할 일, 만든 사람 · 역할은 트리거가 채움). 원장 · 강사는 반 전체나 학생 한 명에게, 학부모 · 학생은 연결된 아이에게만 넣기. 체크는 `check_todo(할 일, 했음?)`. 만든 사람이 고치고, 만든 사람과 원장이 지워요. 화면: 원장 `#members/todos`, 강사 `#todos`, 학부모 `#kid/todos`, 학생 `#todos`(홈 맨 위에도 카드).
  - 성장 리포트: `growth_reports`(학생 · 기간 · 과목 점수 `scores` · 학습 태도 `ratings` · 잘하는 점 · 노력할 점 · 종합 의견 · 다음 목표, 출결 · 할 일 수행 `stats`는 저장할 때 화면이 계산). 원장 · 강사가 쓰고 `status`를 issued로 바꾸면 연결된 가족이 봐요(발급 시각은 트리거). 인쇄 · PDF는 브라우저 인쇄(`@media print`). 화면: 원장 `#members/reports`, 강사 `#reports`, 학부모 `#kid/reports`, 학생 `#reports`.
  - `academy_name`은 트리거가 채워요(학원 표는 그 학원 사람만 읽을 수 있어서).
- 실제 데이터로 연결된 화면: 행정 지원 전체(`#admin/*`, 강사는 `#attend`), 강사 관리 전체(`#teachers/staff` `training` `hire`, 강사 `#learn` `#jobs`), 제휴 전체(`#mou/partners` `abroad` `mine`), 학부모 `#abroad`, 센터 관리(`#center/videos` `requests` `partners` `abroad` `admins`), 원장 홈 "오늘 챙길 일", 학생·학부모 관리 전체(상담·등록, 원생 명단 + 앱 연결, 초대 코드, 학부모 공지 `#members/notices/공지`), 홍보 지원(`#promo/*`, 센터 `#center/promo`). 학부모 `#kid/attend` `#kid/bills` `#news/공지` `#abroad`, 학생 `#attend` `#news`. 데모에만 있는 것: 학부모·학생 일정·숙제·기록(실제 로그인에선 메뉴에서 빠져요).
- 학원 코드가 없는 강사: 학원 연결 화면의 "채용 공고 먼저 보기" → `SEEKER` 모드(채용 공고만).
- 관리자 신청 화면: `app.html#apply-admin`(왼쪽 아래 "센터 관리자 신청", 역할 고르기·학원 연결 화면에도 링크). 수락은 센터 관리 → 관리자.
- 센터 관리자: 학원에 속해 있으면 메뉴에 "센터 관리"가 더 생기고, 학원 없이 관리자만이면 `ROLE = 'admin'`으로 센터 화면만 봐요(역할 고르기도 건너뜀).
- 재정: 매출 = "납부 확인"한 청구(납부한 날 기준) + `incomes`, 순이익 = 매출 - `expenses`. 기간(오늘·최근 7일·월별·3·6개월·1년)마다 그래프 · 표 · 거래 내역 · 엑셀 내려받기(`app.js`의 `finRange` `ledger`). 학원에 아직 속하지 않은 회원은 `app.html`에서 학원 만들기/코드 합류 화면을 먼저 본다.
- 뒤로 가기: 왼쪽 메뉴와 위치 표시(홈 › 분야) 링크는 기록을 바꿔치기(`goReplace`)해서 쌓이지 않아요. 화면 위 "‹ 이전"은 바로 전 화면 한 단계(처음 연 화면이면 한 단계 위).
- 사용자에게 보이는 말: "데모" 대신 "예시 계정", 유학 제휴처 이름은 "인투유학".
- 엑셀로 올리기: `assets/sheet.js`(바깥 라이브러리 없이 .xlsx·.csv 읽기 `readSheet`, 양식 만들기 `downloadXlsx`) + `app.js`의 `IMPORTS`·`importDialog`(원생 명단 · 재정에 "엑셀로 올리기"). 칸 이름은 여러 표현을 알아듣고(`alias`), "예시)" 줄·빈 줄은 건너뛰고, 이미 있는 줄은 건너뛰어요. .xls(예전 형식)는 .xlsx로 저장해 달라고 안내.
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
15. 자료실 (공유 대상 · 비공개, 원장은 모두 보기)
16. 서류·행정 자동 처리
17. 메신저 (원장↔관리자·강사·학부모·학생, 강사↔강사·학부모·학생, 학부모↔학생)
18. 새 소식 빨간 점 (확인하면 사라짐)

# 작업 메모
- 이 클라우드 환경에서는 Supabase·jsdelivr에 직접 접속이 막혀 있다. DB는 Supabase MCP(apply_migration, execute_sql로 `set local role authenticated` + `request.jwt.claims` 시나리오 시험 후 rollback)로, 화면은 가짜 env로 빌드한 `dist/`를 Playwright로 열고 Supabase 응답을 흉내 내서 시험한다. 실제 동작은 Vercel 미리보기에서 사용자가 확인.
- 회원: 테스트 계정 `test_owner`(홍길동), 구글 계정 박윤지(인투어학원 원장).

# 파일 구조
- `index.html`: 첫 화면. 홈페이지가 아니라 프로그램 입구처럼 반반으로 나눈다.
  - 왼쪽(남색) "지원받기": 분야 고르기 → `#area/admin` 분야 상세 → `#apply/admin` 지원 신청 → `#done` 접수 완료. 분야 내용은 `assets/areas.js`
  - 분야 상세페이지: 그림(`HERO_ART`) · 핵심 포인트 · 지원 내용 아이콘 · 분야 색(`AREA_LOOK.accent` → CSS `--ac`). 제휴 · 홍보는 공식 파트너 칸(`PARTNERS`: 로고 · 소개 · 연결 4단계). 인투유학 로고 `assets/brand/intoyuhak-logo.png`, 인투마케팅은 로고가 오면 `PARTNERS.promo.logo`에 넣기(지금은 글자 로고).
  - 오른쪽(흰색) "프로그램 쓰기": 아이디 로그인·회원가입(`?signup=1`), 구글로 계속하기, "예시 계정 들어가보기"(데모), "초대 코드가 뭐예요?" 설명, "로그인 유지하기"
  - 휴대폰에서는 위쪽 탭(지원받기 / 프로그램 이용하기)으로 바로 오간다.
  - 스타일은 `assets/site.css`
- `login.html`, `service.html`: 예전 주소. 첫 화면으로 넘겨 주기만 한다.
- 공유 미리보기: 각 페이지의 og 메타 태그 + `assets/og.png`(1200×630), 탭 아이콘 `assets/favicon.svg`
- `app.html` + `assets/app.js`: 로그인 후 화면. `?role=owner|teacher|parent|student`, 페이지는 `#home` → `#admin` → `#admin/attend` 같은 해시로 바뀐다. 메뉴 구조는 `app.js`의 `AREAS`.
- `assets/base.css`: 공통 색·버튼, `assets/app.css`: 로그인 후 화면 스타일
