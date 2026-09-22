import { adminClient, requireUser, secureHandler } from "../_shared/security.ts";
import { HttpError, json, withDeadline } from "../_shared/http.ts";
import { Stripe, appOrigin, ownedCustomer, priceIds, stripeClient } from "../_shared/billing.ts";
import { PLANS, BILLING_CURRENCY } from "../../../shared/plans.ts";

Deno.serve(secureHandler("create-checkout", async (req) => {
  const user = await requireUser(req);
  const { planType } = await req.json() as { planType?: unknown };
  if (planType !== "pro" && planType !== "unlimited") throw new HttpError(400, "Choose Pro or Unlimited.", "invalid_plan");
  const db = adminClient();
  const leaseId = crypto.randomUUID();
  const { data: initialAttempt, error: claimError } = await db.rpc("ispy_claim_checkout", { p_user_id: user.id, p_lease_id: leaseId });
  if (claimError) throw new HttpError(503, "Checkout is temporarily unavailable. Retry shortly.");
  if (!initialAttempt) throw new HttpError(409, "Checkout is already being prepared. Wait a minute, then retry.");
  try {
  const prices = priceIds();
  const stripe = stripeClient();
  let customerId = await ownedCustomer(stripe, user.id);
  if (!customerId) {
    const customer = await stripe.customers.create({ email: user.email, metadata: { user_id: user.id } }, { idempotencyKey: `ispy-customer-${user.id}` });
    const { error } = await adminClient().from("user_subscriptions").upsert({ user_id: user.id, stripe_customer_id: customer.id }, { onConflict: "user_id" });
    if (error) throw new HttpError(503, "Could not save your billing account. Retry the same plan.", "billing_unavailable");
    customerId = customer.id;
  }
  const [subscriptions, sessions] = await Promise.all([
    stripe.subscriptions.list({ customer: customerId, status: "all", limit: 100 }),
    stripe.checkout.sessions.list({ customer: customerId, limit: 10 }),
  ]);
  if (subscriptions.data.some((s: Stripe.Subscription) => !["canceled", "incomplete_expired"].includes(s.status))) {
    throw new HttpError(409, "You already have a subscription. Use Manage subscription to change your plan or payment details.", "subscription_exists");
  }
  const pending = sessions.data.find((s: Stripe.Checkout.Session) => s.mode === "subscription" && s.status === "open");
  if (pending) {
    if (pending.metadata?.plan_type !== planType) throw new HttpError(409, "A checkout for another plan is already open. Complete it or wait for it to expire before changing plans.", "checkout_pending");
    if (!pending.url) throw new HttpError(503, "Checkout is unavailable. Please retry shortly.");
    return json({ url: pending.url });
  }
  const price = await stripe.prices.retrieve(prices[planType]);
  if (price.unit_amount !== PLANS[planType].monthlyAmountMinor || !price.active || price.currency !== BILLING_CURRENCY || price.recurring?.interval !== "month" || price.recurring.interval_count !== 1) {
    throw new HttpError(503, "The billing plan needs configuration. Please contact support.", "billing_price_invalid");
  }
  let attemptId = initialAttempt;
  if (sessions.data.some((s: Stripe.Checkout.Session) => s.metadata?.ispy_attempt_id === attemptId && s.status !== "open")) {
    const { data, error } = await db.rpc("ispy_rotate_checkout", { p_user_id: user.id, p_lease_id: leaseId });
    if (error || !data) throw new HttpError(503, "Checkout could not be restarted. Retry shortly.");
    attemptId = data;
  }
  const origin = appOrigin(req);
  const parameters: Stripe.Checkout.SessionCreateParams = {
    customer: customerId, client_reference_id: user.id, mode: "subscription",
    line_items: [{ price: price.id, quantity: 1 }],
    success_url: `${origin}/membership?success=true`, cancel_url: `${origin}/membership?canceled=true`,
    metadata: { user_id: user.id, plan_type: planType, ispy_attempt_id: attemptId }, subscription_data: { metadata: { user_id: user.id } },
  };
  let session = await stripe.checkout.sessions.create(parameters, { idempotencyKey: `ispy-checkout-${attemptId}` });
  if (session.status !== "open") {
    // An acknowledged, closed session is safe to replace. Unknown outcomes retain their original key.
    const { data: attempt, error } = await db.rpc("ispy_rotate_checkout", { p_user_id: user.id, p_lease_id: leaseId });
    if (error || !attempt) throw new HttpError(503, "Checkout could not be restarted. Retry shortly.");
    session = await stripe.checkout.sessions.create({ ...parameters, metadata: { ...parameters.metadata, ispy_attempt_id: attempt } }, { idempotencyKey: `ispy-checkout-${attempt}` });
  }
  if (!session.url) throw new HttpError(503, "Checkout is unavailable. Please retry shortly.");
  console.log(JSON.stringify({ event: "checkout_started", user_id: user.id, plan: planType }));
  return json({ url: session.url });
  } finally {
    const { error } = await withDeadline(AbortSignal.timeout(5_000), () => db.rpc("ispy_release_checkout", { p_user_id: user.id, p_lease_id: leaseId }));
    if (error) console.error(JSON.stringify({ event: "checkout_lease_release_failed", user_id: user.id }));
  }
}));
