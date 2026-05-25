import { Page, Locator, expect } from '@playwright/test';

/**
 * BasePage holds locators/actions common to every page in the app.
 * Concrete pages extend this and add page-specific selectors.
 */
export abstract class BasePage {
  constructor(protected readonly page: Page) {}

  async goto(pathOrUrl = '/'): Promise<void> {
    await this.page.goto(pathOrUrl, { waitUntil: 'domcontentloaded' });
  }

  async title(): Promise<string> {
    return this.page.title();
  }

  async url(): Promise<string> {
    return this.page.url();
  }

  async expectVisible(locator: Locator, message?: string): Promise<void> {
    await expect(locator, message).toBeVisible();
  }

  async waitForDomContentLoaded(): Promise<void> {
    await this.page.waitForLoadState('domcontentloaded');
  }
}
