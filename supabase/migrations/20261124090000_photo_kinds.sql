-- 사진으로 넣기: 시간표 · 수강료표에 원생 명단(students) · 영수증 · 장부(ledger)도 (AI 읽기 장수는 종류와 상관없이 학원마다 한 달 10장)
alter table public.photo_reads drop constraint if exists photo_reads_kind_check;
alter table public.photo_reads add constraint photo_reads_kind_check check (kind in ('timetable', 'tuition', 'students', 'ledger'));
