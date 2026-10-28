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
- 메뉴 묶음: `app.js`의 `NAV_GROUPS`(역할별 묶음 이름 · 설명 · 메뉴들). 왼쪽 메뉴(접고 펴기, 접은 묶음은 localStorage `asc-nav`) · 홈 타일 · 전체 메뉴 안내(`#guide`)가 같은 묶음을 써요. 새 메뉴를 만들면 여기에 넣기. 원장 · 강사는 "학원 운영"이 학생·학부모 관리 → 행정 지원 → 일정 순(강사는 결재 · 강사 관리도 여기). 분야 첫 화면의 세부 메뉴는 `SUB_GROUPS`로 작은 묶음(행정: 매일 쓰는 것 · 돈·세금 · 비품·서류 · 자동 처리 / 센터 관리: `CENTER_GROUPS` 처리할 일 · 학원·회원 · 연결·파트너 · 센터 운영 — 학원 없는 관리자는 왼쪽 메뉴에도 이 묶음으로 세부 메뉴가 바로 보여요 / 학생·학부모: 상담·원생 · 수업 관리 · 학부모 소통 / 강사: 우리 강사 · 교육·채용)으로 나누고, "센터에 맡기기"는 타일이 아니라 아래 한 줄(`subTiles`).
- 홈 순서: 오늘 챙길 일(급한 일) → 자주 쓰는 메뉴(`favCard`, "바꾸기"로 최대 8개 고르기, 이 기기 localStorage `asc-fav-역할-…`, 기본은 `FAV_DEFAULT`) → "처음이세요? 이렇게 시작해요"(`startSteps`, 휴대폰에선 접혀 있음 · 실제 데이터로 저절로 체크 · 다 하거나 숨기면 사라짐) → 전체 메뉴 타일.
- 위쪽 검색창: 원장 · 강사는 학생 이름 · 반 · 학부모 · 연락처(`searchPeople`, 누르면 원생 명단이 그 이름으로 걸러짐 `STU_Q`)와 상담 학생, 그리고 메뉴(`searchMenus` + 비슷한 말 `SEARCH_WORDS`). 휴대폰에서도 보여요.
- 메뉴 이름은 역할이 달라도 같은 기능이면 같은 이름: 출결 · 수납 · 오늘 할 일 · 공지 · 결재 · 유학 상담 · 일정·시간표 · 내 제휴 · 내 의뢰 · 강사 채용.
- 분야별 이용(`academy_services`): 원생 · 출결 · 일정 · 채팅 같은 기본 프로그램은 누구나 쓰고, 센터가 직접 해 주는 지원만 학원마다 분야(행정 · 강사 · 학생·학부모 · 제휴 · 홍보)가 "이용 중"(active)일 때 열려요. 상담 중(consulting) · 이용 끝남(ended) · 줄 없음(신청 전)이면 `app.js`의 `SVC_GATE` 화면 대신 `svcLockPage`(신청 안내)가 보이고, 신청 · 의뢰 버튼은 `svcGuard`가 막아요. DB도 `private.has_service(학원, 분야)` · `private.my_service(분야)`로 제휴 신청 · 유학 안내/상담 · 홍보 의뢰 · 채용 공고 · 강사 교육 영상 · 리플렉션 · 센터에 맡기기를 막아요. 이 기능 전에 있던 학원은 다섯 분야 모두 이용 중으로 넣어 뒀고, 새로 만든 학원은 신청 전부터 시작해요.
  - 원장: `#services`(이용 중인 센터 지원 · 분야 더 신청하기 `request_academy_services` → 센터 "지원 신청"에 학원과 이어진 채로 들어가고 그 분야는 상담 중), 첫 화면 접수 번호로 잇기 `claim_support_request(학원, 번호)`. 홈에 안 쓰는 분야가 있으면 한 줄 안내(`svcHint`), `#help` 위에도 요약.
  - 관리자: 센터 관리 → 학원 · 이용 분야(`#center/academies`, `admin_academies()` · `set_academy_service(학원, 분야, 상태|null)`). 학원마다 다섯 분야 칸을 눌러 고르면 바로 저장, 상담 중인 학원이 맨 위 + "모두 이용 중으로 열기".
  - 학부모 · 학생: 제휴가 꺼져 있으면 유학 메뉴가 안 보여요. 학생 `#abroad`의 안내 카드는 접어 둘 수 있어요(`foldWrap`, localStorage `asc-fold-abroad`). 학생(성인 수강생 포함)도 `#abroad`에서 학원이 안내하는 캠프 · 어학연수 · 유학을 보고 직접 상담을 신청해요(신청 창 문구는 본인 기준).
