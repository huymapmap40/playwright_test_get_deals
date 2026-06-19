import { logger } from './logger';


const SLACK_POST_MESSAGE_URL = 'https://slack.com/api/chat.postMessage';
const SLACK_DEFAULT_CHANNEL = process.env.SLACK_DEFAULT_CHANNEL ?? 'automation-test-getdeals247'

export interface SlackMessageOptions {
  /** Channel id (e.g. `C0123ABC`) or name (e.g. `#qa-alerts`). Falls back to SLACK_DEFAULT_CHANNEL. */
  channel?: string;
  /** Plain-text body. Used as the notification fallback when `blocks` are supplied. */
  text: string;
  /** Optional Block Kit blocks for richer formatting. */
  blocks?: unknown[];
  /** Post into an existing thread by passing the parent message's `ts`. */
  threadTs?: string;
}

/**
 * Sends a message to a Slack channel. Errors are logged and surfaced as a
 * `false` return rather than thrown, so a failed notification never takes down
 * the test/report flow that called it.
 *
 * @returns `true` if Slack accepted the message, `false` otherwise.
 */
export async function sendSlackMessage(options: SlackMessageOptions): Promise<boolean> {
  const token = process.env.SLACK_BOT_TOKEN;
  const channel = options.channel ?? SLACK_DEFAULT_CHANNEL;

  if (!token) {
    logger.error('Slack: missing SLACK_BOT_TOKEN — skipping message');
    return false;
  }
  if (!channel) {
    logger.error('Slack: no channel provided and SLACK_DEFAULT_CHANNEL is unset — skipping message');
    return false;
  }

  try {
    const response = await fetch(SLACK_POST_MESSAGE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        channel,
        text: options.text,
        ...(options.blocks ? { blocks: options.blocks } : {}),
        ...(options.threadTs ? { thread_ts: options.threadTs } : {}),
      }),
    });

    // Slack always returns HTTP 200; success/failure is in the JSON `ok` field.
    const result = (await response.json()) as { ok: boolean; error?: string };
    if (!result.ok) {
      logger.error(`Slack: failed to post to ${channel} — ${result.error ?? 'unknown_error'}`);
      return false;
    }

    logger.info(`Slack: message sent to ${channel}`);
    return true;
  } catch (error) {
    logger.error(`Slack: request failed — ${(error as Error).message}`);
    return false;
  }
}
