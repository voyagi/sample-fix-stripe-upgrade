export default function Home() {
  return (
    <main>
      <h1>Plan demo</h1>
      <p>Free gets you started. Pro gives you every feature for one monthly price.</p>
      <p>
        Checkout runs on Stripe. When a payment goes through, Stripe calls{" "}
        <code>/api/stripe/webhook</code> and the buyer&apos;s profile moves to the Pro plan.
      </p>
    </main>
  );
}
