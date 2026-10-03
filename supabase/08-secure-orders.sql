-- Secure order creation and payment state transitions.
-- Review against the connected project's live schema before applying.
begin;

-- Normalize historical values before enforcing one consistent order status vocabulary.
update public.orders
set status = case lower(coalesce(status, 'pending'))
  when 'processing' then 'processing'
  when 'confirmed' then 'processing'
  when 'delivered' then 'completed'
  when 'completed' then 'completed'
  when 'cancelled' then 'cancelled'
  else 'pending'
end
where status is distinct from case lower(coalesce(status, 'pending'))
  when 'processing' then 'processing'
  when 'confirmed' then 'processing'
  when 'delivered' then 'completed'
  when 'completed' then 'completed'
  when 'cancelled' then 'cancelled'
  else 'pending'
end;

alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders
  add constraint orders_status_check
  check (status = any (array['pending','processing','completed','cancelled']::text[]));

-- Remove direct client-side order creation and customer-controlled updates.
drop policy if exists orders_insert on public.orders;
drop policy if exists orders_write on public.orders;
drop policy if exists orders_admin_update on public.orders;
create policy orders_admin_update
  on public.orders for update to authenticated
  using ((select public.auth_role()) = 'admin')
  with check ((select public.auth_role()) = 'admin');

-- Keep customer/admin read access controlled by the existing orders_select policy.
revoke insert, update, delete, truncate, references, trigger
  on table public.orders from anon;
revoke insert, delete, truncate, references, trigger
  on table public.orders from authenticated;
grant select on table public.orders to authenticated;
grant update on table public.orders to authenticated;

-- order_items is not used by the current frontend; close its broad client write paths.
drop policy if exists "Enable insert for authenticated users only" on public.order_items;
drop policy if exists order_items_write on public.order_items;
revoke insert, update, delete, truncate, references, trigger
  on table public.order_items from anon, authenticated;

commit;
