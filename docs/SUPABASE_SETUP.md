# Supabase setup guide (beginners)

This walks you through **everything** for Campus Companion Trade. Your project is already created:

| Setting | Value |
|---------|--------|
| **Project URL** | `https://dhidvacvupjihqnzwdik.supabase.co` |
| **Dashboard** | https://supabase.com/dashboard/project/dhidvacvupjihqnzwdik |

The app reads keys from `app.js` — you do **not** need to change code if these match.

---

## What Supabase does for this app

| Piece | Role |
|-------|------|
| **Database (PostgreSQL)** | Products, orders, profiles, hostels, cart, etc. |
| **Auth** | Login, register, passwords |
| **Storage** | Product images, logos, avatars |
| **API** | Your website talks to Supabase over HTTPS |

You will use the **Dashboard** (website) only — no terminal required for Supabase itself.

---

## Step 1 — Open your project

1. Go to https://supabase.com and sign in (or create a free account).
2. Click your project **dhidvacvupjihqnzwdik** (or the name you gave it).
3. You should see the left sidebar: **Table Editor**, **SQL Editor**, **Authentication**, **Storage**, etc.

---

## Step 2 — Confirm API keys (optional check)

1. Left sidebar → **Project Settings** (gear icon at bottom).
2. Click **API**.
3. You should see:
   - **Project URL:** `https://dhidvacvupjihqnzwdik.supabase.co`
   - **anon public** key — same as in `app.js`

Keep the **service_role** key secret — never put it in `index.html` or GitHub.

---

## ⚠️ Error: `syntax error at or near "supabase"`

That means you pasted the **folder name or file path**, not the SQL inside the file.

| ❌ WRONG (do not paste in SQL Editor) | ✅ RIGHT (paste this kind of text) |
|--------------------------------------|-------------------------------------|
| `supabase/schema.sql` | `create extension if not exists "uuid-ossp";` |
| `run supabase\schema.sql` | `create table if not exists profiles (` |
| `C:\Users\...\supabase\schema.sql` | Lines starting with `--` comments and `create table` |

**How to copy correctly**

1. Open the file **in Cursor or Notepad** (double-click `schema.sql` in the project).
2. Click inside the editor → **Ctrl+A** (select all) → **Ctrl+C**.
3. In Supabase **SQL Editor**, click in the big text box → **Ctrl+V**.
4. The first line should look like: `-- Campus Companion Trade` or `create extension...`
5. If the first word you see is `supabase` or a Windows path — you copied the wrong thing.

**Quick test** — paste only this in SQL Editor and Run:

```sql
select 1 as test;
```

If that works, your SQL Editor is fine; copy the real file contents next.

---

## Step 3 — Run the database schema (most important)

This creates all tables, security rules, and triggers.

1. Left sidebar → **SQL Editor**.
2. Click **+ New query**.
3. On your PC, open this file **in an editor** (not the SQL box):

   `C:\Users\Gifted Soul\Projects\campus-companion-trade1\supabase\schema.sql`

4. **Select all** (Ctrl+A) → **Copy** (Ctrl+C) — you should copy **hundreds of lines** starting with `--` and `create`.
5. Paste into the Supabase SQL Editor.
6. Click **Run** (or Ctrl+Enter).
7. Wait for **Success. No rows returned** (or similar green message).

### If you see errors

| Error | What to do |
|-------|------------|
| `column "status" does not exist` | Run **`02-fix-missing-columns.sql`** (copy file contents, not the path) |
| `column appointments.product_id does not exist` | Run **`02-fix-missing-columns.sql`** OR **`03-appointments-only.sql`** |
| `column "title" … hostels_listings` | Run **`02-fix-missing-columns.sql`** OR **`04-hostels-listings-only.sql`**, then **`seed.sql`** again |
| `already exists` on tables | Schema was partly run before — run `02-fix-missing-columns.sql`, then continue |
| `permission denied` | Make sure you’re project owner; try again logged in as owner |
| `function uuid_generate_v4 does not exist` | Run first line: `create extension if not exists "uuid-ossp";` then run rest |

### Verify tables exist

1. Left sidebar → **Table Editor**.
2. You should see: `profiles`, `products`, `hostels_listings`, `cart_items`, `wishlist_items`, `orders`, `appointments`, `reviews`, `site_settings`, `audit_log`.

---

## Step 4 — Fix site settings row (if empty)

1. **SQL Editor** → **New query**.
2. Paste and **Run**:

```sql
insert into site_settings (id, tagline, announcement_banner)
values (1, 'Students'' Ultimate Helping Hand', 'Welcome to Campus Companion Trade!')
on conflict (id) do update set
  tagline = excluded.tagline,
  announcement_banner = excluded.announcement_banner;
```

3. **Table Editor** → `site_settings` → you should see **1 row**.

---

## Step 5 — Authentication settings

New users must be **approved by admin** before they can use the app (by design).

1. Left sidebar → **Authentication** → **Providers**.
2. **Email** should be **Enabled**.
3. Click **Email** and configure for development:

   | Option | Recommended for now |
   |--------|---------------------|
   | Confirm email | **OFF** (easier testing; turn ON before public launch) |
   | Secure email change | ON |
   | Minimum password length | 6+ |

