import { test as base, Page, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { HomePage, LoginPage } from '../pages';
import { testConfig } from '../config/test-config';
import { maskEmail } from '../utils';

/**
 * Auth fixture.
 *
 * - `authStorageStatePath` is **worker-scoped**: it runs ONCE per worker
 *   (Playwright's equivalent of "session scope"), drives a real login
 *   through the UI, and persists the resulting cookies / localStorage
 *   to a JSON file.
 *
 * - `loggedInPage` is **test-scoped**: each test gets a fresh browser
 *   context bootstrapped from that storage state, so the test starts
 *   already authenticated without paying the login cost per test.
 */

type AuthFixtures = {
  // loggedInContext: BrowserContext;
  loggedInPage: Page;
};

// type AuthWorkerFixtures = {
//   authStorageStatePath: string;
// };

const STORAGE_DIR = path.resolve(__dirname, '..', '..', '.auth');

export const test = base.extend<AuthFixtures>({
  loggedInPage: [
    async ({ browser }, use, workerInfo) => {
      if (!fs.existsSync(STORAGE_DIR)) {
        fs.mkdirSync(STORAGE_DIR, { recursive: true });
      }
      const statePath = path.join(STORAGE_DIR, `worker-${workerInfo.workerIndex}.json`);

      // ---- before-all (per worker) ---------------------------------------
      const context = await browser.newContext();
      const page = await context.newPage();

      const email = testConfig.testUser.email;
      const password = testConfig.testUser.password;
      console.info(`[auth.fixture] worker ${workerInfo.workerIndex}: logging in as ${maskEmail(email)}`);

      const home = new HomePage(page);
      const login = new LoginPage(page);

      await home.open();
      await home.expectLoaded();
      await home.openSignIn();
      await login.expectVisible();
      await login.loginWithEmail(email, password);
      await expect(home.loggedInUserBadge, 'login should produce a logged-in badge').toBeVisible({
        timeout: 30_000,
      });

      // await context.storageState({ path: statePath });
      // await context.close();

      await use(page);

      // ---- after-all (per worker) ----------------------------------------
      try {
        if (fs.existsSync(statePath)) fs.unlinkSync(statePath);
      } catch (err) {
        console.warn(`[auth.fixture] failed to clean up ${statePath}:`, err);
      }
    },
    { scope: 'test' },
  ],

  // loggedInContext: async ({ browser, authStorageStatePath }, use) => {
  //   const context = await browser.newContext({ storageState: authStorageStatePath });
  //   await use(context);
  //   await context.close();
  // },

  // loggedInPage: async ({ loggedInContext }, use) => {
  //   const page = await loggedInContext.newPage();
  //   await use(page);
  // },
});

export { expect } from '@playwright/test';
