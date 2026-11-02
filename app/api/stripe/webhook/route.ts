import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return new Response("Missing Stripe-Signature header", { status: 400 });
  }

  // Stripe signs the exact bytes it sends. Parsing the JSON and serialising it
  // again changes the whitespace, so the signature has to be checked on the raw text.
  const payload = await request.text();

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(payload, signature, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error("Webhook signature verification failed", err);
    return new Response("Webhook signature verification failed", { status: 400 });
  }

  if (event.type !== "checkout.session.completed" && event.type !== "checkout.session.async_payment_succeeded") {
    return Response.json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;

  // Delayed payment methods complete the session before the money arrives.
  // Stripe sends checkout.session.async_payment_succeeded once it does.
  if (session.payment_status === "unpaid") {
    return Response.json({ received: true });
  }

  const userId = session.client_reference_id;
  if (!userId) {
    // Retrying cannot fix a session that was created without a user, so acknowledge it and log it.
    console.error(`Checkout session ${session.id} has no client_reference_id`);
    return Response.json({ received: true });
  }

  // Row Level Security lets nobody but the server change a plan, so the update
  // needs the secret key. With the publishable key it matches no rows and fails silently.
  const { data, error } = await createAdminClient()
    .from("profiles")
    .update({ plan: "pro" })
    .eq("id", userId)
    .select("id");

  if (error || !data || data.length === 0) {
    console.error(`Could not move profile ${userId} to Pro`, error);
    // A non-2xx answer makes Stripe retry the event later instead of dropping it.
    return new Response("Profile update failed", { status: 500 });
  }

  return Response.json({ received: true });
}
