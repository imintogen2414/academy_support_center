-- 물품 구매 요청(결재 '물품 구입')은 원장 · 강사 모두 볼 수 있어요 (누가 무엇을 요청했는지 · 겹쳐 사지 않게)
-- 승인 · 구입 완료는 그대로 원장 · 결재 처리 권한만 (decide_approval · mark_approval_paid)
create policy "구매 요청은 학원 원장·강사가 봄" on public.approvals for select to authenticated
  using (kind = '물품 구입' and private.academy_role(academy_id) in ('owner', 'teacher'));
