# Claude Code setup review

Repository `voyagi/sample-fix-stripe-upgrade`, branch `main` at `581626e`. Reviewed by Taranity on 28 October 2026.

The app is small and easy to follow: one Stripe webhook, one Supabase table, a home page. The Claude Code setup around it was empty. There was no settings file, no CLAUDE.md and no hook, so a new session could open the Stripe secret key, had to work out the project's commands for itself, and nothing checked its edits until CI ran after a push.

The pull request that comes with this review fixes most of that. Two items stay open because they change how the project runs, not only how Claude works in it.

| Finding | Severity | In the pull request |
|---|---|---|
| Claude can read `.env.local`, which holds the Stripe and Supabase keys | High | Fixed |
| No CLAUDE.md, so the rule that `main` keeps the bug on purpose is written nowhere | Medium | Fixed |
| Nothing checks Claude's edits before CI does | Medium | Fixed |
| Vitest doesn't type-check, and only `next build` does | Medium | Fixed locally, CI step open |
| `npm test` passes with zero tests | Medium | Open |
| One "don't ask again" on a push makes every later push silent | Low | Fixed |
| No notes file to carry decisions from one session to the next | Low | Fixed |
| A hand-made `.claude/settings.local.json` would be committed | Low | Fixed |

## Keys and secrets

The README asks you to copy `.env.example` to `.env.local` and fill in `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` and the Supabase keys. Git ignores that file, so it never reaches GitHub. Claude Code is a different matter. With no settings file, Claude reads any file inside the project folder without asking, and `.env.local` sits inside the project folder. Once a key is in the conversation it can turn up in a pasted error, a log or a commit, and a standard Stripe secret key can make any API call on the account, refunds included.

`.claude/settings.json` now denies Claude's file tools on `.env`, `.env.*`, `*.pem` and `*.key`, at any depth in the repository. Edits are denied too, so Claude can't overwrite a key file either. `.env.example` is carved back out on purpose: it holds no values, and Claude needs it to know which variables exist. Deny rules apply as soon as the file is in the repository, without the folder trust step that allow rules wait for.

The rules have limits. They cover Claude's own file tools and the shell commands Claude Code recognises as file reads, like `cat` and `head`. A script that opens files by itself, a Node one-liner for instance, gets past them. The hard boundary is Claude Code's sandbox, which enforces file access at the operating system level for every shell command. We didn't turn it on, because it changes how every command runs and deserves its own decision.

## What Claude knows when a session starts

Without a CLAUDE.md every session started from zero. It had to read `package.json` to find the test command, and it had no way to learn the one rule that matters most here: `main` keeps the upgrade bug on purpose, as the "before" of the sample fix in [pull request #3](https://github.com/voyagi/sample-fix-stripe-upgrade/pull/3). A helpful session asked to tidy up the webhook would fix the bug on `main` and quietly break the sample.

The new `CLAUDE.md` lists the commands, the four files that matter, and the rules. Plans change only on the server after Stripe confirms a payment. The publishable key can't write `profiles.plan`, because row level security only lets a user read their own row. Keys stay out of reach, and a bug fix starts with a failing test. It also points at `NOTES.md`, a short file with where the work stands and what was decided, so the next session doesn't argue a settled question all over again.

## Checking edits as they happen

Before this change, the first thing to notice a broken edit was CI, after a push. Two gaps made that worse. Vitest runs TypeScript without checking the types, so a test file with a type error still passes. We tried it: a test that assigns a string to a `number` passed under `npm test` and failed under `tsc`. And the only type check was the one inside `next build`.

The pull request adds `npm run typecheck` (`tsc --noEmit`) and a PostToolUse hook. After Claude edits a code file, `.claude/hooks/check-after-edit.mjs` runs the typecheck and the tests. When both pass it stays silent. When one fails it hands the output back to Claude with exit code 2, the code a PostToolUse hook uses to report to Claude, so the fix happens in the same turn. Edits to Markdown and config skip it. On this repository both checks together take about two and a half seconds. The hook is plain Node, so it runs the same on macOS, Linux and Windows, with no `jq` or Bash needed.

CI still doesn't run the typecheck. It's one line in `.github/workflows/ci.yml`, and it's the next thing we'd add.

## Tests that pass with nothing to test

`npm test` runs `vitest run --passWithNoTests`, and `main` has no test files. A green check on `main` means the code builds, nothing more. We left this alone, since removing the flag today turns CI red on `main`. Drop it in the pull request that adds the first test to `main`.

## Smaller things

Claude asks before most shell commands, but one "Yes, and don't ask again" on a push makes every later push silent. An `ask` rule on `git push` now prompts every time, auto mode included, and a personal allow rule can't override it. It matches the command as Claude writes it, so `git -C . push` would slip past. Treat it as a speed bump.

`npm test`, `npm run typecheck` and `npm run build` are on the allow list, so routine checks don't stop for a prompt.

`.claude/settings.local.json` is now in `.gitignore`. Claude Code keeps that file out of git when it creates it, but not when someone makes it by hand, and it holds personal allow rules nobody else should inherit.

## Checking it yourself

1. Open Claude Code at the repository root and run `/status`. The setting sources should include the project settings.
2. With a `.env.local` in place, ask Claude to show you what's in it. It should refuse.
3. Ask Claude to add `const total: number = "ten";` to `lib/stripe.ts`. The type error should come back to Claude right after the edit, and Claude should fix it.