- 신청한 분야만 열기: 첫 화면에서 지원 신청한 휴대폰과 원장 프로필 휴대폰이 같으면 `create_academy`가 그 신청을 학원과 잇고 신청한 분야만 "이용 중"으로 열어요(`private.open_services`). 접수 번호로 잇기(`claim_support_request`)도 바로 이용 중. 이용 중이 아닌 센터 지원은 메뉴 · 타일에서 숨겨요(`tailorMenus`, 제휴 · 홍보는 통째로 `SVC_WHOLE`). 주소로 들어오면 신청 안내.
- 성인 학원(`academies.family` = false): 학원 만들 때 "어린이 · 청소년 / 성인" 고르기, 원장 설정 "학부모 기능"으로 바꾸기. 끄면 학부모 칸(`personFields`) · 학부모 말이 빠지고 "수강생 관리 · 수강생 명단 · 연락처(students.phone)"로 보여요. 학부모·학생용 코드는 "수강생용"으로. `famOn()`.
- 파트너 계정(`partner_members`, 관리자가 센터 관리 → 관리자 "파트너 담당자"에서 `add_partner_member(아이디|이메일, 회사)` · `remove_partner_member`): 인투마케팅 담당자는 홍보 의뢰, 인투유학 담당자는 유학 상담(원장이 넘긴 것) · 유학 제휴 신청(a1~a5)을 센터를 거치지 않고 바로 받아 단계 · 안내를 바꿔요(`private.my_partner()` 정책). 로그인하면 `ROLE = 'partner'`, 센터 화면(`centerPromoPage` 등)을 우리 회사 몫만 채운 `CENTER`(`loadPartner`, `CENTER.partner`)로 같이 써요. 센터장은 전부 보고 문제 있을 때만 개입.
- 센터에 맡기기(`center_tasks`, 행정 · 강사 관리 · 학생·학부모 관리 아래 `…/center`): 원장이 서류 대신 작성 · 명단 옮기기 · 채용 대행 · 설명회 준비 같은 일(`TASK_KINDS`)을 맡기면, 관리자가 센터 관리 → 맡긴 일(`#center/tasks`)에서 접수 → 진행 중 → 완료 + 센터 메모(원장 화면에 보여요). 원장은 접수 단계에서만 고치기 · 취소, 상태 · 메모는 트리거가 관리자만 바꾸게 해요.
- 설정(`#settings`, 모든 역할 · 오른쪽 위 내 이름이나 왼쪽 메뉴 "설정"): 내 정보(이름 · 아이디 · 휴대폰 · 로그인 방법, 고치기는 `profileDialog`, 아이디 로그인은 비밀번호 바꾸기), 우리 학원, 이용 중인 센터 지원, 결제 정보(원장: 센터 이용료 · 결제 수단 자리, 학부모: 낼 수강료), 화면 밝기(`setThemeMode` 기기 설정 · 밝게 · 어둡게) · 로그인 유지 · 자주 쓰는 메뉴 · 처음 안내 · 메뉴 묶음 펼치기, 로그아웃 · 관리자 신청 · 탈퇴 안내. 휴대폰이 없으면 홈에 한 줄 안내(`phoneHint`).
- 학생 한 명 보기(원장 `#members/students/학생` · 강사 `#students/학생`, `studentDetail`): 학부모 연락(전화 · 문자 · 번호 복사) · 최근 3개월 출결 · 수납(원장만) · 상담 기록(`leads.student_id`) · 최근 2주 할 일 · 성장 리포트 · 기본 정보. 원생 명단의 이름이나 위쪽 검색의 학생을 누르면 열려요. 학부모 번호는 원장 · 강사 화면에서 가리지 않고 누르면 전화가 걸려요(`telLink`).
- 학부모 수강료 내기: 원장이 설정 → 결제 정보에서 학원 입금 계좌(`academies.pay_bank` · `pay_account` · `pay_holder` · `pay_note`)를 넣으면, 학부모 수납 화면 "내기"(`payDialog`)에 계좌와 복사 버튼이 나와요. 보낸 뒤 "보냈어요" → `report_invoice_paid(청구, 메모, 취소?)`가 `invoices.reported_at`을 남기고, 원장 수납 · 홈 "오늘 챙길 일"에 "입금 확인"으로 떠요. 납부 확인(`paid_at`)은 그대로 원장이. 카드 결제(PG)는 아직 없어요.
- 직책 · 권한(원장 `#teachers/roles`, `rolesPage`): 원장이 강사마다 직책(`academy_members.title`, 우리 학원 직책 `academy_titles` — 매니저 · 재정 담당 · 상담 실장 · 교무 담당 예시 `TITLE_PRESETS`)을 정하고, 원장만 쓰던 기능을 하나씩 켜요(`academy_members.perms`, `PERM_LIST`: students 모든 원생 · 학부모 연결 · notices 공지 · invite 초대 코드(원장용 코드는 빼고) · billing 수납 · finance 재정 · paper 서류 · payroll 원천세 · approvals 결재 처리(내가 올린 건 못 함) · hire 강사 채용 · staff 강사 관리). RPC `list_staff_perms` · `set_member_perms` · `save_academy_title`(직책을 고치면 그 직책인 사람 권한도 바뀜) · `delete_academy_title`, 정하는 건 원장만. DB 판정은 `private.can_do(학원, 권한)`(원장은 늘 true) — 청구 · 지출 · 수입 · 서류 · 원천세 · 공지 · 결재 · 공고 · 원생 정책과 RPC가 이걸 써요. 화면은 `can(권한)`, 강사 권한은 로그인 때 `PERMS` · `MY_TITLE`(위쪽 이름 아래에 직책). 예시 계정은 원장 예시에서 바꾸면 이 기기 localStorage `asc-demo-perms`에 남아 강사 예시(김민지)에 보여요. 학원 정보 · 결제 계좌 · 자동 처리 · 센터 지원 신청 · 사진으로 올리기 · 직책 정하기는 원장만.
- 강사 메뉴는 원장과 같은 묶음(`teacherMenus()`): 행정 지원(출결 + 켜 준 수납 · 재정 · 결재 처리 · 서류 · 원천세) · 학생·학부모 관리(상담·등록 · 원생 명단 · 오늘 할 일 · 성장 리포트 + 공지 · 초대 코드) · 강사 관리(강사 관리 · 채용 권한이 있을 때) · 일정 · 채팅 · 자료실 · 결재(내가 올린 것) · 강사 교육 · 제휴 · 홍보. 주소도 원장과 같아요(`#admin/attend`, `#members/students` …). 예전 강사 주소(`#attend` `#students` `#leads` `#todos` `#reports`)는 `TEACHER_OLD`로 새 주소로 넘겨요. 강사도 출결에서 "입구 출석 화면 열기"(QR) · 홈 "입구 QR 출석 화면 켜기".
- 바뀐 기록 요약(`private.schedule_log`): 고치면 "바뀌기 전 → 바뀐 뒤", 시간은 그대로고 강의실 · 담당 · 메모 · 색만 바뀌면 무엇이 바뀌었는지, "이 주만 빼기"는 action `skip`("이 주 뺌"). 예시 계정은 `DEMO_EDITS`에서 칸 아래 "고침"과 바뀐 기록을 같이 만들어요(`demoSchedLogs`).
- 시간표 지우기: 삭제를 누르면 아래 버튼 줄 자리에 "같은 수업 n칸 모두 지우기 / 이 칸만 지우기 / 이 주만 빼기 / 그만두기"가 떠요(예전엔 창 위쪽 메시지 칸에 떠서 안 보였어요).
- 일정 · 시간표는 원장 · 강사가 똑같이 넣고 고치고 지워요. 트리거 `private.schedule_stamp`가 `created_by_name` · `updated_by_name` · `updated_at`을 채워 칸 아래에 "박윤지 넣음 · 김민지 고침 10/27"(`stampLine`), `private.schedule_log`가 `schedule_logs`(넣음 · 고침 · 지움, 원장 · 강사만 읽기)에 남겨 화면 아래 "바뀐 기록"(`schedLogCard`, 최근 30개). 사진으로 올리기만 원장.
- 계정 전환 · 로그아웃: 위쪽 내 이름 옆 "계정 전환" · "로그아웃"(휴대폰은 아이콘), 왼쪽 메뉴 맨 아래, 설정 → 계정. 이 기기에서 로그인한 계정을 기억해 두고(`supa.js`의 `savedAccounts` · `rememberAccount` · `switchAccount`, localStorage `asc-accounts` 최대 10개, 넘으면 가장 오래 안 쓴 계정부터 빠짐, "로그인 유지하기"를 켠 계정만) 비밀번호 없이 바꿔요(refresh token으로 `refreshSession`, 토큰이 바뀔 때마다 새로 저장). "다른 계정 추가하기"는 이 창 로그인만 지우고(`clearLocalSession`, 서버 로그인은 그대로) 로그인 화면으로, 첫 화면 로그인 패널 위에 "이 기기에서 로그인한 계정". 로그아웃은 `signOut({ scope: 'local' })` + 목록에서 빼기. 예시 계정은 원장 · 강사 · 학부모 · 학생 · 구직 강사 예시끼리 바로 바꿔요.
- 아이디 · 비밀번호 찾기(첫 화면 `#find/id` · `#find/pw`, 로그인 버튼 아래 링크): Edge Function `account-help`(verify_jwt 끔). `find_id`(이름 + 휴대폰/이메일 → 가린 아이디 · 구글 계정 표시), `send_code`(아이디 + 가입한 휴대폰/이메일 → 6자리 인증번호, 1시간 5번), `reset`(인증번호 10분 · 5번까지 → 새 비밀번호), `admin_temp`(센터 관리자 → 회원 상세 "임시 비밀번호 만들기"). 인증번호는 해시만 `recovery_codes`(RLS 켜고 정책 없음, 서비스 키만). 보내기는 비밀 값으로: 이메일 Resend `RESEND_API_KEY` · `MAIL_FROM`, 문자 솔라피 `SOLAPI_API_KEY` · `SOLAPI_API_SECRET` · `SOLAPI_SENDER` — 없으면 "준비 안 됨 · 센터 문의" 안내.
- 가입할 때 휴대폰 + 이메일(`profiles.email`, 소문자, 겹치면 안 됨 `profiles_email_uniq`). 학생은 둘 중 하나만 있어도 돼요. 구글 회원은 구글 이메일이 저절로. 설정 "내 정보 고치기"에서 이메일도 고치고, 없으면 홈에 한 줄 안내(`phoneHint`).
- 센터 시험용 휴대폰 `010-2369-9657`(`private.is_test_phone`)은 휴대폰 · 이메일 겹침 검사에서 빠져서 몇 번이고 다시 가입할 수 있어요(유일 인덱스 조건 · `check_profile_taken` · `handle_new_user`). 이름 · 아이디는 그대로 겹치면 안 돼요.
- 일정 · 시간표 색(`timetable.color` · `academy_events.color`, 10가지 `COLORS` → CSS `.tint.col-이름`, 입력은 `formDialog`의 `type: 'color'` 동그라미). `.col`은 칸반 열 클래스라 색에는 `tint`를 써요.
- 주마다 다른 시간표: `timetable.week_of`(그 주 월요일, 있으면 그 주에만) · `skip_weeks`(매주 수업이 빠지는 주). 화면은 `ttOn(t, 월요일)`, DB는 `private.tt_on`(QR 지각 판단). 칸을 누르면 "매주 바꾸기 / 이 주만 바꾸기", 지우기는 "이 주만 빼기 / 매주에서 지우기". 고칠 때도 요일을 더 고르면 그 요일에 새 칸(예전엔 고칠 때 요일 하나만 돼서 "요일 여러 개"가 막혔어요). 순서는 `ttSort`(요일 → 시작 시간 → 반).
- 우리 학원 과목 목록: `academies.subjects`(`set_academy_subjects`, 원장 · 강사), 시간표 창 과목 칸 아래 "과목 목록 고치기"(`bindSubjectEditor`). 없으면 `SUBJECTS`.
- 우리 학원 사람들(`academy_people_counts(학원)` · `academy_people_list`, 원장 · 강사만 — 학부모 · 학생 화면 · DB 모두 빠짐, 화면 로드는 `loadPeopleCounts`): 원장 · 강사 · 학부모 · 학생 계정 수 + 다니는 원생 — 홈 카드(`peopleCard`) · 설정 "우리 학원".
- 행정 지원 엑셀로 모두 받기(`#admin` 위쪽 버튼 · `adminExportDialog` → `adminExport`): 기간을 고르면 요약 + 원생 명단 · 출결 기록 · 학생별 · 반별 출결 · 청구 · 미납 · 월별 수납 · 지출 · 수입 · 월별 재정 · 항목별 지출 · 거래 내역 · 원천세 · 서류 · 결재 · 수강료 · 할인 · 자동 처리 시트(강사는 켜 준 권한만). `downloadXlsx`의 `opts.more`로 여러 시트, 글꼴은 맑은 고딕(charset 129).
- 첫 화면 · 운영 프로그램 상세 "휴대폰 · 노트북에서"(`deviceSec`): 역할 버튼(눌러 보기 · 처음엔 반짝임) + "휴대폰으로 보기 / 노트북으로 보기"(`LAP_SCREENS` 역할마다 노트북 화면, `laptopMock(역할)`). 장은 6초마다 그 역할 안에서만 넘어가고 역할은 누를 때만 바뀌어요.
- 칸별 권한 주의: 여러 표가 `grant insert/update (칸들)`로 칸마다 권한을 줘요(timetable · academy_events · library_items · notices · messages …). 새 칸을 더하면 꼭 `grant insert (새 칸) / grant update (새 칸)`도 함께 — 빠지면 저장할 때 "permission denied"(42501)로 "저장하지 못했어요"가 떠요(10라운드 색 · 주 칸에서 실제로 났어요). 저장 오류는 `dbErr(오류)`가 이유 + 오류 코드로 보여 줘요.
- 수강료 · 할인 순서 · 묶음(15라운드): `tuition_plans.sort_order` · `group_name`, `discount_presets.sort_order`. 수납 "정해 둔 수강료"에서 "순서 · 묶음 정리"(`orderDialog` → `planOrderDialog`: 끌어서 놓기 · ▲▼ · 묶음 이름 · 한 번에 정렬(묶음끼리 · 금액 · 가나다)), 할인은 "순서 바꾸기"(`discOrderDialog`). `loadPlans`가 순서대로 정렬, 카드는 묶음 제목(`planGroups`)마다. 고르기 칸은 `planOpts()` + `optHtml`(묶음은 `<optgroup>`, `formDialog` select도 `{ group, options }`를 알아들어요). 할인 금액 칸은 `type: 'won'`(쉼표, 퍼센트면 단위가 %).
- 여러 명 빠르게 넣기(15라운드): 위 "모든 줄 수강료 한 번에" 칩, 칸 이름 줄, 반을 적으면 그 반으로 정한 수강료가 저절로.
- 출결(15라운드): 위에 늘 "원생 추가 · 여러 명 넣기", 반별 정렬은 `byClass`(반 가나다 · 숫자 크기대로 · "반 미지정" 맨 뒤 · 반 안은 이름 가나다).
- 수납(15라운드): 위쪽은 "이 달 청구서 만들기 · 더 보기 ▾"(청구 한 건 추가 · 청구 없이 받은 돈 넣기(예전 "현장에서 받기", `onsitePayDialog`) · 카드 단말기 매출로 납부 맞추기 · 수강료표 사진). 미납 줄 네모로 고르기(`INV_SEL`) · 전체 고르기 · 입금 알림 온 것만 → "고른 n건 납부 확인" / "모두 납부 확인"(`payManyDialog`: 결제 방법(지난번 것 localStorage `asc-pay-method`) · 받은 날 · 영수증). 원생 명단 수강료 칸은 청구 전에도 "받았어요"(`data-fee-take`: 청구 + 납부 완료 한 번에, 알림에 "영수증" 버튼 `toastAct`).
- 카드 단말기(15라운드): 토스 단말기 같은 카드 단말기는 웹과 바로 이어지는 공개 연결 방법이 없어요(토스플레이스 · VAN 연동 계약이 필요). 대신 `cardMatchDialog`: 단말기 관리 화면에서 받은 매출 엑셀(.xlsx · .csv)을 올리면 `readSales`가 금액 · 승인일시 · 승인번호 · 카드사 · 상태(취소는 뺌)를 찾아 금액이 같은 미납과 짝지어 한 번에 납부 확인(method 카드, `invoices.pay_ref` 승인번호로 두 번 안 넣음).
- 재정 화면(15라운드): 위 "나간 돈 · 들어온 돈 · 더 보기(엑셀)", 기간은 월별 · 3개월 · 1년 + "다른 기간 ▾"(`FIN_MAIN` · `FIN_MORE`), 남은 돈 한 장(`fin-sum`: 남은 돈 = 들어온 돈 − 나간 돈 · 못 받은 수강료) → 탭 `FIN_TAB` 한눈에(그래프 · 항목) / 거래 내역(`FIN_KIND` 전체 · 들어온 돈 · 나간 돈) / 매달 나가는 돈(`fixedCard`).
- 고정 지출 주기(15라운드): `fixed_costs.every_months`(1 매달 · 2 · 3 · 6개월 · 12 1년 `EVERY`) — 시작하는 달부터 그 간격인 달에만(`private.run_fixed_costs`, 화면 `fixedDue` · `fixedNext`), 금액은 "한 번 나가는 금액", 목록에 "한 달 ○원꼴"(`perMonth`).
- 비품 수정(15라운드): 줄마다 "수정", 고칠 때 지금 수도 바꾸면 `move_supply(fix)`로 "수량 맞춤" 기록(수는 표에서 바로 못 바꿔요).
- 일정 여러 날짜(15라운드): 새 일정 창 "여러 날짜에 한 번에 넣기" → 달력에서 날짜 여러 개(매주 · 격주 같은 요일 한 번에) → 날마다 한 줄(`evDialog`).
- CSS 이름 부딪힘 주의: 출결 카드는 `.card.att`, 첨부 파일 한 줄은 `.att-item`(14라운드에 `.att`로 지었다가 출결 카드가 옆으로 늘어선 모양이 됐어요). 새 클래스는 `grep`으로 먼저 겹치는지 보기.
- 넘버스(16 · 17라운드): 표 파일을 올리는 칸은 모두 엑셀(.xlsx) · 넘버스(.numbers) · CSV(`SHEET_ACCEPT`, 읽기 `readBook` → 시트가 여러 개면 미리보기에서 시트 고르기, 칸 이름이 가장 잘 맞는 시트를 먼저). 받을 때는 `saveBook`이 `window.pickSheetFormat`으로 **받을 때마다** 엑셀 / 넘버스를 물어요(지난번 고른 것만 기억해 먼저 눌러 둠, localStorage `asc-sheet-last`). 넘버스는 Vercel 파이썬 함수 `api/to_numbers.py`(POST `/api/to_numbers`, `requirements.txt`의 numbers-parser)가 색 · 굵게 · 테두리 · 정렬 · 쉼표 · 합치기 · 칸 너비 · 줄 높이까지 넣어 만들어요(`downloadXlsx`는 서식 번호를 `SOBJ`로, `downloadBook`은 칸 서식 그대로 `styled`로 보내요). 넘버스에는 수식 대신 계산한 값. 함수가 없거나 실패하면(예시 · 로컬) SheetJS 0.20.3(npm `@e965/xlsx`, `assets/vendor/xlsx.full.min.js` · `xlsx.zahl.js`)로 값 · 시트 · 합치기만. 파일 이름을 `numbers.py`로 하면 파이썬 기본 모듈 `numbers`와 부딪혀요. numbers-parser는 줄 수가 칸 수보다 적은 표에 가로로 길게 합치면 저장이 실패해서 줄을 칸 수만큼 채워요.
- 재정 보고서 · 수강생 관리표 색(17라운드): 재정 보고서는 칸 묶음마다 색(`RPT_SEC` 계좌 남색 · 입금 파랑 · 출금 주황 · 고정비용 초록, `paintReport`), 금액 글자색(입금 파랑 · 출금 빨강), 한 줄 건너 옅은 색, 합계 줄 굵게 · 굵은 테두리, 이월금 줄 노랑. 관리표는 현황 요약 남(파랑) · 여(분홍) · 결제현황(초록), 머리줄 남색, 상태 글자색(신규 초록 · 취소 빨강 · 예정 파랑), 교재비 O/X 색.
- 칸 위치를 정한 양식은 `downloadBook(파일, 시트들)`(sheet.js): 칸마다 값 · 수식(`f`) · 서식(`s`: 굵게 · 크기 · 색 · 바탕 · 테두리 · 정렬 · 숫자 서식), 합치기 · 줄 높이 · 칸 너비 · 틀 고정. 수식 칸의 `v`는 미리 계산한 값(넘버스용).
- 통장(16라운드, `fin_accounts`: 별칭 · 계좌 · 기준일 잔액 `opening` · 기준일 `opening_on` · 쓰는 곳 `note`, 재정 권한): `expenses` · `incomes` · `invoices` · `fixed_costs`에 `account_id`(고정 지출이 넣는 지출에도 그대로). 납부 확인 · 지출 · 수입 창에 통장 고르기(지난번 것 localStorage `asc-acct-pay|in|out`). 재정 "통장" 탭(`acctCard`, 잔액 `acctBal`), 통장 거래내역 파일 넣기(`IMPORTS.bank`: 입금 → incomes, 출금 → expenses, "수강료" 입금은 기본으로 건너뜀).
- 재정 보고서(16라운드, `finReport`): 원장님이 쓰던 양식 그대로 — "재정 보고서" 시트(별칭 · 계좌 · 전월 잔액 | 입금 통장 · 내역 · 금액(SUMIF) | 출금 | 고정비용 현황 비용 · 처리여부 → 계좌 합계 · 입금 합계 · 출금 합계 · 전체 잔고 · 미처리 금액 · 잔액) + 통장마다 "거래내역조회" 시트 + "거래 내역"(이월금부터) + "자금예산 및 고정지출". 서식은 `RPT`. 예시 계정은 `demoFinSource`.
- 환불(16라운드): `invoices.refund` · `refunded_on` · `refund_note`(청구 창 "더 넣기"), 재정 `ledger()`에서 돌려준 날 나간 돈("환불").
- 수강생 관리표(16라운드, 원생 명단 위 탭 `STU_VIEW` = sheet, `mgView` · `mgRows(달)` · `mgSummary`): 쓰시던 넘버스 "M월 수강생 정보 및 관리 현황" 그대로 — 그 달 다닌 학생 + 그 달 청구서(수강료 · 할인 · 총 납부금액 · 결제방식 · 교재비 O/X · 환불), 위에 구분 × 남/여 × 수강 중/취소/예정 + 결제현황 합계. 원생에 `gender` · `course_from` · `course_to` · `track`(구분, 없으면 수강료 묶음) · `session`(오전/오후) 칸(원생 수정 → 더 넣기). 받기 `mgXlsx(1|12)`(COUNTIFS · SUMIFS 수식, 달마다 시트), 넣기는 `IMPORTS.students`(관리표 칸 + 수강료 칸이 있으면 그 달 청구서 · 납부 완료까지, 명단에 있는 학생은 청구서만 `keepDup`, 시트 이름에서 달 찾기 `sheetMonth`).
- 끌어서 순서(16라운드): `bindSortable(상자, { item, handle, onDrop })` — 포인터 이벤트라 마우스 · 손가락 모두. 수납의 수강료 타일 · 할인 칩에 ⋮⋮(`bindPlanSort`, 다른 묶음 제목 · 수강료 위에 놓으면 그 묶음으로), 순서 정리 창(`orderDialog`)도 같은 방식.
- 자료실 읽음(16라운드, `library_reads`, `mark_library_read` · `library_readers` · `library_read_counts`, 볼 수 있는 사람은 `private.library_audience`): 미리보기 · 다운로드 · 링크를 열면 남고, 올린 사람 · 원장 줄에 "봤어요 n/m명" → `libReadersDialog`. 공지 목록에도 "누가 읽었나요 ›"(예시 계정 `demoNoticeReaders`).
- 결재 다시 보기 · 고치기(16라운드): `apvViewDialog`(강사도 끝난 결재를 눌러 봐요), 원장(결재 처리 권한)은 끝난 결재도 `edit_approval`로 고쳐요 — 넣은 지출 금액 · 내용도 함께, `approvals.edited_at` · `edited_by_name`.
- 첫 화면 위쪽 "무료로 시작하기"는 버튼 안 글자를 `<span>` 하나로 감싸요(버튼 flex gap 때문에 띄어쓰기가 두 번처럼 보였어요).
- 시간표 기간(14라운드): 매주 수업도 `timetable.from_week` ~ `to_week`(그 주 월요일, 비면 끝 없이) 안에서만 나와요(`ttInRange` · `ttOn`, DB `private.tt_on`). 넣을 때 "언제까지?"(`PERIODS`: 한 달 4주(기본) · 3개월 · 끝나는 날 직접 · 끝 없이 · 이 주만 → `periodRow`), 칸 아래 "~11/20까지"(`ttLastDay`). 곧 끝나거나 막 끝난 수업은 위에 "한 달 더 이어가기 · 3개월 더 · 끝 없이 계속"(`ttExtend`), 원장 홈에도 한 줄. 지우기에 "지난주까지만 하고 끝내기". 바뀐 기록 요약은 `private.tt_line`(~마지막 수업 날).
- 시간표 화면 정리(14라운드): 위쪽은 "수업 넣기 · 일정 넣기 · 더 보기 ▾"(`more-menu`: 종이 시간표 사진 · 보강 넣기 · 다른 주 가져오기 · 시간표 정리). 요일 칸 아래 "+ 수업"(`data-tt-add`). 칸 오른쪽 위 ○(`data-tt-sel`)나 Shift · Ctrl+누르기로 여러 칸 → 아래 줄 "복사 · 옮기기 · 이 주 휴강 · 지우기 · 이 주 모두 고르기". 복사(`TT_CLIP`, `ttCopy`)하면 요일마다 "여기에 붙여넣기"(`ttPasteDialog`: 첫 칸 요일 · 시작 시간 · 기간, 간격 그대로) — 다른 주로 넘어가서 붙여도 돼요. 키보드 Ctrl+C · Ctrl+V · Delete · Esc. 입력 창은 색 · 강의실 · 담당 · 메모를 "더 넣기"로 접어요(`formDialog` 칸 옵션 `more` + `moreLabel`). 저장은 `TTX`(ins · upd · del) 하나로 — 예시 계정은 화면 안에서만 바뀌어요(새로 고치면 처음대로).
- 파일 2GB · 미리보기(14라운드): 자료실 · 공지 · 채팅 · 센터 공지 파일은 하나에 2GB(`FILE_MAX`). 6MB가 넘으면 Supabase 이어 올리기(TUS, 6MB씩 · 끊기면 이어서) `putFile(버킷, 경로, 파일, 진행)`, 올리는 중 띠 `upProgress`, 한도 넘으면 `upErr`. 버킷 한도도 2GB로 올렸지만 **실제로는 Supabase 저장 공간 전체 업로드 한도(무료 요금제는 50MB까지)가 먼저 걸려요** — Pro 요금제 + 대시보드 Storage 설정에서 2GB로 올려야 해요. 미리보기는 `fileViewer(목록, 몇 번째)`(사진 · PDF · 영상 · 소리 · txt/csv · 유튜브 · 비메오 링크, 워드 · 한글 등은 "다운로드해서 열어 주세요"), `imgViewer`는 그 사진용 이름. 버튼 이름은 "내려받기"가 아니라 "다운로드"(`downloadFile`). 첨부 목록은 `fileChips(파일들, 버킷)`. `formDialog`의 `type: 'files'`(최대 o.max개, `o.bucket` · `o.prefix()`). 공지에 `notices.files`(파일 10개) — notices 버킷은 사진만이던 제한을 풀었어요.
- 센터 공지(14라운드, `center_notices` · `center_notice_reads`): 센터 관리 → 센터 운영 "원장님 공지"(`#center/notices`, `centerNoticeDialog`): 모든 학원 / 고른 학원(`all_academies` · `academy_ids`, 학원 많으면 이름 찾기) · 강사님에게도(`with_teachers`) · 위에 고정 · 파일 10개(비공개 버킷 `center/공지 id/…` — 그래서 id를 화면이 먼저 정해 넣어요). 고치기 · 지우기, 읽음 확인 `center_notice_readers` · `center_notice_stats`. 원장(받으면 강사도)은 메뉴 "센터 공지"(`#cnews`, `CNEWS_AREA`) · 홈 "오늘 챙길 일" · 빨간 점, 열면 `mark_center_notice_read`. 볼 수 있는지는 `private.can_see_center_notice`. 예시 계정은 `DEMO_CNEWS`.
- 시간표 끌어서 옮기기 · 휴강 · 보강(원장 · 강사): 칸을 끌어 다른 요일에 놓으면(`bindTimetableDrag`) 옮기기 창(`ttMoveDialog`: 요일 · 시작 시간(길이 그대로) · 매주 / 이 주만). "여러 칸 골라 옮기기 · 휴강"(`TT_PICK`) 또는 Shift · Ctrl+누르기로 여러 칸(`TT_SEL`) → 아래 줄 "다른 요일 · 시간으로 옮기기 · 이 주 휴강 · 지우기". 휴강은 `timetable.cancels`({그 주 월요일: 이유}, 매주 칸은 skip_weeks도) — 지우지 않고 "휴강"으로 줄 그어 보여요(학부모 · 학생도 `family_timetable`), 휴강 칸을 누르면 "보강 잡기 · 휴강 풀기"(`ttUncancelDialog`). 보강은 `timetable.kind = 'makeup'` + week_of(`ttMakeupDialog`, 날짜로). 매주 수업은 한 번만 넣으면 1년 내내 나오고, "다른 주 시간표 가져오기"(`ttCopyWeekDialog`) · "이 주만 칸 → 다음 주에도 / 매주로 바꾸기"(`ttOnlyAct`). 화면은 `ttOn`/`ttCanceled`, DB `private.tt_on`도 휴강을 빼요(QR 지각). 바뀐 기록은 "휴강(이유) · 휴강 풀림 · ○/○ 보강".
- 시간표 같은 수업 한 번에(`ttGroup`: 반 · 시작 · 끝 · 과목 · 주가 같은 칸): 칸을 누르면 "같은 수업 모두 / 이 칸만", 요일을 빼면 그 요일 칸은 지워지고 더하면 새로. 지우기도 "같은 수업 모두 지우기". "시간표 정리"(`ttCleanDialog`)에서 반별 · 여러 칸 골라 지우기 · 전체 삭제.
- 학원 나가기 · 옮기기 · 내보내기: `leave_academy(학원)`(원장은 다른 원장이 있을 때만, 가족은 아이 연결도 풀림) · `move_academy(코드)`(새 학원에 들어가고 원장이 아닌 예전 학원에서 나옴) · `remove_member(학원, 사람)`(원장 · "강사 관리" 권한은 강사만). 설정 → 우리 학원 "다른 학원으로 옮기기" · "학원에서 나가기", "우리 학원 사람들 → 누가 있는지 보기"(`peopleListDialog`, `academy_people_list`: 원장 · 강사는 모두, 학부모 · 학생은 원장 · 강사 이름만)에서 내보내기.
- 센터 일정(`#center/schedule`, `centerSchedulePage`): 학원 요청 · 신청(새 지원 신청 · 문의 · 맡긴 일 · 제휴 · 유학 · 홍보 · 관리자 신청 · 분야 상담 중)은 `centerAutoItems`가 접수한 날에 저절로(처리하면 빠짐, "일정에 넣기"로 옮기기), 직접 넣는 일정은 `center_events`(관리자만, 종류 · 색 · 끝냄 `done`, 넣은/고친 사람은 트리거).
- 자료실: 줄마다 "수정 · 삭제" 버튼, 고칠 때 파일도 바꾸기(예전 파일은 지움), 한 번에 30개(`LIB_MANY`)까지 올리면 하나씩 자료로(제목 뒤 번호, 제목이 비면 파일 이름).
- 채팅: 같은 학원에서 이야기할 수 있는 사람은 처음부터 친구(`my_friends().auto`, "우리 학원" 표시 · 지울 수 없음). 사진 · 파일 묶음 한 번에 10개 · 하나 20MB(`messages.files`, 비공개 버킷 `chat/대화방/…`, 대화방 사람만 읽고 올리기, 사진은 1시간 주소 `hydrateChatFiles`). 읽음(`conversation_read_state`): 1:1은 내 말풍선에 "읽음 / 안읽음", 그룹은 안 읽은 사람 수(카톡처럼 `unreadOf`).
- 사진 크게 보기(`imgViewer(목록, 몇 번째)`): 채팅 사진 · 공지 사진을 새 창이 아니라 웹 안 전체 화면에서 넘겨 보고(‹ › · 방향키) "내려받기"(10분짜리 download 서명 주소). 채팅 파일(사진 아닌 것)은 그대로 내려받기.
- 공지 사진 10장(`notices.images`, 비공개 버킷 `notices/학원/…`, 학원 사람이 읽고 공지 권한이 올림). `formDialog`의 `type: 'images'`(긴 쪽 1600px JPEG로 줄여 올림 `shrinkBlob`, 보기는 `hydrateImgs` · `noticeImgs`).
- 공지 아이콘은 `ICON.notice`(스피커), 채팅은 `chat`(말풍선) — 섞어 쓰지 않기.
- 결재함(`#admin/approvals`) 아래에 강사가 올린 홍보 의뢰 · 제휴 신청(원장 결재 대기)도 모아 보여요(`otherApvCard`).
- 센터 관리 → 회원(`#center/members`, `admin_members()`): 가입한 사람 이름 · 아이디/이메일 · 로그인 방법 · 역할 · 휴대폰 · 학원 · 가입일 · 마지막 로그인. 보기만 해요. 순서는 최근 가입 · 먼저 가입 · 이름 가나다 · 학원 가나다(`MEM_SORTS`). 사람을 누르면 `#center/members/회원`(`memberDetail`, `admin_member_detail(회원)`): 학원 · 역할 · 이용 분야 · 자동 처리 · 연결된 아이 · 최근 연 메뉴(`user_seen`) · 쓴 기록 수 · 첫 화면 지원 신청.
- 센터 관리자 홈(`centerHome`): 숫자 한 줄(새 신청 · 열어 줄 분야 · 답할 문의 · 맡긴 일 · 연결 중) → 학원 · 회원 한눈에(`acadOverview`, 보는 방법 `OV_VIEWS` 가입한 순서 · 가나다순(학원) · 역할별(원장 · 강사 · 학부모 · 학생 · 학원 연결 전, 학원 이름과 함께) — 이 기기 localStorage `asc-ov-view`: 학원 한 줄에 원장 · 강사 · 원생 · 가족 수 + 다섯 분야 칸, 칸을 누르면 켜짐(active) ↔ 꺼짐(ended) · 신청(consulting) → 켜짐, 학원 이름을 누르면 그 학원 회원이 펼쳐짐 `OV_OPEN`, 학원 연결 전 회원 한 줄. `admin_members().academy_ids` · `admin_academies().families`) → 예시 계정 바로 열기(`demoAccountsCard`, 새 탭 `/demo/역할`) → 지금 처리할 일(`centerTodo`) · 가입 현황 → 메뉴 묶음(`CENTER_GROUPS`). `#center/academies`도 같은 표.
- 예시 원생은 `data.js` 끝에서 반별 출결 인원(`attendance.total`)만큼 채워요 — 원생 수 · 강사 담당 반 원생 · 출결 · 수납 숫자가 서로 맞아요. 예시 연락처는 `010-0000-`으로 시작하는 가짜 번호.
- 시간 칸(`formDialog`의 `type: 'time'`): 지역 고르기처럼 오전/오후 · 시 · 분(5분 단위) 드롭다운(`clockPicker` · `bindClockPickers`, 값은 hidden 칸에 "16:00"). 시간표 추가는 요일을 여러 개 고르면 요일마다 한 줄씩(`type: 'multi'` + `expand`), 시작을 바꾸면 끝이 수업 길이만큼 따라와요(`timePickers` · `setClock`).
- 가로 스크롤 없애기: 표(`.table .tr`)는 좁은 화면에서 두 칸 카드로, 칸반(`.board`)은 줄바꿈, 입력 창은 옆으로 안 밀려요(`dialog` overflow-x hidden). 넓은 서류 편집도 줄마다 카드(`sheetEditor`).
- 예시 계정 QR 출석: 원장 · 강사 출결 아래 "오늘 학생이 직접 찍은 출석"(`demoQrCard`), 학생 · 학부모 홈 안내의 "예시로 QR 찍어 보기"(`demoScanDialog` → `#checkin/demo.날짜.demo`).
- 학부모는 QR을 찍지 않아요(`qr_check_in`이 `parent_no_qr`로 막음). 대신 홈 "오늘 출석 알림"(`attendAlert`: 아이가 QR · 출석 번호로 출석하거나 선생님이 넣으면 시각 · 방법이 떠요, 수업 전이면 "아직 출석 전", 오늘 수업이 없으면 최근 출석) + 메뉴 · 종 빨간 점(`NEWS.parent['kid/attend']`). 학생 QR 안내(`checkinHint`)는 오늘 우리 학원 수업이 있을 때만(`classToday`: 아이 반 시간표 · 휴원, 예시는 아이 오늘 일정).
- 학원에 와야만 되는 출석(`#kiosk` 입구 출석 화면, 원장 · 강사): 출결 화면 "입구 출석 화면 열기" → 메뉴 없는 전체 화면(`kioskPage` · `bindKiosk`, 화면 꺼짐 방지)에 한국 날짜마다 하나인 오늘 QR(`checkin_qr`, "QR 인쇄"로 뽑아 붙여도 돼요(`@media print`), 서명은 `private.checkin_keys`, 그리기는 `assets/vendor/qrcode.js` = npm `qrcode-generator`를 빌드가 복사). 학생 · 학부모가 휴대폰 카메라로 찍으면 `/app#checkin/토큰` → `qr_check_in`(오늘 QR만, QR 주소는 늘 정식 주소 `SITE_URL` — Vercel 미리보기 주소는 Vercel 로그인으로 잠겨 있어서, 연결된 아이 모두 출석, 로그인 전이면 sessionStorage `asc-next`로 로그인 뒤 돌아옴). 휴대폰이 없으면 같은 화면에서 출석 번호(학부모 · 본인 휴대폰 뒤 4자리, `kiosk_find` · `kiosk_check_in`). 수업 시작 10분이 지나면 지각(`private.do_checkin`, 시간표 기준). `attendance.method`(qr · kiosk · staff) · `checked_at`이 남고 출결 화면에 "QR 15:02" 표시. 아래 "방금 출석"은 `kiosk_recent`.
- 오늘 할 일: 반 전체 · 학생 한 명 · "학생 여러 명 골라서"(`todoPicker`, 반 이름을 누르면 그 반 모두).
- 상담·등록: 학년(선택) · 생년월일(`birth`, 선택) · 학생 본인 연락처(`phone`, 성인 · 고등학생) · 학부모는 선택. 등록하면 트리거가 원생으로 함께 옮겨요. 강사도 메뉴 `#leads`(삭제는 원장만).
- 현장 결제(`onsitePayDialog`): 원장이 상담에서 "등록"으로 옮기면 그 자리에서 받은 수강료 · 교재비 · 기타를 "납부 완료" 청구로 바로 남기고 영수증(`printReceipt`, 인쇄 · PDF)을 뽑아요. 수납 화면 "현장에서 받기", 납부 완료 줄의 "영수증"도 같아요. 학생 고르기의 "명단에 없는 사람 · 직접 적기"로 웹을 안 쓰는 사람도 이름만 적어 받아요(`invoices.student_id` 없이 `student_name`, "원생 명단에도 넣기" 선택).
- 앱 없이 쓰는 학원: 학생 · 학부모가 앱에 가입하지 않아도 명단 · 출결 · 수강료 · 영수증을 모두 관리해요. 원생 명단 표의 "수강료 · 이번 달" 칸(`feeCell`: 정해 둔 수강료 - 할인, 납부 · 미납 · 청구 전 + 바로 "청구하기" · "받았어요"), 위쪽 한 줄(`fee-bar` "청구 전 n명 청구서 만들기" `billStudents` · `feeInvoice`), "여러 명 빠르게 넣기"(`quickStudentsDialog`: 줄마다 이름 · 반 · 학년 · 연락처 · 수강료 + 이번 달 청구서까지), 원생 추가 창 "이번 달 수강료 청구서도 바로 만들기". 원장 스위치 "학생 · 학부모 앱 같이 쓰기"(`academies.app_off`, `appOn()` · `appSwitch`: 끄면 앱 연결 · 연결 기다림 · 초대 안내를 숨겨요).
- 원생 들고 남(`students.status` active 다니는 중 · paused 쉬는 중 · left 그만둠, `joined_on` · `left_on`): 원생 명단 위 이번 달 · 최근 7일 새로 옴 · 그만둠 · 그만둘 예정(`rosterSummary`), 상태 거르기(`STU_ST`), "원생 정리"(`rosterDialog`)에서 여러 명 골라 반 옮기기 · 쉬기 · 그만두기(오늘 · 이번 달 말 · 날짜) · 다시 다니기. `REAL.allStudents`는 명단용 전부, `REAL.students`는 다니는 중만(출결 · 청구 · 할 일 · 숫자). 그만두는 날이 지나면 매일 아침 저절로 그만둠.
- 학부모 기능 스위치(`famSwitch`): 설정 → 우리 학원, 학생·학부모 관리 첫 화면, 원생 명단 위. 예시 계정도 눌러 볼 수 있어요(sessionStorage `asc-demo-family`).
- 프로그램마다 "이렇게 써요"(`assets/howto.js`의 `HOWTO`, 화면 제목 아래 `addHowto`): 오른쪽 위 ×(`howto-x`)를 누를 때까지 계속 보여요(localStorage `asc-howto-역할-주소`). 단계 설명(`stateGuide`)도 ×로 닫으면 `asc-howto-역할-sg:종류`, 제목 옆 "단계 설명" 버튼으로 다시 봐요. 숨긴 뒤엔 제목 옆 "사용법" 버튼 · 전체 메뉴 안내 아래 "메뉴마다 이렇게 써요" · 설정 "메뉴 사용법 안내"에서 다시 봐요. 새 화면을 만들면 `HOWTO`에 넣기.
- 단계 설명(`STATE_GUIDE` · `STATE_PAGES`, `stateGuide`): 제휴 · 홍보 · 유학 · 지원 신청 · 문의 · 맡긴 일 · 이용 분야 · 결재 화면 위 "단계가 무슨 뜻이에요?"에 단계마다 센터 관리자 쪽 · 원장님 쪽 뜻을 함께(내 쪽이 진하게).
- 원천세 계산(`#admin/payroll`, `payroll` 원장만): 강사마다 구분(프리랜서 3.3% · 일용직 (일당-15만원)×2.7% 소액부징수 · 근로소득 · 직접) · 지급액만 넣으면 소득세 · 지방소득세 · 실지급액(`calcTax`), "재정 지출에도 넣기"(`expense_id`), 지난달 불러오기, 신고 서류로 넣기(`wht:월`), 엑셀. 서류 바로 만들기는 바로 받지 않고 `sheetEditor`에서 칸을 고치고 줄을 더한 뒤 엑셀로 받아요(합계는 다시 계산).
- 자동으로 처리(`#admin/auto`, `academies.auto` = { bill: {on, day}, unpaid: {on, days}, paper: {on} }, 기록 `auto_logs`): pg_cron `asc-automations`가 매일 한국 9시 10분 `private.run_automations()` — 매달 day일 정해 둔 수강료로 청구서, 기한 지난 미납에 학부모(성인 학원은 수강생)께 원장 이름 채팅 한 번(`invoices.reminded_at`, `private.auto_message`), 지난달 지급이 있으면 원천세 · 1월엔 사업장현황 서류. "지금 한 번 해 보기"는 `run_my_automations(학원)`. 서류 자동이 켜져 있으면 앱을 열 때 `paperSuggestions`도 저절로 넣어요(`autoPaperOnOpen`). 원장 홈에 "저절로 처리한 일".
- 첫 화면 진행 상황 보기(`#check`): 접수 번호 + 남긴 연락처 → `check_my_request(번호, 연락처)`(가입 안 해도 돼요). 접수 완료 화면 · 오른쪽 아래 링크에서 바로.
- 공유 미리보기 이미지 `assets/og.png`는 첫 화면처럼 남색 그라데이션 + 첫 화면 문구 + 노트북 · 휴대폰 그림(`mock.js`의 `heroMock`을 1200×630으로 찍은 것). 이미지를 바꾸면 메신저가 새로 읽도록 html의 `og.png?v=` 숫자를 올리기.
- 센터에 문의하기(`#help`, 원장 · 강사만 — 왼쪽 아래 카드): `submit_inquiry`로 보내고 내 문의 · 답변을 봐요. 관리자는 센터 관리 → 문의(`#center/inquiries`)에서 `answer_inquiry`. 학부모 · 학생 화면에는 센터 카드가 없어요.
- 예시 계정의 날짜는 실제 오늘(`DATA.today = todayText()`), 오늘 출결 · 아이 오늘 일정은 오늘 요일에 수업이 있는 것만(일요일엔 없음). 예시 수납은 미납 목록(`DATA.unpaid`)으로 미납 수 · 금액을 계산해서 홈 · 목록 · 메뉴 숫자가 같아요.
- 입력 칸은 되도록 눌러서 고르게: `chips`(학년 `GRADES`, 과목 `SUBJECTS`, 반, 강사 `staffNames()`, 서류 이름 · 내는 곳, 다음 할 일 …), 지역은 `regionPicker`, 전화번호 칸(type tel)은 치는 동안 하이픈이 저절로.
- 화면은 한 번에 다 보여주지 않고 "홈 → 분야 → 세부 → 항목"처럼 한 단계씩 들어가게 정돈한다.
- 디자인(프로그램 안): 남색·파란 계열. 색 토큰은 `assets/base.css`의 `:root`에 모여 있다.
- 디자인(첫 화면 `index.html` · `/area` · `/jobs` · 로그인): 흰 바탕 + 파란 버튼 하나 + 큰 글씨 + 실제 화면 그림, 군데군데 남색 그라데이션 구간(메인 그림 뒤 띠 `.hero-art::before`, 휴대폰에서 `.sec.navy`, 분야 상세 맨 위 `.d-hero`, 시작하기 `.start`, 아래쪽 `.foot`). 다크 모드도 돼요(머리글 해 · 달 버튼, `site.css`의 다크 토큰). 기기 그림 속 화면은 늘 밝게(`.fit-in`이 토큰을 밝게 고정). 반투명 카드 · 빛줄기 · 글자 그라데이션 · 분야별 무지개 색은 쓰지 않는다. 스타일은 `assets/site.css`(첫 화면용 토큰을 `:root`에서 덮어씀).
- 기기 그림: `assets/mock.js` — 노트북(`laptopMock`) · 휴대폰(`PHONE_SCREENS` 원장 · 강사 · 학부모 · 학생) · 창 모양(`AREA_MOCK` 분야마다). 정해진 크기로 그리고 `fitBox` + `fitMocks`가 칸 너비에 맞춰 줄여요. 숫자 · 이름은 예시.
- 움직임(필요한 만큼만): `.rv`가 화면에 들어오면 아래에서 떠오름(`bindMotion`, `--d`는 순서, 빨리 지나친 것은 `revealPast`), 첫 화면 알림이 4초마다 바뀜(`HERO_TOASTS`), 휴대폰 섹션은 4초마다 다음 장 · 마지막 장 뒤 다음 역할(마우스를 올리면 멈춤), 목록 줄 · 그래프가 차례로. 기기 설정 "움직임 줄이기"면 모두 멈추고 바로 보여요(`html.motion`이 안 붙음).
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
  - `academies`, `academy_members`(한 학원에 원장 여러 명 가능), `academy_codes`(원장용·강사용·학부모·학생용 초대 코드, 원장만 RPC로 조회), `students`(원장 · 강사 추가 · 수정, 삭제는 원장만, 강사는 담당 반 학생 + 내가 추가한 학생만("모든 원생" 권한이 켜져 있으면 전부) — `private.can_see_student` · `private.my_classes`(원장이 정한 `academy_members.classes` + 시간표에서 담당 강사가 나인 반). 출결 · 할 일 · 성장 리포트도 같은 기준. 원장은 강사 관리 → 우리 학원 강사 "강사 담당 반"에서 `list_teacher_classes` · `set_teacher_classes`, 강사 화면 안내는 `my_teacher_classes`, 추가한 사람 `added_by_name` · `added_by_role`은 트리거, 수강료 `tuition_plan_id`).
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
  - 일정 · 시간표: `timetable`(반 · 요일 · 시간 · 과목 + 세부 강의실 · 담당 강사 · 메모, 원장 · 강사 쓰기), `academy_events`(시험 · 행사 · 휴원 …, 원장 · 강사 쓰기 · 고치기, 세부는 `detail`) — 누가 넣고 고쳤는지 · `schedule_logs`는 위 "일정 · 시간표" 항목. 두 표 모두 원장 · 강사만 바로 읽고, 학부모 · 학생은 세부를 뺀 `family_timetable(학원)` · `family_events(학원, 부터, 까지)`. 화면 `#schedule`(모든 역할, 주간 시간표는 주를 넘기거나 날짜로 고르고 그 주 일정도 함께 · 월간 달력).
  - 학생 할 일: `student_todos`(학생 · 날짜 · 할 일, 만든 사람 · 역할은 트리거가 채움). 원장 · 강사는 반 전체나 학생 한 명에게, 학부모 · 학생은 연결된 아이에게만 넣기. 체크는 `check_todo(할 일, 했음?)`. 만든 사람이 고치고, 만든 사람과 원장이 지워요. 화면: 원장 `#members/todos`, 강사 `#todos`, 학부모 `#kid/todos`, 학생 `#todos`(홈 맨 위에도 카드).
  - 성장 리포트: `growth_reports`(학생 · 기간 · 과목 점수 `scores` · 학습 태도 `ratings` · 잘하는 점 · 노력할 점 · 종합 의견 · 다음 목표, 출결 · 할 일 수행 `stats`는 저장할 때 화면이 계산). 원장 · 강사가 쓰고 `status`를 issued로 바꾸면 연결된 가족이 봐요(발급 시각은 트리거). 인쇄 · PDF는 브라우저 인쇄(`@media print`). 화면: 원장 `#members/reports`, 강사 `#reports`, 학부모 `#kid/reports`, 학생 `#reports`.
  - 자료실 폴더: `library_folders`(원장 · 강사 누구나 만들기 · 이름 바꾸기 · 지우기, 학부모 · 학생은 보기만 — 자료가 있는 폴더만 보여요), `library_items.folder_id`, 옮기기는 `move_library_items(자료들, 폴더|null)`(볼 수 있는 자료면 누가 올렸든). 예시 계정 자료실도 역할마다 볼 수 있는 것만(`libData`).
  - 자료실: `library_items`(제목 · 분류 · 파일 또는 링크 · 공유 범위 `visibility` private 나만 / staff 원장·강사 / class 반 가족 / everyone 모두, 올린 사람은 트리거). 판정은 `private.can_see_library` — 원장은 전부(강사 비공개 포함). 파일은 Storage 비공개 버킷 `library`(50MB, 경로 `학원 id/무작위/file.확장자`), 읽기는 그 자료를 볼 수 있을 때만, 올리기는 원장·강사만. 열기 · 내려받기는 10분짜리 서명 주소. 화면 `#library`(모든 역할).
  - 채팅(카톡처럼, 예전 이름 메신저): 친구 · 채팅 두 화면. 예시 계정 친구 · 대화도 역할마다 대화할 수 있는 사람만(`DEMO_PEOPLE` · `DEMO_CHAT`). `friends`(내가 추가한 사람, RPC `find_people(검색어)` — 한 글자 이상 쳐야 나와요 · `add_friend` `remove_friend` `my_friends`). `conversations`(kind direct 1:1 `user_a < user_b` / group 방 이름 `title`, 마지막 메시지는 트리거), `conversation_members`(방 사람), `messages`(방 사람만 읽기 · 쓰기, 1:1은 보낼 때도 아직 대화할 수 있는 사이인지 `private.can_send`), `conversation_reads`. 누가 누구와: `private.message_academy(a, b)` — 원장↔관리자·강사·학부모·학생, 강사↔강사·학부모·학생, 학부모↔학생(같은 아이로 연결됐을 때만). 그룹은 `create_group(이름, 사람들)` `add_group_members` `rename_group` `leave_conversation` `conversation_people`. 목록은 `my_chats()`(안 읽은 수, 예전 `my_conversations` · `message_contacts`는 안 써요). 프로필 사진 · 상태 메시지는 `profiles.avatar_url` · `status_msg`, 사진은 공개 버킷 `avatars/내 id/…`(5MB). 화면 `#messages`(모든 역할 · 관리자 포함), 열어 둔 대화는 5초, 목록은 20초마다 새로 확인. 읽음은 `markRead`(화면 숫자를 바로 지우고 `mark_conversation_read` — supabase 요청은 `.then`/`await`가 있어야 실제로 보내져요), 보고 있는 대화(`chatOpen`)에 새로 온 메시지도 바로 읽음. 채팅 위쪽 상대 사진 · 이름 · 그룹 말풍선 위 이름 · 대화 상대 목록을 누르면 프로필(`personDialog`: 역할 · 학원 · 상태 메시지 · 친구 추가 · 1:1 채팅).
  - 새 소식 빨간 점: `user_seen`(메뉴 경로마다 마지막으로 본 시각, 본인 것만). `app.js`의 `NEWS`(역할별 경로 → 남이 올린 것의 시각 목록)보다 새로운 게 있으면 메뉴 · 타일 · 종 모양에 점, 그 화면을 열면 `markSeen`이 지워요. 처음엔 최근 3일 것만. 예시 계정은 `DEMO_NEWS` + sessionStorage.
  - `academy_name`은 트리거가 채워요(학원 표는 그 학원 사람만 읽을 수 있어서).
