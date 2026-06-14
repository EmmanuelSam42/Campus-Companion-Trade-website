# Campus Companion Trade

**Students' Ultimate Helping Hand** — A campus marketplace for products, services, and hostel rentals.

## Quick start

1. **Logo** — Place `Campus_Co_official_logo-Photoroom.png` in this folder (same level as `index.html`).

2. **Supabase** — In [Supabase Dashboard](https://supabase.com/dashboard) → your project → **SQL Editor**, run the full script:
   ```
   supabase/schema.sql
   ```

3. **Storage** — Create buckets (Dashboard → Storage):
   - `logos`, `products`, `hostels`, `avatars`
   - Set each to **public** read; allow authenticated uploads.

4. **First admin** — Register once in the app, then run:
   ```sql
   update profiles
   set role = 'admin', status = 'approved'
   where email = 'your-email@example.com';
   ```

5. **Run locally** — Open `index.html` in a browser, or serve the folder:
   ```powershell
   cd "C:\Users\Gifted Soul\Projects\campus-companion-trade1"
   npx --yes serve .
   ```
   Then visit `http://localhost:3000`

## Files

| File | Purpose |
|------|---------|
| `index.html` | UI, styles, all page markup |
| `app.js` | Supabase client, routing, dashboards |
| `supabase/schema.sql` | Tables, RLS, triggers |

> Original spec asked for one HTML file. Logic lives in `app.js` for easier editing; you can inline it into `<script>` in `index.html` if you prefer a single file.

## Supabase credentials

Configured in `app.js`:
- URL: `https://dhidvacvupjihqnzwdik.supabase.co`
- Anon key: (see `app.js`)

Never commit the **service role** key.

## Features

- Auth: login/register with admin approval workflow
- Roles: customer, vendor, admin with role-based nav
- Products & services, hostels, cart, checkout, orders, wishlist
- Vendor dashboard: products, orders, appointments, reviews
- Admin dashboard: users, products, hostels, orders, settings, audit log

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `relation does not exist` | Run `schema.sql` |
| `Profile not found` | Check `handle_new_user` trigger |
| Logo missing | Add PNG to project root |
| Storage upload fails | Create buckets + policies |

Powered by **Supabase** (PostgreSQL + Auth + Storage).
