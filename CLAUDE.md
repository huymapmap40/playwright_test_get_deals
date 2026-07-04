# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Playwright + TypeScript end-to-end UI tests for the live site **get-deals.vercel.app**.
There is no application code here — the "system under test" is a remote website,
so tests run against production over the network and depend on real credentials.

## Commands

```bash
npm install                       # install deps
npm run install:browsers          # install Playwright browser binaries (run once)

npm test                          # run the full suite (headless, chromium only)
npm run test:headed               # run with a visible browser
npm run test:ui                   # interactive UI runner (best for debugging)
npm run test:debug                # Playwright Inspector

npx playwright test tests/login.spec.ts            # run a single file
npx playwright test --grep "@ID_1"                 # run a single test by tag
npx playwright test -g "user can log in"           # run by title substring

npm run report                    # open the HTML report from the last run
npm run codegen                   # record selectors against getdeals247.com

npm run lint                      # eslint
npm run typecheck                 # tsc --noEmit
npm run format                    # prettier write
```

Run `npm run lint && npm run typecheck` before pushing.

## Setup that gates everything

Tests cannot run without credentials. `src/config/test-config.ts` reads `.env`
and **throws** `Missing required env var: TEST_USER_EMAIL` (lazily, via getters)
the moment a test touches `testConfig.testUser`. Copy `.env.example` to `.env`
and fill `TEST_USER_EMAIL` / `TEST_USER_PASSWORD`. `.env` is git-ignored.

## Architecture

The codebase follows the **Page Object Model**. The dependency flow is:

```
tests/*.spec.ts
   ├─ src/pages/        locators + actions (HomePage, LoginPage : BasePage)
   ├─ src/fixtures/     custom `test` runner that injects a logged-in page
   ├─ src/config/       env-backed config (baseUrl, credentials)
   └─ src/utils/        pure helpers (maskEmail, parsePrice, …)
```

- **`src/pages/`** — All selectors live here, never in specs. `BasePage` holds
  shared navigation/assertion helpers; concrete pages extend it. Selectors are
  deliberately accessibility-first (`getByRole`/`getByLabel`) with CSS fallbacks
  so they survive minor markup changes. When a test breaks on a missing
  selector, fix the Page Object — not the spec. Use `npm run codegen` to find
  new selectors.

- **`src/fixtures/auth.fixture.ts`** — Exports an extended `test` (re-exported via
  `src/fixtures/index.ts`) that provides a `loggedInPage` fixture: it drives a
  real UI login and hands the test an already-authenticated page.

- **Two ways tests authenticate.** `tests/login.spec.ts` shows both:
  - `@ID_1` imports the bare `@playwright/test` runner (`baseTest`) and performs
    the login interaction itself — this is the test _of_ login.
  - `@ID_2` imports `test` from `src/fixtures` and receives `loggedInPage`
    pre-authenticated — login is a precondition, not the thing under test.

  Pick the runner based on whether login is the subject or just setup.

- **Tag-based selection drives CI.** Every test carries a `@ID_n` tag. CI runs a
  specific subset via `--grep`. Keep tags unique and stable.

## CI

`.github/workflows/run_test_and_check_pr.yaml` runs on PRs to `main`. It uses
**yarn** (`yarn install`, `yarn playwright:install`, `yarn test --grep "@ID_1"`)
even though local dev uses npm — keep both lockfiles/flows working. Credentials
come from `secrets.TEST_USER_EMAIL` / `TEST_USER_PASSWORD`. CI currently runs
**only `@ID_1`**; add tags to the `--grep` to widen coverage.

`playwright.config.ts` behaves differently under CI (`process.env.CI`): retries
2 (vs 0), 1 worker (vs unlimited), and `forbidOnly` is on — a stray `test.only`
fails the build.

## Things to focus on / known gotchas

- **Tests hit production over the network.** They are inherently flaky against a
  third-party site; a failure may be the site, not the test. Prefer fixing
  selectors in Page Objects over loosening assertions.
- **Only chromium is active.** firefox/webkit projects are commented out in
  `playwright.config.ts`.
- **The auth fixture's docstring is stale.** It describes a _worker-scoped_
  fixture that saves/reuses `storageState` to avoid re-logging-in per test, but
  the live code is **test-scoped** with the storageState save/reuse commented
  out — so every test logs in through the UI. If you touch auth, reconcile the
  comments with the code (or restore the worker-scoped optimization).
- **`.env.example` contains a real-looking email.** Treat example/fixture data
  with care; don't propagate real addresses.
- **The README describes the project as fuller than it is** (worker sessions,
  empty CI placeholder). Trust the code over the README when they disagree.
- **`maskEmail` exists so credentials don't leak into CI logs** — use it for any
  new log line that includes an email.
