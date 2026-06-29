-- Campus Companion Trade — Supabase schema
-- Run in Supabase SQL Editor (Dashboard → SQL → New query)

create extension if not exists "uuid-ossp";

-- ─── TABLES ───────────────────────────────────────────────────────────────

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text not null default '',
  role text not null default 'customer' check (role in ('customer', 'vendor', 'admin')),
  phone text,
  student_id text,
  hall text,
  business_name text,
  business_type text,
  business_bio text,
  business_logo_url text,
  campus_location text,
  social_handle text,
  availability_hours text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'suspended')),
  verified boolean not null default false,
  deletion_requested boolean not null default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists products (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  category text not null default 'General',
  price numeric(10, 2) not null default 0,
  type text not null default 'product' check (type in ('product', 'service')),
  description text,
  image_url text,
  vendor_name text,
  vendor_id uuid references profiles(id) on delete set null,
  featured boolean default false,
  in_stock boolean default true,
  avg_rating numeric(3, 2) default 0,
  review_count int default 0,
  availability_hours text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists hostels_listings (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  type text not null default 'Single',
  price_per_month numeric(10, 2) not null,
  location text,
  university text,
  distance text,
  amenities jsonb default '[]'::jsonb,
  available_from date,
  units_available int default 1,
  landlord_name text,
  landlord_phone text,
  rules text,
  images jsonb default '[]'::jsonb,
  vendor_id uuid references profiles(id) on delete set null,
  status text default 'pending' check (status in ('pending', 'live', 'occupied')),
  created_at timestamptz default now()
);

create table if not exists cart_items (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  quantity int not null default 1 check (quantity > 0),
  created_at timestamptz default now(),
  unique (user_id, product_id)
);

create table if not exists wishlist_items (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  product_id uuid references products(id) on delete cascade,
  hostels_id uuid references hostels_listings(id) on delete cascade,
  created_at timestamptz default now(),
  check (product_id is not null or hostels_id is not null)
);

create table if not exists orders (
  id uuid primary key default uuid_generate_v4(),
  order_number text unique not null,
  user_id uuid references profiles(id) on delete set null,
  user_name text,
  user_email text,
  items jsonb not null default '[]'::jsonb,
  subtotal numeric(10, 2) not null,
  delivery_fee numeric(10, 2) default 5.00,
  total numeric(10, 2) not null,
  payment_method text,
  payment_reference text,
  payment_status text default 'pending' check (payment_status in ('pending', 'paid', 'cod', 'failed')),
  delivery_name text,
  delivery_phone text,
  delivery_address text,
  notes text,
  status text default 'Processing' check (status in ('Processing', 'Confirmed', 'Delivered', 'Cancelled')),
  created_at timestamptz default now()
);

create table if not exists appointments (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id) on delete set null,
  product_id uuid references products(id) on delete set null,
  hostels_id uuid references hostels_listings(id) on delete set null,
  user_name text,
  service_name text,
  vendor_name text,
  preferred_date date,
  preferred_time text,
  message text,
  status text default 'pending' check (status in ('pending', 'confirmed', 'cancelled')),
  created_at timestamptz default now()
);

create table if not exists reviews (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references products(id) on delete cascade,
  user_id uuid references profiles(id) on delete set null,
  user_name text,
  rating int not null check (rating between 1 and 5),
  body text,
  flagged boolean default false,
  created_at timestamptz default now()
);

create table if not exists site_settings (
  id int primary key default 1 check (id = 1),
  tagline text default 'Students'' Ultimate Helping Hand',
  logo_url text,
  announcement_banner text,
  categories jsonb default '["Fashion","Electronics","Food","Services","Hostels & Rentals","General"]'::jsonb,
  updated_at timestamptz default now()
);

insert into site_settings (id) values (1) on conflict (id) do nothing;

create table if not exists audit_log (
  id uuid primary key default uuid_generate_v4(),
  admin_id uuid references profiles(id) on delete set null,
  admin_name text,
  action_type text not null,
  target_type text,
  target_id text,
  target_name text,
  details jsonb,
  created_at timestamptz default now()
);

