# How to get Admin access

Campus Companion Trade does **not** have a separate “Admin login” button. Everyone uses the same **Login** form on the right side of the auth page.

After login, the app reads your row in **`profiles`**:

| `role` | `status` | What you see |
|--------|----------|----------------|
| `admin` | `approved` | **⚙ Admin Panel** in the header → Admin dashboard |
| `vendor` | `approved` | Vendor dashboard |
| `customer` | `approved` | Home, cart, orders, etc. |
| any | `pending` | Cannot login — “pending approval” message |

---

## First-time setup: make yourself admin

### Step 1 — Register in the app

1. Run the site: `npx serve .` → open http://localhost:3000  
2. On the **Register** panel (right), create an account with your real **email**, **password**, and **student ID**.  
3. You should see **“Pending approval”** — you cannot use the app yet. That is normal.

### Step 2 — Promote your account in Supabase

1. Open https://supabase.com/dashboard/project/dhidvacvupjihqnzwdik  
2. **SQL Editor** → **New query**  
3. Open on your PC: `supabase\01-make-admin.sql`  
4. Change `YOUR_EMAIL@example.com` to the **exact email** you registered with  
5. Copy the whole file → paste in SQL Editor → **Run**  
6. You should see one row: `role = admin`, `status = approved`

**Or** open `supabase/profile-roles-queries.sql` in the project — section **1** (admin) and **2** (verify).

**Or** run this directly (replace email):

```sql
update profiles
set role = 'admin', status = 'approved', verified = true
where email = 'you@example.com';

select email, role, status from profiles where email = 'you@example.com';
```

### Step 3 — Log in again

1. **Login** (left panel): same email, password, and **same student ID** you used when registering.  
2. Header should show: **Hi, Your Name** + **Admin** badge + **⚙ Admin Panel** + **Logout**  
3. You land on the **Admin dashboard** automatically.

---

## “I logged in but I only see Home / Cart — no Admin Panel”

Your `profiles` row is still a **customer** (or vendor). Fix in Supabase:

```sql
select email, role, status from profiles where email = 'you@example.com';
```

If `role` is not `admin`, run the `update` from Step 2 again.

---

## “Pending approval” when I try to login

`status` is still `pending`. Run:

```sql
update profiles set status = 'approved' where email = 'you@example.com';
```

---

## “Student ID does not match”

The Student ID on login must match the one saved at registration:

```sql
select email, student_id from profiles where email = 'you@example.com';
```

Use that value on the login form, or update it:

```sql
update profiles set student_id = 'YOUR_ID' where email = 'you@example.com';
```

---

## No row in `profiles` after register

The signup trigger may be missing. Run `schema.sql` again, or insert manually using your user id from **Authentication → Users**.

---

## Checklist

- [ ] Registered in the app with email + password + student ID  
- [ ] Ran `01-make-admin.sql` with **my** email  
- [ ] `select` shows `role = admin`, `status = approved`  
- [ ] Logged in with same email, password, student ID  
- [ ] Header shows **⚙ Admin Panel**
