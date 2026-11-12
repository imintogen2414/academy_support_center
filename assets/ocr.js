/* ---------- 사진 무료로 읽기 (시간표 · 수강료표) ----------
   사진을 서버로 보내지 않고 이 기기 브라우저 안에서 글자를 읽어요(Tesseract.js 7, Apache-2.0 · 한글 + 영어 글자 파일).
   처음 한 번 글자 파일(약 2MB)과 읽는 프로그램(약 4MB)을 받고, 다음부터는 브라우저에 남아 있어 바로 읽어요.
   읽은 글자에서 규칙으로 줄을 만들어요(ocrRows): 시간표는 "반 · 요일 · 시간" 한 줄짜리 목록과 요일이 위에 있는 격자표, 수강료표는 "이름 · 금액" 줄.
   틀리면 화면에서 "AI로 더 정확하게 읽기"(Edge Function read-photo)로 다시 읽어요. 파일은 빌드가 assets/vendor/tess/에 복사해요. */
let TESS = null, TESS_WORKER = null, OCR_PROG = null;
function loadTess() {
  if (TESS) return TESS;
  TESS = new Promise((ok, no) => {
    const s = document.createElement('script');
    s.src = '/assets/vendor/tess/tesseract.min.js';
    s.onload = () => window.Tesseract ? ok(window.Tesseract) : no(new Error('ocr_load'));
    s.onerror = () => { TESS = null; no(new Error('ocr_load')); };
    document.head.appendChild(s);
  });
  return TESS;
}
async function ocrWorker() {
  const T = await loadTess();
  if (!TESS_WORKER) TESS_WORKER = T.createWorker(['kor', 'eng'], 1, {
    workerPath: '/assets/vendor/tess/worker.min.js', corePath: '/assets/vendor/tess', langPath: '/assets/vendor/tess/lang',
    logger: m => { if (OCR_PROG) OCR_PROG(m); }
  }).catch(e => { TESS_WORKER = null; throw e; });
  return TESS_WORKER;
}
// 사진(data URL) → { rows, note, text, lines }
// 사진을 2배 · 흑백으로 다듬고 표 줄을 지운 뒤, "한 덩어리 글"로 읽어요(psm 6). 결과가 약하면 "흩어진 글"로도 읽어(psm 11) 나은 쪽을 써요.
async function ocrRead(kind, image, onProg) {
  OCR_PROG = onProg || null;
  try {
    const w = await ocrWorker(), pre = await ocrPrep(image);
    const once = async psm => {
      await w.setParameters({ tessedit_pageseg_mode: psm, preserve_interword_spaces: '1' });
      const { data } = await w.recognize(pre, {}, { text: true, blocks: true });
      const lines = ocrLines(data);
      return { rows: kind === 'timetable' ? ttFromOcr(lines) : feeFromOcr(lines), text: (data.text || '').slice(0, 4000), lines: lines.length };
    };
    // 두 방식으로 읽고 점수가 높은 쪽: 확실한 줄 2점 · 짐작한 줄 1점 · 이름에 한글이 있으면 1점 더
    const score = r => r.rows.reduce((a, x) => a + (x.unsure ? 1 : 2) + (/[가-힣]/.test(x.class_name || x.name || '') ? 1 : 0), 0);
    let best = await once('6');
    const alt = await once('11');
    if (score(alt) > score(best)) best = alt;
    return { ...best, note: best.rows.length ? '' : '무료로는 표를 찾지 못했어요.' };
  } finally { OCR_PROG = null; }
}
// 사진 다듬기: 2배(긴 쪽 3200px까지) · 흑백 · 표 줄(긴 가로 · 세로 선) 지우기 — 표 줄이 있으면 글자를 거의 못 읽어서요
async function ocrPrep(src, scale = 2) {
  const im = new Image(); im.src = src; await im.decode();
  const k = Math.min(scale, 3200 / Math.max(im.width, im.height));
  const c = document.createElement('canvas'); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
  const x = c.getContext('2d'); x.filter = 'grayscale(1)'; x.drawImage(im, 0, 0, c.width, c.height); x.filter = 'none';
  const W = c.width, H = c.height, d = x.getImageData(0, 0, W, H), p = d.data;
  let sum = 0; for (let i = 0; i < p.length; i += 4) sum += p[i];
  const th = Math.min(170, (sum / (p.length / 4)) * 0.75);
  const dark = new Uint8Array(W * H); for (let i = 0, j = 0; i < p.length; i += 4, j++) dark[j] = p[i] < th ? 1 : 0;
  const kill = new Uint8Array(W * H), minH = Math.max(40, W * 0.06), minV = Math.max(40, H * 0.06);
  for (let y = 0; y < H; y++) { let run = 0; for (let xx = 0; xx <= W; xx++) { if (xx < W && dark[y * W + xx]) run++; else { if (run >= minH) for (let r = xx - run; r < xx; r++) kill[y * W + r] = 1; run = 0; } } }
  for (let xx = 0; xx < W; xx++) { let run = 0; for (let y = 0; y <= H; y++) { if (y < H && dark[y * W + xx]) run++; else { if (run >= minV) for (let r = y - run; r < y; r++) kill[r * W + xx] = 1; run = 0; } } }
  for (let j = 0; j < W * H; j++) { const v = kill[j] ? 255 : dark[j] ? 0 : 255; p[j * 4] = p[j * 4 + 1] = p[j * 4 + 2] = v; }
  x.putImageData(d, 0, 0);
  return c.toDataURL('image/png');
}
// 낱말 잇기: 한글은 글자마다 따로 나와서, 사이가 좁으면 붙이고 넓으면 띄어요
const joinWords = ws => { const s = [...ws].sort((a, b) => a.x0 - b.x0); return s.map((w, i) => (i && w.x0 - s[i - 1].x1 > 0.25 * Math.max(10, (w.h + s[i - 1].h) / 2) ? ' ' : '') + w.text).join(''); };
// 블록 → 줄 [{ text, words: [{ text, x, y, w, h, c }], y }]
function ocrLines(data) {
  const out = [];
  (data.blocks || []).forEach(b => (b.paragraphs || []).forEach(p => (p.lines || []).forEach(l => {
    const words = (l.words || []).filter(w => w.text && w.text.trim() && (w.confidence > 35 || (w.confidence > 10 && /[가-힣]/.test(w.text))))
      .map(w => ({ text: ocrNorm(w.text), x: (w.bbox.x0 + w.bbox.x1) / 2, x0: w.bbox.x0, x1: w.bbox.x1, y: (w.bbox.y0 + w.bbox.y1) / 2, h: w.bbox.y1 - w.bbox.y0, c: w.confidence }));
    if (words.length) out.push({ text: ocrNorm(joinWords(words)), words, y: (l.bbox.y0 + l.bbox.y1) / 2, h: l.bbox.y1 - l.bbox.y0 });
  })));
  return out.sort((a, b) => a.y - b.y);
}
const ocrNorm = s => String(s).replace(/(^|\s)급(?=\s|$)/g, '$1금').replace(/[～〜∼]/g, '~').replace(/[：]/g, ':').replace(/[－—–]/g, '-').replace(/[|｜]/g, ' ').replace(/\s+/g, ' ').trim();
const WD_CH = '일월화수목금토';
const pad2 = n => String(n).padStart(2, '0');
const addMin = (t, m) => { const [h, mm] = t.split(':').map(Number), v = Math.min(23 * 60 + 55, h * 60 + mm + m); return `${pad2(Math.floor(v / 60))}:${pad2(v % 60)}`; };
// 글 안의 시간들: 15:00 · 3시 20분 · 오후 3시 · 3시반
function ocrTimes(s) {
  const out = [], re = /(오전|오후|AM|PM|am|pm)?\s*(\d{1,2})\s*(?::\s*(\d{2})|시\s*(?:(\d{1,2})\s*분|(반))?)/g;
  let m;
  while ((m = re.exec(s))) {
    let h = +m[2]; const min = m[3] != null ? +m[3] : m[4] != null ? +m[4] : m[5] ? 30 : 0, ap = (m[1] || '').toLowerCase();
    if (h > 24 || min > 59) continue;
    let guess = false;
    if ((ap === '오후' || ap === 'pm') && h < 12) h += 12;
    else if (!ap && h >= 1 && h <= 9) { h += 12; guess = true; } // 학원 수업은 보통 오후
    out.push({ t: `${pad2(h)}:${pad2(min)}`, at: m.index, end: m.index + m[0].length, guess });
  }
  return out;
}
// 요일 묶음: 월수금 · 화/목 · 월~금 · 월요일
function ocrDays(s) {
  const days = new Set(), spans = [];
  const range = /([월화수목금토일])\s*[~-]\s*([월화수목금토일])(?:요일)?/g;
  let m;
  while ((m = range.exec(s))) {
    let a = WD_CH.indexOf(m[1]), b = WD_CH.indexOf(m[2]);
    if (a === 0) a = 7; if (b === 0) b = 7;
    for (let d = a; d <= b; d++) days.add(d % 7);
    spans.push([m.index, m.index + m[0].length]);
  }
  const group = /(^|[\s(,/·])((?:[월화수목금토일](?:요일)?[,/·\s]?){1,7})(?=$|[\s),])/g;
  while ((m = group.exec(s))) {
    const g = m[2], at = m.index + m[1].length;
    if (spans.some(([a, b]) => at < b && at + g.length > a)) continue;
    const chs = g.replace(/요일/g, '').replace(/[,/·\s]/g, '');
    if (!chs || !/^[월화수목금토일]+$/.test(chs) || new Set(chs).size !== chs.length) continue;
    [...chs].forEach(c => days.add(WD_CH.indexOf(c)));
    spans.push([at, at + g.length]);
  }
  return { days: [...days].sort((a, b) => (a || 7) - (b || 7)), spans };
}
const cutSpans = (s, spans) => { let out = s; [...spans].sort((a, b) => b[0] - a[0]).forEach(([a, b]) => { out = out.slice(0, a) + ' ' + out.slice(b); }); return out; };
// 한글 띄어쓰기 다듬기: "주 2 회" → "주2회", "내 신반" → "내신반"(한 글자만 떨어져 나온 것은 뒤에 붙여요)
const tidyKo = s => s.replace(/(^|\s)([가-힣]?)\s?(\d{1,2})\s(회|시간|일|개월|학년|반)(?=\s|$)/g, '$1$2$3$4')
  .replace(/(^|\s)([가-힣])\s(?=[가-힣]{1,3}(\s|$))/g, '$1$2');
