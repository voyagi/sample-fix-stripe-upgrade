# sample-fix-stripe-upgrade

A small Next.js 16 and Supabase app with a Free and a Pro plan. Stripe Checkout takes the payment, and a webhook is meant to move the account to Pro. This is a public sample: `main` holds the app with its upgrade bug, and the fix lives in [pull request #3](https://github.com/voyagi/sample-fix-stripe-upgrade/pull/3).

Read `NOTES.md` first. Update it when the state changes or a decision is made.

## Commands

- `npm ci` installs from the lockfile.
- `npm test` runs Vitest. It passes with no test files, so a green run on `main` checks nothing yet.
- `npm run typecheck` runs `tsc --noEmit`. Vitest doesn't type-check, so run this too.
- `npm run build` is the production build. CI runs `npm ci`, `npm test` and `npm run build` on every pull request.
- `npm run dev` starts the local server. It needs a `.env.local` with Supabase and Stripe test keys. The variable names are in `.env.example`.

## Where things are

- `app/api/stripe/webhook/route.ts` is the Stripe webhook, the only place a plan changes.
- `lib/stripe.ts` builds the Stripe client.
- `lib/supabase/client.ts` builds the Supabase client with the publishable key.
- `supabase/migrations/0001_profiles.sql` creates the `profiles` table. `plan` is `free` or `pro`.

## Rules

- `main` keeps the upgrade bug on purpose. It is the "before" of the sample fix. Don't fix the webhook on `main`.
- A plan changes only on the server, after Stripe confirms the payment. Browser code never writes `profiles.plan`.
- The publishable key can't write `profiles.plan`: row level security lets a signed-in user read their own row and nothing else. Server code that writes needs a server-only key, and that code must never be imported into a component that runs in the browser.
- Never open, print or copy `.env` or `.env.*` files. The project settings deny it. Ask for a variable's name, never its value.
- A bug fix starts with a test that fails because of the bug, then the change that makes it pass.
- Made-up data only. Test keys, user ids and email addresses in this repository are invented.
- Commits follow Conventional Commits (`fix:`, `test:`, `docs:`, `chore:`). Every change goes through a pull request.

## Hooks

After each edit to a code file, `.claude/hooks/check-after-edit.mjs` runs the typecheck and the tests. If either fails, the output comes back to you. Fix it before moving on.
