-- ONE FILE: fixes legacy hostels_listings (name/title + price/price_per_month)
-- Copy ALL of this file into Supabase SQL Editor → Run → then run seed.sql

-- === name + title ===
alter table public.hostels_listings add column if not exists name text;
alter table public.hostels_listings add column if not exists title text;
update public.hostels_listings set name = title where (name is null or name = '') and title is not null;
update public.hostels_listings set title = name where (title is null or title = '') and name is not null;
alter table public.hostels_listings alter column name drop not null;

-- === From 06: price + price_per_month ===
alter table public.hostels_listings add column if not exists price numeric(10, 2);
alter table public.hostels_listings add column if not exists price_per_month numeric(10, 2);
update public.hostels_listings set price = price_per_month where price is null and price_per_month is not null;
update public.hostels_listings set price_per_month = price where price_per_month is null and price is not null;
alter table public.hostels_listings alter column price drop not null;

-- Combined trigger
create or replace function public.hostels_legacy_sync()
returns trigger language plpgsql as $$
begin
  if new.title is not null and new.title <> '' then
    new.name := coalesce(nullif(new.name, ''), new.title);
  elsif new.name is not null and new.name <> '' then
    new.title := coalesce(nullif(new.title, ''), new.name);
  end if;
  if new.price_per_month is not null then
    new.price := coalesce(new.price, new.price_per_month);
  elsif new.price is not null then
    new.price_per_month := coalesce(new.price_per_month, new.price);
  end if;
  return new;
end;
$$;

drop trigger if exists hostels_sync_name_title on public.hostels_listings;
drop trigger if exists hostels_sync_price_columns on public.hostels_listings;
drop trigger if exists hostels_legacy_sync on public.hostels_listings;
create trigger hostels_legacy_sync
  before insert or update on public.hostels_listings
  for each row execute function public.hostels_legacy_sync();

select id, name, title, price, price_per_month, status from public.hostels_listings limit 5;
