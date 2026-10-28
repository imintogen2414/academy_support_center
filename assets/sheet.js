// 엑셀(.xlsx) · 넘버스(.numbers) · CSV 읽기와 양식 만들기.
// readSheet(file) → 첫 번째 시트의 행 목록 [[칸, 칸, …], …] (칸은 모두 글자, 날짜는 YYYY-MM-DD)
// readBook(file) → 모든 시트 [{ name, rows }] (넘버스처럼 달마다 시트가 있는 파일에서 고르기)
// downloadXlsx(파일 이름, 행 목록, 칸 너비, 옵션) → 보기 좋게 꾸민 표 다운로드
// downloadBook(파일 이름, 시트들) → 칸 위치 · 합치기 · 수식까지 정한 양식(재정 보고서 · 수강생 관리표) 다운로드
// 받을 때 형식(.xlsx / .numbers)은 window.pickSheetFormat(파일 이름)이 정해요(app.js가 물어봐요).
// 엑셀 · CSV는 브라우저 기능만으로, 넘버스는 그때만 SheetJS(assets/vendor/xlsx.full.min.js)를 불러서 읽고 써요.

/* ---------- 읽기 ---------- */
async function readSheet(file) { return (await readBook(file))[0].rows; }
async function readBook(file) {
  const buf = new Uint8Array(await file.arrayBuffer());
  const isZip = buf[0] === 0x50 && buf[1] === 0x4b; // "PK" → xlsx 또는 numbers (둘 다 zip)
  if (/\.numbers$/i.test(file.name)) return readNumbers(buf);
  if (isZip) {
    const z = await unzip(buf);
    if (!z.files['xl/workbook.xml'] && Object.keys(z.files).some(n => /^Index\/.*\.iwa$/.test(n))) return readNumbers(buf);
    return readXlsx(buf, z);
  }
  if (/\.xls$/i.test(file.name)) throw new Error('old_xls');
  return [{ name: 'CSV', rows: parseCsv(decodeText(buf)) }];
}
// SheetJS는 넘버스를 쓸 때만 한 번 불러요 (900KB)
let SHEETJS = null;
function loadSheetJs() {
  if (SHEETJS) return SHEETJS;
  const add = src => new Promise((ok, no) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => no(new Error('sheetjs_load')); document.head.appendChild(s); });
  SHEETJS = add('/assets/vendor/xlsx.full.min.js').then(() => add('/assets/vendor/xlsx.zahl.js')).then(() => window.XLSX).catch(e => { SHEETJS = null; throw e; });
  return SHEETJS;
}
async function readNumbers(buf) {
  const X = await loadSheetJs();
  const wb = X.read(buf, { type: 'array', cellDates: true });
  const cellText = v => v instanceof Date ? `${v.getUTCFullYear()}-${String(v.getUTCMonth() + 1).padStart(2, '0')}-${String(v.getUTCDate()).padStart(2, '0')}` : String(v ?? '').trim();
  return wb.SheetNames.map(name => ({ name, rows: X.utils.sheet_to_json(wb.Sheets[name], { header: 1, raw: true, defval: '', blankrows: true }).map(r => r.map(cellText)) }));
}

// CSV: UTF-8이 기본, 깨지면 한글 윈도우 엑셀이 쓰는 EUC-KR로 다시 읽어요
function decodeText(buf) {
  let t = new TextDecoder('utf-8').decode(buf);
  if (t.includes('�')) { try { t = new TextDecoder('euc-kr').decode(buf); } catch {} }
  return t.replace(/^﻿/, '');
}
function parseCsv(text) {
  const rows = [];
  let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ',' || c === '\t') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.map(r => r.map(x => x.trim()));
}

// xlsx = zip 안의 xml. 압축은 브라우저 DecompressionStream('deflate-raw')로 풀어요
async function unzip(buf) {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error('bad_zip');
  const count = dv.getUint16(eocd + 10, true);
  let p = dv.getUint32(eocd + 16, true);
  const files = {};
  for (let n = 0; n < count; n++) {
    if (dv.getUint32(p, true) !== 0x02014b50) break;
    const method = dv.getUint16(p + 10, true), size = dv.getUint32(p + 20, true);
    const nameLen = dv.getUint16(p + 28, true), extraLen = dv.getUint16(p + 30, true), commentLen = dv.getUint16(p + 32, true);
    const local = dv.getUint32(p + 42, true);
    const name = new TextDecoder().decode(buf.subarray(p + 46, p + 46 + nameLen));
    files[name] = { method, size, local };
    p += 46 + nameLen + extraLen + commentLen;
  }
  const read = async name => {
    const f = files[name];
    if (!f) return null;
    const start = f.local + 30 + dv.getUint16(f.local + 26, true) + dv.getUint16(f.local + 28, true);
    const raw = buf.subarray(start, start + f.size);
    if (f.method === 0) return new TextDecoder().decode(raw);
    const s = new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return new TextDecoder().decode(await new Response(s).arrayBuffer());
  };
  return { files, read };
}

