# Sample fix: customers pay, but stay on the Free plan

This repository is a worked example of a fixed-price repair, made by Taranity.

The `main` branch holds a small Next.js and Supabase app with a Free and a Pro plan, written the way apps from AI app builders often arrive: Stripe Checkout works, the customer is charged, and their account never moves to Pro.

- **The bug report** is [issue #1](https://github.com/voyagi/sample-fix-stripe-upgrade/issues/1), written the way a founder would describe it.
- **The fix** is [pull request #3](https://github.com/voyagi/sample-fix-stripe-upgrade/pull/3). It adds a test that reproduces the bug first (the red check), then the change that makes it pass (the green check), and explains what was wrong in plain words.

A second, separate piece of work sets the repository up for Claude Code. [Issue #4](https://github.com/voyagi/sample-fix-stripe-upgrade/issues/4) asks for it and [pull request #5](https://github.com/voyagi/sample-fix-stripe-upgrade/pull/5) does it, with a written review in `docs/claude-code-setup-review.md`.

No real customer, company or data is involved. The app, the keys in the tests and the user ids are all made up.

## Run it

```bash
npm ci
npm test
npm run build
```

To run it against real services, copy `.env.example` to `.env.local`, fill in a Supabase project and Stripe test-mode keys, apply `supabase/migrations/0001_profiles.sql`, and point a Stripe test webhook at `/api/stripe/webhook`.