- 실제 데이터로 연결된 화면: 행정 지원 전체(`#admin/*`, 강사는 `#attend`), 강사 관리 전체(`#teachers/staff` `training` `hire`, 강사 `#learn` `#jobs`), 제휴 전체(`#mou/partners` `abroad` `mine`), 학부모 `#abroad`, 센터 관리(`#center/videos` `requests` `partners` `abroad` `admins`), 원장 홈 "오늘 챙길 일", 학생·학부모 관리 전체(상담·등록, 원생 명단 + 앱 연결, 초대 코드, 학부모 공지 `#members/notices/공지`), 홍보 지원(`#promo/*`, 센터 `#center/promo`). 학부모 `#kid/attend` `#kid/bills` `#news/공지` `#abroad`, 학생 `#attend` `#news`. 데모에만 있는 것: 학부모·학생 일정·숙제·기록(실제 로그인에선 메뉴에서 빠져요).
- 학원 코드가 없는 강사: 학원 연결 화면의 "채용 공고 먼저 보기" → `SEEKER` 모드(채용 공고만).
- 관리자 신청 화면: `app.html#apply-admin`(왼쪽 아래 "센터 관리자 신청", 역할 고르기·학원 연결 화면에도 링크). 수락은 센터 관리 → 관리자.
- 센터 관리자: 학원에 속해 있으면 메뉴에 "센터 관리"가 더 생기고, 학원 없이 관리자만이면 `ROLE = 'admin'`으로 센터 화면만 봐요(역할 고르기도 건너뜀).
- 고정 지출(`fixed_costs`, 재정 권한): 월세 · 관리비 · 공과금 · 인터넷 · 렌탈 · 기장료 …(`FIXED_PRESETS`)를 한 번 넣으면 매달 정한 날(1~28일 · 말일) 재정 "지출"에 저절로(`private.run_fixed_costs` — cron `asc-automations`가 run_automations와 함께, 앱 열 때 `apply_fixed_costs` · `autoFixedOnOpen`). `last_month`로 한 달에 한 번만, 지운 지출은 다시 안 넣어요. 금액이 달마다 다르면(`vary`) 지출에 `need_check` → "금액 확인". 재정 화면 "매달 나가는 돈"(`fixedCard`), 자동 처리 화면에도 한 줄, 엑셀 "고정 지출" 시트. 지출 항목 `EXP_CATS`에 통신비 · 렌탈 · 비품 · 세무 · 보험 · 이자 · 구독.
- 비품 · 교재(`#admin/supplies`, `supplies` · `supply_logs`, 원장 · 강사 누구나, 지우기는 원장): 이름 · 종류(`SUPPLY_CATS`) · 수 · 단위 · 알림 수 · 둔 곳 · 하나 값. "+ 들어옴 · − 씀 · 빌려줌 · 돌려받음 · 수량 맞춤"은 `move_supply(품목, 종류, 수, 누구, 메모, 산 금액)` — 산 금액을 넣으면(재정 권한) 지출(교재비 · 비품)에도. 모자라면 원장 홈 "오늘 챙길 일"(`supplyLow`). 엑셀로 받기 · 엑셀 파일로 넣기(`IMPORTS.supplies`). 예시 `DEMO_SUPPLIES`.
- 재정: 매출 = "납부 확인"한 청구(납부한 날 기준) + `incomes`, 순이익 = 매출 - `expenses`. 기간(오늘·최근 7일·월별·3·6개월·1년·직접 고르기 — 시작일부터 최대 1년, `customRange`)마다 그래프 · 표 · 거래 내역 · 엑셀 내려받기(`app.js`의 `finRange` `ledger`). 학원에 아직 속하지 않은 회원은 `app.html`에서 학원 만들기/코드 합류 화면을 먼저 본다.
- 뒤로 가기: 왼쪽 메뉴와 위치 표시(홈 › 분야) 링크는 기록을 바꿔치기(`goReplace`)해서 쌓이지 않아요. 화면 위 "‹ 이전"은 바로 전 화면 한 단계(처음 연 화면이면 한 단계 위).
- 사용자에게 보이는 말: "데모" 대신 "예시 계정", 유학 제휴처 이름은 "인투유학". "가족"이라고 쓰지 않고 "학부모 · 수강생"(또는 학부모 / 학생)으로.
- 예시 학부모 수납: 하늘영어학원 10월 수강료는 형제 할인 10%로 270,000원(원가 300,000) — 원장 미납 목록 · `discountSamples` · 첫 화면 그림과 같아요.
- 사진으로 올리기(`PHOTO_IMPORTS` · `photoImportDialog`, 원장만): 시간표(`#schedule`) · 수강료표(수납 "정해 둔 수강료") 사진 → 긴 쪽 1600px JPEG로 줄여(`shrinkPhoto`) Edge Function `read-photo`(`supabase/functions/read-photo`, 중간 모델 Claude Sonnet 5.5가 읽어 JSON)로 보내고 → 줄마다 칸을 고치는 확인 창(흐린 칸은 "확인 필요", 이미 있는 줄은 체크 꺼짐) → 저장. 키는 Supabase Edge Function 비밀 값 `ANTHROPIC_API_KEY`(없으면 "준비 중" 안내). 학원마다 한 달 10장(`PHOTO_LIMIT`, DB `photo_reads` · `start_photo_read`가 원장인지 · 남은 장수를 확인하고 막아요, 읽기에 실패하면 `cancel_photo_read`로 되돌림, 남은 장수 `photo_read_left` — 센터 관리자는 null = 제한 없음). 예시 계정은 예시 결과(`sample`)만.
- 엑셀 내려받기 모양(`downloadXlsx(파일, 행, 너비, 옵션)`): 칸이 두 개 이상 찬 첫 줄이 머리줄(남색 바탕 흰 글씨), 그 위 한 칸 줄은 제목(크게 · 가로 합치기) · 부제목, 칸마다 테두리 · 한 줄 건너 옅은 색, 금액 칸(머리줄에 원 · 금액 · 세 …)은 숫자 + 1,000 쉼표, 합계 줄 굵게, "*" 안내 줄은 회색, 머리줄 아래 틀 고정 + 거르기, 칸 너비 저절로, 인쇄는 한 쪽 너비. 올리기 양식(`importGuide`)은 꼭 채울 칸 진한 머리줄 · "예시)" 줄 회색 · 빈 줄 30개 · 두 번째 시트 "작성 안내"(올리기는 첫 시트만 읽어요).
- 엑셀 버튼 말 · 아이콘(헷갈리지 않게): 웹 → 엑셀은 `ic('download')` "엑셀로 받기", 엑셀 → 웹은 `ic('upload')` "엑셀 파일로 넣기", 빈 양식은 `ic('sheet')` "빈 ○○ 양식 받기"(넣기 창 안). 올리기 칸이 비면 `def` 값.
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
21. ~~첫 화면 다시 디자인: 밝게 · 노트북 · 휴대폰 그림 · 필요한 만큼 움직임~~ (완료)
22. ~~사진으로 시간표 · 수강료 올리기 · 학생도 유학 · 남색 구간 · 첫 화면 다크 모드 · 강사 교육 목록 깨짐~~ (완료 · `ANTHROPIC_API_KEY` 비밀 값을 넣으면 실제로 읽어요)
23. ~~QR · 출석 번호로 학원에서만 출석 · 채팅 읽음 바로 · 채팅 프로필 보기 · 친구 추가~~ (완료)
24. ~~출석 QR 하루 단위 · QR 인쇄 · QR 주소를 정식 주소로~~ (완료)
25. ~~첫 화면 QR 출석 소개 · 휴대폰 여러 장 넘기기 · 예시 계정 QR · 관리자 학원 · 회원 한눈에 · 관리자 예시 계정 · 엑셀 꾸미기~~ (완료)
26. ~~로그아웃 버튼 · 계정 전환 · 강사도 원장처럼 원생 관리 · 강사 출결 QR · 일정 같이 고치기 + 누가 고쳤는지 · 강사 권한 켜고 끄기 · 학원 안 직책(매니저 · 재정 담당)~~ (완료)
27. ~~아이디 · 비밀번호 찾기(휴대폰 · 이메일) · 공지 아이콘 · 시험용 휴대폰 열기 · 계정 전환 10개 · 첫 화면 · 분야 상세에 직책 · 권한 · 강사 QR · 시간표 기록 반영~~ (완료 · 인증번호를 실제로 보내려면 Resend · 솔라피 비밀 값을 넣기)
28. ~~휴대폰 · 노트북 화면 보기 · 행정 지원 엑셀 모두 받기 · 학원 사람 수 · 일정 · 시간표 색 · 주마다 다른 시간표 · 과목 목록 고치기 · 시간 순서 · 고칠 때 요일 여러 개~~ (완료)
29. ~~시간표 같은 수업 한 번에 고치기 · 정리(선택 · 전체 삭제) · 저장 오류(칸 권한) 고침 + 이유 표시 · 학원 나가기 · 옮기기 · 내보내기 · 센터 일정 · 자료실 수정 · 삭제 · 30개 올리기 · 채팅 학원 친구 · 파일 10개 · 읽음 · 공지 사진 10장 · 학원 사람 누가 누구인지~~ (완료)
30. ~~시간표 삭제 선택지 안 보이던 오류 · 채팅/공지 사진 웹 안에서 보기 · 가족 → 학부모 · 수강생 · 바뀐 기록 = 시간표 · 학부모 QR 대신 출석 알림 · 학원 사람 수 원장 · 강사만 · 학생 QR 안내 수업 날만 · 학생 유학 접기 · 사용 안내 × · 분야 첫 화면 작은 묶음~~ (완료)
31. ~~센터 관리 메뉴 묶음 · 학원/회원 가입순 · 가나다 · 역할별 · 고정 지출(월세 · 관리비) 자동 · 비품 · 교재 관리 · 앱 없이 명단 · 수강료 · 엑셀 버튼 말 · 아이콘 · 시간표 끌어서 옮기기 · 여러 칸 · 휴강 · 보강 · 다른 주 가져오기~~ (완료)
32. ~~시간표 여러 칸 · 복사 · 붙여넣기 · 기간(한 달 · 3개월) · 이어가기 · 시간표 화면 정리 · 자료실 미리보기 · "다운로드" · 파일 2GB(이어 올리기) · 공지 파일 · 센터 → 원장님 공지~~ (완료 · 2GB는 Supabase 요금제 · 저장 공간 한도를 올려야 실제로 돼요)
33. ~~수강료 · 할인 순서 · 묶음 · 할인 쉼표 · 여러 명 넣기 수강료 고르기 · 출결 추가 · 정렬 · 납부 한 번에 확인 · 받았어요 · 카드 단말기 매출 맞추기 · 재정 간단하게 · 고정 지출 3 · 6개월 · 1년 · 비품 수정 · 일정 여러 날짜 · 첫 화면 띄어쓰기~~ (완료 · 단말기를 실제로 바로 잇으려면 토스플레이스 · VAN 연동 계약이 필요)
34. ~~재정 보고서 양식 그대로 · 통장 · 통장 거래내역 넣기 · 수강생 관리표(넘버스 양식) + 명단 · 수강료 연결 · 환불 · 넘버스 받기 · 올리기 · 수강료 · 할인 끌어서 정렬 · 자료실 · 공지 누가 봤는지 · 끝난 결재 다시 보기 · 고치기~~ (완료)
35. ~~받을 때마다 엑셀 / 넘버스 고르기 · 넘버스에도 색 · 굵게 · 정렬 · 합치기(서버 함수) · 재정 보고서 · 관리표 색 정리~~ (완료)

