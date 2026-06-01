-- Fix missing columns (safe to run multiple times)
-- Use when you see: column "status" does not exist, column "product_id" does not exist, etc.
-- Copy ALL lines below into Supabase SQL Editor → Run

-- ─── profiles ───────────────────────────────────────────────────────────────
alter table public.profiles add column if not exists full_name text default '';
alter table public.profiles add column if not exists email text default '';
alter table public.profiles add column if not exists role text default 'customer';
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists student_id text;
alter table public.profiles add column if not exists hall text;
alter table public.profiles add column if not exists business_name text;
alter table public.profiles add column if not exists business_type text;
alter table public.profiles add column if not exists business_bio text;
alter table public.profiles add column if not exists business_logo_url text;
alter table public.profiles add column if not exists campus_location text;
alter table public.profiles add column if not exists social_handle text;
alter table public.profiles add column if not exists availability_hours text;
alter table public.profiles add column if not exists status text default 'pending';
alter table public.profiles add column if not exists verified boolean default false;
alter table public.profiles add column if not exists deletion_requested boolean default false;
alter table public.profiles add column if not exists created_at timestamptz default now();
alter table public.profiles add column if not exists updated_at timestamptz default now();

update public.profiles set status = 'pending' where status is null;
update public.profiles set verified = false where verified is null;
update public.profiles set deletion_requested = false where deletion_requested is null;
update public.profiles set role = 'customer' where role is null;

-- ─── products ───────────────────────────────────────────────────────────────
alter table public.products add column if not exists category text default 'General';
alter table public.products add column if not exists type text default 'product';
alter table public.products add column if not exists description text;
alter table public.products add column if not exists image_url text;
alter table public.products add column if not exists vendor_name text;
alter table public.products add column if not exists vendor_id uuid;
alter table public.products add column if not exists featured boolean default false;
alter table public.products add column if not exists in_stock boolean default true;
alter table public.products add column if not exists avg_rating numeric(3, 2) default 0;
alter table public.products add column if not exists review_count int default 0;
alter table public.products add column if not exists availability_hours text;
alter table public.products add column if not exists created_at timestamptz default now();
alter table public.products add column if not exists updated_at timestamptz default now();

-- ─── hostels_listings ───────────────────────────────────────────────────────
alter table public.hostels_listings add column if not exists name text;
alter table public.hostels_listings add column if not exists title text;
alter table public.hostels_listings add column if not exists price numeric(10, 2);
alter table public.hostels_listings add column if not exists price_per_month numeric(10, 2) default 0;

update public.hostels_listings set price = price_per_month where price is null and price_per_month is not null;
update public.hostels_listings set price_per_month = price where price_per_month is null and price is not null;
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

update public.hostels_listings set status = 'pending' where status is null;

-- ─── cart_items ─────────────────────────────────────────────────────────────
alter table public.cart_items add column if not exists user_id uuid;
alter table public.cart_items add column if not exists product_id uuid;
alter table public.cart_items add column if not exists quantity int default 1;
alter table public.cart_items add column if not exists created_at timestamptz default now();

-- ─── wishlist_items ─────────────────────────────────────────────────────────
alter table public.wishlist_items add column if not exists user_id uuid;
alter table public.wishlist_items add column if not exists product_id uuid;
alter table public.wishlist_items add column if not exists hostels_id uuid;
alter table public.wishlist_items add column if not exists created_at timestamptz default now();

-- ─── orders ─────────────────────────────────────────────────────────────────
alter table public.orders add column if not exists order_number text;
alter table public.orders add column if not exists user_id uuid;
alter table public.orders add column if not exists user_name text;
alter table public.orders add column if not exists user_email text;
alter table public.orders add column if not exists items jsonb default '[]'::jsonb;
alter table public.orders add column if not exists subtotal numeric(10, 2) default 0;
alter table public.orders add column if not exists delivery_fee numeric(10, 2) default 5.00;
alter table public.orders add column if not exists total numeric(10, 2) default 0;
alter table public.orders add column if not exists payment_method text;
alter table public.orders add column if not exists delivery_name text;
alter table public.orders add column if not exists delivery_phone text;
alter table public.orders add column if not exists delivery_address text;
alter table public.orders add column if not exists notes text;
alter table public.orders add column if not exists status text default 'Processing';
alter table public.orders add column if not exists created_at timestamptz default now();

update public.orders set status = 'Processing' where status is null;

-- ─── appointments (fixes product_id / hostels_id errors) ────────────────────
alter table public.appointments add column if not exists user_id uuid;
alter table public.appointments add column if not exists product_id uuid;
alter table public.appointments add column if not exists hostels_id uuid;
alter table public.appointments add column if not exists user_name text;
alter table public.appointments add column if not exists service_name text;
alter table public.appointments add column if not exists vendor_name text;
alter table public.appointments add column if not exists preferred_date date;
alter table public.appointments add column if not exists preferred_time text;
alter table public.appointments add column if not exists message text;
alter table public.appointments add column if not exists status text default 'pending';
alter table public.appointments add column if not exists created_at timestamptz default now();

update public.appointments set status = 'pending' where status is null;

-- ─── reviews ────────────────────────────────────────────────────────────────
alter table public.reviews add column if not exists product_id uuid;
alter table public.reviews add column if not exists user_id uuid;
alter table public.reviews add column if not exists user_name text;
alter table public.reviews add column if not exists rating int;
alter table public.reviews add column if not exists body text;
alter table public.reviews add column if not exists flagged boolean default false;
alter table public.reviews add column if not exists created_at timestamptz default now();

-- ─── site_settings ──────────────────────────────────────────────────────────
alter table public.site_settings add column if not exists tagline text;
alter table public.site_settings add column if not exists logo_url text;
alter table public.site_settings add column if not exists announcement_banner text;
alter table public.site_settings add column if not exists categories jsonb default '["Fashion","Electronics","Food","Services","Hostels & Rentals","General"]'::jsonb;
alter table public.site_settings add column if not exists updated_at timestamptz default now();

-- ─── audit_log ──────────────────────────────────────────────────────────────
alter table public.audit_log add column if not exists admin_id uuid;
alter table public.audit_log add column if not exists admin_name text;
alter table public.audit_log add column if not exists action_type text;
alter table public.audit_log add column if not exists target_type text;
alter table public.audit_log add column if not exists target_id text;
alter table public.audit_log add column if not exists target_name text;
alter table public.audit_log add column if not exists details jsonb;
alter table public.audit_log add column if not exists created_at timestamptz default now();

-- ─── Verify key columns exist ───────────────────────────────────────────────
select table_name, column_name
from information_schema.columns
where table_schema = 'public'
  and table_name in ('profiles', 'appointments')
  and column_name in ('status', 'product_id', 'hostels_id')
order by table_name, column_name;
