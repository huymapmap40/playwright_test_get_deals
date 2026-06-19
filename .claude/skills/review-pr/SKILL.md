---
name: review-pr
description: >-
  Review a pull request (or the current branch's diff) against this Playwright +
  TypeScript repo's five core conventions: Page Object Model compliance, ESLint
  cleanliness, @ID test tags, no leaked secrets, and simple/readable logic. Use
  this skill whenever the user asks to review a PR, check changes before pushing,
  vet a diff, or prepare a branch for merge — and whenever it runs inside the
  claude-pr-review CI workflow. Trigger it even if the user just says "review my
  changes", "is this ready to merge?", or "check my test", since those map to
  these project rules.
---

# Review PR

You are reviewing changes in a Playwright + TypeScript E2E test repo for
getdeals247.com. The point of this skill is consistency: every PR should be held
to the same five checks, whether a human runs `/review-pr` locally or the CI
workflow invokes it. Be concrete and cite `file:line` so findings are actionable.

## Step 1 — Get the diff and detect context

Figure out what to review and where to report.

- **In CI / when a PR exists:** read the PR diff with `gh pr diff <number>` (the
  number is usually in the prompt or `$GITHUB_REF`). Findings will be posted back
  to the PR.
- **Locally:** review the branch delta with `git diff main...HEAD` (fall back to
  `git diff` for uncommitted work). Findings go in a chat summary.

Only review **changed** lines. Pre-existing issues in untouched code are noise on
a PR review — note them at most as a one-line aside, never as blockers.

## Step 2 — Run the five checks

Each check below explains *why* it matters so you can judge edge cases rather than
pattern-match. Severity guide: **🔴 Blocker** (would fail CI or leak data),
**🟡 Should-fix** (violates a convention), **🟢 Nit** (optional polish).

### 1. Page Object Model compliance
Selectors belong in `src/pages/*.ts`, never in `tests/*.spec.ts`. The whole suite
survives markup changes only because specs talk to Page Objects, not the DOM. So:
- Flag any `getByRole`, `getByLabel`, `getByPlaceholder`, `page.locator(...)`, or
  raw CSS/XPath used directly inside a spec — it should move into a Page Object
  method or locator. 🟡 (🔴 if it's a raw CSS/XPath string, which is brittle).
- New pages/components should extend `BasePage` and prefer accessibility-first
  locators (`getByRole`/`getByLabel`) with CSS only as a fallback `.or(...)`.
- A spec calling page-object methods (`login.fillCredentials(...)`) is correct —
  don't flag that.

### 2. ESLint cleanliness
CI runs `npm run lint` and fails on errors. Rather than guess, **run it** and read
real output:
```bash
npm run lint
```
Surface anything it reports on changed files. Pay special attention to the rules
this repo treats as errors, because they catch real test bugs:
- `@typescript-eslint/no-floating-promises` — an un-awaited Playwright call is the
  #1 source of flaky tests. 🔴
- `playwright/expect-expect` — a test with no assertion passes vacuously. 🔴
- `@typescript-eslint/no-unused-vars` (allows `_`-prefixed), `no-console`
  (only `warn`/`error`/`info`). 🟡

### 3. @ID test tags
CI selects tests by tag (`--grep "@ID_1"`), so tags are how tests get run at all.
Check that:
- Every `test(...)` / `baseTest(...)` / `authTest(...)` added or changed carries a
  `{ tag: "@ID_n" }`. Missing tag → the test silently never runs in CI. 🔴
- Tags are **unique** across the suite — grep the repo for the new tag to confirm
  it isn't reused (a duplicate makes `--grep` ambiguous). 🔴

### 4. No leaked secrets / sensitive data
Credentials must come from the environment via `testConfig`, never the source.
- Flag any hardcoded password, token, API key, real email, or `mongodb+srv://`
  connection string in tracked files. 🔴
- A `.env` added to the diff (it must stay git-ignored) → 🔴.
- Any new log line (`console.*`) that prints an email must wrap it in
  `maskEmail(...)` so credentials don't leak into CI logs. 🟡
- Placeholder/example values (`your-password-here`, `xxxxx`) are fine.

### 5. Simple, readable logic
Tests are documentation; convoluted logic hides intent and breaks flakily.
- Flag conditionals/loops branching the test path (`if`/`try-catch` around
  assertions) — the repo lints `playwright/no-conditional-in-test` for a reason:
  a test should follow one deterministic path. 🟡
- Suggest collapsing duplicated setup into a fixture, deeply nested blocks into
  early returns, or repeated literals into named constants — but only when it
  genuinely clarifies. Don't invent churn; a small, clear function is fine. 🟢

## Step 3 — Report

### When posting to a PR
Post one summary comment, and inline comments for specific lines where the tool
allows. Always comment even if the PR is clean (say so) — silence reads as "the
job didn't run". Use the GitHub CLI:
```bash
gh pr comment <number> --body "<markdown>"
```

### Report format (use this structure)
```markdown
## PR Review — review-pr skill

**Verdict:** ✅ Ready / ⚠️ Changes requested / 🔴 Blockers found

### 🔴 Blockers
- `tests/foo.spec.ts:12` — selector `page.locator('#submit')` used in a spec;
  move it into a HomePage method (POM check).

### 🟡 Should-fix
- ...

### 🟢 Nits
- ...

### Checks
| Check | Result |
| --- | --- |
| POM compliance | ✅ / ❌ |
| ESLint | ✅ / ❌ |
| @ID tags | ✅ / ❌ |
| No leaked secrets | ✅ / ❌ |
| Simple logic | ✅ / ❌ |
```

If there are no findings in a section, omit it. Keep each finding to one or two
lines: location, what's wrong, and the fix. The reader wants to act, not read an
essay.
