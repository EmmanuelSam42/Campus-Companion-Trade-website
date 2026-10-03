# Secure checkout rollout checklist

## What this change does

- Moves order creation out of the browser and into the authenticated `checkout` Edge Function.
- Re-reads product prices and availability from the database; the browser submits only product IDs and quantities.
- Calculates subtotal and the GH₵5 delivery fee server-side and writes both current and legacy required order columns.
- Creates online-payment orders as pending with a server-generated Paystack reference.
- Verifies Paystack transactions on the server using `PAYSTACK_SECRET_KEY`; a browser callback alone never marks an order paid.
- Requires the verified transaction to match the reference, GHS currency, expected amount, success status, and order metadata when supplied.
- Removes direct customer order inserts/updates and broad order-item write paths. Admin order status changes remain supported through the existing admin UI and the admin-only RLS update policy.
- Normalizes order statuses to `pending`, `processing`, `completed`, or `cancelled`.

## Deployment prerequisites — do not skip

1. Review `supabase/08-secure-orders.sql` against the actual live schema and existing policies before applying it. It changes live order access if applied.
2. Deploy `supabase/functions/checkout/index.ts` as the Supabase Edge Function named `checkout`.
3. Configure the server-side `PAYSTACK_SECRET_KEY` using Supabase Function secrets. Never put this secret in `app.js`, HTML, or a public repository.
4. Confirm the frontend Paystack public key matches the intended Paystack environment. The current checked-in key uses the `pk_test_` prefix.
5. Run the smoke tests below in a non-production/test environment first. This PR does not deploy the function, set secrets, or apply SQL to the live database.

## Smoke tests

- Approved signed-in customer, Cash on Delivery: order saves with server-calculated totals, `payment_status=cod`, and `status=pending`.
- Approved signed-in customer, Mobile Money/Card, successful Paystack test transaction: order starts pending and becomes paid only after server verification.
- Cancelled payment: order remains unpaid/pending and cart remains available.
- Forged client amount/price/name: ignored; total and line prices are recalculated from database product records.
- Unknown product, out-of-stock product, or invalid quantity: request rejected without creating an order.
- Unapproved profile, missing/invalid JWT, wrong order owner, wrong reference, failed transaction, wrong currency, or amount mismatch: rejected.
- Customer direct insert/update to `orders`: denied by SQL grants/RLS.
- Customer direct write to `order_items`: denied.
- Admin updates order status: succeeds and is stored in the normalized status vocabulary.
- Existing customer can still read only their own orders; admin can read all orders.

## Operational notes / limitations

- The existing frontend does not use `order_items`; item snapshots continue to be stored in `orders.items`.
- A failed client-side verification leaves the order pending and the cart intact; staff should reconcile completed Paystack transactions before a customer retries.
- Product price/availability is checked when the order is created. Inventory is not reserved or decremented, so simultaneous purchases can still exceed stock unless inventory reservation is implemented separately.
- Before production launch, test the exact live schema, check existing policy names, review order-status/reporting consumers, configure the Paystack live secret securely, and run Supabase security advisors.
- No SQL has been applied to the live database and no Edge Function has been deployed as part of preparing this PR.
