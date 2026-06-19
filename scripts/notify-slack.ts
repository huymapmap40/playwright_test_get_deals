import { sendSlackMessage } from '../src/utils';

/**
 * CI entry point for the Slack notification. Reads the test-run outcome and a
 * link back to the run from the environment (set by the GitHub Actions job) and
 * posts a single summary message via the shared `sendSlackMessage` util.
 *
 * Env:
 *   TEST_RESULT  GitHub job result: success | failure | cancelled | skipped
 *   RUN_URL      link to the Actions run (optional)
 *   SLACK_BOT_TOKEN / SLACK_DEFAULT_CHANNEL  consumed by sendSlackMessage
 */

const result = process.env.TEST_RESULT ?? 'unknown';
const runUrl = process.env.RUN_URL;

const emoji = result === 'success' ? '✅' : result === 'failure' ? '❌' : '⚠️';
const lines = [`${emoji} Playwright getdeals247 test run: *${result}*`];
if (runUrl) {
  lines.push(`<${runUrl}|View run>`);
}

sendSlackMessage({ text: lines.join('\n') })
  .then((ok) => {
    // Fail the step if Slack rejected the message, so the problem is visible.
    process.exit(ok ? 0 : 1);
  })
  .catch(() => process.exit(1));