-- ─── FUNCTIONS & TRIGGERS ─────────────────────────────────────────────────

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id, full_name, email, role, phone, student_id, hall,
    business_name, business_type, business_bio, business_logo_url,
    campus_location, social_handle, availability_hours, status
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'role', 'customer'),
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'student_id',
    new.raw_user_meta_data->>'hall',
    new.raw_user_meta_data->>'business_name',
    new.raw_user_meta_data->>'business_type',
    new.raw_user_meta_data->>'business_bio',
    new.raw_user_meta_data->>'business_logo_url',
    new.raw_user_meta_data->>'campus_location',
    new.raw_user_meta_data->>'social_handle',
    new.raw_user_meta_data->>'availability_hours',
    'pending'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.auth_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.profile_requires_reapproval()
returns trigger
language plpgsql
as $$
begin
  if old.role <> 'admin' and (
    new.full_name is distinct from old.full_name or
    new.phone is distinct from old.phone or
    new.hall is distinct from old.hall or
    new.business_name is distinct from old.business_name or
    new.business_bio is distinct from old.business_bio or
    new.campus_location is distinct from old.campus_location or
    new.business_logo_url is distinct from old.business_logo_url or
    new.deletion_requested is distinct from old.deletion_requested
  ) then
    new.status := 'pending';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_reapproval on profiles;
create trigger profiles_reapproval
  before update on profiles
  for each row execute function public.profile_requires_reapproval();

create or replace function public.update_product_rating()
returns trigger
language plpgsql
as $$
begin
  update products set
    avg_rating = coalesce((select avg(rating)::numeric(3,2) from reviews where product_id = new.product_id), 0),
    review_count = (select count(*)::int from reviews where product_id = new.product_id)
  where id = new.product_id;
  return new;
end;
$$;

drop trigger if exists on_review_change on reviews;
create trigger on_review_change
  after insert or update or delete on reviews
  for each row execute function public.update_product_rating();

-- ─── INDEXES ────────────────────────────────────────────────────────────────

-- Products indexes
create index if not exists idx_products_created_at on products(created_at desc);
create index if not exists idx_products_category on products(category);
create index if not exists idx_products_type on products(type);
create index if not exists idx_products_vendor_id on products(vendor_id);
create index if not exists idx_products_featured on products(featured) where featured = true;
create index if not exists idx_products_in_stock on products(in_stock) where in_stock = true;

-- Hostels listings indexes
create index if not exists idx_hostels_status on hostels_listings(status);
create index if not exists idx_hostels_vendor_id on hostels_listings(vendor_id);
create index if not exists idx_hostels_created_at on hostels_listings(created_at desc);
create index if not exists idx_hostels_price on hostels_listings(price_per_month);
create index if not exists idx_hostels_status_vendor on hostels_listings(status, vendor_id) where status = 'live';

-- Cart items indexes
create index if not exists idx_cart_items_user_id on cart_items(user_id);
create index if not exists idx_cart_items_product_id on cart_items(product_id);
create index if not exists idx_cart_items_user_product on cart_items(user_id, product_id);

-- Wishlist items indexes
create index if not exists idx_wishlist_items_user_id on wishlist_items(user_id);
create index if not exists idx_wishlist_items_product_id on wishlist_items(product_id);
create index if not exists idx_wishlist_items_hostels_id on wishlist_items(hostels_id);
create index if not exists idx_wishlist_items_user_product on wishlist_items(user_id, product_id);
create index if not exists idx_wishlist_items_user_hostel on wishlist_items(user_id, hostels_id);

-- Orders indexes
create index if not exists idx_orders_user_id on orders(user_id);
create index if not exists idx_orders_status on orders(status);
create index if not exists idx_orders_created_at on orders(created_at desc);
create index if not exists idx_orders_user_status on orders(user_id, status);
create index if not exists idx_orders_user_created on orders(user_id, created_at desc);

-- Appointments indexes
create index if not exists idx_appointments_user_id on appointments(user_id);
create index if not exists idx_appointments_status on appointments(status);
create index if not exists idx_appointments_user_status on appointments(user_id, status);
create index if not exists idx_appointments_product_id on appointments(product_id);
create index if not exists idx_appointments_hostels_id on appointments(hostels_id);

-- ─── RLS ────────────────────────────────────────────────────────────────────

