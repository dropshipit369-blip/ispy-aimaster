import { requireUser, secureHandler } from "../_shared/security.ts";
import { HttpError, json } from "../_shared/http.ts";
import { appOrigin, ownedCustomer, stripeClient } from "../_shared/billing.ts";

Deno.serve(secureHandler("customer-portal", async (req) => {
  const user = await requireUser(req);
  const stripe = stripeClient();
  const customerId = await ownedCustomer(stripe, user.id);
  if (!customerId) throw new HttpError(404, "There is no billing account yet. Choose a plan to get started.", "billing_account_missing");
  const session = await stripe.billingPortal.sessions.create({ customer: customerId, return_url: `${appOrigin(req)}/membership` });
  return json({ url: session.url });
}));
