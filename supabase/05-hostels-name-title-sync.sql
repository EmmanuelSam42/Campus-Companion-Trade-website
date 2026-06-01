-- Fix: null value in column "name" of relation "hostels_listings"
-- Your table has an OLD required column "name" AND newer column "title".
-- This syncs them and keeps future inserts working.

-- Ensure both columns exist
alter table public.hostels_listings add column if not exists name text;
alter table public.hostels_listings add column if not exists title text;

-- Copy title → name where name is empty
update public.hostels_listings
set name = title
where (name is null or name = '') and title is not null and title <> '';

-- Copy name → title where title is empty (older rows)
update public.hostels_listings
set title = name
where (title is null or title = '') and name is not null and name <> '';

-- Optional: stop NOT NULL on name if you only use title in the app
alter table public.hostels_listings alter column name drop not null;

-- Auto-sync on future inserts/updates
create or replace function public.hostels_sync_name_title()
returns trigger
language plpgsql
as $$
begin
  if new.title is not null and new.title <> '' then
    new.name := coalesce(nullif(new.name, ''), new.title);
  elsif new.name is not null and new.name <> '' then
    new.title := coalesce(nullif(new.title, ''), new.name);
  end if;
  return new;
end;
$$;

drop trigger if exists hostels_sync_name_title on public.hostels_listings;
create trigger hostels_sync_name_title
  before insert or update on public.hostels_listings
  for each row execute function public.hostels_sync_name_title();

-- Also sync price / price_per_month (run 06-hostels-price-sync.sql if price errors persist)

select id, name, title, price, price_per_month, status from public.hostels_listings limit 5;
