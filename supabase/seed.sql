-- Campus Companion Trade — sample seed data
-- Run AFTER schema.sql and AFTER you have at least one approved admin/vendor profile.
-- Replace VENDOR_UUID below with a real profiles.id (vendor or admin).

-- Example: use your admin id
-- select id, email from profiles where role = 'admin' limit 1;

-- ─── Uncomment and set your vendor/admin UUID ───────────────────────────────
-- \set vendor_id '00000000-0000-0000-0000-000000000000'

-- Or insert as Campus Companion (no vendor_id):
insert into products (name, category, price, type, description, image_url, vendor_name, featured, in_stock, avg_rating, review_count)
values
  ('Campus Essentials Kit', 'General', 45.00, 'product', 'Notebook, pens, and highlighters for the semester.', 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600', 'Campus Companion', true, true, 4.5, 12),
  ('Phone Repair & Screen Fix', 'Electronics', 80.00, 'service', 'Same-day screen and battery repairs near campus.', 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=600', 'Campus Companion', true, true, 4.8, 8),
  ('Jollof Rice Plate', 'Food', 25.00, 'product', 'Fresh jollof with chicken — student portion.', 'https://images.unsplash.com/photo-1604329760661-e71dc83f2b26?w=600', 'Campus Companion', true, true, 4.2, 24),
  ('Laundry Pickup Service', 'Services', 15.00, 'service', 'We collect, wash, and return within 48 hours.', 'https://images.unsplash.com/photo-1582735687156-581b8ead5eeb?w=600', 'Campus Companion', false, true, 4.0, 5)
on conflict do nothing;

-- name + title: some databases have a legacy NOT NULL "name" column
insert into hostels_listings (name, title, type, price, price_per_month, location, university, amenities, available_from, units_available, landlord_name, landlord_phone, rules, images, status)
values (
  'Sunrise Hall Annex',
  'Sunrise Hall Annex',
  'Single',
  650.00,
  650.00,
  'East Legon, 5 min walk to gate',
  'University of Ghana',
  '["WiFi","Furnished","Water","AC"]'::jsonb,
  current_date + interval '14 days',
  3,
  'Campus Companion Housing',
  '+233200000000',
  'No loud music after 10pm. Visitors sign in at reception.',
  '["https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800","https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800"]'::jsonb,
  'live'
)
on conflict do nothing;

update site_settings set
  tagline = 'Students'' Ultimate Helping Hand',
  announcement_banner = 'Welcome to Campus Companion Trade — your campus marketplace is live!'
where id = 1;
