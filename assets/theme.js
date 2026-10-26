// 다크 모드: 처음엔 기기 설정(휴대폰 · PC의 어두운 화면)을 따르고, 버튼을 누르면 밝게/어둡게 고정해요 (localStorage asc-theme)
(function () {
  const root = document.documentElement, mq = window.matchMedia('(prefers-color-scheme: dark)');
  const saved = () => { try { return localStorage.getItem('asc-theme'); } catch (e) { return null; } };
  const isDark = () => root.dataset.theme ? root.dataset.theme === 'dark' : mq.matches;
  const SUN = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
  const MOON = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 13a9 9 0 1 1-10-10 7 7 0 0 0 10 10z"/></svg>';
  const meta = () => document.querySelector('meta[name=theme-color]');
  function paint() {
    const d = isDark();
    document.querySelectorAll('[data-theme-toggle]').forEach(b => {
      b.innerHTML = d ? SUN : MOON;
      b.title = d ? '밝은 화면으로' : '어두운 화면으로';
      b.setAttribute('aria-pressed', d);
    });
    if (meta()) meta().content = d ? (meta().dataset.dark || '#05072a') : (meta().dataset.light || '#070a3d');
  }
  const s = saved();
  if (s === 'dark' || s === 'light') root.dataset.theme = s;
  window.toggleTheme = () => {
    const next = isDark() ? 'light' : 'dark';
    root.dataset.theme = next;
    try { localStorage.setItem('asc-theme', next); } catch (e) { /* 저장 못 해도 지금 화면은 바뀌어요 */ }
    paint();
  };
  // 설정 화면: 기기 설정(system) · 밝게(light) · 어둡게(dark)
  window.setThemeMode = mode => {
    if (mode === 'dark' || mode === 'light') root.dataset.theme = mode; else delete root.dataset.theme;
    try { if (mode === 'dark' || mode === 'light') localStorage.setItem('asc-theme', mode); else localStorage.removeItem('asc-theme'); } catch (e) { /* 지금 화면만 바뀌어요 */ }
    paint();
  };
  document.addEventListener('click', e => { if (e.target.closest('[data-theme-toggle]')) window.toggleTheme(); });
  mq.addEventListener && mq.addEventListener('change', paint);
  window.paintTheme = paint;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', paint); else paint();
})();
