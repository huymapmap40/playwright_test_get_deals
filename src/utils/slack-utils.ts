import { logger } from './logger';

/**
 * Posts messages to Slack via the Web API (`chat.postMessage`), which lets us
 * target a specific channel at call time — unlike an incoming webhook, which is
 * bound to a single channel. Auth uses a bot token so the message is attributed
 * to the app and can post to any channel the bot is a member of.
 *
 * Required env var:
 *   SLACK_BOT_TOKEN        bot token, starts with `xoxb-`
 * Optional env var:
 *   SLACK_DEFAULT_CHANNEL  channel used when a call omits one (id like `C0123` or name `#qa-alerts`)
 *
 * The bot must be invited to a channel before it can post there
 * (`/invite @your-bot`), otherwise Slack returns `not_in_channel`.
 */

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
