import { Locator, Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * HomePage = get-deals.vercel.app landing page.
 *
 * The selectors below favour accessibility-first queries (getByRole / aria-label),
 * which tend to survive minor markup changes. Adjust the regexes if the live
 * page exposes different accessible names.
 */
export class HomePage extends BasePage {
  readonly userIconButton: Locator;
  readonly loggedInUserBadge: Locator;

  constructor(page: Page) {
    super(page);

    // Top-right user/account entry point. Match by role+name first, then
    // fall back to a header-scoped data-test id if your team adds one.
    this.userIconButton = page.locator('[id*=radix]')
      .first();

    // After login, the icon turns into an avatar/initials badge. We
    // identify it by the presence of an "account menu" / "profile" affordance.
    this.loggedInUserBadge = page.getByRole('button', { name: /[A-Z]{2}/ }).first();
  }

  signInButton = this.page.getByRole('menuitem', { name: /Sign In/i})

  async open(): Promise<void> {
    await this.goto('/');
  }

  async clickUserIcon(): Promise<void> {
    await this.userIconButton.click();
  }

  async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/getdeals247\.com/);
    await this.expectVisible(this.userIconButton, 'top-right user icon should be visible');
  }



  async expectUserLoggedIn(): Promise<void> {
    await expect(this.loggedInUserBadge, 'logged-in user badge should be visible').toBeVisible();
  }

  async openSignIn(): Promise<void> {
    await this.clickUserIcon();
    await this.signInButton.click();
  }
}
