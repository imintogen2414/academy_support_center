// Supabase 연결 — 키는 빌드 때 환경변수로 만든 assets/env.js(window.ENV)에서 받아요.
// 환경변수가 없으면(로컬에서 그냥 열 때) SB는 null이고, 화면은 데모로만 동작해요.
// 로그인 유지하기: 켜면(기본) 브라우저를 닫아도 로그인이 남고(localStorage), 끄면 창을 닫을 때 로그아웃돼요(sessionStorage).
const KEEP_KEY = 'asc-keep-login';
const keepLogin = () => { try { return localStorage.getItem(KEEP_KEY) !== '0'; } catch { return true; } };
const setKeepLogin = on => { try { localStorage.setItem(KEEP_KEY, on ? '1' : '0'); } catch {} };
const authStore = {
  getItem: k => { try { return (keepLogin() ? localStorage : sessionStorage).getItem(k); } catch { return null; } },
  setItem: (k, v) => { try { (keepLogin() ? localStorage : sessionStorage).setItem(k, v); } catch {} },
  removeItem: k => { try { localStorage.removeItem(k); sessionStorage.removeItem(k); } catch {} }
};
const SB = (window.ENV && ENV.SUPABASE_URL && ENV.SUPABASE_KEY && window.supabase)
  // pkce: 구글 로그인 후 주소에 #토큰 대신 ?code= 로 돌아와서, 화면 주소(#home 같은 해시)와 부딪히지 않아요
  ? supabase.createClient(ENV.SUPABASE_URL, ENV.SUPABASE_KEY, { auth: { flowType: 'pkce', storage: authStore } })
  : null;

/* 계정 전환: 이 기기에서 로그인한 계정을 기억해 두고(localStorage asc-accounts, 최대 10개) 비밀번호 없이 바꿔요.
   "로그인 유지하기"를 켠 계정만 기억해요. 기억하는 건 이름 · 역할 · 다시 로그인용 refresh token이에요(Supabase가 원래 이 기기에 두는 것과 같은 값).
   지금 계정의 토큰은 바꾸기 직전에 새로 저장해서, 다른 계정으로 갈 때 옛 토큰을 다시 쓰지 않아요. */
const ACC_KEY = 'asc-accounts';
const savedAccounts = () => { try { return JSON.parse(localStorage.getItem(ACC_KEY) || '[]'); } catch { return []; } };
const putAccounts = list => { try { localStorage.setItem(ACC_KEY, JSON.stringify(list.slice(0, 10))); } catch {} };
const forgetAccount = id => putAccounts(savedAccounts().filter(a => a.id !== id));
async function rememberAccount(info, uid) {
  if (!SB || !keepLogin()) return;
  const { data } = await SB.auth.getSession(), s = data && data.session;
  if (!s || (uid && s.user.id !== uid)) return; // 지금 화면의 사람과 로그인이 다르면 (다른 탭에서 바꿈) 저장하지 않아요
  const old = savedAccounts().find(a => a.id === s.user.id) || {};
  putAccounts([{ ...old, ...info, id: s.user.id, rt: s.refresh_token, at: Date.now() }, ...savedAccounts().filter(a => a.id !== s.user.id)]);
}
// 이 창의 로그인만 지워요 (서버의 로그인은 그대로라 저장한 계정으로 다시 돌아올 수 있어요)
const clearLocalSession = () => { try { [localStorage, sessionStorage].forEach(st => Object.keys(st).filter(k => /^sb-.*-auth-token/.test(k)).forEach(k => st.removeItem(k))); } catch {} };
async function switchAccount(id) {
  const a = savedAccounts().find(x => x.id === id);
  if (!a || !SB) return false;
  const { data, error } = await SB.auth.refreshSession({ refresh_token: a.rt });
  if (error || !data.session) { forgetAccount(id); return false; }
  putAccounts(savedAccounts().map(x => x.id === id ? { ...x, rt: data.session.refresh_token, at: Date.now() } : x));
  return true;
}

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
