-- Fix: column "title" of relation "hostels_listings" does not exist
-- Run before seed.sql. Safe to run multiple times.

alter table public.hostels_listings add column if not exists name text;
alter table public.hostels_listings add column if not exists title text;
alter table public.hostels_listings add column if not exists price_per_month numeric(10, 2) default 0;
alter table public.hostels_listings add column if not exists type text default 'Single';
alter table public.hostels_listings add column if not exists location text;
alter table public.hostels_listings add column if not exists university text;
alter table public.hostels_listings add column if not exists distance text;
alter table public.hostels_listings add column if not exists amenities jsonb default '[]'::jsonb;
alter table public.hostels_listings add column if not exists available_from date;
alter table public.hostels_listings add column if not exists units_available int default 1;
alter table public.hostels_listings add column if not exists landlord_name text;
alter table public.hostels_listings add column if not exists landlord_phone text;
alter table public.hostels_listings add column if not exists rules text;
alter table public.hostels_listings add column if not exists images jsonb default '[]'::jsonb;
alter table public.hostels_listings add column if not exists vendor_id uuid;
alter table public.hostels_listings add column if not exists status text default 'pending';
alter table public.hostels_listings add column if not exists created_at timestamptz default now();

-- Show all columns on hostels_listings
select column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'hostels_listings'
order by ordinal_position;
