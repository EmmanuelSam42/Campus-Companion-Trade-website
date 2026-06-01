-- Fix: null value in column "price" of relation "hostels_listings"
-- Legacy column "price" (NOT NULL) vs app column "price_per_month"

alter table public.hostels_listings add column if not exists price numeric(10, 2);
alter table public.hostels_listings add column if not exists price_per_month numeric(10, 2);

-- Sync existing rows
update public.hostels_listings
set price = price_per_month
where price is null and price_per_month is not null;

update public.hostels_listings
set price_per_month = price
where price_per_month is null and price is not null;

-- Allow inserts that only set price_per_month (app/seed)
alter table public.hostels_listings alter column price drop not null;

create or replace function public.hostels_sync_price_columns()
returns trigger
language plpgsql
as $$
begin
  if new.price_per_month is not null then
    new.price := coalesce(new.price, new.price_per_month);
  elsif new.price is not null then
    new.price_per_month := coalesce(new.price_per_month, new.price);
  end if;
  return new;
end;
$$;

drop trigger if exists hostels_sync_price_columns on public.hostels_listings;
create trigger hostels_sync_price_columns
  before insert or update on public.hostels_listings
  for each row execute function public.hostels_sync_price_columns();

select id, name, title, price, price_per_month, status
from public.hostels_listings
limit 5;
