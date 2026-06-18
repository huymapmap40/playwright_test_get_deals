import { expect } from '@playwright/test';
import { dbFixture as test } from '@fixtures/db.fixture';
import { sum } from '../src/utils/number-utils';

test.describe('Test sum', () => {
  test('Adds two positive numbers', {tag: '@Test_Sum_1'},async ({dbInstance, log}) => {
    const first_deals = await dbInstance.collection('deals').find().limit(10).toArray();
    log.info(JSON.parse(JSON.stringify(first_deals)))
    expect(sum(2, 3)).toEqual(5);
  });

  test('Handles negatives and zero', async ({dbInstance, log}) => {
    const adminDb = await dbInstance.admin()
    log.info(`Admin DB is ${adminDb}`)
    expect(sum(-4, 4)).toBe(0);
    expect(sum(-2, -3)).toBe(-5);
    expect(sum(0, 7)).toBe(7);
  });

  test('Adds decimals', async ({myFixture, log}) => {
    log.info(`MyFixture return value ${myFixture}`)
    expect(sum(0.1, 0.2)).toBeCloseTo(0.3);
  });
});
