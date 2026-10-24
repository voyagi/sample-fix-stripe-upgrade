import Stripe from "stripe";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/stripe/webhook/route";

const WEBHOOK_SECRET = "whsec_test_only_not_a_real_secret";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test_only";

// A stand-in for the profiles table that behaves like Row Level Security does:
// the secret key bypasses RLS, while the publishable key with no signed-in user
// runs as `anon`, matches no policy, and gets an empty result with no error.
const db = vi.hoisted(() => ({
  secretKey: "sb_secret_test_only",
  profiles: new Map<string, { plan: string }>(),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: (_url: string, key: string) => ({
    from: (_table: string) => ({
      update: (values: { plan: string }) => ({
        eq: (_column: string, id: string) => {
          const run = () => {
            const row = db.profiles.get(id);
            if (key !== db.secretKey || !row) return { data: [], error: null };
            row.plan = values.plan;
            return { data: [{ id }], error: null };
          };
          return {
            select: async () => run(),
            then: (resolve: (value: unknown) => unknown) => resolve({ ...run(), data: null }),
          };
        },
      }),
    }),
  }),
}));

const stripe = new Stripe("sk_test_only");

function checkoutEvent(type: string, session: Record<string, unknown>) {
  return {
    id: "evt_test_1",
    object: "event",
    type,
    data: { object: { id: "cs_test_1", object: "checkout.session", ...session } },
  };
}

function webhookRequest(event: object, options: { secret?: string; signed?: boolean } = {}) {
  const { secret = WEBHOOK_SECRET, signed = true } = options;
  // Stripe sends the event as indented JSON and signs those exact bytes.
  const payload = JSON.stringify(event, null, 2);
  const headers = new Headers({ "content-type": "application/json" });
  if (signed) {
    headers.set("stripe-signature", stripe.webhooks.generateTestHeaderString({ payload, secret }));
  }
  return new Request("http://localhost/api/stripe/webhook", { method: "POST", headers, body: payload });
}

beforeEach(() => {
  vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_only");
  vi.stubEnv("STRIPE_WEBHOOK_SECRET", WEBHOOK_SECRET);
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://localhost:54321");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", SUPABASE_PUBLISHABLE_KEY);
  vi.stubEnv("SUPABASE_SECRET_KEY", db.secretKey);
  vi.spyOn(console, "error").mockImplementation(() => {});
  db.profiles.clear();
  db.profiles.set("user_123", { plan: "free" });
});

describe("POST /api/stripe/webhook", () => {
  it("moves the buyer to Pro after a paid checkout", async () => {
    const response = await POST(
      webhookRequest(checkoutEvent("checkout.session.completed", { client_reference_id: "user_123", payment_status: "paid" })),
    );

    expect(response.status).toBe(200);
    expect(db.profiles.get("user_123")?.plan).toBe("pro");
  });

  it("waits for a delayed payment to settle before upgrading", async () => {
    const pending = await POST(
      webhookRequest(checkoutEvent("checkout.session.completed", { client_reference_id: "user_123", payment_status: "unpaid" })),
    );
    expect(pending.status).toBe(200);
    expect(db.profiles.get("user_123")?.plan).toBe("free");

    const settled = await POST(
      webhookRequest(checkoutEvent("checkout.session.async_payment_succeeded", { client_reference_id: "user_123", payment_status: "paid" })),
    );
    expect(settled.status).toBe(200);
    expect(db.profiles.get("user_123")?.plan).toBe("pro");
  });

  it("asks Stripe to retry when no profile was updated", async () => {
    const response = await POST(
      webhookRequest(checkoutEvent("checkout.session.completed", { client_reference_id: "user_missing", payment_status: "paid" })),
    );

    expect(response.status).toBe(500);
  });

  it("rejects an event signed with the wrong secret", async () => {
    const response = await POST(
      webhookRequest(checkoutEvent("checkout.session.completed", { client_reference_id: "user_123", payment_status: "paid" }), {
        secret: "whsec_someone_else",
      }),
    );

    expect(response.status).toBe(400);
    expect(db.profiles.get("user_123")?.plan).toBe("free");
  });

  it("rejects a request with no signature", async () => {
    const response = await POST(
      webhookRequest(checkoutEvent("checkout.session.completed", { client_reference_id: "user_123", payment_status: "paid" }), {
        signed: false,
      }),
    );

    expect(response.status).toBe(400);
    expect(db.profiles.get("user_123")?.plan).toBe("free");
  });
});