alter table profiles enable row level security;
alter table products enable row level security;
alter table hostels_listings enable row level security;
alter table cart_items enable row level security;
alter table wishlist_items enable row level security;
alter table orders enable row level security;
alter table appointments enable row level security;
alter table reviews enable row level security;
alter table site_settings enable row level security;
alter table audit_log enable row level security;

-- profiles
drop policy if exists profiles_select on profiles;
create policy profiles_select on profiles for select using (true);
drop policy if exists profiles_update_own on profiles;
create policy profiles_update_own on profiles for update using (auth.uid() = id);
drop policy if exists profiles_admin_all on profiles;
create policy profiles_admin_all on profiles for all using (public.auth_role() = 'admin');

-- products
drop policy if exists products_select on products;
create policy products_select on products for select using (true);
drop policy if exists products_insert on products;
create policy products_insert on products for insert with check (
  public.auth_role() in ('vendor', 'admin') or vendor_id = auth.uid()
);
drop policy if exists products_update on products;
create policy products_update on products for update using (
  vendor_id = auth.uid() or public.auth_role() = 'admin'
);
drop policy if exists products_delete on products;
create policy products_delete on products for delete using (
  vendor_id = auth.uid() or public.auth_role() = 'admin'
);

-- hostels
drop policy if exists hostels_select on hostels_listings;
create policy hostels_select on hostels_listings for select using (
  status = 'live' or vendor_id = auth.uid() or public.auth_role() = 'admin'
);
drop policy if exists hostels_write on hostels_listings;
create policy hostels_write on hostels_listings for all using (
  vendor_id = auth.uid() or public.auth_role() in ('vendor', 'admin')
);

-- cart & wishlist
drop policy if exists cart_own on cart_items;
create policy cart_own on cart_items for all using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists wishlist_own on wishlist_items;
create policy wishlist_own on wishlist_items for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- orders
drop policy if exists orders_select on orders;
create policy orders_select on orders for select using (
  user_id = auth.uid() or public.auth_role() in ('admin', 'vendor')
);
drop policy if exists orders_insert on orders;
create policy orders_insert on orders for insert with check (user_id = auth.uid());
drop policy if exists orders_update_admin on orders;
create policy orders_update_admin on orders for update using (public.auth_role() = 'admin');

-- appointments
drop policy if exists appointments_select on appointments;
create policy appointments_select on appointments for select using (
  user_id = auth.uid()
  or public.auth_role() = 'admin'
  or exists (
    select 1 from products p
    where p.id = appointments.product_id and p.vendor_id = auth.uid()
  )
);
drop policy if exists appointments_insert on appointments;
create policy appointments_insert on appointments for insert with check (user_id = auth.uid());
drop policy if exists appointments_update on appointments;
create policy appointments_update on appointments for update using (
  public.auth_role() in ('admin', 'vendor') or user_id = auth.uid()
);

-- reviews
drop policy if exists reviews_select on reviews;
create policy reviews_select on reviews for select using (true);
drop policy if exists reviews_insert on reviews;
create policy reviews_insert on reviews for insert with check (user_id = auth.uid());
drop policy if exists reviews_delete_admin on reviews;
create policy reviews_delete_admin on reviews for delete using (public.auth_role() = 'admin');
drop policy if exists reviews_update_admin on reviews;
create policy reviews_update_admin on reviews for update using (public.auth_role() = 'admin');

-- site_settings
drop policy if exists settings_select on site_settings;
create policy settings_select on site_settings for select using (true);
drop policy if exists settings_update on site_settings;
create policy settings_update on site_settings for update using (public.auth_role() = 'admin');

-- audit_log
drop policy if exists audit_admin on audit_log;
create policy audit_admin on audit_log for select using (public.auth_role() = 'admin');
drop policy if exists audit_insert on audit_log;
create policy audit_insert on audit_log for insert with check (public.auth_role() = 'admin');

-- ─── STORAGE (run in Dashboard or via API) ──────────────────────────────────
-- Buckets: logos, products, hostels, avatars — public read, auth upload

-- Bootstrap first admin (replace email after you register):
-- update profiles set role = 'admin', status = 'approved' where email = 'you@example.com';

-- ─── MIGRATIONS (safe to re-run on existing projects) ───────────────────────
alter table orders add column if not exists payment_reference text;
alter table orders add column if not exists payment_status text default 'pending';
-- Enable Realtime: Dashboard → Database → Replication → orders, appointments, profiles
