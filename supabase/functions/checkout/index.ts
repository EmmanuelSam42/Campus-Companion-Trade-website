// Authenticated checkout endpoint. Never expose SUPABASE_SERVICE_ROLE_KEY or PAYSTACK_SECRET_KEY to the browser.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const money = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
const DELIVERY_FEE = 5;
const ONLINE_METHODS = new Set(["Mobile Money", "Card"]);
const PAYMENT_METHODS = new Set(["Mobile Money", "Card", "Cash on Delivery"]);

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceKey) {
    return json({ error: "Checkout server configuration is incomplete." }, 500);
  }

  const authorization = req.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return json({ error: "Sign in to check out." }, 401);

  const authClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: { user }, error: authError } = await authClient.auth.getUser();
  if (authError || !user) return json({ error: "Your session is invalid or expired." }, 401);

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const body = await req.json();
    if (!body || typeof body.action !== "string") return json({ error: "Invalid request." }, 400);

    const { data: profile, error: profileError } = await admin
      .from("profiles").select("id, role, status, full_name, email")
      .eq("id", user.id).maybeSingle();
    if (profileError || !profile || profile.status !== "approved") {
      return json({ error: "An approved account is required to check out." }, 403);
    }

    if (body.action === "create") {
      const paymentMethod = body.paymentMethod;
      if (!PAYMENT_METHODS.has(paymentMethod)) return json({ error: "Unsupported payment method." }, 400);

      const deliveryName = typeof body.deliveryName === "string" ? body.deliveryName.trim().slice(0, 160) : "";
      const deliveryPhone = typeof body.deliveryPhone === "string" ? body.deliveryPhone.trim().slice(0, 60) : "";
      const deliveryAddress = typeof body.deliveryAddress === "string" ? body.deliveryAddress.trim().slice(0, 500) : "";
      const notes = typeof body.notes === "string" ? body.notes.trim().slice(0, 1000) : "";
      if (!deliveryName || !deliveryPhone || !deliveryAddress) {
        return json({ error: "Name, phone, and delivery address are required." }, 400);
      }
      if (!Array.isArray(body.items) || body.items.length < 1 || body.items.length > 50) {
        return json({ error: "Your cart is empty or contains too many distinct items." }, 400);
      }

      const quantities = new Map<string, number>();
      for (const item of body.items) {
        if (!item || typeof item.product_id !== "string" || !/^[0-9a-f-]{36}$/i.test(item.product_id)) {
          return json({ error: "A cart item has an invalid product ID." }, 400);
        }
        const quantity = Number(item.quantity);
        if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
          return json({ error: "Each item quantity must be between 1 and 99." }, 400);
        }
        quantities.set(item.product_id, (quantities.get(item.product_id) || 0) + quantity);
        if ((quantities.get(item.product_id) || 0) > 99) return json({ error: "Item quantity exceeds the limit." }, 400);
      }

      const ids = [...quantities.keys()];
      const { data: products, error: productError } = await admin
        .from("products")
        .select("id, name, price, type, image_url, vendor_name, vendor_id, in_stock")
        .in("id", ids);
      if (productError || !products || products.length !== ids.length) {
        return json({ error: "One or more products are no longer available. Refresh your cart." }, 409);
      }

      const items = [];
      let subtotal = 0;
      for (const product of products) {
        const price = Number(product.price);
        const quantity = quantities.get(product.id) || 0;
        if (!product.in_stock || !Number.isFinite(price) || price < 0 || !Number.isInteger(quantity) || quantity < 1) {
          return json({ error: `${product.name || "A product"} is unavailable. Refresh your cart.` }, 409);
        }
        if (product.vendor_id) {
          const { data: vendor } = await admin.from("profiles")
            .select("role, status, verified").eq("id", product.vendor_id).maybeSingle();
          if (!vendor || vendor.role !== "vendor" || vendor.status !== "approved" || vendor.verified !== true) {
            return json({ error: `${product.name || "A product"} is not currently available for purchase.` }, 409);
          }
        }
        subtotal = money(subtotal + money(price * quantity));
        items.push({
          product_id: product.id,
          name: product.name,
          price: money(price),
          quantity,
          image_url: product.image_url,
          vendor_name: product.vendor_name,
        });
      }

      const total = money(subtotal + DELIVERY_FEE);
      const orderNumber = "CCT-" + crypto.randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase();
      const paymentReference = ONLINE_METHODS.has(paymentMethod)
        ? "CCT-" + crypto.randomUUID().replaceAll("-", "")
        : null;
      const paymentStatus = paymentMethod === "Cash on Delivery" ? "cod" : "pending";

      // Populate legacy NOT NULL columns as well as the current frontend's order fields.
      const orderRow = {
        order_number: orderNumber,
        user_id: user.id,
        customer_name: deliveryName,
        customer_phone: deliveryPhone,
        total_amount: total,
        user_name: deliveryName,
        user_email: profile.email || user.email || "",
        items,
        subtotal,
        delivery_fee: DELIVERY_FEE,
        total,
        payment_method: paymentMethod,
        payment_reference: paymentReference,
        payment_status: paymentStatus,
        delivery_name: deliveryName,
        delivery_phone: deliveryPhone,
        delivery_address: deliveryAddress,
        notes,
        status: "pending",
      };
      const { data: order, error: orderError } = await admin
        .from("orders").insert(orderRow).select("id, order_number, total, payment_reference, payment_status").single();
      if (orderError || !order) {
        console.error("Order insert failed", orderError?.message);
        return json({ error: "We could not save your order. Please try again." }, 500);
      }
      return json({
        orderId: order.id,
        orderNumber: order.order_number,
        total: Number(order.total),
        email: profile.email || user.email || "",
        paymentReference: order.payment_reference,
        paymentStatus: order.payment_status,
      });
    }

    if (body.action === "verify") {
      if (typeof body.orderId !== "string" || typeof body.reference !== "string" || body.reference.length > 200) {
        return json({ error: "Order ID and payment reference are required." }, 400);
      }
      const { data: order, error: orderError } = await admin.from("orders")
        .select("id, user_id, order_number, total, payment_status, payment_reference")
        .eq("id", body.orderId).eq("user_id", user.id).maybeSingle();
      if (orderError || !order) return json({ error: "Order not found." }, 404);
      if (!ONLINE_METHODS.has(String(order.payment_method || "")) && order.payment_status !== "paid") {
        return json({ error: "This order does not require online payment." }, 400);
      }
      if (order.payment_status === "paid") {
        if (order.payment_reference !== body.reference) return json({ error: "Payment reference does not match this order." }, 409);
        return json({ verified: true, orderNumber: order.order_number, paymentStatus: "paid" });
      }
      if (!order.payment_reference || order.payment_reference !== body.reference) {
        return json({ error: "Payment reference does not match this order." }, 409);
      }
      const secret = Deno.env.get("PAYSTACK_SECRET_KEY");
      if (!secret) return json({ error: "Online payment verification is not configured. Your order remains pending." }, 503);

      const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(body.reference)}`, {
        headers: { Authorization: `Bearer ${secret}`, Accept: "application/json" },
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.status || !result?.data) {
        return json({ error: "Paystack could not verify this transaction. Your order remains pending." }, 502);
      }
      const transaction = result.data;
      const expectedAmount = Math.round(Number(order.total) * 100);
      if (
        transaction.status !== "success" ||
        transaction.reference !== order.payment_reference ||
        transaction.currency !== "GHS" ||
        Number(transaction.amount) !== expectedAmount ||
        (transaction.metadata?.order_number && transaction.metadata.order_number !== order.order_number)
      ) {
        return json({ error: "Payment is not confirmed for the expected amount and order. Your order remains pending." }, 409);
      }

      const { data: updated, error: updateError } = await admin.from("orders")
        .update({ payment_status: "paid" })
        .eq("id", order.id).eq("user_id", user.id).eq("payment_status", "pending")
        .select("id").maybeSingle();
      if (updateError) {
        console.error("Payment status update failed", updateError.message);
        return json({ error: "Payment was received but order confirmation needs support review." }, 500);
      }
      if (!updated) {
        const { data: latest } = await admin.from("orders").select("payment_status, payment_reference")
          .eq("id", order.id).maybeSingle();
        if (latest?.payment_status !== "paid" || latest.payment_reference !== body.reference) {
          return json({ error: "Payment confirmation could not be saved. Contact support with your order number." }, 500);
        }
      }
      return json({ verified: true, orderNumber: order.order_number, paymentStatus: "paid" });
    }

    return json({ error: "Unsupported checkout action." }, 400);
  } catch (error) {
    console.error("Checkout request failed", error instanceof Error ? error.message : "unknown error");
    return json({ error: "Checkout failed unexpectedly. Please try again or contact support." }, 500);
  }
});