# 작업 메모
- 이 클라우드 환경에서는 Supabase·jsdelivr에 직접 접속이 막혀 있다. DB는 Supabase MCP(apply_migration, execute_sql로 `set local role authenticated` + `request.jwt.claims` 시나리오 시험 후 rollback)로, 화면은 가짜 env로 빌드한 `dist/`를 Playwright로 열고 Supabase 응답을 흉내 내서 시험한다. 실제 동작은 Vercel 미리보기에서 사용자가 확인.
- 회원: 테스트 계정 `test_owner`(홍길동), 구글 계정 박윤지(인투어학원 원장).

# 파일 구조
- `index.html`: 첫 화면. 전체 너비 남색 + 위쪽 머리글(로고 · 운영 프로그램 · 추가 서비스 · 이용 사례 · 강사 채용 · [로그인] [무료로 시작하기]). 문구는 원장님 기준.
  - 구조는 "운영 프로그램 1개(무료로 시작) + 필요할 때만 붙이는 추가 서비스 3개(상담 후 진행)". `areas.js`의 `SITE_AREAS`에 `kind: 'program'`(행정·재정 자동화 `admin` · 학생·학부모 관리 `members` · 강사와 함께 쓰기 `teachers`) / `'service'`(홍보 대행 `promo` · 유학·캠프 제휴 `mou` · 강사 구하기 `hire`), `PROGRAM_AREAS` · `SERVICE_AREAS`. 프로그램은 "무료로 시작하기 · 예시 계정", 서비스는 "상담 신청하기". 행정 자동화를 "신청 → 매니저 연락 → 견적"으로 소개하지 않는다. 파트너 이름은 카드 제목이 아니라 "공식 파트너 ○○"로 작게.
  - 처음 화면 순서(`homeView`): 메인 메시지(가운데 정렬 + 노트북 · 휴대폰 그림 `heroMock`) → 운영 프로그램 3개(글 · 화면 번갈아 `feat-row`) → 휴대폰에서(역할 버튼 + 역할마다 4장을 옆으로 넘기는 휴대폰 `phoneDeck` · `PHONE_PAGES`[위쪽 제목, 켜진 탭, [설명 제목, 설명], 내용], 아래 설명 · 점 · ‹ › `#mobCap`, 4초마다 다음 장 → 다음 역할, 넘기거나 누르면 저절로 넘기기 멈춤 `#mobile-sec`) → 추가 서비스 3개 → 이용 사례 → 자주 묻는 질문 4개(`SITE_FAQ` 세 번째 값 true) → 시작하기 띠(`startBand`) → 아래쪽(메뉴 묶음 + 사업자 정보). 화면 하나짜리(신청 · 문의 · 질문 · 예시 계정 · 강사 채용)는 `page()` 틀. 자세한 설명 · 질문 전체 · 비용은 분야 상세(`/area/…`)와 `#faq`로.
  - 해시 화면(`VIEWS`): `#apply/분야` 추가 서비스 상담 신청(서비스 3개 + "프로그램 도입 도움"), `#done`, `#ask`, `#check`, `#faq`(질문 전체 · 비용 · 사업자 정보), `#demo`(예시 계정 고르기, `/demo/seeker` 구직 강사 포함), `#login` · `#signup`(로그인 패널 `#program`을 보여 주고 소개는 숨김, `#signup/teacher`는 강사로 골라 두고 가입 뒤 `/app#jobs`). 그 밖의 해시(`#program-sec` 등)는 처음 화면의 그 자리로.
  - 강사로 일하고 싶은 분: `/jobs`(빌드가 `dist/jobs.html`, `vercel.json` rewrite). `public_job_board()`(가입 안 해도 됨)로 공고 · 가입한 학원, 공고가 없으면 예시 공고(`JOB_SAMPLES`)에 "예시" 표시. 상세는 `/jobs#job/공고`.
  - (예전) 분야 상세 흐름: `/area/admin` 분야 상세 → 프로그램이면 가입, 서비스면 `#apply/분야` → `#done` 접수 완료. 분야 내용은 `assets/areas.js`
  - 분야 상세페이지: 화면 그림(`AREA_MOCK`) · 핵심 포인트 · 지원 내용 아이콘 · 분야 색(`AREA_LOOK.accent` → CSS `--ac`). 제휴 · 홍보는 공식 파트너 칸(`PARTNERS`: 로고 · 소개 · 연결 4단계). 인투유학 로고 `assets/brand/intoyuhak-logo.png`, 인투마케팅 로고 `assets/brand/intomarketing-logo.png`(가로) · `intomarketing-mark.png`(세로, 앱 제휴 · 홍보 소개 칸).
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
