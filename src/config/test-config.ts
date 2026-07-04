import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });

function required(key: string): string {
  const value = process.env[key];
  if (value === undefined || value.length === 0) {
    throw new Error(`Missing required env var: ${key}. See .env.example.`);
  }
  return value;
}

export const testConfig = {
  baseUrl: process.env.BASE_URL ?? 'https://get-deals.vercel.app',
  testUser: {
    get email(): string {
      return required('TEST_USER_EMAIL');
    },
    get password(): string {
      return required('TEST_USER_PASSWORD');
    },
  },
} as const;