const cleanName = s => tidyKo(s).replace(/^[^0-9A-Za-z가-힣]+/, '').replace(/[~\-:,()[\]{}·/]+/g, ' ').replace(/\b(요일|시간|수업|부터|까지)\b/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 50);

// 시간표: 한 줄짜리 목록("초등A반 월수금 15:00~16:20 영어")이 먼저, 안 되면 요일이 위에 늘어선 격자표
// 글자 인식이 낱말로 나눠 준 것을 써요: 요일 낱말 · 시간 낱말을 빼고, 시간 앞은 반 이름 · 뒤는 과목
const dayWord = t => {
  const s = t.replace(/요일/g, '').replace(/[,/·()]/g, '');
  const r = s.match(/^([월화수목금토일])[~-]([월화수목금토일])$/);
  if (r) { let a = WD_CH.indexOf(r[1]), b = WD_CH.indexOf(r[2]); if (!a) a = 7; if (!b) b = 7; const o = []; for (let d = a; d <= b; d++) o.push(d % 7); return o; }
  return /^[월화수목금토일]{1,7}$/.test(s) && new Set(s).size === s.length ? [...s].map(c => WD_CH.indexOf(c)) : null;
};
function ttFromOcr(lines) {
  const list = [];
  lines.forEach(l => {
    const ts = ocrTimes(l.text);
    if (!ts.length) return;
    const days = new Set(), keep = [];
    let tw = null;
    l.words.forEach(w => {
      const d = dayWord(w.text);
      if (d) { d.forEach(x => days.add(x)); return; }
      if (ocrTimes(w.text).length) { if (!tw) tw = w; return; }
      if (/^[~\-:.]+$/.test(w.text) || /^(오전|오후|AM|PM|am|pm|부터|까지|매주)$/.test(w.text)) return;
      keep.push(w);
    });
    // "초등A반화목"처럼 붙어 나오면 끝의 요일 글자를 떼요
    if (!days.size) keep.forEach(w => { const m = w.text.match(/^(.*[^월화수목금토일])([월화수목금토일]{2,7})$/); if (m && new Set(m[2]).size === m[2].length) { [...m[2]].forEach(c => days.add(WD_CH.indexOf(c))); w.text = m[1]; } });
    if (!days.size) ocrDays(l.text).days.forEach(d => days.add(d));
    if (!days.size) return;
    const before = keep.filter(w => !tw || w.x1 <= tw.x0 + 4), after = keep.filter(w => tw && w.x1 > tw.x0 + 4);
    const cls = cleanName(joinWords(before)) || cleanName(joinWords(after)), subj = before.length ? cleanName(joinWords(after)) : '';
    if (!cls) return;
    const start = ts[0], end = ts[1];
    [...days].sort((a, b) => (a || 7) - (b || 7)).forEach(d => list.push({ class_name: cls, weekday: d, start_time: start.t, end_time: end ? end.t : addMin(start.t, 50),
      subject: subj, room: '', teacher_name: '', unsure: !end || start.guess || !!(end && end.guess) || !!(end && end.t <= start.t) || !/[가-힣]/.test(cls) }));
  });
  if (list.length) return list;
  return ttGrid(lines);
}
function ttGrid(lines) {
  // 요일 머리줄: 요일 글자가 3개 이상 따로 있는 줄
  const isDay = t => /^[월화수목금토일](요일)?$/.test(t.replace(/[()]/g, ''));
  const head = lines.find(l => l.words.filter(w => isDay(w.text)).length >= 3);
  if (!head) return [];
  const cols = head.words.filter(w => isDay(w.text)).map(w => ({ d: WD_CH.indexOf(w.text.replace(/[()]/g, '')[0]), x: w.x, x0: w.x0 })).sort((a, b) => a.x - b.x);
  const colW = cols.length > 1 ? (cols[cols.length - 1].x - cols[0].x) / (cols.length - 1) : 200;
  const leftEdge = cols[0].x - colW / 2;
  // 왼쪽 시간 칸
  const slots = [];
  lines.filter(l => l.y > head.y).forEach(l => {
    const left = l.words.filter(w => w.x1 < leftEdge + colW * 0.2);
    const ts = ocrTimes(left.map(w => w.text).join(' '));
    if (ts.length) slots.push({ y: l.y, start: ts[0].t, end: ts[1] ? ts[1].t : null, guess: ts[0].guess });
  });
  if (!slots.length) return [];
  slots.sort((a, b) => a.y - b.y);
  slots.forEach((s, i) => { if (!s.end) s.end = slots[i + 1] && slots[i + 1].start > s.start ? slots[i + 1].start : addMin(s.start, 50); });
  const cells = {};
  lines.filter(l => l.y > head.y - head.h / 2).forEach(l => l.words.forEach(w => {
    if (w.x < leftEdge || isDay(w.text) || ocrTimes(w.text).length) return;
    const col = cols.reduce((a, c) => Math.abs(c.x - w.x) < Math.abs(a.x - w.x) ? c : a);
    if (Math.abs(col.x - w.x) > colW * 0.6) return;
    let si = -1; slots.forEach((s, i) => { if (s.y - Math.max(l.h, 12) <= w.y) si = i; });
    if (si < 0) return;
    const k = `${col.d}:${si}`; (cells[k] ||= []).push(w);
  }));
  return Object.entries(cells).map(([k, ws]) => {
    const [d, si] = k.split(':').map(Number), s = slots[si], name = cleanName(joinWords(ws));
    return name ? { class_name: name, weekday: d, start_time: s.start, end_time: s.end, subject: '', room: '', teacher_name: '', unsure: true } : null;
  }).filter(Boolean).sort((a, b) => (a.weekday || 7) - (b.weekday || 7) || a.start_time.localeCompare(b.start_time));
}

