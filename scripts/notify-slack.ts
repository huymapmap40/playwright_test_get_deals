import { sendSlackMessage } from '../src/utils';

const result = process.env.TEST_RESULT ?? 'unknown';
const runUrl = process.env.RUN_URL;
const buildId = process.env.BUILD_ID!;
const authorTriggeredTest = process.env.AUTHOR!;
const statusTest = process.env.STATUS_TEST!;
const passedNumber = process.env.PASSED!;
const failedNumber = process.env.FAILED!;
const totalNumber = process.env.TOTAL!;
const reportPageUrl = process.env.REPORT_PAGE_URL!;
const buildRunUrl = process.env.BUILD_RUN_URL!;

function _button(text: string, url: string) {
  return { type: 'button', text: { type: 'plain_text', text: text, emoji: true }, url: url };
}

const formatNotifyTestResult = (
  buildId: string,
  author: string,
  status: string,
  passed: string,
  failed: string,
  total: string,
): unknown[] => {
  const blocks: unknown[] = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `# Automation Playwright test result - Build ${buildId}`,
        emoji: true,
      },
      level: 1,
    },
    { type: 'divider' },
    { type: 'context', elements: [{ type: 'plain_text', text: `Triggered by: ${author}` }] },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Status:* ${status}\n\n*Summary:* :white_check_mark: ${passed} passed  :x: ${failed} failed (${total} total)`,
      },
    },
  ];

  const buttons: unknown[] = [];
  if (reportPageUrl) {
    buttons.push(_button('View Report 📊', reportPageUrl));
  }
  if (buildRunUrl) {
    buttons.push(_button('Build Run 🔧', buildRunUrl));
  }

  if (buttons.length > 0) {
    blocks.push({
      type: 'actions',
      elements: buttons,
    });
  }

  return blocks;
};

const emoji = result === 'success' ? '✅' : result === 'failure' ? '❌' : '⚠️';
const lines = [`${emoji} Playwright getdeals247 test run: *${result}*`];
if (runUrl) {
  lines.push(`<${runUrl}|View run>`);
}

sendSlackMessage({
  text: lines.join('\n'),
  blocks: formatNotifyTestResult(
    buildId,
    authorTriggeredTest,
    statusTest,
    passedNumber,
    failedNumber,
    totalNumber,
  ),
})
  .then((ok) => {
    // Fail the step if Slack rejected the message, so the problem is visible.
    process.exit(ok ? 0 : 1);
  })
  .catch(() => process.exit(1));
