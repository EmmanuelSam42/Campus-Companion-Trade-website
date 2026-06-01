-- Quick shortcut: make yourself admin after registering
-- For all role/status queries see: profile-roles-queries.sql

update profiles
set
  role = 'admin',
  status = 'approved',
  verified = true,
  full_name = coalesce(nullif(full_name, ''), 'Site Admin')
where email = 'YOUR_EMAIL@example.com';

select id, email, full_name, role, status, student_id
from profiles
where email = 'YOUR_EMAIL@example.com';