// 수강료표: 금액(300,000원 · 30만원 · 30만 5천원)을 찾고 그 앞 글을 이름으로
function ocrMoney(s) {
  const out = [], re = /(\d{1,3}(?:[,.]\d{3})+|\d{4,7})\s*원?|(\d{1,4}(?:\.\d)?)\s*만\s*(?:(\d)\s*천)?\s*원?/g;
  let m;
  while ((m = re.exec(s))) {
    const v = m[1] ? +m[1].replace(/[,.]/g, '') : Math.round(+m[2] * 10000 + (m[3] ? +m[3] * 1000 : 0));
    if (v >= 10000 && v <= 5000000) out.push({ v, at: m.index, end: m.index + m[0].length });
  }
  return out;
}
function feeFromOcr(lines) {
  const rows = [];
  lines.forEach((l, li) => {
    const ms = ocrMoney(l.text);
    if (!ms.length) return;
    const label = cleanName(l.text.slice(0, ms[0].at));
    const tail = l.text.slice(ms[ms.length - 1].end).replace(/^[\s,(]+|[\s)]+$/g, '').trim().slice(0, 200);
    ms.forEach((m, i) => {
      let name = i === 0 ? label : cleanName(l.text.slice(ms[i - 1].end, m.at)) || label;
      // 격자표: 같은 세로줄 위쪽 머리 글(주 2회 · 주 3회 …)을 붙여요
      if (ms.length > 1) {
        const mx = moneyX(l, m);
        const headLine = lines.slice(0, li).reverse().find(h => !ocrMoney(h.text).length && h.words.length >= 2);
        if (mx != null && headLine) {
          const hw = headLine.words.reduce((a, w) => Math.abs(w.x - mx) < Math.abs(a.x - mx) ? w : a);
          if (hw && !name.includes(hw.text)) name = cleanName(`${label} ${hw.text}`);
        }
      }
      rows.push({ name, amount: m.v, class_name: '', memo: i === ms.length - 1 ? tail : '', unsure: !name || ms.length > 1 });
    });
  });
  return rows;
}
// 금액이 줄의 어느 가로 위치에 있는지 (글자 위치로 낱말을 찾아요)
function moneyX(l, m) {
  let pos = 0;
  for (const w of l.words) { const s = l.text.indexOf(w.text, pos); if (s < 0) continue; if (s <= m.at + 1 && s + w.text.length >= m.at) return w.x; pos = s + w.text.length; }
  return null;
}
// 무료 결과가 쓸 만한지: 줄이 있고 "확인 필요"가 절반 아래
const ocrGood = rows => rows.length > 0 && rows.filter(r => r.unsure).length / rows.length < 0.5;
if (typeof module !== 'undefined') module.exports = { ttFromOcr, feeFromOcr, ocrTimes, ocrDays, ocrMoney, ocrGood };
