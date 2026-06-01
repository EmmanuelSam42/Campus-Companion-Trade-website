-- Run this if site_settings is empty or homepage has no tagline
insert into site_settings (id, tagline, announcement_banner)
values (
  1,
  'Students'' Ultimate Helping Hand',
  'Welcome to Campus Companion Trade — your campus marketplace is live!'
)
on conflict (id) do update set
  tagline = excluded.tagline,
  announcement_banner = excluded.announcement_banner,
  updated_at = now();

select * from site_settings;
