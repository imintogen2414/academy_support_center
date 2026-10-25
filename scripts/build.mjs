// 배포용 dist/ 폴더를 만들어요.
// 1) 화면 파일을 그대로 복사  2) supabase-js 브라우저 파일 복사
// 3) Vercel 환경변수로 assets/env.js 생성 — 키는 코드에 쓰지 않고 여기서만 넣어요.
import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';

const out = 'dist';
rmSync(out, { recursive: true, force: true });
mkdirSync(out);

for (const f of ['index.html', 'app.html', 'login.html', 'service.html']) cpSync(f, `${out}/${f}`);
cpSync('assets', `${out}/assets`, { recursive: true });

mkdirSync(`${out}/assets/vendor`, { recursive: true });
cpSync('node_modules/@supabase/supabase-js/dist/umd/supabase.js', `${out}/assets/vendor/supabase.js`);

const env = {
  SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  SUPABASE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || ''
};
if (!env.SUPABASE_URL || !env.SUPABASE_KEY) {
  console.warn('[build] Supabase 환경변수가 없어요. 로그인·신청 저장 없이 데모로만 동작해요.');
}
writeFileSync(`${out}/assets/env.js`, `// 빌드할 때 자동으로 만들어지는 파일이에요. 직접 고치지 마세요.\nwindow.ENV = ${JSON.stringify(env)};\n`);
console.log('[build] dist/ 준비 완료');
