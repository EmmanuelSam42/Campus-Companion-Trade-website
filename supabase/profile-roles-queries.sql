-- =============================================================================
-- Campus Companion Trade — Profile role & status queries
-- =============================================================================
-- HOW TO USE:
-- 1. Supabase Dashboard → SQL Editor → New query
-- 2. Open THIS file in Cursor/Notepad → Ctrl+A → Ctrl+C
-- 3. Paste into SQL Editor (copy SQL only — not the file path)
-- 4. Replace your-email@example.com with your real email
-- 5. Run ONE section at a time (select the lines you need → Run)
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. MAKE YOURSELF ADMIN (run after registering in the app)
-- -----------------------------------------------------------------------------
-- Replace email, then run this block:

update profiles
set
  role = 'admin',
  status = 'approved',
  verified = true,
  full_name = coalesce(nullif(full_name, ''), 'Site Admin')
where email = 'your-email@example.com';


-- -----------------------------------------------------------------------------
-- 2. VERIFY — check your account
-- -----------------------------------------------------------------------------

select id, email, full_name, role, status, student_id, verified, created_at
from profiles
where email = 'your-email@example.com';


-- -----------------------------------------------------------------------------
-- 3. LIST RECENT USERS (find your email if update matched 0 rows)
-- -----------------------------------------------------------------------------

select id, email, full_name, role, status, student_id, created_at
from profiles
order by created_at desc
limit 20;


-- -----------------------------------------------------------------------------
-- 4. APPROVE A CUSTOMER (normal shopper)
-- -----------------------------------------------------------------------------

update profiles
set role = 'customer', status = 'approved'
where email = 'other-user@example.com';


-- -----------------------------------------------------------------------------
-- 5. APPROVE A VENDOR (business seller)
-- -----------------------------------------------------------------------------

update profiles
set role = 'vendor', status = 'approved'
where email = 'vendor@example.com';


-- -----------------------------------------------------------------------------
-- 6. VERIFY A VENDOR (gold badge on listings)
-- -----------------------------------------------------------------------------

update profiles
set verified = true
where email = 'vendor@example.com' and role = 'vendor';


-- -----------------------------------------------------------------------------
-- 7. SET PENDING (waiting for approval — blocks login)
-- -----------------------------------------------------------------------------

update profiles
set status = 'pending'
where email = 'someone@example.com';


-- -----------------------------------------------------------------------------
-- 8. REJECT OR SUSPEND (blocks login)
-- -----------------------------------------------------------------------------

update profiles
set status = 'rejected'
where email = 'someone@example.com';

-- or:
-- update profiles set status = 'suspended' where email = 'someone@example.com';


-- -----------------------------------------------------------------------------
-- 9. FIX STUDENT ID (if login says "Student ID does not match")
-- -----------------------------------------------------------------------------

update profiles
set student_id = 'YOUR_STUDENT_ID'
where email = 'your-email@example.com';


-- -----------------------------------------------------------------------------
-- 10. NO PROFILE ROW? Create one manually
-- -----------------------------------------------------------------------------
-- Get UUID from: Supabase → Authentication → Users → copy User UID
-- Replace PASTE-USER-UUID and email below:

/*
insert into profiles (id, full_name, email, role, status, student_id)
values (
  'PASTE-USER-UUID-HERE',
  'Your Full Name',
  'your-email@example.com',
  'admin',
  'approved',
  'YOUR_STUDENT_ID'
);
*/


-- -----------------------------------------------------------------------------
-- 11. PROMOTE BY USER ID (if you know the UUID, not the email)
-- -----------------------------------------------------------------------------

/*
update profiles
set role = 'admin', status = 'approved', verified = true
where id = 'PASTE-USER-UUID-HERE';
*/


-- -----------------------------------------------------------------------------
-- 12. COUNTS — dashboard-style overview
-- -----------------------------------------------------------------------------

select
  count(*) filter (where role = 'customer') as customers,
  count(*) filter (where role = 'vendor') as vendors,
  count(*) filter (where role = 'admin') as admins,
  count(*) filter (where status = 'pending') as pending_approval,
  count(*) filter (where status = 'approved') as approved,
  count(*) filter (where status = 'rejected') as rejected
from profiles;


-- -----------------------------------------------------------------------------
-- ROLE / STATUS REFERENCE
-- -----------------------------------------------------------------------------
-- role:    'customer' | 'vendor' | 'admin'
-- status:  'pending' | 'approved' | 'rejected' | 'suspended'
--
-- Login rules (app):
--   status must be 'approved' to log in
--   role 'admin'     → Admin Panel
--   role 'vendor'    → Vendor dashboard
--   role 'customer'  → Homepage / shop
-- =============================================================================
