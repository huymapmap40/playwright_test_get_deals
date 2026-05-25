# playwright-test-get-deals

End-to-end UI tests for [getdeals247.com](https://getdeals247.com), built with
[Playwright](https://playwright.dev/) + TypeScript.

The project is structured around the Page Object Model (POM): page locators
and actions live under `src/pages/`, fixtures under `src/fixtures/`, helpers
under `src/utils/`, and the actual test suites under `tests/`.

---

## Project layout

```
.
├── .github/
│   ├── workflows/                # CI workflows live here (add later)
│   └── pull_request_template.md  # default PR template
├── src/
│   ├── config/
│   │   └── test-config.ts        # reads BASE_URL + credentials from .env
│   ├── pages/                    # Page Object Model
│   │   ├── BasePage.ts
│   │   ├── HomePage.ts
│   │   └── LoginPage.ts
│   ├── fixtures/                 # custom Playwright fixtures
│   │   └── auth.fixture.ts       # worker-scoped login (== "session scope")
│   └── utils/                    # string / number helpers
│       ├── string-utils.ts
│       └── number-utils.ts
├── tests/                        # test suites — one file per feature
│   └── login.spec.ts
├── .env.example                  # copy to .env and fill in credentials
├── .eslintrc.cjs
├── .prettierrc
├── playwright.config.ts
├── tsconfig.json
└── package.json
```

### Where do I put what?

| I want to ...                                    | Put it in ...               |
| ------------------------------------------------ | --------------------------- |
| Add a new page's locators / actions              | `src/pages/<NewPage>.ts`    |
| Reuse a precondition across many tests          | `src/fixtures/*.fixture.ts` |
| Add a generic string/number helper               | `src/utils/`                |
| Add a new test scenario                          | `tests/<feature>.spec.ts`   |
| Change runner config (timeouts, projects, etc.)  | `playwright.config.ts`      |

---

## Getting started

### 1. Install dependencies

```bash
npm install
npm run install:browsers   # installs Chromium / Firefox / WebKit
```

### 2. Configure credentials

```bash
cp .env.example .env
# edit .env and fill in TEST_USER_EMAIL / TEST_USER_PASSWORD
```

`.env` is git-ignored. Never commit real credentials.

### 3. Run the tests

```bash
npm test                   # headless, all browsers
npm run test:headed        # headed mode (see the browser)
npm run test:ui            # Playwright UI mode (best dev experience)
npm run test:chromium      # one browser only
npm run report             # open the HTML report from the last run
```

---

## Available `npm` scripts

| Command                      | What it does                                           |
| ---------------------------- | ------------------------------------------------------ |
| `npm test`                   | Run the full Playwright suite                          |
| `npm run test:headed`        | Run with a visible browser window                      |
| `npm run test:ui`            | Open Playwright's interactive UI runner                |
| `npm run test:debug`         | Run with the Playwright Inspector / debugger attached  |
| `npm run test:chromium`      | Run only the Chromium project                          |
| `npm run test:firefox`       | Run only the Firefox project                           |
| `npm run test:webkit`        | Run only the WebKit project                            |
| `npm run report`             | Open the last HTML report                              |
| `npm run codegen`            | Open Playwright codegen against getdeals247.com        |
| `npm run install:browsers`   | Install Playwright browser binaries + OS deps          |
| `npm run lint`               | ESLint over the whole project                          |
| `npm run lint:fix`           | ESLint with `--fix`                                    |
| `npm run typecheck`          | Type-check with `tsc --noEmit`                         |
| `npm run format`             | Prettier write                                         |
| `npm run format:check`       | Prettier check (CI-friendly)                           |

---

## The login flow that is tested

The default suite (`tests/login.spec.ts`) covers:

1. Navigate to `https://getdeals247.com`.
2. Click the user icon at the top-right corner.
3. Assert the login page is shown.
4. Choose the **Login with email & password** option.
5. Submit `TEST_USER_EMAIL` / `TEST_USER_PASSWORD` from `.env`.
6. Assert the page is back at the homepage and the top-right icon now
   shows the logged-in user badge.

> **Selectors note.** The Page Objects use accessibility-first locators
> (`getByRole`, `getByLabel`, `getByPlaceholder`) with CSS fallbacks.
> If getdeals247.com changes its markup or copy, adjust the regexes in
> `src/pages/HomePage.ts` and `src/pages/LoginPage.ts` — the test code
> itself should stay unchanged.

---

## Fixtures

`src/fixtures/auth.fixture.ts` exposes a custom `test` runner with:

- **`authStorageStatePath`** — worker-scoped (Playwright's equivalent of
  "session scope"). It performs a real UI login **once per worker process**
  in its `before` phase, saves the resulting cookies / localStorage to
  `.auth/worker-<n>.json`, and cleans the file up in its `after` phase.
- **`loggedInContext`** / **`loggedInPage`** — test-scoped. Each test gets
  a fresh browser context bootstrapped from the saved state, so the test
  starts already authenticated.

Use it like this:

```ts
import { test, expect } from '../src/fixtures';
import { HomePage } from '../src/pages';

test('shows the logged-in badge', async ({ loggedInPage }) => {
  const home = new HomePage(loggedInPage);
  await home.open();
  await home.expectUserLoggedIn();
});
```

---

## Linting & TypeScript

- ESLint config: `.eslintrc.cjs` (TypeScript + Playwright rules, Prettier-compatible).
- TypeScript config: `tsconfig.json` (strict mode, path aliases).

Run before pushing:

```bash
npm run lint && npm run typecheck
```

---

## CI

A `.github/workflows/` folder is included as a placeholder. Add your
workflow YAML there when you're ready to wire up CI — typical steps:

```yaml
# .github/workflows/playwright.yml (example, add yourself)
- run: npm ci
- run: npx playwright install --with-deps
- run: npm run lint
- run: npm run typecheck
- run: npm test
```

A pull request template lives at `.github/pull_request_template.md`.

---

## Troubleshooting

- **Login test fails because a selector didn't match** — open
  `npm run codegen`, click through the flow, and copy the selectors
  Playwright suggests into the relevant Page Object. Prefer
  `getByRole` / `getByLabel` over brittle CSS.
- **`Missing required env var: TEST_USER_EMAIL`** — you haven't created
  `.env` yet. Copy from `.env.example`.
- **Slow first run** — Playwright downloads browser binaries on first use.
  Run `npm run install:browsers` once after `npm install`.
