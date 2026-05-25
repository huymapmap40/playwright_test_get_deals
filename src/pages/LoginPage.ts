import { Locator, Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * LoginPage = the auth surface that appears after clicking the user icon.
 *
 * The site offers multiple sign-in methods (social, email/password, etc.).
 * `chooseEmailPasswordOption()` opens the email/password form before
 * the email/password fields become visible.
 */
export class LoginPage extends BasePage {
  readonly heading: Locator;
  readonly emailPasswordOption: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    super(page);

    this.heading = page
      .getByRole('heading', { name: /sign in|log in|login/i })
      .or(page.locator('[data-testid="login-title"]'))
      .first();

    this.emailPasswordOption = page
      .getByRole('tab', { name: /Email & Password/i })
      .first();

    this.emailInput = page.locator('#email')
      .first();

    this.passwordInput = page.locator('#password')
      .first();

    this.submitButton = page
      .getByRole('button', { name: /^Sign In$/i })
      .first();

    this.errorMessage = page
      .getByRole('alert')
      .or(page.locator('[data-testid="login-error"], .login-error, .error-message'))
      .first();
  }

  async expectVisible(): Promise<void> {
    await expect(this.heading, 'login heading should be visible').toBeVisible();
  }

  async chooseEmailPasswordOption(): Promise<void> {
    if (await this.emailPasswordOption.isVisible().catch(() => false)) {
      await this.emailPasswordOption.click();
    }
    await expect(this.emailInput, 'email field should be visible').toBeVisible();
  }

  async fillCredentials(email: string, password: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
  }

  async submit(): Promise<void> {
    await this.submitButton.click();
  }

  async loginWithEmail(email: string, password: string): Promise<void> {
    await this.chooseEmailPasswordOption();
    await this.fillCredentials(email, password);
    await this.submit();
  }
}