4. Go to **Authentication** → **URL Configuration**:
   - **Site URL:** `http://localhost:3000` (if using `npx serve`)
   - **Redirect URLs** — add these (one per line):
     ```
     http://localhost:3000/**
     http://127.0.0.1:3000/**
     http://localhost:5500/**
     file://**
     ```
   - When you deploy later, add your real domain: `https://your-site.netlify.app/**`

5. **Authentication** → **Policies** (if shown): default is fine.

---

## Step 6 — Storage buckets (images)

1. Left sidebar → **Storage**.
2. Click **New bucket** and create **four** buckets:

| Bucket name | Public bucket? | Notes |
|-------------|----------------|--------|
| `logos` | **Yes** (toggle ON) | Business & site logos |
| `products` | **Yes** | Product/service images |
| `hostels` | **Yes** | Hostel photos |
| `avatars` | **Yes** | Profile photos |

For each bucket:
- Name must match **exactly** (lowercase).
- Enable **Public bucket** so images show on the website without extra login.

### Storage policies (SQL)

1. **SQL Editor** → **New query**.
2. Open and copy all of:

   `supabase\storage.sql`

3. Paste → **Run**.

If you get **policy already exists**, delete old storage policies in **Storage** → **Policies**, or skip duplicate lines.

---

## Step 7 — Sample data (optional but recommended)

1. **SQL Editor** → **New query**.
2. Copy all of `supabase\seed.sql` → paste → **Run**.
3. **Table Editor** → `products` → should show 4 sample items.
4. **Table Editor** → `hostels_listings` → should show 1 hostel.

---

## Step 8 — Create YOUR admin account

You cannot use the admin dashboard until an admin is **approved**.

### 8a — Register in the app

1. On your PC, open a terminal in the project folder:

   ```powershell
   cd "C:\Users\Gifted Soul\Projects\campus-companion-trade1"
   npx --yes serve .
   ```

2. Browser → `http://localhost:3000` (or the URL `serve` prints).
3. **Register** (right panel) as **Customer** with your real email and password.
4. You will see **“Pending approval”** — that is correct.
5. You will **not** be able to log in yet.

### 8b — Approve yourself as admin (SQL)

1. Supabase → **SQL Editor** → **New query**.
2. Replace the email below with the one you registered, then **Run**:

```sql
update profiles
set
  role = 'admin',
  status = 'approved',
  full_name = 'Site Admin'
where email = 'YOUR_EMAIL@example.com';
```

3. **Table Editor** → `profiles` → your row should show `role = admin`, `status = approved`.

### 8c — Log in

1. Back in the app → **Login** with same email + password + student ID you used when registering.
2. You should land on the **Admin** dashboard.

---

## Step 9 — Quick test checklist

Do these in order:

| # | Test | Expected |
|---|------|----------|
| 1 | Table Editor → `products` has rows | 4 rows after seed |
| 2 | Login as admin | Admin sidebar appears |
| 3 | Home page | Categories + featured products |
| 4 | Register a second test user | Pending message; cannot login |
| 5 | Admin → Users → Approve test user | They can login as customer |
| 6 | Upload a product image (vendor or admin) | Image URL loads in browser |

---

## Step 10 — Common problems

### “Profile not found” on login

- **Cause:** `schema.sql` trigger `handle_new_user` did not run.
- **Fix:** Re-run the trigger section from `schema.sql`, or insert profile manually:

```sql
-- Only if profile missing after signup (replace UUID and email from Authentication → Users)
insert into profiles (id, full_name, email, role, status)
values ('USER_UUID_FROM_AUTH', 'Your Name', 'you@email.com', 'customer', 'pending');
```

### Login works but “pending approval” forever

- Run the admin `update profiles` SQL from Step 8b.

### Images upload fails

- Buckets must exist and be **public**.
- Run `storage.sql`.
- User must be **logged in** when uploading.

### Empty homepage / no products

- Run `seed.sql` or add a product in Admin → Add Product.

### CORS or auth errors on `file://`

- Do **not** open `index.html` by double-clicking. Use `npx serve .` and `http://localhost:3000`.

### RLS / permission denied

- Make sure you ran the full `schema.sql` (RLS policies at the bottom).
- Logged-in user can only edit their own cart/wishlist — that is correct.

---

## What’s already done on your project

A quick API check showed:

- Tables **exist** (`products`, `profiles`, `hostels_listings`, etc.).
- Row counts are **0** — run **Step 4**, **Step 7**, and **Step 8** if you haven’t yet.
- `site_settings` may need **Step 4** insert.

---

## After setup — continue roadmap

When all Step 9 checks pass, tell the agent:

**“Phase 0 complete — start Phase 1”**

and we continue with [ROADMAP.md](../ROADMAP.md).

---

## One-page checklist (print this)

```
[ ] Logged into supabase.com → correct project
[ ] Ran supabase/schema.sql (SQL Editor)
[ ] site_settings has 1 row
[ ] Auth: Email on, confirm email OFF for dev
[ ] Auth: Redirect URLs include localhost
[ ] Storage: logos, products, hostels, avatars (all public)
[ ] Ran supabase/storage.sql
[ ] Ran supabase/seed.sql
[ ] Registered in app via npx serve
[ ] SQL: promoted my email to admin + approved
[ ] Logged in → Admin dashboard works
```
