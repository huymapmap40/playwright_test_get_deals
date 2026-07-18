---
name: analyze-ci-failed
description: >-
  Diagnose a failing Playwright run and self-heal it when the TEST is at fault —
  never when the SITE is broken. Classifies the failure (test drift vs. site
  outage vs. flake), and for test drift fixes the selector/expectation in a Page
  Object under src/pages/, verifies the fix locally, and opens a PR. Use this
  skill whenever a Playwright run fails and you want it triaged or auto-fixed:
  after `npm test` fails locally, when the user says "the tests are red", "why
  did CI fail", "heal the failing test", "fix the broken selector", or when a
  GitHub Actions test workflow fails and a self-heal workflow invokes it. Works
  the same locally (reads test-results/) and in CI (reads downloaded artifacts).
---

# Analyze CI Failed — self-healing Playwright triage

You are triaging a failing Playwright run for the get-deals.vercel.app E2E suite.
Your job is **not** to make red go green. Your job is to find the *true cause* and
heal it only when the test itself has drifted. A failing test that caught a real
production bug is the test doing its job — "fixing" that is the worst outcome.

Read this whole file before acting. The classification in Step 2 is the point of
the skill; everything else serves it.

## Non-negotiable guardrails

These override any instinct to make the run pass. Violating one is a failure of
the skill even if the suite goes green.

1. **Never edit files under `tests/`.** Specs describe intended behaviour. If a
   spec's assertion fails, that is a signal to investigate — not to rewrite. Heal
   by fixing **`src/pages/*.ts`** (selectors/actions) only.
2. **Never weaken or delete an assertion to make a test pass.** Changing
   `toBeVisible()` → `toBeHidden()`, widening a regex to match anything, removing
   an `expect`, or bumping a timeout to paper over a real hang are all forbidden.
   Loosening a selector to be more resilient (adding an accessible-name `.or()`
   fallback) is allowed; loosening an *assertion of correctness* is not.
3. **When in doubt, do NOT heal.** Classify as "needs human" and report. A missed
   auto-fix costs a code review; a wrong auto-fix hides a production outage.
4. **Never auto-merge.** Every fix goes out as a PR for a human. Never push to
   `main`, never merge, never bypass the very CI that would re-check the fix.
5. **Never touch credentials or `.env`.** Auth failures are almost always the site
   or secrets, not the test — see the decision table.

## Step 1 — Gather the failure evidence

Find the real error, not just "exit code 1". Where you look depends on context.

**Locally** (default), the reporters in `playwright.config.ts` leave everything in
place after a failing run:

- `test-results/junit.xml` — machine-readable list of which tests failed and their
  error messages. Start here to enumerate failures.
- `test-results/.last-run.json` — the failed test IDs from the most recent run.
- `test-results/<test-folder>/` — per-failure artifacts: `error-context.md` (the
  page snapshot at failure), `trace.zip`, screenshots, video. `trace: 'retain-on-failure'`
  means a trace exists for every failure.
- `playwright-report/` — the HTML report (open with `npm run report`).

Useful commands:
```bash
# Re-run just the failing test to see a clean error (swap in the real @ID tag):
npx playwright test --grep "@ID_1"
# Inspect the recorded trace for a failure (DOM, network, console at each step):
npx playwright show-trace test-results/<folder>/trace.zip
```

**In CI** (a self-heal workflow invoked this skill), the failed run's artifacts
were downloaded — read `playwright-report/` and any `results.json`/`junit.xml`
the same way. The trace inside the report is your richest evidence.

Extract, for each failure: the **test title + `@ID` tag**, the **failing line**,
the **error type** (locator timeout, assertion mismatch, navigation error, …), and
the **page state at failure** (from `error-context.md` / trace — did the page even
load? was the user logged in?).

## Step 2 — Classify the failure (the whole game)

Map each failure to exactly one verdict. This decides whether you heal or alert.