async function readXlsx(buf, z) {
  z = z || await unzip(buf);
  const xml = s => new DOMParser().parseFromString(s, 'application/xml');
  const all = (doc, tag) => [...doc.getElementsByTagNameNS('*', tag)];
  // 공유 글자
  const ss = await z.read('xl/sharedStrings.xml');
  const shared = ss ? all(xml(ss), 'si').map(si => all(si, 't').map(t => t.textContent).join('')) : [];
  // 날짜 서식인 칸 찾기 (서식 번호 14~22, 45~47 또는 yyyy·mm·dd가 들어간 사용자 서식)
  const st = await z.read('xl/styles.xml');
  const dateStyles = new Set();
  if (st) {
    const d = xml(st);
    const custom = {};
    all(d, 'numFmt').forEach(f => { custom[f.getAttribute('numFmtId')] = f.getAttribute('formatCode') || ''; });
    const xfs = all(d, 'cellXfs')[0];
    if (xfs) all(xfs, 'xf').forEach((xf, i) => {
      const id = +xf.getAttribute('numFmtId');
      if ((id >= 14 && id <= 22) || (id >= 45 && id <= 47) || (custom[id] && /[yd]/i.test(custom[id].replace(/"[^"]*"|\[[^\]]*\]/g, '')))) dateStyles.add(i);
    });
  }
  // 시트마다 (순서대로)
  const wb = xml(await z.read('xl/workbook.xml'));
  const rels = xml(await z.read('xl/_rels/workbook.xml.rels'));
  const col = ref => { let n = 0; for (const ch of ref.replace(/\d+/g, '')) n = n * 26 + ch.charCodeAt(0) - 64; return n - 1; };
  const book = [];
  for (const [i, sh] of all(wb, 'sheet').entries()) {
    const rid = sh.getAttribute('r:id') || sh.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id');
    const rel = all(rels, 'Relationship').find(r => r.getAttribute('Id') === rid);
    let target = rel ? rel.getAttribute('Target') : `worksheets/sheet${i + 1}.xml`;
    target = target.startsWith('/') ? target.slice(1) : `xl/${target.replace(/^\.\//, '')}`;
    const src = await z.read(target);
    if (!src) continue;
    const sheet = xml(src), rows = [];
    all(sheet, 'row').forEach(r => {
      const out = [];
      all(r, 'c').forEach(c => {
        const t = c.getAttribute('t'), v = all(c, 'v')[0], s = +c.getAttribute('s');
        let val = '';
        if (t === 's') val = shared[+(v && v.textContent)] ?? '';
        else if (t === 'inlineStr') val = all(c, 't').map(x => x.textContent).join('');
        else if (v) {
          val = v.textContent;
          if (t !== 'str' && t !== 'b' && dateStyles.has(s) && !isNaN(+val)) val = serialToYmd(+val);
        }
        out[c.getAttribute('r') ? col(c.getAttribute('r')) : out.length] = String(val).trim();
      });
      rows[(+r.getAttribute('r') || rows.length + 1) - 1] = Array.from(out, x => x ?? '');
    });
    book.push({ name: sh.getAttribute('name') || `시트 ${i + 1}`, rows: Array.from(rows, x => x || []) });
  }
  if (!book.length) throw new Error('bad_xlsx');
  return book;
}
// 엑셀 날짜 숫자(1900년 기준) → YYYY-MM-DD
function serialToYmd(n) {
  const d = new Date(Math.round((n - 25569) * 864e5));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

/* ---------- 양식 만들기 (.xlsx, 압축 없이 묶기) ---------- */
const CRC_TABLE = (() => { const t = new Uint32Array(256); for (let i = 0; i < 256; i++) { let c = i; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[i] = c >>> 0; } return t; })();
const crc32 = b => { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = CRC_TABLE[(c ^ b[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
function zipStore(entries) {
  const enc = new TextEncoder(), parts = [], dir = [];
  let off = 0;
  for (const [name, text] of entries) {
    const nb = enc.encode(name), data = enc.encode(text), crc = crc32(data);
    const h = new DataView(new ArrayBuffer(30));
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true);
    h.setUint32(14, crc, true); h.setUint32(18, data.length, true); h.setUint32(22, data.length, true); h.setUint16(26, nb.length, true);
    parts.push(new Uint8Array(h.buffer), nb, data);
    const c = new DataView(new ArrayBuffer(46));
    c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true);
    c.setUint32(16, crc, true); c.setUint32(20, data.length, true); c.setUint32(24, data.length, true); c.setUint16(28, nb.length, true); c.setUint32(42, off, true);
    dir.push(new Uint8Array(c.buffer), nb);
    off += 30 + nb.length + data.length;
  }
  const size = dir.reduce((a, x) => a + x.length, 0);
  const e = new DataView(new ArrayBuffer(22));
  e.setUint32(0, 0x06054b50, true); e.setUint16(8, entries.length, true); e.setUint16(10, entries.length, true); e.setUint32(12, size, true); e.setUint32(16, off, true);
  return new Blob([...parts, ...dir, new Uint8Array(e.buffer)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
/* 보기 좋게 꾸민 엑셀: 맨 위 제목(크게) · 머리줄(남색 바탕 흰 글씨) · 칸마다 테두리 · 한 줄 건너 옅은 색 · 금액은 숫자로(1,000 쉼표)
   · 합계 줄 굵게 · "*" 안내 줄은 회색 · 머리줄 아래 틀 고정 + 거르기 · 칸 너비 저절로 · 인쇄는 한 쪽 너비에 맞춤.
   머리줄 = 칸이 두 개 이상 찬 첫 줄. 그 위 한 칸짜리 줄은 제목(첫 줄) · 부제목.
   opts.required: 꼭 채울 칸(머리줄 진한 파랑), opts.example: "예시)"로 시작하는 줄은 기울여 회색,
   opts.guide: [[칸, 설명], …] → 두 번째 시트 "작성 안내" (올리기는 첫 시트만 읽어요), opts.sheet: 시트 이름,
   opts.more: [[시트 이름, 행, 너비], …] → 시트를 더 붙여요(행정 지원 전체 받기처럼 한 파일에 여러 시트).
   글씨체는 모든 칸이 맑은 고딕(한글 글꼴 정보 charset 129 함께). */
function downloadXlsx(filename, rows, widths = [], opts = {}) {
  const x = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const colName = i => { let s = ''; i++; while (i) { s = String.fromCharCode(65 + (i - 1) % 26) + s; i = Math.floor((i - 1) / 26); } return s; };
  const NS = 'http://schemas.openxmlformats.org';
  // 서식 번호: 0 기본 · 1 제목 · 2 부제목 · 3 머리줄 · 4 칸 · 5 칸(옅은 줄) · 6 금액 · 7 금액(옅은 줄) · 8 합계 글 · 9 합계 금액 · 10 안내 · 11 예시 · 12 꼭 채울 머리줄 · 13 숫자 · 14 숫자(옅은 줄) · 15 가운데 칸 · 16 가운데 칸(옅은 줄)
  const S = { title: 1, sub: 2, head: 3, cell: 4, cellAlt: 5, money: 6, moneyAlt: 7, sumText: 8, sumMoney: 9, note: 10, example: 11, headReq: 12, num: 13, numAlt: 14, mid: 15, midAlt: 16 };
  // 같은 서식을 넘버스 파일에도 (서식 번호 → 굵게 · 색 · 바탕 · 테두리 · 정렬)
  const ALT = 'F3F5FC', SUMF = 'E3E8FB';
  const SOBJ = [null, { b: 1, sz: 16, color: '1B2470' }, { sz: 10, color: '6B7280' }, { b: 1, color: 'FFFFFF', fill: '2A3496', bd: 1, h: 'center', wrap: 1 }, { bd: 1 }, { bd: 1, fill: ALT },
    { bd: 1, h: 'right', num: '#,##0' }, { bd: 1, fill: ALT, h: 'right', num: '#,##0' }, { b: 1, fill: SUMF, bd: 1 }, { b: 1, fill: SUMF, bd: 1, h: 'right', num: '#,##0' }, { sz: 10, color: '6B7280' },
    { bd: 1, color: '8A93A6' }, { b: 1, color: 'FFFFFF', fill: '101876', bd: 1, h: 'center', wrap: 1 }, { bd: 1, h: 'right' }, { bd: 1, fill: ALT, h: 'right' }, { bd: 1, h: 'center' }, { bd: 1, fill: ALT, h: 'center' }];
  const sheetXml = (rws, wds, o = {}) => {
    const filled = r => (r || []).filter(v => String(v ?? '').trim() !== '').length;
    let hi = rws.findIndex(r => filled(r) >= 2); if (hi < 0) hi = 0;
    const head = rws[hi] || [], ncol = Math.max(1, ...rws.map(r => (r || []).length));
    const moneyCol = head.map(h => /원\)|원$|금액|합계|세\b|세\(|세액|소득세|지급|수입|지출|매출|이익|수강료|교재비/.test(String(h)) && !/일$|날|번호|연락|전화/.test(String(h)));
    const numCol = head.map(h => !/번호|연락|전화|코드|학년|날짜|일자|등록일|지급일|^\d+$/.test(String(h)));
    const midCol = head.map(h => /^\d+$/.test(String(h).trim())); // 출석부 날짜 칸처럼 짧은 칸은 가운데
    const isNum = v => /^-?(0|[1-9]\d{0,2}(,\d{3})+|[1-9]\d*)$/.test(String(v).trim());
    let end = rws.findIndex((r, i) => i > hi && !(r || []).length); if (end < 0) end = rws.length;
    const out = [], grid = [], heights = {};
    rws.forEach((r, ri) => {
      r = r || [];
      const first = String(r[0] ?? ''), gr = grid[ri] = [];
      let kind = 'body';
      if (ri < hi) kind = ri === 0 ? 'title' : 'sub';
      else if (ri === hi) kind = 'head';
      else if (filled(r) === 1 && first.startsWith('*')) kind = 'note';
      else if (r.some(v => /^(합계|순이익|매출 합계|지출 합계)$/.test(String(v).trim()))) kind = 'sum';
      else if (o.example && first.startsWith('예시)')) kind = 'example';
      const alt = kind === 'body' && ri > hi && (ri - hi) % 2 === 0;
      const cells = [];
      const len = r.length && ['body', 'sum', 'example', 'head'].includes(kind) ? Math.max(r.length, head.length) : r.length; // [] 줄은 빈 칸(테두리 없음)
      for (let ci = 0; ci < len; ci++) {
        const v = r[ci] ?? '', ref = `${colName(ci)}${ri + 1}`;
        let st = 0;
        if (kind === 'title') st = S.title; else if (kind === 'sub') st = S.sub; else if (kind === 'note') st = S.note;
        else if (kind === 'head') st = (o.required || []).includes(ci) ? S.headReq : S.head;
        else if (kind === 'example') st = S.example;
        const asNum = (kind === 'body' || kind === 'sum') && ri > hi && numCol[ci] && isNum(v);
        if (kind === 'body') st = asNum ? (moneyCol[ci] ? (alt ? S.moneyAlt : S.money) : (alt ? S.numAlt : S.num)) : midCol[ci] ? (alt ? S.midAlt : S.mid) : (alt ? S.cellAlt : S.cell);
        if (kind === 'sum') st = asNum ? S.sumMoney : S.sumText;
        if (asNum) { cells.push(`<c r="${ref}" s="${st}"><v>${String(v).replace(/,/g, '')}</v></c>`); gr[ci] = { v: +String(v).replace(/,/g, ''), s: SOBJ[st] }; }
        else if (String(v) === '' && !st) continue;
        else { cells.push(`<c r="${ref}" t="inlineStr"${st ? ` s="${st}"` : ''}><is><t xml:space="preserve">${x(v)}</t></is></c>`); gr[ci] = { v: String(v), s: SOBJ[st] }; }
      }
      const ht = kind === 'title' ? ' ht="30" customHeight="1"' : kind === 'head' ? ' ht="24" customHeight="1"' : '';
      if (kind === 'title') heights[ri + 1] = 30; else if (kind === 'head') heights[ri + 1] = 24;
      out.push(`<row r="${ri + 1}"${ht}>${cells.join('')}</row>`);
    });
    // 칸 너비: 정해 준 값이 없으면 글자 길이로 (한글은 두 칸)
    const wlen = v => [...String(v ?? '')].reduce((a, c) => a + (c.charCodeAt(0) > 255 ? 2 : 1), 0);
    const auto = [...Array(ncol)].map((_, ci) => Math.min(40, Math.max(8, ...rws.slice(hi).map(r => wlen((r || [])[ci]) + 2))));
    const cw = auto.map((w, i) => wds[i] ? Math.max(wds[i], Math.min(w, wds[i] * 1.6)) : w);
    const cols = `<cols>${cw.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${Math.round(w * 1.15 * 10) / 10}" customWidth="1"/>`).join('')}</cols>`;
    const mrefs = rws.slice(0, hi).map((r, i) => filled(r) === 1 && ncol > 1 ? `A${i + 1}:${colName(ncol - 1)}${i + 1}` : '').filter(Boolean);
    rws.forEach((r, i) => { if (i > hi && filled(r) === 1 && String((r || [])[0] ?? '').startsWith('*') && ncol > 1) mrefs.push(`A${i + 1}:${colName(ncol - 1)}${i + 1}`); });
    const merges = mrefs.map(m => `<mergeCell ref="${m}"/>`);
    const pane = `<sheetViews><sheetView workbookViewId="0" showGridLines="0"><pane ySplit="${hi + 1}" topLeftCell="A${hi + 2}" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>`;
    const filter = end - hi > 2 && head.length > 1 ? `<autoFilter ref="A${hi + 1}:${colName(head.length - 1)}${end}"/>` : '';
    const styled = { rows: grid.map(r => Array.from(r || [], c => c || null)), merges: mrefs, cols: cw.map(w => Math.round(w * 1.15 * 10) / 10), heights };
    return { styled, filter: filter ? `$A$${hi + 1}:$${colName(head.length - 1)}$${end}` : '', xml: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="${NS}/spreadsheetml/2006/main" xmlns:r="${NS}/officeDocument/2006/relationships"><sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>${pane}<sheetFormatPr defaultRowHeight="18"/>${cols}<sheetData>${out.join('')}</sheetData>${filter}${merges.length ? `<mergeCells count="${merges.length}">${merges.join('')}</mergeCells>` : ''}<pageMargins left="0.5" right="0.5" top="0.6" bottom="0.6" header="0.3" footer="0.3"/><pageSetup paperSize="9" orientation="${ncol > 7 ? 'landscape' : 'portrait'}" fitToWidth="1" fitToHeight="0"/></worksheet>` };
  };
  // opts.blank: 양식 아래 바로 적을 수 있게 테두리만 있는 빈 줄
  const body = opts.blank ? [...rows, ...[...Array(opts.blank)].map(() => (rows[0] || []).map(() => ''))] : rows;
  const sheets = [[opts.sheet || '양식', sheetXml(body, widths, opts)], ...(opts.more || []).map(([n, r, w, o]) => [n, sheetXml(r, w || [], o || {})])];
  if (opts.guide) sheets.push(['작성 안내', sheetXml([['작성 안내'], ['첫 번째 시트에 채워서 그대로 올려 주세요. 칸 이름(첫 줄)은 바꾸지 마세요.'], [], ['칸', '꼭 채우기', '이렇게 적어요'], ...opts.guide], [16, 10, 60])]);
  // 글꼴: 순서는 b · i · sz · color · name · family · charset (엑셀 규칙)
  const font = ({ b, i, sz = 11, color } = {}) => `<font>${b ? '<b/>' : ''}${i ? '<i/>' : ''}<sz val="${sz}"/>${color ? `<color rgb="${color}"/>` : ''}<name val="맑은 고딕"/><family val="3"/><charset val="129"/></font>`;
  const fonts = [font(), font({ b: 1, sz: 16, color: 'FF1B2470' }), font({ sz: 10, color: 'FF6B7280' }), font({ b: 1, color: 'FFFFFFFF' }), font({ b: 1 }), font({ i: 1, sz: 10, color: 'FF6B7280' }), font({ i: 1, color: 'FF8A93A6' })];
  const fill = rgb => `<fill><patternFill patternType="solid"><fgColor rgb="${rgb}"/><bgColor indexed="64"/></patternFill></fill>`;
  const fills = ['<fill><patternFill patternType="none"/></fill>', '<fill><patternFill patternType="gray125"/></fill>', fill('FF2A3496'), fill('FFF3F5FC'), fill('FFE3E8FB'), fill('FF101876')];
  const borders = ['<border><left/><right/><top/><bottom/><diagonal/></border>', `<border>${['left', 'right', 'top', 'bottom'].map(k => `<${k} style="thin"><color rgb="FFD5DAE8"/></${k}>`).join('')}<diagonal/></border>`, `<border>${['left', 'right'].map(k => `<${k} style="thin"><color rgb="FFD5DAE8"/></${k}>`).join('')}<top style="medium"><color rgb="FF2A3496"/></top><bottom style="thin"><color rgb="FFD5DAE8"/></bottom><diagonal/></border>`];
  const xf = (f, fi, b, n, al = '') => `<xf numFmtId="${n}" fontId="${f}" fillId="${fi}" borderId="${b}" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center"${al}/></xf>`;
  const xfs = [xf(0, 0, 0, 0), xf(1, 0, 0, 0), xf(2, 0, 0, 0), xf(3, 2, 1, 0, ' horizontal="center" wrapText="1"'), xf(0, 0, 1, 0), xf(0, 3, 1, 0), xf(0, 0, 1, 164), xf(0, 3, 1, 164), xf(4, 4, 2, 0), xf(4, 4, 2, 164), xf(5, 0, 0, 0, ' wrapText="1"'), xf(6, 0, 1, 0), xf(3, 5, 1, 0, ' horizontal="center" wrapText="1"'), xf(0, 0, 1, 3), xf(0, 3, 1, 3), xf(0, 0, 1, 0, ' horizontal="center"'), xf(0, 3, 1, 0, ' horizontal="center"')];
  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="${NS}/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="#,##0"/></numFmts><fonts count="${fonts.length}">${fonts.join('')}</fonts><fills count="${fills.length}">${fills.join('')}</fills><borders count="${borders.length}">${borders.join('')}</borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="${xfs.length}">${xfs.join('')}</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
  const names = sheets.map((s, i) => s[1].filter ? `<definedName name="_xlnm._FilterDatabase" localSheetId="${i}" hidden="1">'${x(String(s[0]).replace(/[\\/?*[\]:]/g, ' ').slice(0, 31))}'!${s[1].filter}</definedName>` : '').filter(Boolean);
  const sheetName = n => x(String(n).replace(/[\\/?*[\]:]/g, ' ').slice(0, 31));
  const blob = zipStore([
    ['[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="${NS}/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`],
    ['_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="${NS}/package/2006/relationships"><Relationship Id="rId1" Type="${NS}/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`],
    ['xl/workbook.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="${NS}/spreadsheetml/2006/main" xmlns:r="${NS}/officeDocument/2006/relationships"><sheets>${sheets.map((s, i) => `<sheet name="${sheetName(s[0])}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets>${names.length ? `<definedNames>${names.join('')}</definedNames>` : ''}</workbook>`],
    ['xl/_rels/workbook.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="${NS}/package/2006/relationships">${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="${NS}/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId${sheets.length + 1}" Type="${NS}/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`],
    ['xl/styles.xml', styles],
    ...sheets.map((s, i) => [`xl/worksheets/sheet${i + 1}.xml`, s[1].xml])
  ]);
  // 넘버스로 받을 때 쓸 값만 있는 표 (금액처럼 보이는 글자는 숫자로)
  const plainOf = rws => rws.map(r => (r || []).map(v => /^-?(0|[1-9]\d{0,2}(,\d{3})+|[1-9]\d{0,11})$/.test(String(v ?? '').trim()) ? +String(v).replace(/,/g, '') : v ?? ''));
  const plain = [[opts.sheet || '양식', plainOf(body)], ...(opts.more || []).map(([n, r]) => [n, plainOf(r)])];
  if (opts.guide) plain.push(['작성 안내', [['작성 안내'], ['첫 번째 시트에 채워서 그대로 올려 주세요. 칸 이름(첫 줄)은 바꾸지 마세요.'], [], ['칸', '꼭 채우기', '이렇게 적어요'], ...opts.guide]]);
  return saveBook(filename, blob, plain, sheets.map(([n, sh]) => ({ name: n, ...sh.styled })));
}

/* ---------- 받기: .xlsx 그대로 또는 넘버스(.numbers)로 바꿔서 ----------
   넘버스는 서버(/api/to_numbers, Vercel 파이썬 함수)가 색 · 굵게 · 테두리 · 정렬 · 쉼표 · 합치기 · 칸 너비까지 넣어 만들어요(styled).
   서버가 없거나(예시 · 로컬) 실패하면 SheetJS로 값 · 시트 · 합치기만 넣은 넘버스를 만들어요. 넘버스에는 수식 대신 계산한 값이 들어가요. */
async function numbersFromServer(name, styled) {
  if (!styled || !/^https?:/.test(location.protocol)) return null;
  try {
    const r = await fetch('/api/to_numbers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, sheets: styled }) });
    if (!r.ok || !/numbers/.test(r.headers.get('content-type') || '')) return null;
    return await r.blob();
  } catch (e) { return null; }
}
async function saveBook(filename, xlsxBlob, plain, styled) {
  let fmt = 'xlsx';
  if (typeof window.pickSheetFormat === 'function') { fmt = await window.pickSheetFormat(filename); if (!fmt) return false; }
  let blob = xlsxBlob, name = filename;
  if (fmt === 'numbers') {
    name = filename.replace(/\.xlsx$/i, '') + '.numbers';
    if (typeof toast === 'function') toast('넘버스 파일을 만드는 중이에요…');
    const fromServer = await numbersFromServer(name.replace(/\.numbers$/, ''), styled);
    if (fromServer) blob = new Blob([fromServer], { type: 'application/x-iwork-numbers-sffnumbers' });
    else try {
      const X = await loadSheetJs(), wb = X.utils.book_new(), used = new Set();
      plain.forEach(([n, rows]) => {
        let nm = String(n).replace(/[\\/?*[\]:]/g, ' ').slice(0, 31) || '시트', k = 2;
        while (used.has(nm)) nm = `${nm.slice(0, 28)} ${k++}`;
        used.add(nm);
        const ws = X.utils.aoa_to_sheet(rows.map(r => (r || []).map(v => v ?? '')));
        const st = styled && styled.find(x => x.name === n);
        if (st && st.merges && st.merges.length) ws['!merges'] = st.merges.map(m => X.utils.decode_range(m));
        X.utils.book_append_sheet(wb, ws, nm);
      });
      blob = new Blob([X.write(wb, { bookType: 'numbers', type: 'array', numbers: window.XLSX_ZAHL_PAYLOAD })], { type: 'application/x-iwork-numbers-sffnumbers' });
    } catch (e) { console.warn(e); if (typeof toast === 'function') toast('넘버스 파일을 만들지 못했어요 · 엑셀(.xlsx)로 받아 주세요'); return false; }
  }
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: name });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  return true;
}

/* ---------- 칸 위치까지 정한 양식 (재정 보고서 · 수강생 관리표처럼) ----------
   sheets: [{ name, rows: [[칸, …], …], merges: ['B3:M4', …], cols: [너비, …], heights: { 줄번호: 높이 }, freeze: 줄 수, landscape }]
   칸: 값(글자 · 숫자) 또는 { v: 값, f: '수식(= 없이)', s: 서식 } — 수식 칸의 v는 계산한 값(넘버스 · 미리보기용).
   서식: { b 굵게, sz 글자 크기, color 'FF0000', fill 'F2F2F2', bd 테두리(1 얇게 · 2 굵게 · 0 없음), h 'center'|'left'|'right', num '#,##0' 같은 숫자 서식, wrap } */
function downloadBook(filename, sheets) {
  const x = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const colName = i => { let s = ''; i++; while (i) { s = String.fromCharCode(65 + (i - 1) % 26) + s; i = Math.floor((i - 1) / 26); } return s; };
  const NS = 'http://schemas.openxmlformats.org';
  // 서식 모음: 같은 모양은 한 번만
  const fonts = [], fills = ['<fill><patternFill patternType="none"/></fill>', '<fill><patternFill patternType="gray125"/></fill>'], borders = ['<border><left/><right/><top/><bottom/><diagonal/></border>'], numFmts = [], xfs = [];
  const idx = (arr, s) => { let i = arr.indexOf(s); if (i < 0) { arr.push(s); i = arr.length - 1; } return i; };
  const font = ({ b, sz = 11, color }) => `<font>${b ? '<b/>' : ''}<sz val="${sz}"/>${color ? `<color rgb="FF${color}"/>` : ''}<name val="맑은 고딕"/><family val="3"/><charset val="129"/></font>`;
  idx(fonts, font({}));
  const line = w => w === 2 ? 'medium' : 'thin';
  const border = bd => bd ? `<border>${['left', 'right', 'top', 'bottom'].map(k => `<${k} style="${line(bd)}"><color rgb="FF808080"/></${k}>`).join('')}<diagonal/></border>` : borders[0];
  xfs.push('<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>');
  const styleId = s => {
    if (!s) return 0;
    const f = idx(fonts, font(s)), fi = s.fill ? idx(fills, `<fill><patternFill patternType="solid"><fgColor rgb="FF${s.fill}"/><bgColor indexed="64"/></patternFill></fill>`) : 0, b = idx(borders, border(s.bd));
    let n = 0;
    if (s.num) { const k = numFmts.indexOf(s.num); n = 164 + (k < 0 ? numFmts.push(s.num) - 1 : k); }
    const al = `<alignment vertical="center"${s.h ? ` horizontal="${s.h}"` : ''}${s.wrap ? ' wrapText="1"' : ''}/>`;
    return idx(xfs, `<xf numFmtId="${n}" fontId="${f}" fillId="${fi}" borderId="${b}" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">${al}</xf>`);
  };
  const sheetXml = sh => {
    const rowsXml = sh.rows.map((r, ri) => {
      const cells = (r || []).map((c, ci) => {
        if (c == null || c === '') return '';
        const o = typeof c === 'object' ? c : { v: c }, ref = `${colName(ci)}${ri + 1}`, st = styleId(o.s), sa = st ? ` s="${st}"` : '';
        if (o.f) return `<c r="${ref}"${sa}${typeof o.v === 'number' || o.v == null ? '' : ' t="str"'}><f>${x(o.f)}</f>${o.v == null ? '' : `<v>${x(o.v)}</v>`}</c>`;
        if (o.v == null || o.v === '') return st ? `<c r="${ref}"${sa}/>` : '';
        if (typeof o.v === 'number') return `<c r="${ref}"${sa}><v>${o.v}</v></c>`;
        return `<c r="${ref}" t="inlineStr"${sa}><is><t xml:space="preserve">${x(o.v)}</t></is></c>`;
      }).join('');
      const ht = sh.heights && sh.heights[ri + 1] ? ` ht="${sh.heights[ri + 1]}" customHeight="1"` : '';
      return `<row r="${ri + 1}"${ht}>${cells}</row>`;
    }).join('');
    const cols = sh.cols && sh.cols.length ? `<cols>${sh.cols.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w || 9}" customWidth="1"/>`).join('')}</cols>` : '';
    const pane = sh.freeze ? `<pane ySplit="${sh.freeze}" topLeftCell="A${sh.freeze + 1}" activePane="bottomLeft" state="frozen"/>` : '';
    const merges = sh.merges && sh.merges.length ? `<mergeCells count="${sh.merges.length}">${sh.merges.map(m => `<mergeCell ref="${m}"/>`).join('')}</mergeCells>` : '';
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="${NS}/spreadsheetml/2006/main" xmlns:r="${NS}/officeDocument/2006/relationships"><sheetPr><pageSetUpPr fitToPage="1"/></sheetPr><sheetViews><sheetView workbookViewId="0" showGridLines="0">${pane}</sheetView></sheetViews><sheetFormatPr defaultRowHeight="18"/>${cols}<sheetData>${rowsXml}</sheetData>${merges}<pageMargins left="0.4" right="0.4" top="0.5" bottom="0.5" header="0.3" footer="0.3"/><pageSetup paperSize="9" orientation="${sh.landscape === false ? 'portrait' : 'landscape'}" fitToWidth="1" fitToHeight="0"/></worksheet>`;
  };
  const used = new Set(), names = sheets.map(sh => { let n = String(sh.name).replace(/[\\/?*[\]:]/g, ' ').slice(0, 31) || '시트', k = 2; while (used.has(n)) n = `${n.slice(0, 28)} ${k++}`; used.add(n); return n; });
  const sheetFiles = sheets.map(sheetXml); // 서식 모음을 채운 다음 styles.xml을 만들어요
  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="${NS}/spreadsheetml/2006/main">${numFmts.length ? `<numFmts count="${numFmts.length}">${numFmts.map((f, i) => `<numFmt numFmtId="${164 + i}" formatCode="${x(f)}"/>`).join('')}</numFmts>` : ''}<fonts count="${fonts.length}">${fonts.join('')}</fonts><fills count="${fills.length}">${fills.join('')}</fills><borders count="${borders.length}">${borders.join('')}</borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="${xfs.length}">${xfs.join('')}</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
  const blob = zipStore([
    ['[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="${NS}/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`],
    ['_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="${NS}/package/2006/relationships"><Relationship Id="rId1" Type="${NS}/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`],
    // 수식은 열 때 다시 계산해요(fullCalcOnLoad)
    ['xl/workbook.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="${NS}/spreadsheetml/2006/main" xmlns:r="${NS}/officeDocument/2006/relationships"><sheets>${names.map((n, i) => `<sheet name="${x(n)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets><calcPr calcId="191029" fullCalcOnLoad="1"/></workbook>`],
    ['xl/_rels/workbook.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="${NS}/package/2006/relationships">${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="${NS}/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId${sheets.length + 1}" Type="${NS}/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`],
    ['xl/styles.xml', styles],
    ...sheetFiles.map((s, i) => [`xl/worksheets/sheet${i + 1}.xml`, s])
  ]);
  const plain = sheets.map((sh, i) => [names[i], sh.rows.map(r => (r || []).map(c => c == null ? '' : typeof c === 'object' ? (c.v ?? '') : c))]);
  const styled = sheets.map((sh, i) => ({ name: names[i], rows: sh.rows.map(r => Array.from(r || [], c => c == null ? null : typeof c === 'object' ? { v: c.v ?? '', s: c.s || null } : { v: c, s: null })), merges: sh.merges || [], cols: sh.cols || [], heights: sh.heights || {} }));
  return saveBook(filename, blob, plain, styled);
}
