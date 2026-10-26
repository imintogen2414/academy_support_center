// 엑셀(.xlsx) · CSV 읽기와 양식(.xlsx) 만들기 — 바깥 라이브러리 없이 브라우저 기능만 써요.
// readSheet(file) → 첫 번째 시트의 행 목록 [[칸, 칸, …], …] (칸은 모두 글자, 날짜는 YYYY-MM-DD)
// downloadXlsx(파일 이름, 행 목록) → 양식 파일 내려받기

/* ---------- 읽기 ---------- */
async function readSheet(file) {
  const buf = new Uint8Array(await file.arrayBuffer());
  const isZip = buf[0] === 0x50 && buf[1] === 0x4b; // "PK" → xlsx
  if (isZip) return readXlsx(buf);
  if (/\.xls$/i.test(file.name)) throw new Error('old_xls');
  return parseCsv(decodeText(buf));
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

async function readXlsx(buf) {
  const z = await unzip(buf);
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
  // 첫 번째 시트 위치
  const wb = xml(await z.read('xl/workbook.xml'));
  const rels = xml(await z.read('xl/_rels/workbook.xml.rels'));
  const first = all(wb, 'sheet')[0];
  const rid = first && (first.getAttribute('r:id') || first.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id'));
  const rel = all(rels, 'Relationship').find(r => r.getAttribute('Id') === rid);
  let target = rel ? rel.getAttribute('Target') : 'worksheets/sheet1.xml';
  target = target.startsWith('/') ? target.slice(1) : `xl/${target.replace(/^\.\//, '')}`;
  const sheet = xml(await z.read(target) || await z.read('xl/worksheets/sheet1.xml'));
  const col = ref => { let n = 0; for (const ch of ref.replace(/\d+/g, '')) n = n * 26 + ch.charCodeAt(0) - 64; return n - 1; };
  const rows = [];
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
  return Array.from(rows, x => x || []);
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
function downloadXlsx(filename, rows, widths = []) {
  const x = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const colName = i => { let s = ''; i++; while (i) { s = String.fromCharCode(65 + (i - 1) % 26) + s; i = Math.floor((i - 1) / 26); } return s; };
  const body = rows.map((r, ri) => `<row r="${ri + 1}">${r.map((v, ci) => `<c r="${colName(ci)}${ri + 1}" t="inlineStr"${ri === 0 ? ' s="1"' : ''}><is><t xml:space="preserve">${x(v)}</t></is></c>`).join('')}</row>`).join('');
  const cols = widths.length ? `<cols>${widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')}</cols>` : '';
  const NS = 'http://schemas.openxmlformats.org';
  const blob = zipStore([
    ['[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="${NS}/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`],
    ['_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="${NS}/package/2006/relationships"><Relationship Id="rId1" Type="${NS}/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`],
    ['xl/workbook.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="${NS}/spreadsheetml/2006/main" xmlns:r="${NS}/officeDocument/2006/relationships"><sheets><sheet name="양식" sheetId="1" r:id="rId1"/></sheets></workbook>`],
    ['xl/_rels/workbook.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="${NS}/package/2006/relationships"><Relationship Id="rId1" Type="${NS}/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="${NS}/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`],
    ['xl/styles.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="${NS}/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="맑은 고딕"/></font><font><b/><sz val="11"/><name val="맑은 고딕"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFDDE4FF"/></patternFill></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="2"><xf xfId="0"/><xf fontId="1" fillId="2" xfId="0" applyFont="1" applyFill="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`],
    ['xl/worksheets/sheet1.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="${NS}/spreadsheetml/2006/main">${cols}<sheetData>${body}</sheetData></worksheet>`]
  ]);
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: filename });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
