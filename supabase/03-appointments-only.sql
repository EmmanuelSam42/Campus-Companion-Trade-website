-- Quick fix ONLY for: column appointments.product_id does not exist
-- Paste this alone if you don't want the full 02-fix file.

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

select column_name from information_schema.columns
where table_schema = 'public' and table_name = 'appointments'
order by column_name;
