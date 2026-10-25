// Supabase 연결 — 키는 빌드 때 환경변수로 만든 assets/env.js(window.ENV)에서 받아요.
// 환경변수가 없으면(로컬에서 그냥 열 때) SB는 null이고, 화면은 데모로만 동작해요.
const SB = (window.ENV && ENV.SUPABASE_URL && ENV.SUPABASE_KEY && window.supabase)
  // pkce: 구글 로그인 후 주소에 #토큰 대신 ?code= 로 돌아와서, 화면 주소(#home 같은 해시)와 부딪히지 않아요
  ? supabase.createClient(ENV.SUPABASE_URL, ENV.SUPABASE_KEY, { auth: { flowType: 'pkce' } })
  : null;

// 아이디 로그인: Supabase는 이메일로 로그인하므로, 아이디를 내부용 이메일로 바꿔서 써요.
// (이 주소로 메일을 보내지 않아요. Supabase에서 "Confirm email"을 꺼 두어야 해요.)
const ID_DOMAIN = 'id.academysupportcenter.app';
const idToEmail = id => `${id.trim().toLowerCase()}@${ID_DOMAIN}`;
const ID_RULE = /^[a-z0-9_]{4,20}$/;

// Supabase 오류를 원장님이 읽을 수 있는 말로
function authErrorText(e) {
  const m = (e && e.message) || '';
  if (/Invalid login credentials/i.test(m)) return '아이디 또는 비밀번호가 맞지 않아요.';
  if (/already registered|already exists/i.test(m)) return '이미 쓰고 있는 아이디예요. 다른 아이디를 골라 주세요.';
  if (/Password should be/i.test(m)) return '비밀번호는 8자 이상으로 정해 주세요.';
  if (/Email not confirmed/i.test(m)) return '가입 확인이 아직 안 됐어요. 센터에 문의해 주세요.';
  if (/provider is not enabled/i.test(m)) return '구글 로그인이 아직 준비 중이에요.';
  if (/rate limit/i.test(m)) return '잠시 후 다시 시도해 주세요.';
  return '문제가 생겼어요. 잠시 후 다시 시도해 주세요.';
}
