# 넘버스(.numbers) 파일 만들기 — Vercel Python 함수 (POST /api/to_numbers — 파일 이름이 numbers.py면 파이썬 기본 모듈과 부딪혀요)
# 브라우저(sheet.js의 saveBook)가 칸마다 값 · 서식(굵게 · 크기 · 글자색 · 바탕색 · 테두리 · 정렬 · 쉼표) · 합치기 · 칸 너비 · 줄 높이를
# JSON으로 보내면, numbers-parser로 색 · 굵은 글씨까지 들어간 넘버스 파일을 돌려줘요. 저장은 하지 않아요(받은 내용으로 파일만 만들어 바로 돌려줌).
# 넘버스 파일에는 수식이 들어가지 않고 계산한 값이 들어가요(엑셀 파일에는 수식 그대로).
import io
import json
import re
import tempfile
import traceback
import os
from http.server import BaseHTTPRequestHandler
from urllib.parse import quote

from numbers_parser import Alignment, Border, Document, RGB

MAX_BODY = 4 * 1024 * 1024
MAX_CELLS = 120_000
FONT = 'Apple SD Gothic Neo'


def rgb(h):
    h = str(h or '').lstrip('#')
    if not re.fullmatch(r'[0-9A-Fa-f]{6}', h):
        return None
    return RGB(int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16))


def build(book, merges=True):
    sheets = book.get('sheets') or []
    if not sheets:
        raise ValueError('no_sheets')
    total = sum(len(r or []) for sh in sheets for r in (sh.get('rows') or []))
    if total > MAX_CELLS:
        raise ValueError('too_big')
    doc = None
    styles = {}
    used = set()

    def name_of(n):
        n = re.sub(r'[\\/?*\[\]:]', ' ', str(n or '시트'))[:31] or '시트'
        base, k = n, 2
        while n in used:
            n = f'{base[:28]} {k}'
            k += 1
        used.add(n)
        return n

    for si, sh in enumerate(sheets):
        rows = sh.get('rows') or []
        nr = max(1, len(rows))
        nc = max([1] + [len(r or []) for r in rows] + [len(sh.get('cols') or [])])
        nr = max(nr, nc)  # numbers-parser: 줄 수가 칸 수보다 적은 표에 가로로 길게 합치면 저장에 실패해서 빈 줄을 채워요
        nm = name_of(sh.get('name'))
        if doc is None:
            doc = Document(sheet_name=nm, table_name=nm, num_header_rows=0, num_header_cols=0, num_rows=nr, num_cols=nc)
        else:
            doc.add_sheet(nm, nm, num_rows=nr, num_cols=nc)
        t = doc.sheets[-1].tables[0]
        for attr in ('num_header_rows', 'num_header_cols'):
            try:
                setattr(t, attr, 0)
            except Exception:
                pass

        def style_of(s):
            key = json.dumps(s, sort_keys=True)
            if key not in styles:
                kw = {'name': f'asc{len(styles)}', 'font_name': FONT, 'font_size': float(s.get('sz') or 11),
                      'bold': bool(s.get('b')), 'alignment': Alignment(s.get('h') or 'auto', 'middle')}
                if s.get('color') and rgb(s['color']):
                    kw['font_color'] = rgb(s['color'])
                if s.get('fill') and rgb(s['fill']):
                    kw['bg_color'] = rgb(s['fill'])
                if s.get('wrap'):
                    kw['text_wrap'] = True
                styles[key] = doc.add_style(**kw)
            return styles[key]

        for ri, r in enumerate(rows):
            for ci, c in enumerate(r or []):
                if c is None or c == '':
                    continue
                o = c if isinstance(c, dict) else {'v': c}
                v, s = o.get('v'), o.get('s')
                if v is None:
                    v = ''
                if isinstance(v, bool) or not isinstance(v, (int, float)):
                    v = str(v)
                if v == '' and not s:
                    continue
                if s:
                    t.write(ri, ci, v, style=style_of(s))
                    if s.get('bd'):
                        line = Border(2.0 if s['bd'] == 2 else 0.75, RGB(150, 150, 150), 'solid')
                        t.set_cell_border(ri, ci, ['top', 'right', 'bottom', 'left'], line)
                    if s.get('num') and isinstance(v, (int, float)):
                        t.set_cell_formatting(ri, ci, 'number', decimal_places=0, show_thousands_separator=True)
                else:
                    t.write(ri, ci, v)
        for m in (sh.get('merges') or []) if merges else []:
            try:
                t.merge_cells(m)
            except Exception:
                pass
        for ci, w in enumerate(sh.get('cols') or []):
            if w:
                t.col_width(ci, max(16, round(float(w) * 7.2)))
        for rr, h in (sh.get('heights') or {}).items():
            try:
                ri = int(rr) - 1
                if 0 <= ri < nr and h:
                    t.row_height(ri, round(float(h) * 1.25))
            except Exception:
                pass
    fd, path = tempfile.mkstemp(suffix='.numbers')
    os.close(fd)
    try:
        doc.save(path)
        with open(path, 'rb') as f:
            return f.read()
    finally:
        try:
            os.remove(path)
        except OSError:
            pass


class handler(BaseHTTPRequestHandler):
    def _send(self, code, body, ctype='application/json', extra=None):
        self.send_response(code)
        self.send_header('Content-Type', ctype)
        self.send_header('Cache-Control', 'no-store')
        for k, v in (extra or {}).items():
            self.send_header(k, v)
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        try:
            n = int(self.headers.get('Content-Length') or 0)
            if n <= 0 or n > MAX_BODY:
                return self._send(413, b'{"error":"too_big"}')
            book = json.loads(self.rfile.read(n).decode('utf-8'))
            try:
                data = build(book)
            except ValueError as e:
                if str(e) in ('no_sheets', 'too_big'):
                    raise
                data = build(book, merges=False)  # numbers-parser가 드물게 합치기에서 실패해요 → 합치기만 빼고 다시
            fname = re.sub(r'[\r\n"]', '', str(book.get('name') or 'sheet'))[:120] + '.numbers'
            return self._send(200, data, 'application/x-iwork-numbers-sffnumbers',
                              {'Content-Disposition': f"attachment; filename*=UTF-8''{quote(fname)}"})
        except ValueError as e:
            if os.environ.get('ASC_DEBUG'):
                traceback.print_exc()
            return self._send(400, json.dumps({'error': str(e)[:200]}).encode())
        except Exception:
            if os.environ.get('ASC_DEBUG'):
                traceback.print_exc()
            return self._send(500, b'{"error":"build_failed"}')

    def do_GET(self):
        self._send(405, b'{"error":"post_only"}')
