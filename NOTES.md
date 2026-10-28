# Notes

Where the work stands and what was decided, newest first. Read it at the start of a session and update it at the end.

## 2026-10-28: Claude Code setup

Where it stands:

- `main` (`581626e`) is the plan demo with the upgrade bug, kept on purpose. Issue #1 describes the bug.
- Pull request #3 holds the fix: a failing test first, then the change.
- Issue #4 asks for a safe Claude Code setup. Pull request #5, branch `chore/claude-code-setup`, adds it with its written review, `docs/claude-code-setup-review.md`.

Decided:

- `.env` and `.env.*` files are closed to Claude. `.env.example` stays open so the variable names are visible. `*.pem` and `*.key` files are closed too.
- `git push` always asks first. Tests, the typecheck and the build run without a prompt.
- The hook runs the typecheck and the tests after code edits only. Markdown and config edits skip it.
- No formatter hook yet. The project has no formatter, and adding one would reformat every file in one commit. Decide it together with linting.
- `--passWithNoTests` stays until the first test lands on `main`. Removing it now turns CI red.
- The sandbox stays off for now. The deny rules don't cover a script that opens files by itself, and the sandbox would. Turning it on changes how every shell command runs, so it gets its own decision.

Next:

- Add `npm run typecheck` to `.github/workflows/ci.yml`.
- Pick a formatter and a linter, then add the formatter to the hook.
