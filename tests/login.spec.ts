import { test as baseTest, expect } from '@playwright/test';
import { test as authTest } from '../src/fixtures';
import { HomePage, LoginPage } from '../src/pages';
import { testConfig } from '../src/config/test-config';

/**
 * Full UI login flow — uses the bare `@playwright/test` runner so we exercise
 * the login interaction end-to-end (no pre-seeded storageState).
 */
baseTest.describe('Login flow (UI)', () => {
  baseTest('user can log in with email and password', {tag: "@ID_1"} , async ({ page }) => {
    const home = new HomePage(page);
    const login = new LoginPage(page);

    await baseTest.step('navigate to getdeals247.com', async () => {
      await home.open();
      await home.expectLoaded();
    });

    await baseTest.step('open login from the top-right user icon', async () => {
      await home.openSignIn();
      await login.expectVisible();
    });

    await baseTest.step('choose email + password sign-in option', async () => {
      await login.chooseEmailPasswordOption();
    });

    await baseTest.step('submit credentials', async () => {
      await login.fillCredentials(testConfig.testUser.email, testConfig.testUser.password);
      await login.submit();
    });

    await baseTest.step('verify back on homepage and user badge is shown', async () => {
      await expect(page).toHaveURL(/getdeals247\.com/);
      await home.expectUserLoggedIn();
    });
  });
});

/**
 * Smoke test using the worker-scoped auth fixture: starts already logged in
 * thanks to the stored session, so we only assert the post-login state.
 */
authTest.describe('Authenticated home (fixture)', () => {
  authTest('home page shows logged-in user badge', async ({ loggedInPage }) => {
    const home = new HomePage(loggedInPage);
    await home.open();
    await expect(home.loggedInUserBadge).toBeVisible();
  });
});
