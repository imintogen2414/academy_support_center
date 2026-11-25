
(function () {
  "use strict";

  /* ---------- STAGE 1 · 듣기 ---------- */
  var PART2 = [
    { no: 28, tag: "Part 2 · 평서문", src: "audio/t2-p2-28.mp3", ans: 2,
      q: "Did you see the announcement about Emily's promotion?",
      opts: ["All the technology's been upgraded.", "Perhaps a good career counselor.", "I've been busy all morning."] },
    { no: 29, tag: "Part 2 · 제안문", src: "audio/t2-p2-29.mp3", ans: 1,
      q: "Let's try our best to finish the project on time.",
      opts: ["All except the first one.", "We may need a few more days.", "I think over time it will."] },
    { no: 30, tag: "Part 2 · Where", src: "audio/t2-p2-30.mp3", ans: 2,
      q: "Where's the store manager?",
      opts: ["A recent hiring decision.", "I enjoy shopping at that store.", "She went out for lunch."] }
  ];

  var PART3 = {
    tag: "Part 3 · 32–34", src: "audio/t2-p3-32-34.mp3",
    script: [
      ["W-Am", "Hello, Forest Grove Photography Services. How can I help you?"],
      ["M-Cn", "Hi, I'd like to get a photographer to cover our event. It's a charity basketball game next Tuesday night. I was hoping to get Thomas Zukowski. He works for you, right?"],
      ["W-Am", "Yes, but unfortunately, Thomas doesn't usually work evenings."],
      ["M-Cn", "Oh, too bad. Could you recommend somebody else?"],
      ["W-Am", "Before I do that, let me talk to him. He might make an exception. Tom does love basketball."]
    ],
    qs: [
      { no: 32, tag: "Part 3 · 주제·목적", q: "Why is the man calling?", ans: 1,
        opts: ["To rent a facility", "To hire a photographer", "To request a price list", "To schedule a repair"] },
      { no: 33, tag: "Part 3 · 문제점", q: "What problem does the woman mention?", ans: 3,
        opts: ["Her employee does not have transportation.", "Her service does not cover sports events.", "The weather will be bad on Tuesday.", "The time the man requested is too late."] },
      { no: 34, tag: "Part 3 · 다음 행동", q: "What does the woman say she will do?", ans: 2,
        opts: ["Issue a refund", "Cancel an order", "Talk to an employee", "E-mail her manager"] }
    ]
  };

  /* ---------- STAGE 2 · 읽기 ---------- */
  var RC = [
    { tag: "Part 5 · 품사", stem: "The marketing team submitted its ------- for the spring product launch on Friday.",
      opts: ["propose", "proposal", "proposed", "proposing"], ans: 1 },
    { tag: "Part 5 · 전치사", stem: "All staff members must complete the online safety training ------- March 31.",
      opts: ["by", "until", "since", "among"], ans: 0 },
    { tag: "Part 5 · 접속사", stem: "------- the heavy rain, the outdoor ceremony proceeded exactly as planned.",
      opts: ["Although", "Despite", "However", "Because"], ans: 1 },
    { tag: "Part 5 · 태", stem: "Applications submitted after the posted deadline will not ------- .",
      opts: ["consider", "considering", "be considered", "have considered"], ans: 2 },
    { tag: "Part 5 · 관계사", stem: "Ms. Tanaka, ------- presentation impressed the board, was promoted to director.",
      opts: ["who", "whom", "whose", "which"], ans: 2 },
    { tag: "Part 5 · 어휘", stem: "Thanks to the extra crew, the renovation is currently ------- of schedule by two weeks.",
      opts: ["ahead", "front", "early", "advance"], ans: 0 },
    { tag: "Part 6 · 문맥 속 빈칸",
      passage: "NOTICE TO ALL STAFF\n\nThe west elevator will be out of service from June 3 through June 7 for its annual safety inspection. During this period, please use the east elevator or the stairwell near the lobby.\n\nWe apologize for the inconvenience and ------- your patience while the work is completed.",
      stem: "빈칸에 들어갈 가장 알맞은 것을 고르세요.",
      opts: ["appreciate", "appreciating", "appreciation", "to appreciating"], ans: 0 },
    { tag: "Part 7 · 요청 사항",
      passage: "From: Dana Whitfield, Facilities\nTo: All Department Heads\nSubject: Workspace Survey\n\nOver the next two weeks, our team will visit each floor to measure how meeting rooms are currently used. We will not interrupt any sessions; observers will simply record the number of occupants at the start of each hour. The findings will guide which rooms are converted into quiet work areas later this year.\n\nIf your department has reserved a room for confidential discussions, please e-mail me those dates by Friday so that we can exclude them.",
      stem: "What are department heads asked to do?",
      opts: ["Reserve meeting rooms in advance", "Report the dates of confidential meetings", "Attend a training session on the new layout", "Submit a list of employees on each floor"], ans: 1 }
  ];

  /* ---------- STAGE 3 · 운영 ---------- */
  var HABIT = [
    { dir: -1, t: "LC 문제를 풀 때, ABCD 보기 중에 뭐가 정답일지 끝까지 고민하다가 다음 문제를 놓칠 때가 있다." },
    { dir: -1, t: "문제를 찍었는데 맞춰서 '이게 맞다고?' 싶은 때가 있고, 내 생각보다 많이 맞거나 더 틀리는 경향이 있다." },
    { dir: -1, t: "시간이 부족해서 거의 매번 복합지문(이중, 삼중지문)을 다 못 풀고 찍는 편이다." }
  ];

  var SCALE = [
    { v: 1, label: "전혀 아니다" }, { v: 2, label: "아닌 편이다" }, { v: 3, label: "반반이다" },
    { v: 4, label: "그런 편이다" }, { v: 5, label: "매우 그렇다" }
  ];

  var LC_BANDS = [
    { max: 0, lo: 100, hi: 200 }, { max: 1, lo: 160, hi: 250 }, { max: 2, lo: 230, hi: 310 },
    { max: 3, lo: 295, hi: 370 }, { max: 4, lo: 355, hi: 420 }, { max: 5, lo: 415, hi: 465 },
    { max: 6, lo: 450, hi: 495 }
  ];
  var RC_BANDS = [
    { max: 0, lo: 90, hi: 180 }, { max: 1, lo: 140, hi: 230 }, { max: 2, lo: 195, hi: 280 },
    { max: 3, lo: 250, hi: 330 }, { max: 4, lo: 300, hi: 375 }, { max: 5, lo: 350, hi: 415 },
    { max: 6, lo: 395, hi: 450 }, { max: 7, lo: 430, hi: 475 }, { max: 8, lo: 455, hi: 495 }
  ];

  var SE_RECENT = 35, SE_TEST = 90;

  var TYPES = {
    LMP: { name: "청해 린머슬형", line: "듣기는 근육, 운영도 안정적입니다.",
      desc: [
        "들은 건 확실히 잡고, 시험 시간에 쫓기지도 않습니다. 여덟 체형 중 출발선이 가장 좋습니다. 찍어서 맞힌 문항이 적다는 건 지금 점수가 전부 실력이라는 뜻이고, 그건 다음 시험에서도 그대로 재현된다는 뜻입니다.",
        "남은 건 읽기 쪽 근육 하나입니다. 그런데 이건 공부량이 부족해서가 아니라 노출량이 부족해서인 경우가 많습니다. LC에 쏟은 시간만큼 RC 실전에 쏟으면 생각보다 빨리 올라옵니다."
      ],
      scene: [
        "Part 3·4에서 대화가 끝나기 전에 답이 보입니다",
        "Part 5는 막히면 과감히 넘기고 나중에 돌아옵니다",
        "Part 7 후반부에 시간이 남지는 않지만 모자라지도 않습니다"
      ],
      strong: ["추측에 기대지 않아 회차별 점수 편차가 작습니다", "시간 배분이 이미 몸에 배어 있습니다"],
      weak: ["RC 절대량이 부족해 고득점 구간에서 먼저 막힙니다", "긴 지문을 끝까지 읽는 지구력이 덜 쌓였습니다"],
      myth: { q: "LC가 되니까 RC도 금방 되겠지", a: "듣기와 읽기는 다른 근육입니다. 귀로 처리하는 속도와 눈으로 구문을 분해하는 속도는 따로 훈련해야 올라옵니다." },
      fit: ["Part 7을 시간 재고 푸는 실전 훈련", "직독직해로 끊어 읽는 속도 올리기"],
      avoid: ["LC 기초 강의 재수강 — 이미 되는 걸 다시 하는 셈입니다"],
      rx: ["Part 7을 시간 재고 푸는 훈련 주 2회", "직독직해로 독해 속도 150wpm 목표", "LC는 받아쓰기 대신 실전 세트로 유지"] },

    LMT: { name: "청해 벌크업형", line: "아는데, 시간이 늘 모자랍니다.",
      desc: [
        "푼 문항의 정확도는 이미 높습니다. 문제는 운영입니다. 한 문항에 미련을 두다 다음을 놓치고, 뒤쪽 지문은 통째로 찍습니다. 실력보다 점수가 낮게 나오는 가장 억울한 체형입니다.",
        "이 체형은 공부를 더 한다고 점수가 오르지 않습니다. 이미 아는 걸 시간 안에 꺼내지 못하는 게 문제라서, 고쳐야 할 건 지식이 아니라 습관입니다."
      ],
      scene: [
        "Part 2에서 ‘방금 그거 뭐였지’ 하다 다음 문제를 놓칩니다",
        "Part 5 한 문항을 1분 넘게 붙잡고 있은 적이 있습니다",
        "Part 7 마지막 세트는 거의 매번 찍고 나옵니다"
      ],
      strong: ["푼 문항의 정답률이 높습니다", "기초가 흔들리지 않아 난이도가 올라도 버팁니다"],
      weak: ["미완료 문항이 매 회차 점수를 깎습니다", "한 문항에 대한 미련이 연쇄적으로 뒤를 망칩니다"],
      myth: { q: "조금만 더 보면 풀릴 것 같은데", a: "20초 안에 안 보이면 1분을 더 봐도 안 보입니다. 그 1분이 뒤의 세 문항을 날립니다." },
      fit: ["문항당 타이머 걸고 푸는 훈련", "복합지문을 뒤가 아니라 먼저 푸는 순서 실험"],
      avoid: ["새 이론 강의 — 지식은 이미 충분합니다"],
      rx: ["Part 5는 문항당 20초 타이머 걸고 풀기", "복합지문을 뒤가 아니라 먼저 푸는 순서 실험", "1분 넘긴 문항은 버리고 넘어가는 연습"] },

    LFP: { name: "청해 마른비만형", line: "시간은 여유로운데, 근거 없이 고릅니다.",
      desc: [
        "시간에 쫓기지 않는데 정답을 감으로 고릅니다. 빨리 푸는 게 아니라 판단을 생략하고 있는 쪽에 가깝습니다. 지금 점수는 실제 실력보다 높게 잡혀 있고, 난이도가 조금만 올라가도 그대로 무너집니다.",
        "공부를 안 한 게 아닙니다. 외운 것과 문제에서 쓰이는 형태가 아직 연결되지 않았을 뿐입니다. 연결만 되면 이 체형은 여덟 중 가장 빠르게 오릅니다."
      ],
      scene: [
        "보기 두 개까지는 쉽게 줄이는데 거기서 감으로 찍습니다",
        "채점하다 ‘어 이게 맞았네?’ 싶은 문항이 여러 개입니다",
        "해설을 보면 ‘아 맞다 이거 아는 건데’가 반복됩니다"
      ],
      strong: ["시간 운영이 안정적이라 고칠 게 하나뿐입니다", "기초 자료는 이미 머리에 들어 있습니다"],
      weak: ["추측 의존도가 높아 점수가 실력을 과대평가합니다", "근거 없이 고르는 습관이 굳으면 상위 구간에서 멈춥니다"],
      myth: { q: "맞았으니까 아는 거지", a: "찍어서 맞힌 문항은 다음 시험에서 틀릴 문항입니다. 정답률이 아니라 확신율을 봐야 합니다." },
      fit: ["문항마다 고른 근거를 한 줄로 적기", "단어를 뜻이 아니라 예문 통째로 외우기"],
      avoid: ["문제량 늘리기 — 근거 없이 푸는 양만 늘어납니다"],
      rx: ["문항마다 고른 근거를 한 줄로 적기", "Part 2를 의문사별로 묶어 반응 훈련", "확신 / 반반 / 찍음 체크를 습관으로"] },

    LFT: { name: "청해 요요형", line: "점수가 날마다 다릅니다.",
      desc: [
        "감으로 고르고 시간에도 쫓깁니다. 그날의 운이 점수를 정하니 다음 시험에서 재현되지 않습니다. 잘 본 날의 점수를 실력으로 착각하기 쉽고, 못 본 날은 이유를 못 찾습니다.",
        "지금 필요한 건 속도를 내는 게 아니라 늦추는 겁니다. 푼 양이 실력으로 바뀌는 구조를 먼저 만들어야 합니다."
      ],
      scene: [
        "같은 유형을 또 틀리는데 어디서 틀렸는지 기억이 안 납니다",
        "모의고사 점수가 회차마다 크게 출렁입니다",
        "오답노트를 만들다 말았습니다"
      ],
      strong: ["시험 경험이 쌓여 유형 자체는 낯설지 않습니다", "공부에 쓰는 절대 시간은 확보돼 있습니다"],
      weak: ["기준선이 올라가지 않고 위아래로 흔들리기만 합니다", "실제 시험 당일 리스크가 여덟 체형 중 가장 큽니다"],
      myth: { q: "많이 풀면 늘겠지", a: "복습 없는 문제 풀이는 같은 실수를 반복 연습하는 것과 같습니다. 양이 아니라 회수율이 문제입니다." },
      fit: ["2주간 새 문제 중단하고 오답 3회독만", "매일 50단어 고정, 예외 없이"],
      avoid: ["모의고사 연속 응시 — 진단만 반복됩니다"],
      rx: ["새 문제를 줄이고 오답 3회독으로 전환", "매일 50단어 고정, 예외 없이", "찍은 문항만 따로 모아 일주일 뒤 다시 풀기"] },

    RMP: { name: "독해 린머슬형", line: "읽기는 단단하고 운영도 안정, 귀만 남았습니다.",
      desc: [
        "구문을 보고 읽는 눈과 시간 감각이 둘 다 있습니다. RC에서 벌어둔 점수로 버티는 구조라 총점이 안정적입니다. 다만 소리로 들어오는 영어에는 아직 근육이 없습니다.",
        "LC는 지식이 아니라 반응 속도의 영역입니다. 아는 단어도 귀로 들으면 못 알아듣는 구간이 있고, 그 구간은 듣는 양으로만 좁혀집니다."
      ],
      scene: [
        "Part 5는 빠르게 지나가는데 Part 3·4에서 멍해집니다",
        "스크립트를 보면 다 아는 내용인데 들을 땐 안 들립니다",
        "LC 후반부로 갈수록 집중이 떨어집니다"
      ],
      strong: ["문장 구조를 보는 눈이 있어 RC 상승 곡선이 안정적입니다", "시간 배분이 자리를 잡았습니다"],
      weak: ["LC 후반 집중력 저하로 Part 3·4 손실이 큽니다", "듣기 노출량이 절대적으로 부족합니다"],
      myth: { q: "스크립트 보면 다 아는데 왜 안 들리지", a: "아는 것과 들리는 건 다른 능력입니다. 읽어서 아는 단어가 귀에 꽂히려면 그 단어를 소리로 만난 횟수가 쌓여야 합니다." },
      fit: ["Part 3·4 선택지 먼저 읽는 훈련", "1.2배속 듣기로 귀 속도 올리기"],
      avoid: ["받아쓰기만 반복 — 정확도는 올라도 속도가 안 붙습니다"],
      rx: ["Part 3·4 선택지 먼저 읽는 훈련", "1.2배속 듣기로 귀 속도 올리기", "Part 2 의문사 반사 훈련 매일 10분"] },

    RMT: { name: "독해 벌크업형", line: "읽을 줄 아는데, 다 못 읽고 끝납니다.",
      desc: [
        "지문을 정확히 읽습니다. 그런데 속도가 안 나서 복합지문 구간에서 시간이 터집니다. 아는 만큼 받지 못하고 있습니다.",
        "정확도를 조금 내주고 속도를 가져오는 거래가 필요합니다. 100% 이해하고 넘어가는 습관이 역설적으로 점수를 깎고 있습니다."
      ],
      scene: [
        "지문을 처음부터 끝까지 꼼꼼히 읽습니다",
        "이중·삼중지문에서 시간이 터집니다",
        "마지막 10문항은 거의 매번 못 보고 나옵니다"
      ],
      strong: ["읽은 지문에 대한 정확도는 확보돼 있습니다", "어휘와 구문이 뒤를 받쳐줍니다"],
      weak: ["매 회차 미완료 문항이 남아 점수가 고정됩니다", "완벽주의가 가장 비싼 시간을 잡아먹습니다"],
      myth: { q: "지문을 다 이해해야 답이 보이지", a: "Part 7은 전부 읽는 시험이 아니라 필요한 곳을 찾는 시험입니다. 질문이 묻지 않은 문단은 안 읽어도 됩니다." },
      fit: ["질문 먼저 읽고 근거만 찾아가는 훈련", "지문당 제한시간 걸고 끊어 읽기"],
      avoid: ["정독 습관 유지 — 지금 가장 비싼 습관입니다"],
      rx: ["복합지문을 먼저 푸는 순서로 바꿔보기", "지문당 제한시간 걸고 끊어 읽기", "LC는 미련 버리고 넘어가는 훈련"] },

    RFP: { name: "독해 마른비만형", line: "문법은 아는데, 고를 땐 감으로 갑니다.",
      desc: [
        "단어와 문법을 공부했고 설명도 들었습니다. 그런데 문제 앞에서는 근거 대신 익숙함으로 고릅니다. 시간은 남는데 정답률이 안 올라오는 이유가 여기 있습니다.",
        "아는 것과 쓰는 것 사이가 비어 있습니다. 이 간격은 문제를 더 푼다고 좁혀지지 않고, 고른 이유를 말로 꺼내는 훈련으로만 좁혀집니다."
      ],
      scene: [
        "해설을 보면 ‘아 그렇지’ 싶은데 다음에 또 틀립니다",
        "‘그냥 이게 자연스러워 보여서’ 고른 적이 많습니다",
        "문법 강의는 이미 여러 번 들었습니다"
      ],
      strong: ["기초 자료는 이미 머리에 들어 있습니다", "시간 압박이 없어 고칠 게 하나뿐입니다"],
      weak: ["맞힌 문항의 상당수가 추측이라 난이도가 오르면 드러납니다", "익숙함으로 고르는 습관이 오개념을 만듭니다"],
      myth: { q: "강의를 들었으니 안다", a: "듣고 이해한 것과 시험장에서 꺼내 쓰는 건 다릅니다. 남에게 설명할 수 없으면 아직 모르는 겁니다." },
      fit: ["5형식 뼈대잡기로 문장 구조부터 다시", "선택지를 지운 이유까지 한 줄로 적기"],
      avoid: ["같은 문법 강의 재수강 — 세 번째는 효과가 없습니다"],
      rx: ["5형식 뼈대잡기로 문장 구조부터 다시", "선택지를 지운 이유까지 한 줄로 적기", "Part 5 오답을 유형별로 태깅해 누적"] },

    RFT: { name: "독해 요요형", line: "푼 만큼 남지 않습니다.",
      desc: [
        "문제는 많이 푸는데 복습도 운영도 없어서 푼 양이 실력으로 전환되지 않습니다. 지문을 끝까지 읽기보다 눈에 걸리는 단어로 답을 고르는 습관이 굳어 있습니다.",
        "여덟 체형 중 가장 먼저 속도를 늦춰야 하는 쪽입니다. 지금은 양이 아니라 구조를 바꿀 때입니다."
      ],
      scene: [
        "지문에서 보기와 같은 단어가 보이면 그걸 고릅니다",
        "복합지문은 거의 매번 찍고 넘어갑니다",
        "푼 문제집은 많은데 다시 본 건 거의 없습니다"
      ],
      strong: ["공부에 쓰는 절대 시간은 확보돼 있습니다", "문제 유형에 대한 노출이 많습니다"],
      weak: ["점수가 오르내리기만 하고 기준선이 안 올라갑니다", "패러프레이즈를 못 잡아 함정 보기에 자주 걸립니다"],
      myth: { q: "지문에 있는 단어가 보기에도 있으면 그게 답이지", a: "토익은 같은 단어를 그대로 쓰지 않습니다. 똑같은 단어가 보이는 보기가 오히려 함정인 경우가 많습니다." },
      fit: ["2주간 새 문제 중단하고 오답 복습만", "Part 7 패러프레이즈 쌍 정리하기"],
      avoid: ["새 문제집 구매 — 지금은 가진 것부터 비워야 합니다"],
      rx: ["2주간 새 문제 중단, 오답 복습만", "매일 50단어 + 주 1회 누적 테스트", "복합지문은 시간 재고 한 세트씩만"] }
  };

  var MATRIX_ORDER = ["LMP", "RMP", "LMT", "RMT", "LFP", "RFP", "LFT", "RFT"];
  var L4 = ["A", "B", "C", "D"];

  var GROUPS = [
    { name: "Part 2 · 질의응답", note: "짧은 질문을 듣고 응답 고르기", part: "p2" },
    { name: "Part 3 · 대화 이해", note: "흐름 파악과 세부사항 포착", part: "p3" },
    { name: "Part 5 · 문장 구조", note: "품사 · 태 · 관계사 · 접속사",
      tags: ["Part 5 · 품사", "Part 5 · 접속사", "Part 5 · 태", "Part 5 · 관계사"] },
    { name: "Part 5 · 어휘와 전치사", note: "기한 전치사 · 연어",
      tags: ["Part 5 · 전치사", "Part 5 · 어휘"] },
    { name: "Part 6·7 · 지문 이해", note: "문맥 속 빈칸과 요청 사항 파악",
      tags: ["Part 6 · 문맥 속 빈칸", "Part 7 · 요청 사항"] }
  ];

  var STEPS = [];
  PART2.forEach(function (it) { STEPS.push({ kind: "p2", item: it }); });
  STEPS.push({ kind: "p3set" });
  RC.forEach(function (it) { STEPS.push({ kind: "rc", item: it }); });
  HABIT.forEach(function (it, i) { STEPS.push({ kind: "habit", item: it, hi: i }); });

  var N_LC = PART2.length + PART3.qs.length;
  var N_RC = RC.length;
  var N_SCORED = N_LC + N_RC;

  var answers = {}, habits = [], step = 0, awaitingConf = false;
  var plays = 0, revealed = false;
  var t0 = 0, timerId = 0, summary = "", stepStart = 0, times = {};
  var cardData = null, calcTimers = [];

  function el(id) { return document.getElementById(id); }
  var vIntro = el("v-intro"), vQuiz = el("v-quiz"), vCalc = el("v-calc"), vResult = el("v-result");
  var au = el("au");
  var reduced = false;
  try { reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { reduced = false; }

  (function () {
    var bar = el("qBar"), i;
    for (i = 0; i < STEPS.length; i++) { bar.appendChild(document.createElement("i")); }
  })();

  function show(v) {
    vIntro.hidden = v !== "intro";
    vQuiz.hidden = v !== "quiz";
    vCalc.hidden = v !== "calc";
    vResult.hidden = v !== "result";
  }

  function fillParas(id, arr) {
    var host = el(id);
    host.textContent = "";
    arr.forEach(function (s) {
      var p = document.createElement("p");
      p.className = "copy";
      p.textContent = s;
      host.appendChild(p);
    });
  }

  function fillList(id, arr) {
    var host = el(id);
    host.textContent = "";
    arr.forEach(function (s) {
      var li = document.createElement("li");
      li.textContent = s;
      host.appendChild(li);
    });
  }

  function fillScene(id, arr) {
    var host = el(id);
    host.textContent = "";
    arr.forEach(function (s, i) {
      var row = document.createElement("div");
      var n = document.createElement("i");
      n.textContent = pad(i + 1);
      var t = document.createElement("span");
      t.textContent = s;
      row.appendChild(n); row.appendChild(t);
      host.appendChild(row);
    });
  }

  function fillMyth(m) {
    var host = el("rMyth");
    host.textContent = "";
    var k = document.createElement("div"); k.className = "myth-k"; k.textContent = "자주 하는 착각";
    var q = document.createElement("div"); q.className = "myth-q"; q.textContent = "\u201C" + m.q + "\u201D";
    var a = document.createElement("div"); a.className = "myth-a"; a.textContent = m.a;
    host.appendChild(k); host.appendChild(q); host.appendChild(a);
  }

  function pad(n) { return n < 10 ? "0" + n : String(n); }
  function setText(id, s) { el(id).textContent = s; }
  function round5(n) { return Math.round(n / 5) * 5; }
  function clampScore(n) { return Math.max(10, Math.min(990, n)); }
  function readScore(id) {
    var v = parseInt(el(id).value, 10);
    if (isNaN(v) || v < 10 || v > 990) { return null; }
    return clampScore(round5(v));
  }
  function secs(n) { return n >= 60 ? (Math.floor(n / 60) + "분 " + Math.round(n % 60) + "초") : (Math.round(n * 10) / 10 + "초"); }
  function avg(list) {
    if (!list.length) { return 0; }
    var s = 0, i;
    for (i = 0; i < list.length; i++) { s += list[i]; }
    return s / list.length;
  }
  function bandOf(list, n) {
    for (var i = 0; i < list.length; i++) { if (n <= list[i].max) { return list[i]; } }
    return list[list.length - 1];
  }
  function totalRange(lcN, rcN) {
    var a = bandOf(LC_BANDS, lcN), b = bandOf(RC_BANDS, rcN);
    return { lo: a.lo + b.lo, hi: a.hi + b.hi, mid: Math.round((a.lo + b.lo + a.hi + b.hi) / 2) };
  }
  function totalBand(lcN, rcN) { var r = totalRange(lcN, rcN); return r.lo + "–" + r.hi; }

  function tick() {
    var s = Math.floor((Date.now() - t0) / 1000);
    setText("qTimer", pad(Math.floor(s / 60)) + ":" + pad(s % 60));
  }

  /* ---------- 음원 재생 ----------
     <audio> 태그가 통째로 막히는 환경이 있어 재생 경로를 세 단계로 둔다.
       1) Web Audio  — 메모리에서 디코딩해 바로 출력. 제약이 가장 적다.
       2) <audio> + blob 주소
       3) <audio> + 원본 주소
     셋 다 실패할 때만 대본으로 넘긴다. */

  function audioSrc(path) {
    var map = window.__AUDIO;
    if (map && map[path]) { return map[path]; }
    return path;
  }

  var AP = { path: "", mode: "", ctx: null, buffers: {}, blobs: {},
             node: null, startAt: 0, dur: 0, raf: 0, reason: "" };

  function b64Bytes(uri) {
    var b64 = uri.slice(uri.indexOf(",") + 1);
    var bin = window.atob(b64);
    var out = new Uint8Array(bin.length), i;
    for (i = 0; i < bin.length; i++) { out[i] = bin.charCodeAt(i); }
    return out;
  }

  function audioCtx() {
    if (AP.ctx) { return AP.ctx; }
    var C = window.AudioContext || window.webkitAudioContext;
    if (!C) { return null; }
    try { AP.ctx = new C(); } catch (e) { AP.ctx = null; }
    return AP.ctx;
  }

  function decodeFor(path) {
    if (AP.buffers[path]) { return Promise.resolve(AP.buffers[path]); }
    var uri = audioSrc(path);
    var c = audioCtx();
    if (!c) { return Promise.reject(new Error("AudioContext 미지원")); }

    function decode(arrbuf) {
      return new Promise(function (resolve, reject) {
        var done = function (buf) { AP.buffers[path] = buf; resolve(buf); };
        var fail = function (e) { reject(e || new Error("디코딩 실패")); };
        var ret;
        try { ret = c.decodeAudioData(arrbuf, done, fail); } catch (e) { fail(e); return; }
        if (ret && ret.then) { ret.then(done, fail); }
      });
    }

    if (uri.indexOf("data:") === 0) {
      var bytes;
      try { bytes = b64Bytes(uri); } catch (e) { return Promise.reject(e); }
      return decode(bytes.buffer);
    }
    if (/^https?:/.test(uri) || uri.indexOf("/") === 0 || uri.indexOf("audio/") === 0) {
      return window.fetch(uri).then(function (r) {
        if (!r.ok) { throw new Error("음원 " + r.status); }
        return r.arrayBuffer();
      }).then(decode);
    }
    return Promise.reject(new Error("음원 주소 없음"));
  }

  function primeAudio(path) {
    AP.path = path;
    AP.mode = "";
    AP.reason = "";
    decodeFor(path).then(null, function () { /* 재생할 때 다시 시도한다 */ });
  }

  function stopNode() {
    if (AP.raf) { window.cancelAnimationFrame(AP.raf); AP.raf = 0; }
    if (AP.node) {
      try { AP.node.onended = null; AP.node.stop(0); } catch (e) { /* 무시 */ }
      AP.node = null;
    }
  }

  function stopAudio() {
    stopNode();
    try { au.pause(); au.currentTime = 0; } catch (e) { /* 무시 */ }
    el("playBtn").classList.remove("on");
    el("trackFill").style.width = "0";
  }

  function clipEnded() {
    el("playBtn").classList.remove("on");
    setText("playLabel", plays >= 2 ? "재생 완료" : "다시 재생");
    el("playBtn").disabled = plays >= 2;
    el("trackFill").style.width = "100%";
  }

  function trackLoop() {
    if (!AP.node || !AP.ctx) { return; }
    var pct = AP.dur ? Math.min(100, ((AP.ctx.currentTime - AP.startAt) / AP.dur) * 100) : 0;
    el("trackFill").style.width = pct + "%";
    if (pct < 100) { AP.raf = window.requestAnimationFrame(trackLoop); }
  }

  au.addEventListener("timeupdate", function () {
    if (AP.mode === "element" && au.duration) {
      el("trackFill").style.width = ((au.currentTime / au.duration) * 100) + "%";
    }
  });
  au.addEventListener("ended", function () { if (AP.mode === "element") { clipEnded(); } });
  au.addEventListener("error", function () {
    if (AP.mode !== "element") { return; }
    audioGiveUp("태그 오류" + (au.error ? " " + au.error.code : ""));
  });

  function playViaElement(path, why) {
    AP.mode = "element";
    var uri = audioSrc(path), url = uri;
    if (uri.indexOf("data:") === 0) {
      if (AP.blobs[path]) { url = AP.blobs[path]; }
      else {
        try {
          url = window.URL.createObjectURL(new window.Blob([b64Bytes(uri)], { type: "audio/mpeg" }));
          AP.blobs[path] = url;
        } catch (e) { url = uri; }
      }
    }
    try {
      au.src = url;
      au.currentTime = 0;
      var pr = au.play();
      if (pr && pr.catch) {
        pr.catch(function (e) {
          audioGiveUp((why || "") + " / " + (e && e.name ? e.name : "재생 거부"));
        });
      }
    } catch (e) { audioGiveUp((why || "") + " / 재생 불가"); }
  }

  function audioGiveUp(reason) {
    stopNode();
    AP.reason = reason || "";
    el("playBtn").classList.remove("on");
    el("playBtn").disabled = true;
    el("replayBtn").disabled = true;
    el("playerNote").hidden = false;
    setText("playerNote",
      "이 기기에서는 음원이 재생되지 않아 대본으로 진행합니다. 읽고 답하셔도 채점은 동일합니다."
      + (AP.reason ? "  [" + AP.reason + "]" : ""));
    revealScript();
  }

  function playNow() {
    var s = STEPS[step];
    var path = (s.kind === "p2") ? s.item.src : PART3.src;
    AP.path = path;

    plays++;
    el("playBtn").classList.add("on");
    setText("playLabel", "재생 중");
    el("playBtn").disabled = true;
    el("replayBtn").disabled = plays >= 2;
    unlockAnswers();

    var c = audioCtx();
    if (c && c.state === "suspended" && c.resume) {
      try { c.resume(); } catch (e) { /* 무시 */ }
    }

    decodeFor(path).then(function (buf) {
      if (AP.path !== path) { return; }
      stopNode();
      try {
        var node = c.createBufferSource();
        node.buffer = buf;
        node.connect(c.destination);
        node.onended = function () {
          if (AP.node === node) { AP.node = null; clipEnded(); }
        };
        AP.mode = "webaudio";
        AP.node = node;
        AP.dur = buf.duration;
        AP.startAt = c.currentTime;
        node.start(0);
        AP.raf = window.requestAnimationFrame(trackLoop);
      } catch (e) {
        playViaElement(path, "WebAudio 출력 실패");
      }
    }, function (e) {
      playViaElement(path, e && e.message ? e.message : "디코딩 실패");
    });
  }

  function unlockAnswers() {
    if (STEPS[step].kind === "p3set") { return; }
    var opts = el("qOpts").children, i;
    for (i = 0; i < opts.length; i++) { opts[i].disabled = false; }
  }

  function revealScript() {
    revealed = true;
    var box = el("scriptBox");
    box.hidden = false;
    box.textContent = "";
    if (STEPS[step].kind === "p2") {
      var it = STEPS[step].item;
      var q = document.createElement("div");
      q.className = "ln";
      var s1 = document.createElement("span"); s1.className = "spk"; s1.textContent = "Q";
      var s2 = document.createElement("span"); s2.textContent = it.q;
      q.appendChild(s1); q.appendChild(s2);
      box.appendChild(q);
      var ol = document.createElement("ol");
      ol.type = "A";
      it.opts.forEach(function (o) { var li = document.createElement("li"); li.textContent = o; ol.appendChild(li); });
      box.appendChild(ol);
    } else {
      PART3.script.forEach(function (row) {
        var ln = document.createElement("div");
        ln.className = "ln";
        var sp = document.createElement("span"); sp.className = "spk"; sp.textContent = row[0];
        var tx = document.createElement("span"); tx.textContent = row[1];
        ln.appendChild(sp); ln.appendChild(tx);
        box.appendChild(ln);
      });
    }
    el("scriptBtn").disabled = true;
    unlockAnswers();
  }

  function makeOpt(letter, text, pressed, onClick) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "opt";
    b.setAttribute("aria-pressed", pressed ? "true" : "false");
    var l = document.createElement("span"); l.className = "ltr";
    l.textContent = typeof letter === "number" ? letter : "(" + letter + ")";
    var t = document.createElement("span"); t.textContent = text;
    b.appendChild(l); b.appendChild(t);
    b.addEventListener("click", onClick);
    return b;
  }

  function render() {
    stopAudio();
    var s = STEPS[step], i;

    var cells = el("qBar").children;
    for (i = 0; i < cells.length; i++) { cells[i].className = i < step ? "on" : (i === step ? "now" : ""); }

    var box = el("qOpts");
    box.textContent = "";
    el("qConf").hidden = true;
    el("qSet").hidden = true;
    el("qSet").textContent = "";
    el("qPassage").hidden = true;
    el("goWrap").hidden = true;
    el("scriptBox").hidden = true;
    el("playerNote").hidden = true;
    el("scriptBtn").disabled = false;
    el("replayBtn").disabled = true;
    el("playBtn").disabled = false;
    el("trackFill").style.width = "0";
    setText("playLabel", "재생하기");
    awaitingConf = false;
    plays = 0; revealed = false;

    var hasAudio = (s.kind === "p2" || s.kind === "p3set");
    el("qPlayer").hidden = !hasAudio;
    el("qStem").hidden = (s.kind !== "rc" && s.kind !== "habit");

    if (s.kind === "p2") {
      primeAudio(s.item.src);
      setText("qStage", "STAGE 1 · 듣기");
      setText("qNow", pad(PART2.indexOf(s.item) + 1));
      setText("qTotal", "/ 6");
      setText("qTag", s.item.tag);
      setText("playLead", "질문과 선택지를 듣고 가장 알맞은 응답을 고르세요. 선택지는 화면에 없습니다.");
      setText("qHint", "실제 시험처럼 한 번만 듣는 쪽을 권합니다");

      ["A", "B", "C"].forEach(function (L, idx) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "opt blind";
        b.disabled = true;
        b.setAttribute("aria-pressed", answers[step] && answers[step].a === idx ? "true" : "false");
        var l = document.createElement("span"); l.className = "ltr"; l.textContent = "(" + L + ")";
        b.appendChild(l);
        b.addEventListener("click", function () { answerQ(idx); });
        box.appendChild(b);
      });

    } else if (s.kind === "p3set") {
      primeAudio(PART3.src);
      setText("qStage", "STAGE 1 · 듣기");
      setText("qNow", "04–06");
      setText("qTotal", "/ 6");
      setText("qTag", PART3.tag);
      setText("playLead", "대화를 들으며 세 문항에 답하세요. 들으면서 바로 골라도 됩니다.");
      setText("qHint", "음원은 두 번까지 들을 수 있습니다");
      if (!answers[step]) { answers[step] = [{ a: null, c: null }, { a: null, c: null }, { a: null, c: null }]; }
      renderSet();
      el("goWrap").hidden = false;
      refreshGo();

    } else if (s.kind === "rc") {
      setText("qStage", "STAGE 2 · 읽기");
      setText("qNow", pad(RC.indexOf(s.item) + 1));
      setText("qTotal", "/ 8");
      setText("qTag", s.item.tag);
      setText("qHint", "정답은 끝까지 알려주지 않습니다");

      if (s.item.passage) {
        var pz = el("qPassage");
        pz.hidden = false;
        pz.textContent = s.item.passage;
      }

      var stem = el("qStem");
      stem.hidden = false;
      stem.className = "stem";
      stem.textContent = "";
      s.item.stem.split("-------").forEach(function (part, k) {
        if (k > 0) {
          var bl = document.createElement("span"); bl.className = "blank"; bl.textContent = "-------";
          stem.appendChild(bl);
        }
        stem.appendChild(document.createTextNode(part));
      });

      s.item.opts.forEach(function (text, idx) {
        box.appendChild(makeOpt(L4[idx], text, answers[step] && answers[step].a === idx, function () { answerQ(idx); }));
      });

    } else {
      setText("qStage", "STAGE 3 · 운영");
      setText("qNow", pad(s.hi + 1));
      setText("qTotal", "/ 3");
      setText("qTag", "시험장에서의 습관");
      setText("qHint", "정답은 없습니다. 지금 상태 그대로");

      var s2 = el("qStem");
      s2.hidden = false;
      s2.className = "stem ko";
      s2.textContent = s.item.t;

      SCALE.forEach(function (sc) {
        box.appendChild(makeOpt(sc.v, sc.label, habits[s.hi] === sc.v, function () { answerHabit(s.hi, sc.v); }));
      });
    }

    /* 이전으로 돌아왔을 때: 골랐던 답과 확신도를 그대로 되살리고 다시 바꿀 수 있게 연다 */
    var prev = answers[step];
    if ((s.kind === "p2" || s.kind === "rc") && prev && prev.a !== null && prev.a !== undefined) {
      unlockAnswers();
      awaitingConf = true;
      el("qConf").hidden = false;
      paintConf(prev.c);
    }

    el("backBtn").style.visibility = step === 0 ? "hidden" : "visible";
    stepStart = Date.now();
  }

  function renderSet() {
    var host = el("qSet");
    host.hidden = false;
    host.textContent = "";
    var state = answers[step];

    PART3.qs.forEach(function (q, qi) {
      var card = document.createElement("div");
      card.className = "setq" + (state[qi].a !== null && state[qi].c ? " done" : "");
      var n = document.createElement("div"); n.className = "n"; n.textContent = q.no;
      var qq = document.createElement("div"); qq.className = "q"; qq.textContent = q.q;
      card.appendChild(n); card.appendChild(qq);

      var ob = document.createElement("div");
      ob.className = "sopts";
      q.opts.forEach(function (text, oi) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "sopt";
        b.setAttribute("aria-pressed", state[qi].a === oi ? "true" : "false");
        var l = document.createElement("span"); l.className = "ltr"; l.textContent = "(" + L4[oi] + ")";
        var t = document.createElement("span"); t.textContent = text;
        b.appendChild(l); b.appendChild(t);
        b.addEventListener("click", function () { state[qi].a = oi; renderSet(); });
        ob.appendChild(b);
      });
      card.appendChild(ob);

      var cf = document.createElement("div");
      cf.className = "sconf";
      cf.hidden = state[qi].a === null;
      var lab = document.createElement("div"); lab.className = "lab"; lab.textContent = "이 문항, 얼마나 확신하나요?";
      var row = document.createElement("div"); row.className = "row";
      [["sure", "확신"], ["half", "반반"], ["guess", "찍음"]].forEach(function (p) {
        var b = document.createElement("button");
        b.type = "button"; b.className = p[0]; b.textContent = p[1];
        b.setAttribute("aria-pressed", state[qi].c === p[0] ? "true" : "false");
        b.addEventListener("click", function () { state[qi].c = p[0]; renderSet(); });
        row.appendChild(b);
      });
      cf.appendChild(lab); cf.appendChild(row);
      card.appendChild(cf);
      host.appendChild(card);
    });
    refreshGo();
  }

  function refreshGo() {
    var state = answers[step];
    if (!state || !state.length) { return; }
    var done = 0, i;
    for (i = 0; i < state.length; i++) { if (state[i].a !== null && state[i].c) { done++; } }
    var b = el("goBtn");
    b.disabled = done < state.length;
    b.textContent = done < state.length ? ("세 문항 모두 답해 주세요 · " + done + "/3") : "다음으로 →";
  }

  el("playBtn").addEventListener("click", function () { if (plays < 2) { playNow(); } });
  el("replayBtn").addEventListener("click", function () { if (plays < 2) { playNow(); } });
  el("scriptBtn").addEventListener("click", revealScript);
  el("goBtn").addEventListener("click", function () {
    if (times[step] === undefined) { times[step] = (Date.now() - stepStart) / 1000; }
    next();
  });

  function paintConf(c) {
    Array.prototype.forEach.call(el("qConf").querySelectorAll("button"), function (b) {
      b.setAttribute("aria-pressed", b.getAttribute("data-c") === c ? "true" : "false");
    });
  }

  /* 답은 확신도를 고르기 전까지 몇 번이고 바꿀 수 있다. */
  function answerQ(i) {
    var prev = answers[step];
    if (times[step] === undefined) { times[step] = (Date.now() - stepStart) / 1000; }
    answers[step] = { a: i, c: prev ? prev.c : null };
    var opts = el("qOpts").children, k;
    for (k = 0; k < opts.length; k++) {
      opts[k].setAttribute("aria-pressed", k === i ? "true" : "false");
    }
    awaitingConf = true;
    el("qConf").hidden = false;
    paintConf(answers[step].c);
  }

  Array.prototype.forEach.call(el("qConf").querySelectorAll("button"), function (b) {
    b.addEventListener("click", function () {
      if (!awaitingConf || !answers[step]) { return; }
      answers[step].c = b.getAttribute("data-c");
      paintConf(answers[step].c);
      awaitingConf = false;
      window.setTimeout(next, 160);
    });
  });

  function answerHabit(hi, v) {
    habits[hi] = v;
    var opts = el("qOpts").children, k;
    for (k = 0; k < opts.length; k++) { opts[k].setAttribute("aria-pressed", SCALE[k].v === v ? "true" : "false"); }
    window.setTimeout(next, 200);
  }

  function next() {
    if (step < STEPS.length - 1) { step++; render(); window.scrollTo(0, 0); }
    else { finish(); }
  }

  /* ---------- chart ---------- */
  var SVGNS = "http://www.w3.org/2000/svg";
  function svgEl(name, attrs) {
    var e = document.createElementNS(SVGNS, name), k;
    for (k in attrs) { if (Object.prototype.hasOwnProperty.call(attrs, k)) { e.setAttribute(k, attrs[k]); } }
    return e;
  }

  function buildChart(first, recent, lo, hi, center) {
    var W = 620, H = 250, padL = 54, padR = 34, padT = 26, padB = 46;
    var vals = [lo, hi, center];
    if (first !== null) { vals.push(first); }
    if (recent !== null) { vals.push(recent); }
    var mn = Math.max(0, Math.min.apply(null, vals) - 60);
    var mx = Math.min(990, Math.max.apply(null, vals) + 60);
    if (mx - mn < 150) { mx = Math.min(990, mn + 150); }

    var svg = svgEl("svg", { viewBox: "0 0 " + W + " " + H, role: "img",
      "aria-label": "토익 점수 추이와 다음 시험 예상 구간" });

    var inset = 28;
    function X(i) { return padL + inset + (W - padL - padR - inset) * (i / 2); }
    function Y(v) { return padT + (H - padT - padB) * (1 - (v - mn) / (mx - mn)); }

    var g, gv, stepV = (mx - mn) / 3;
    for (g = 0; g <= 3; g++) {
      gv = Math.round((mn + stepV * g) / 10) * 10;
      svg.appendChild(svgEl("line", { x1: padL, y1: Y(gv), x2: W - padR, y2: Y(gv), stroke: "#2A1F56", "stroke-width": 1 }));
      var gt = svgEl("text", { x: padL - 11, y: Y(gv) + 5, fill: "#ADA0DC", "font-size": 13,
        "text-anchor": "end", "font-family": "IBM Plex Mono, monospace" });
      gt.textContent = String(gv);
      svg.appendChild(gt);
    }

    svg.appendChild(svgEl("rect", { x: X(2) - 36, y: Y(hi), width: 72, height: Math.max(3, Y(lo) - Y(hi)),
      fill: "#3BE7FF", "fill-opacity": ".18", stroke: "#3BE7FF", "stroke-opacity": ".65", rx: 3 }));

    function line(x1, y1, x2, y2, color, dash) {
      var a = { x1: x1, y1: y1, x2: x2, y2: y2, stroke: color, "stroke-width": 3, "stroke-linecap": "round" };
      if (dash) { a["stroke-dasharray"] = "7 6"; }
      svg.appendChild(svgEl("line", a));
    }
    if (first !== null && recent !== null) { line(X(0), Y(first), X(1), Y(recent), "#A779FF"); }
    if (recent !== null) { line(X(1), Y(recent), X(2), Y(center), "#3BE7FF", true); }
    else if (first !== null) { line(X(0), Y(first), X(2), Y(center), "#3BE7FF", true); }

    function dot(x, y, color) {
      svg.appendChild(svgEl("circle", { cx: x, cy: y, r: 6, fill: "#06030F", stroke: color, "stroke-width": 3 }));
    }
    function label(x, y, text, color) {
      var e = svgEl("text", { x: x, y: y - 15, fill: color, "font-size": 15, "text-anchor": "middle",
        "font-family": "IBM Plex Mono, monospace", "font-weight": "600" });
      e.textContent = text;
      svg.appendChild(e);
    }
    function axis(x, text) {
      var e = svgEl("text", { x: x, y: H - 14, fill: "#ADA0DC", "font-size": 13, "text-anchor": "middle",
        "font-family": "IBM Plex Sans KR, sans-serif" });
      e.textContent = text;
      svg.appendChild(e);
    }

    if (first !== null) { dot(X(0), Y(first), "#A779FF"); label(X(0), Y(first), String(first), "#CBB6FF"); axis(X(0), "처음"); }
    if (recent !== null) { dot(X(1), Y(recent), "#A779FF"); label(X(1), Y(recent), String(recent), "#CBB6FF"); axis(X(1), "최근"); }
    dot(X(2), Y(center), "#3BE7FF");
    label(X(2), Y(hi), lo + "–" + hi, "#9BEFFF");
    axis(X(2), "다음 예상");
    return svg;
  }

  /* ---------- finish ---------- */
  function finish() {
    stopAudio();
    window.clearInterval(timerId);

    var lcC = 0, rcC = 0, sure = 0, half = 0, guess = 0;
    var wrongSure = 0, wrongHalf = 0, wrongGuess = 0;
    var lcSure = 0, lcHalf = 0, rcSure = 0, rcHalf = 0;
    var wrongList = [], detail = [];

    function grade(item, p, isLC, label, qText, part) {
      var ansText = "(" + L4[item.ans] + ") " + item.opts[item.ans];
      var conf = (p && p.c) ? p.c : "guess";
      var ok = !!(p && p.a === item.ans);
      detail.push({ part: part, tag: item.tag, ok: ok, conf: conf, isLC: isLC });
      if (ok) {
        if (isLC) { lcC++; } else { rcC++; }
        if (conf === "sure") { sure++; if (isLC) { lcSure++; } else { rcSure++; } }
        else if (conf === "half") { half++; if (isLC) { lcHalf++; } else { rcHalf++; } }
        else { guess++; }
      } else {
        if (conf === "sure") { wrongSure++; }
        else if (conf === "half") { wrongHalf++; }
        else { wrongGuess++; }
        wrongList.push({ label: label, tag: item.tag, q: qText, ans: ansText, sure: conf === "sure" });
      }
    }

    var tP2 = [], tRC = [], tSet = 0;
    STEPS.forEach(function (s, i) {
      if (s.kind === "p2") {
        grade(s.item, answers[i], true, "LC " + s.item.no, s.item.q, "p2");
        if (times[i] !== undefined) { tP2.push(times[i]); }
      } else if (s.kind === "p3set") {
        var st = answers[i] || [];
        PART3.qs.forEach(function (q, qi) { grade(q, st[qi], true, "LC " + q.no, q.q, "p3"); });
        if (times[i] !== undefined) { tSet = times[i]; }
      } else if (s.kind === "rc") {
        grade(s.item, answers[i], false, "RC " + pad(RC.indexOf(s.item) + 1),
          s.item.passage ? s.item.stem : s.item.stem.replace("-------", "______"), "rc");
        if (times[i] !== undefined) { tRC.push(times[i]); }
      }
    });

    var correct = lcC + rcC;
    var fat = correct === 0 ? 100 : Math.round(((guess + half * 0.5) / correct) * 100);
    var realLC = Math.round(lcSure + lcHalf * 0.5);
    var realRC = Math.round(rcSure + rcHalf * 0.5);
    /* 인바디 점수 — 실제 인바디처럼 70~80이 표준이 되도록 잡는다.
       정확도 50 + 확신도 25 + 기본 25, 오개념만 소폭 감점. */
    var score100 = Math.max(0, Math.min(100, Math.round(
      (correct / N_SCORED) * 50
      + ((sure + half * 0.5) / N_SCORED) * 25
      + 25
      - wrongSure * 1.5)));
    var grade = score100 >= 85 ? "우수"
              : score100 >= 70 ? "표준"
              : score100 >= 55 ? "보완 필요" : "집중 관리";

    setText("rGrade", " · " + grade);
    setText("cSurface", totalBand(lcC, rcC) + " 점대");
    setText("cReal", totalBand(realLC, realRC) + " 점대");
    setText("cFat", fat + "%");
    setText("cWrongSure", wrongSure + "개");

    function badge(id, top, bottom) {
      var b = el(id);
      b.textContent = "";
      b.appendChild(document.createTextNode(top));
      b.appendChild(document.createElement("br"));
      b.appendChild(document.createTextNode(bottom));
    }
    badge("bSurface", correct + "/" + N_SCORED, "정답");
    badge("bReal", (realLC + realRC) + "/" + N_SCORED, "확신");

    /* ---- 예상 점수 구간 ---- */
    var firstScore = readScore("f-first");
    var recentScore = readScore("f-recent");
    var realRange = totalRange(realLC, realRC);
    var measured = realRange.mid;
    var ceiling = false, floored = false;

    if (recentScore !== null && correct === N_SCORED && measured < recentScore) {
      measured = recentScore; ceiling = true;
    }
    if (recentScore !== null && correct === 0 && measured > recentScore) {
      measured = recentScore; floored = true;
    }

    var center, halfW, basis;
    if (recentScore !== null) {
      var wR = 1 / (SE_RECENT * SE_RECENT), wT = 1 / (SE_TEST * SE_TEST);
      center = round5((recentScore * wR + measured * wT) / (wR + wT));
      var se = 1 / Math.sqrt(wR + wT);
      var diverge = Math.abs(recentScore - measured);
      halfW = round5(se + Math.min(70, diverge * 0.22));
      if (ceiling) {
        basis = "14문항을 모두 맞혀 이 테스트로는 상한을 재지 못했습니다. 최근 성적 " + recentScore + "점을 기준선으로 잡았습니다.";
      } else if (floored) {
        basis = "한 문항도 맞히지 못해 하한을 재지 못했습니다. 최근 성적 " + recentScore + "점을 기준선으로 잡았습니다.";
      } else {
        basis = "실제 응시 결과인 최근 성적 " + recentScore + "점에 큰 비중을, 오늘 측정한 실질 추정치 " + measured + "점에 작은 비중을 두어 계산했습니다. 두 값이 벌어질수록 구간이 넓어집니다.";
      }
    } else {
      center = round5(measured);
      halfW = 95;
      basis = "오늘 측정한 실질 추정치만으로 계산했습니다. 최근 성적을 입력하면 구간이 크게 좁아집니다.";
    }
    var pLo = clampScore(round5(center - halfW));
    var pHi = clampScore(round5(center + halfW));

    setText("pSub", basis);

    var dEl = el("pDelta");
    if (recentScore !== null) {
      var dv = center - recentScore;
      dEl.hidden = false;
      dEl.textContent = "최근 " + recentScore + "점 대비 " + (dv > 0 ? "+" : "") + dv + "점";
      dEl.style.color = dv > 0 ? "var(--win)" : (dv < 0 ? "var(--magenta)" : "var(--dim)");
      dEl.style.borderColor = dv > 0 ? "var(--win)" : (dv < 0 ? "var(--magenta)" : "var(--edge-2)");
    } else { dEl.hidden = true; }

    var cw = el("pChartWrap");
    if (firstScore !== null || recentScore !== null) {
      cw.hidden = false;
      cw.textContent = "";
      cw.appendChild(buildChart(firstScore, recentScore, pLo, pHi, center));
    } else { cw.hidden = true; }

    /* ---- 교차 분석 ---- */
    var crossBox = el("rCross");
    crossBox.textContent = "";
    var CROSS = [
      { v: sure, t1: "확신하고 맞힘", t2: "그대로 가져갈 실력", cls: "ok" },
      { v: half, t1: "반반인데 맞힘", t2: "굳히면 실력이 됨", cls: "warn" },
      { v: guess, t1: "찍어서 맞힘", t2: "다음엔 틀릴 문항", cls: "bad" },
      { v: wrongSure, t1: "확신했는데 틀림", t2: "가장 위험한 칸", cls: "bad" },
      { v: wrongHalf, t1: "반반인데 틀림", t2: "복습하면 잡힘", cls: "warn" },
      { v: wrongGuess, t1: "몰라서 틀림", t2: "아직 안 쌓인 기초", cls: "" }
    ];
    CROSS.forEach(function (c) {
      var d = document.createElement("div");
      d.className = "cx" + (c.cls ? " " + c.cls : "");
      var v = document.createElement("div"); v.className = "v"; v.textContent = c.v;
      var k = document.createElement("div"); k.className = "k";
      k.appendChild(document.createTextNode(c.t1));
      k.appendChild(document.createElement("br"));
      k.appendChild(document.createTextNode(c.t2));
      d.appendChild(v); d.appendChild(k);
      crossBox.appendChild(d);
    });

    /* ---- 영역별 ---- */
    var secBox = el("rSections");
    secBox.textContent = "";
    var sectionRows = [];
    GROUPS.forEach(function (gp) {
      var mine = detail.filter(function (d) {
        return gp.part ? d.part === gp.part : (gp.tags.indexOf(d.tag) >= 0);
      });
      if (!mine.length) { return; }
      var ok = mine.filter(function (d) { return d.ok; }).length;
      var pct = Math.round((ok / mine.length) * 100);
      var missed = mine.filter(function (d) { return !d.ok; }).map(function (d) { return d.tag; });
      sectionRows.push({ name: gp.name, ok: ok, n: mine.length, pct: pct });

      var row = document.createElement("div");
      row.className = "srow";
      var nm = document.createElement("div");
      nm.className = "nm";
      nm.appendChild(document.createTextNode(gp.name));
      var sub = document.createElement("small");
      sub.textContent = missed.length ? ("놓친 유형 · " + missed.join(", ")) : (gp.note + " · 전부 정답");
      nm.appendChild(sub);
      var mini = document.createElement("div");
      mini.className = "mini";
      var fill = document.createElement("i");
      fill.style.width = pct + "%";
      fill.style.background = pct >= 67 ? "var(--cyan)" : (pct >= 34 ? "var(--gold)" : "var(--magenta)");
      mini.appendChild(fill);
      var sc = document.createElement("div");
      sc.className = "sc";
      sc.textContent = ok + "/" + mine.length;
      row.appendChild(nm); row.appendChild(mini); row.appendChild(sc);
      secBox.appendChild(row);
    });

    /* ---- 속도 ---- */
    var elapsed = (Date.now() - t0) / 1000;
    var rcAvg = avg(tRC);
    var spBox = el("rSpeed");
    spBox.textContent = "";
    [
      { n: "총 소요 시간", s: "시작부터 마지막 문항까지", v: secs(elapsed) },
      { n: "읽기 평균 풀이", s: rcAvg ? ("Part 5 권장 속도는 문항당 20초입니다 · " + (rcAvg > 24 ? "느린 편" : "괜찮은 편")) : "기록 없음",
        v: rcAvg ? secs(rcAvg) : "—" },
      { n: "Part 2 평균 응답", s: "음원 재생 시간이 포함된 값입니다", v: tP2.length ? secs(avg(tP2)) : "—" },
      { n: "Part 3 세트", s: "듣고 세 문항을 모두 고르기까지", v: tSet ? secs(tSet) : "—" }
    ].forEach(function (r) {
      var row = document.createElement("div");
      row.className = "srow";
      var nm = document.createElement("div");
      nm.className = "nm";
      nm.appendChild(document.createTextNode(r.n));
      var sub = document.createElement("small"); sub.textContent = r.s;
      nm.appendChild(sub);
      var sc = document.createElement("div");
      sc.className = "sc";
      sc.style.flexBasis = "auto";
      sc.textContent = r.v;
      row.appendChild(nm); row.appendChild(sc);
      spBox.appendChild(row);
    });

    /* ---- 축 ---- */
    var lcRate = lcC / N_LC, rcRate = rcC / N_RC;
    var pctL = (lcRate + rcRate) === 0 ? 50 : Math.round((lcRate / (lcRate + rcRate)) * 100);
    var pctM = 100 - fat;
    var sumC = 0;
    HABIT.forEach(function (h, i) { sumC += ((habits[i] || 3) - 3) * h.dir; });
    var pctP = Math.round(((sumC + 6) / 12) * 100);

    /* 판정 기준선. 솔직하게 답할수록 불리해지지 않도록 중앙이 아닌 실제 기준에 둔다. */
    var MID_LR = 50, MID_MF = 60, MID_PT = 33;
    var winLR = pctL >= MID_LR, winMF = fat <= 40, winPT = sumC >= -2;
    var code = (winLR ? "L" : "R") + (winMF ? "M" : "F") + (winPT ? "P" : "T");
    var t = TYPES[code] || TYPES.LMP;

    var axBox = el("rAxes");
    axBox.textContent = "";
    var fills = [];
    [
      { l: "청해 우위", r: "독해 우위", pct: pctL, mid: MID_LR, lc: "#3BE7FF", rc: "#A779FF", win: winLR, m: true,
        note: "LC " + lcC + "/" + N_LC + "  vs  RC " + rcC + "/" + N_RC },
      { l: "근육 · 확신", r: "지방 · 추측", pct: pctM, mid: MID_MF, lc: "#5BFFB0", rc: "#FF57A8", win: winMF, m: true,
        note: "확신 정답 " + sure + " · 반반 " + half + " · 찍음 " + guess + "  |  기준선 " + MID_MF + "%" },
      { l: "운영 안정", r: "흔들림 · 시간 압박", pct: pctP, mid: MID_PT, lc: "#3BE7FF", rc: "#FFC53D", win: winPT, m: false,
        note: "세로선이 판정 기준선입니다" }
    ].forEach(function (a) {
      var row = document.createElement("div");
      var head = document.createElement("div");
      head.className = "axis-head";
      var L = document.createElement("span");
      L.className = "axis-side" + (a.win ? " win" : "");
      L.appendChild(document.createTextNode(a.l + (a.m ? " · 측정값" : " · 자가응답")));
      var lp = document.createElement("span"); lp.className = "pc"; lp.textContent = a.pct + "%";
      L.appendChild(lp);
      var R = document.createElement("span");
      R.className = "axis-side" + (a.win ? "" : " win");
      var rp = document.createElement("span"); rp.className = "pc"; rp.textContent = (100 - a.pct) + "%";
      R.appendChild(document.createTextNode(a.r));
      R.appendChild(rp);
      head.appendChild(L); head.appendChild(R);

      var track = document.createElement("div");
      track.className = "axis-track";
      track.style.background = a.rc;
      track.style.opacity = a.win ? ".45" : "1";
      var fill = document.createElement("div");
      fill.className = "axis-fill";
      fill.style.background = a.lc;
      fill.style.opacity = a.win ? "1" : ".45";
      var mid = document.createElement("div");
      mid.className = "axis-mid";
      mid.style.left = (a.mid || 50) + "%";
      track.appendChild(fill); track.appendChild(mid);
      row.appendChild(head); row.appendChild(track);
      if (a.note) {
        var nt = document.createElement("div");
        nt.className = "axis-note";
        nt.textContent = a.note;
        row.appendChild(nt);
      }
      axBox.appendChild(row);
      fills.push({ node: fill, pct: a.pct });
    });

    /* ---- head ---- */
    var who = el("f-name").value.trim();
    setText("rWho", who ? who + " 님의 토익 체형은" : "당신의 토익 체형은");
    setText("rName", t.name);
    var codeBox = el("rCode");
    codeBox.textContent = "";
    code.split("").forEach(function (ch) {
      var sp = document.createElement("span");
      sp.textContent = ch;
      if (ch === "F" || ch === "T") { sp.className = "f"; }
      codeBox.appendChild(sp);
    });
    codeBox.appendChild(document.createTextNode(" · 8가지 체형 중 하나"));
    setText("rLine", t.line);
    fillParas("rDesc", t.desc);
    fillScene("rScene", t.scene);
    fillList("rGood", t.strong);
    fillList("rRisk", t.weak);
    fillList("rFit", t.fit);
    fillList("rAvoid", t.avoid);
    fillMyth(t.myth);

    var mx2 = el("rMatrix");
    mx2.textContent = "";
    MATRIX_ORDER.forEach(function (c) {
      var ty = TYPES[c];
      var cell = document.createElement("div");
      cell.className = "tcell" + (c === code ? " mine" : "");
      var top = document.createElement("div");
      top.className = "tc-top";
      var cd = document.createElement("span"); cd.className = "tc-code"; cd.textContent = c;
      top.appendChild(cd);
      if (c === code) {
        var chip = document.createElement("span"); chip.className = "mine-chip"; chip.textContent = "내 체형";
        top.appendChild(chip);
      }
      var nm2 = document.createElement("div"); nm2.className = "tc-name"; nm2.textContent = ty.name;
      var ln2 = document.createElement("div"); ln2.className = "tc-line"; ln2.textContent = ty.line;
      cell.appendChild(top); cell.appendChild(nm2); cell.appendChild(ln2);
      mx2.appendChild(cell);
    });

    var rx = el("rRx");
    rx.textContent = "";
    t.rx.forEach(function (line, i) {
      var row = document.createElement("div");
      row.className = "rx-item";
      var n = document.createElement("span"); n.className = "rx-n"; n.textContent = "RX " + pad(i + 1);
      var sp = document.createElement("span"); sp.className = "rx-t"; sp.textContent = line;
      row.appendChild(n); row.appendChild(sp);
      rx.appendChild(row);
    });

    var rev = el("rReview");
    rev.textContent = "";
    if (wrongList.length === 0) {
      var none = document.createElement("div");
      none.className = "rv";
      none.textContent = "14문항 전부 정답입니다. 정밀 측정에서 난이도를 올려 다시 재보세요.";
      rev.appendChild(none);
    } else {
      wrongList.forEach(function (w) {
        var row = document.createElement("div");
        row.className = "rv";
        var top = document.createElement("div");
        top.className = "top";
        var no = document.createElement("span"); no.className = "no"; no.textContent = w.label;
        var tg = document.createElement("span"); tg.className = "tag"; tg.textContent = w.tag;
        top.appendChild(no); top.appendChild(tg);
        if (w.sure) {
          var wn = document.createElement("span"); wn.className = "warn"; wn.textContent = "확신했는데 틀림";
          top.appendChild(wn);
        }
        var qq = document.createElement("div"); qq.className = "qq"; qq.textContent = w.q;
        var aa = document.createElement("div"); aa.className = "aa";
        aa.appendChild(document.createTextNode("정답 "));
        var ab = document.createElement("b"); ab.textContent = w.ans;
        aa.appendChild(ab);
        row.appendChild(top); row.appendChild(qq); row.appendChild(aa);
        rev.appendChild(row);
      });
    }

    summary = (who ? who + " 님 · " : "") + "토익 인바디 결과\n"
      + code + " " + t.name + "\n" + t.line + "\n"
      + "다음 시험 예상 " + pLo + "–" + pHi + "점 · 인바디 점수 " + score100 + "/100\n"
      + "LC " + lcC + "/" + N_LC + " · RC " + rcC + "/" + N_RC + " · 추측 의존도 " + fat + "%\n"
      + "확신 정답 " + sure + " · 오개념 " + wrongSure + "\n"
      + "— INTO LANGUAGE ACADEMY 토익 인바디";

    cardData = {
      who: who, code: code, type: t, score100: score100, pLo: pLo, pHi: pHi,
      correct: correct, n: N_SCORED, fat: fat, wrongSure: wrongSure,
      lcC: lcC, rcC: rcC, nLC: N_LC, nRC: N_RC,
      sections: sectionRows, cross: CROSS, recent: recentScore, first: firstScore
    };

    setText("shTitle", t.name);
    setText("shRange", pLo + "–" + pHi);
    el("shB1").style.width = pctL + "%";
    el("shB2").style.width = pctM + "%";
    el("shB3").style.width = pctP + "%";

    runReveal(score100, pLo, pHi, fills);
  }

  /* ---------- 연출 ---------- */
  var CALC_LINES = [
    "응답 데이터 정렬",
    "확신도 교차 분석",
    "청해 · 독해 균형 산출",
    "추측 의존도 계산",
    "예상 점수 구간 추정",
    "체형 판정"
  ];

  function runReveal(score100, pLo, pHi, fills) {
    calcTimers.forEach(window.clearTimeout);
    calcTimers = [];
    vResult.classList.remove("go");

    var box = el("calcLines");
    box.textContent = "";
    CALC_LINES.forEach(function (txt, i) {
      var d = document.createElement("div");
      d.className = "ln";
      var b = document.createElement("b"); b.textContent = pad(i + 1);
      var s = document.createElement("span"); s.textContent = txt;
      d.appendChild(b); d.appendChild(s);
      box.appendChild(d);
    });

    function reveal() {
      show("result");
      window.scrollTo(0, 0);
      vResult.classList.add("go");
      if (reduced) {
        setText("rScore", score100);
        paintRange(pLo, pHi);
        fills.forEach(function (f) { f.node.style.width = f.pct + "%"; });
      } else {
        countUp("rScore", 0, score100, 900, 300);
        countRange(pLo, pHi, 1000, 450);
        window.setTimeout(function () {
          fills.forEach(function (f) { f.node.style.width = f.pct + "%"; });
        }, 500);
      }
      syncSaveBox();
    }

    if (reduced) { reveal(); return; }

    show("calc");
    window.scrollTo(0, 0);
    var lines = box.children, i;
    for (i = 0; i < lines.length; i++) {
      (function (node, idx) {
        calcTimers.push(window.setTimeout(function () { node.classList.add("on"); }, 180 + idx * 330));
      })(lines[i], i);
    }
    calcTimers.push(window.setTimeout(reveal, 180 + CALC_LINES.length * 330 + 420));
  }

  function paintRange(lo, hi) {
    var pr = el("pRange");
    pr.textContent = "";
    pr.appendChild(document.createTextNode(lo + " – " + hi));
    var sm = document.createElement("small");
    sm.textContent = " 점";
    pr.appendChild(sm);
  }

  function countUp(id, from, to, dur, delay) {
    window.setTimeout(function () {
      var t1 = Date.now();
      function frame() {
        var k = Math.min(1, (Date.now() - t1) / dur);
        var e = 1 - Math.pow(1 - k, 3);
        setText(id, Math.round(from + (to - from) * e));
        if (k < 1) { window.requestAnimationFrame(frame); }
      }
      frame();
    }, delay || 0);
  }

  function countRange(lo, hi, dur, delay) {
    window.setTimeout(function () {
      var t1 = Date.now();
      function frame() {
        var k = Math.min(1, (Date.now() - t1) / dur);
        var e = 1 - Math.pow(1 - k, 3);
        paintRange(Math.round(lo * e), Math.round(hi * e));
        if (k < 1) { window.requestAnimationFrame(frame); }
        else { paintRange(lo, hi); }
      }
      frame();
    }, delay || 0);
  }

  /* ---------- 결과지 캔버스 ---------- */
  function buildCard() {
    var W = 1080, H = 1760;
    var cv = document.createElement("canvas");
    cv.width = W; cv.height = H;
    var x = cv.getContext("2d");
    var d = cardData;

    var bg = x.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, "#160E33");
    bg.addColorStop(.45, "#0B0620");
    bg.addColorStop(1, "#06030F");
    x.fillStyle = bg;
    x.fillRect(0, 0, W, H);

    function text(s, px, py, size, color, font, align) {
      x.fillStyle = color;
      x.font = size + "px " + (font || '"IBM Plex Sans KR", sans-serif');
      x.textAlign = align || "left";
      x.fillText(s, px, py);
    }
    function rr(px, py, w, h, r) {
      x.beginPath();
      x.moveTo(px + r, py);
      x.arcTo(px + w, py, px + w, py + h, r);
      x.arcTo(px + w, py + h, px, py + h, r);
      x.arcTo(px, py + h, px, py, r);
      x.arcTo(px, py, px + w, py, r);
      x.closePath();
    }
    function box(px, py, w, h, stroke) {
      rr(px, py, w, h, 10);
      x.fillStyle = "rgba(29,20,66,.85)";
      x.fill();
      x.strokeStyle = stroke;
      x.lineWidth = 2;
      x.stroke();
    }

    var M = 72, y = 0;

    text("INTO LANGUAGE ACADEMY", M, 86, 24, "#3BE7FF", '"IBM Plex Mono", monospace');
    var dt = new Date();
    text(dt.getFullYear() + "." + pad(dt.getMonth() + 1) + "." + pad(dt.getDate()), W - M, 86, 24, "#ADA0DC", '"IBM Plex Mono", monospace', "right");
    text("토익 인바디", M, 180, 74, "#EEF3FF", '"Black Han Sans", sans-serif');

    x.strokeStyle = "#3B2A7D"; x.lineWidth = 2;
    x.beginPath(); x.moveTo(M, 218); x.lineTo(W - M, 218); x.stroke();

    y = 288;
    text(d.who ? d.who + " 님의 토익 체형" : "당신의 토익 체형", W / 2, y, 30, "#ADA0DC", null, "center");
    y += 86;
    text(d.type.name, W / 2, y, 76, "#FFFFFF", '"Black Han Sans", sans-serif', "center");
    y += 52;
    text(d.code + " · 8가지 체형 중 하나", W / 2, y, 28, "#3BE7FF", '"IBM Plex Mono", monospace', "center");
    y += 54;
    text(d.type.line, W / 2, y, 28, "#FFC53D", null, "center");

    y = 530;
    box(M, y, W - M * 2, 196, "#3BE7FF");
    text("다음 시험 예상 구간", W / 2, y + 52, 26, "#3BE7FF", '"IBM Plex Mono", monospace', "center");
    text(d.pLo + " – " + d.pHi, W / 2, y + 134, 76, "#FFFFFF", '"IBM Plex Mono", monospace', "center");

    y += 232;
    var cols = [
      { v: d.correct + "/" + d.n, k: "정답", c: "#3BE7FF" },
      { v: d.fat + "%", k: "추측 의존도", c: "#FF57A8" },
      { v: String(d.wrongSure), k: "오개념", c: "#FFC53D" },
      { v: d.score100 + "/100", k: "인바디 점수", c: "#5BFFB0" }
    ];
    var cw = (W - M * 2 - 30) / 4;
    cols.forEach(function (c, i) {
      var px = M + i * (cw + 10);
      box(px, y, cw, 150, "#3B2A7D");
      text(c.v, px + cw / 2, y + 68, 40, c.c, '"IBM Plex Mono", monospace', "center");
      text(c.k, px + cw / 2, y + 112, 23, "#ADA0DC", null, "center");
    });

    y += 212;
    text("영역별 정답률", M, y, 30, "#3BE7FF", '"IBM Plex Mono", monospace');
    y += 28;
    d.sections.forEach(function (s) {
      y += 62;
      text(s.name, M, y, 27, "#F3EFFF");
      text(s.ok + "/" + s.n, W - M, y, 27, "#F3EFFF", '"IBM Plex Mono", monospace', "right");
      rr(M, y + 14, W - M * 2 - 90, 10, 5);
      x.fillStyle = "#1D1442"; x.fill();
      rr(M, y + 14, (W - M * 2 - 90) * (s.pct / 100), 10, 5);
      x.fillStyle = s.pct >= 67 ? "#3BE7FF" : (s.pct >= 34 ? "#FFC53D" : "#FF57A8");
      x.fill();
    });

    y += 108;
    text("확신도 교차 분석", M, y, 30, "#3BE7FF", '"IBM Plex Mono", monospace');
    y += 30;
    var bw = (W - M * 2 - 24) / 3;
    d.cross.forEach(function (c, i) {
      var px = M + (i % 3) * (bw + 12);
      var py = y + Math.floor(i / 3) * 150;
      var col = c.cls === "ok" ? "#5BFFB0" : (c.cls === "bad" ? "#FF57A8" : (c.cls === "warn" ? "#FFC53D" : "#3B2A7D"));
      box(px, py, bw, 134, col);
      text(String(c.v), px + bw / 2, py + 62, 40, col === "#3B2A7D" ? "#F3EFFF" : col, '"IBM Plex Mono", monospace', "center");
      text(c.t1, px + bw / 2, py + 104, 22, "#ADA0DC", null, "center");
    });

    y += 330;
    x.strokeStyle = "#3B2A7D"; x.lineWidth = 2;
    x.beginPath(); x.moveTo(M, y); x.lineTo(W - M, y); x.stroke();
    y += 66;
    text("다시 돌아오지 않을 2026년 연말,", W / 2, y, 38, "#F3EFFF", '"Black Han Sans", sans-serif', "center");
    y += 54;
    text("토익의 맷집을 키우라!", W / 2, y, 38, "#FFC53D", '"Black Han Sans", sans-serif', "center");

    text("본 결과는 14문항 자가 측정 추정치이며 실제 시험 점수를 보장하지 않습니다.", W / 2, H - 52, 20, "#8B7FC0", null, "center");

    return cv;
  }

  function canvasBlob(cv, type) {
    return new Promise(function (resolve, reject) {
      try { cv.toBlob(function (b) { b ? resolve(b) : reject(new Error("blob")); }, type || "image/png"); }
      catch (e) { reject(e); }
    });
  }

  function toast(m) {
    var t = el("toast");
    t.textContent = m;
    t.classList.add("show");
    window.setTimeout(function () { t.classList.remove("show"); }, 2400);
  }

  function saveError(e) {
    var code = (e && e.code) || "";
    if (code === "declined") { return; }
    if (code === "too_large") { toast("파일이 너무 큽니다."); return; }
    toast("저장하지 못했습니다. 화면을 캡처해 주세요.");
  }

  /* 저장 경로는 두 가지.
     claude.ai 안에서는 downloads 기능으로, 일반 웹사이트에서는 브라우저 기본 다운로드로. */
  var downloads = null;
  var inArtifact = !!(window.claude && window.claude.use);
  window.__canSave = !inArtifact;

  function syncSaveBox() {
    var sb = el("saveBox");
    if (sb) { sb.hidden = !window.__canSave; }
  }

  if (inArtifact) {
    window.claude.use("downloads").then(function (d) {
      downloads = d;
      window.__canSave = !!d;
      if (!vResult.hidden) { syncSaveBox(); }
    }, function () { /* 무시 */ });
  }

  function saveFile(filename, blob) {
    if (downloads) { return downloads.save({ filename: filename, data: blob }); }
    return new Promise(function (resolve, reject) {
      var url = "";
      try {
        url = window.URL.createObjectURL(blob);
        var a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.rel = "noopener";
        a.style.display = "none";
        document.body.appendChild(a);
        a.click();
        window.setTimeout(function () {
          try { document.body.removeChild(a); window.URL.revokeObjectURL(url); } catch (e2) { /* 무시 */ }
        }, 1500);
        resolve({ status: "saved" });
      } catch (e) {
        if (url) { try { window.URL.revokeObjectURL(url); } catch (e3) { /* 무시 */ } }
        reject(e);
      }
    });
  }

  function fileBase() {
    var who = cardData && cardData.who ? cardData.who.replace(/[\\/:*?"<>|]/g, "") : "";
    var dt = new Date();
    return "토익인바디_" + (who ? who + "_" : "") + dt.getFullYear() + pad(dt.getMonth() + 1) + pad(dt.getDate());
  }

  async function withFonts(fn) {
    try { if (document.fonts && document.fonts.ready) { await document.fonts.ready; } } catch (e) { /* 무시 */ }
    return fn();
  }

  el("savePng").addEventListener("click", function () {
    if (!cardData) { return; }
    withFonts(function () { return canvasBlob(buildCard(), "image/png"); })
      .then(function (blob) { return saveFile(fileBase() + ".png", blob); })
      .then(function () { toast("결과지를 저장했습니다."); }, saveError);
  });

  el("savePdf").addEventListener("click", function () {
    if (!cardData) { return; }
    var jsPDFns = window.jspdf;
    if (!jsPDFns || !jsPDFns.jsPDF) { toast("PDF 모듈을 불러오지 못했습니다. 이미지로 저장해 주세요."); return; }
    withFonts(function () {
      var cv = buildCard();
      var img = cv.toDataURL("image/jpeg", 0.92);
      var pdf = new jsPDFns.jsPDF({ orientation: "portrait", unit: "pt", format: [595, 970] });
      pdf.setFillColor(6, 3, 15);
      pdf.rect(0, 0, 595, 970, "F");
      pdf.addImage(img, "JPEG", 0, 0, 595, 970);
      return pdf.output("blob");
    })
      .then(function (blob) { return saveFile(fileBase() + ".pdf", blob); })
      .then(function () { toast("PDF로 저장했습니다."); }, saveError);
  });

  /* ---------- controls ---------- */
  function start() {
    answers = {}; habits = []; step = 0; awaitingConf = false; times = {};
    vResult.classList.remove("go");
    t0 = Date.now();
    window.clearInterval(timerId);
    timerId = window.setInterval(tick, 1000);
    tick();
    render();
    show("quiz");
    window.scrollTo(0, 0);
  }

  el("startBtn").addEventListener("click", start);
  el("againBtn").addEventListener("click", function () {
    stopAudio();
    calcTimers.forEach(window.clearTimeout);
    calcTimers = [];
    show("intro");
    window.scrollTo(0, 0);
  });
  el("backBtn").addEventListener("click", function () {
    if (step > 0) { step--; render(); window.scrollTo(0, 0); }
  });

  el("copyBtn").addEventListener("click", function () {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(summary).then(
          function () { toast("결과를 복사했어요"); },
          function () { toast("복사가 막혀 있어요. 화면을 캡처해 주세요"); }
        );
      } else { toast("복사가 막혀 있어요. 화면을 캡처해 주세요"); }
    } catch (e) { toast("복사할 수 없어요"); }
  });

  document.addEventListener("keydown", function (e) {
    if (vQuiz.hidden) { return; }
    var s = STEPS[step], n = parseInt(e.key, 10);
    var opts = el("qOpts").children;
    if (s.kind === "p2") { if (n >= 1 && n <= 3 && opts[0] && !opts[0].disabled) { answerQ(n - 1); } }
    else if (s.kind === "rc") { if (n >= 1 && n <= 4) { answerQ(n - 1); } }
    else if (s.kind === "habit") { if (n >= 1 && n <= 5) { answerHabit(s.hi, n); } }
  });

  window.addEventListener("pagehide", stopAudio);

  render();
  show("intro");
})();