| What you observe in the evidence | Verdict | Action |
|---|---|---|
| Locator not found / action timeout, but the page **loaded fine** and other elements are present → the markup/selector moved | **TEST DRIFT** | Heal (Step 3) |
| Assertion on stable UI text/label/format that the site legitimately changed (e.g. button renamed "Sign In" → "Log In") | **TEST DRIFT** | Heal (Step 3) |
| Login fails, HTTP 4xx/5xx, blank page, navigation timeout, or **many tests fail at the same step** → the app itself is down/broken | **SITE BROKEN** | Alert, do NOT heal (Step 4) |
| Assertion caught a genuine behaviour/content bug in the app (price wrong, data missing) | **SITE BROKEN / REAL BUG** | Alert, do NOT heal (Step 4) |
| Passed on retry, or timing-only failure that isn't reproducible | **FLAKE** | Report, don't patch (Step 4) |
| `Missing required env var`, auth rejected with valid-looking creds | **CONFIG / SECRETS** | Alert, do NOT heal (Step 4) |

Rules of thumb that keep classification honest:
- **A wall of failures is almost never test drift.** One selector moving breaks one
  or two tests; the login page 500ing breaks all of them. Count the blast radius.
- **Auth/network/5xx = site, not test.** Do not "fix" these in code.
- If the *only* way to make it pass is to change what the test asserts is true,
  it is not drift — it is a real signal. Stop and report.

## Step 3 — Heal (only for TEST DRIFT)

1. **Locate the drifted selector** in the relevant Page Object under `src/pages/`
   (`LoginPage.ts`, `HomePage.ts`, `BasePage.ts`, …). The spec calls a Page Object
   method — trace from the failing line back to the locator it uses.
2. **Find the correct selector.** Use the page snapshot in `error-context.md`/the
   trace to see the current DOM. If you need to explore the live site, use
   `npm run codegen` (records against get-deals.vercel.app) or the Playwright MCP
   browser tools.
3. **Fix it the repo's way** — accessibility-first, matching the existing style:
   prefer `getByRole`/`getByLabel` with a CSS fallback via `.or(...)`, e.g.
   ```ts
   this.submitButton = page
     .getByRole('button', { name: /^Sign In$/i })
     .or(page.locator('[data-testid="signin"]'))
     .first();
   ```
   Add a resilient fallback rather than replacing one brittle selector with another.
   Keep the change minimal and scoped to the drifted locator.
4. **Verify the fix locally** before claiming success — re-run the exact test:
   ```bash
   npx playwright test --grep "@ID_n"
   npm run lint && npm run typecheck
   ```
   If it still fails, you misclassified or mis-fixed — reconsider Step 2 rather
   than piling on more changes. Do not open a PR for an unverified fix.

## Step 4 — Alert (SITE BROKEN / FLAKE / CONFIG)

Do **not** change code. Report clearly so a human acts on the right thing:
- State the verdict and the evidence (which tests, which step, the error, blast
  radius). Use `maskEmail` for any email in output — credentials must not leak.
- For a suspected site outage, recommend confirming get-deals.vercel.app manually
  and, in CI, opening an issue / Slack alert rather than a PR.
- For a flake, name the test and suggest a stability follow-up (e.g. a proper
  web-first assertion) — but no code change from this skill.

## Step 5 — Report / open the PR

**Locally:** print a concise summary — verdict per failure, the fix (as a
`file:line` diff) if you healed, and the verification result. Let the user decide
to commit.

**In CI (self-heal):** for a verified TEST-DRIFT fix, open a PR (never push to
`main`, never merge):
```bash
git checkout -b heal/<id>-<slug>
git commit -am "fix(pages): heal drifted selector for @ID_n

<what moved, why this fix, verification result>"
gh pr create --title "Self-heal: @ID_n selector drift" --body "<evidence + diff + how verified>"
```
The PR body must state the classification and evidence so the reviewer can judge
it. The PR re-triggers the normal test workflow, which is the real green check —
your local verification is a pre-filter, not a substitute.

## Output format

Lead with a one-line verdict per failing test, then details:

```
@ID_1  TEST DRIFT   → healed  (LoginPage.ts:38 submit button renamed)  ✓ re-run green
@ID_2  SITE BROKEN  → alert   (login returns 500 — 4/4 tests fail at auth)  no code change
```

Be concrete, cite `file:line`, and never report a heal as done without a passing
local re-run behind it.
