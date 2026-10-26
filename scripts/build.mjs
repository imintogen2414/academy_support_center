// 배포용 dist/ 폴더를 만들어요.
// 1) 화면 파일을 그대로 복사  2) supabase-js 브라우저 파일 복사
// 3) Vercel 환경변수로 assets/env.js 생성 — 키는 코드에 쓰지 않고 여기서만 넣어요.
// 4) 분야 페이지 · robots.txt · sitemap.xml
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const out = 'dist';
rmSync(out, { recursive: true, force: true });
mkdirSync(out);

for (const f of ['index.html', 'app.html', 'login.html', 'service.html']) cpSync(f, `${out}/${f}`);
cpSync('assets', `${out}/assets`, { recursive: true });

mkdirSync(`${out}/assets/vendor`, { recursive: true });
cpSync('node_modules/@supabase/supabase-js/dist/umd/supabase.js', `${out}/assets/vendor/supabase.js`);

// 4) 검색 노출: 분야마다 제목 · 설명이 들어간 페이지(/area/admin → area/admin.html, vercel.json이 이어 줘요) + robots.txt · sitemap.xml
const SITE = 'https://academysupportcenter.vercel.app';
const { SITE_AREAS } = runInNewContext(readFileSync('assets/areas.js', 'utf8') + ';({ SITE_AREAS })', {});
const strip = s => String(s).replace(/<br\s*\/?>/g, ' ').replace(/<[^>]+>/g, '').replace(/"/g, '&quot;');
const home = readFileSync('index.html', 'utf8');
const homeTitle = home.match(/<title>(.*?)<\/title>/)[1], homeDesc = home.match(/<meta name="description" content="(.*?)">/)[1];
mkdirSync(`${out}/area`);
for (const a of SITE_AREAS) {
  const title = `${a.name} | 학원지원센터`, desc = `${strip(a.title)} — ${strip(a.lede)}`, url = `${SITE}/area/${a.id}`;
  const page = home.split(`<title>${homeTitle}</title>`).join(`<title>${title}</title>`)
    .split(`content="${homeTitle}"`).join(`content="${title}"`)
    .split(`content="${homeDesc}"`).join(`content="${desc}"`)
    .replace(`<meta property="og:url" content="${SITE}/">`, `<meta property="og:url" content="${url}">`)
    .replace(`<link rel="canonical" href="${SITE}/">`, `<link rel="canonical" href="${url}">`);
  writeFileSync(`${out}/area/${a.id}.html`, page);
}
writeFileSync(`${out}/robots.txt`, `User-agent: *\nAllow: /\nDisallow: /app\nDisallow: /app.html\nDisallow: /demo/\n\nSitemap: ${SITE}/sitemap.xml\n`);
const today = new Date().toISOString().slice(0, 10);
writeFileSync(`${out}/sitemap.xml`, `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${['/', ...SITE_AREAS.map(a => `/area/${a.id}`)].map(p => `  <url><loc>${SITE}${p}</loc><lastmod>${today}</lastmod></url>`).join('\n')}
</urlset>
`);

const env = {
  SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  SUPABASE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || ''
};
if (!env.SUPABASE_URL || !env.SUPABASE_KEY) {
  console.warn('[build] Supabase 환경변수가 없어요. 로그인·신청 저장 없이 데모로만 동작해요.');
}
writeFileSync(`${out}/assets/env.js`, `// 빌드할 때 자동으로 만들어지는 파일이에요. 직접 고치지 마세요.\nwindow.ENV = ${JSON.stringify(env)};\n`);
console.log('[build] dist/ 준비 완료');
