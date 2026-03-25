import { SlackNotificationData } from '@/types';

function formatCount(n: number): string {
  if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(1)}億`;
  if (n >= 10_000) return `${(n / 10_000).toFixed(1)}万`;
  return n.toLocaleString();
}

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString('ja-JP', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatChange(n: number): string {
  if (n > 0) return `+${formatCount(n)}`;
  if (n < 0) return `${formatCount(n)}`;
  return '変化なし';
}

/**
 * Slack Block Kit 形式のペイロードを生成する
 */
export function buildSlackPayload(data: SlackNotificationData) {
  const blocks: object[] = [];

  // ヘッダー
  blocks.push({
    type: 'header',
    text: { type: 'plain_text', text: '📊 YouTube ダッシュボード 更新レポート', emoji: true },
  });

  // 更新サマリー
  blocks.push({
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: `✅ *${data.updatedCount}件* のデータを更新しました\n🕐 ${formatTimestamp(data.timestamp)}`,
    },
  });

  // 急上昇動画セクション
  if (data.viewIncreases.length > 0) {
    blocks.push({ type: 'divider' });
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `🚀 *急上昇動画（前回比 +1,000回以上）*\n${data.viewIncreases
          .map(
            (v) =>
              `• <https://www.youtube.com/watch?v=${v.videoId}|${v.title}>\n　  *${formatChange(v.increase)}回* 増加（合計 ${formatCount(v.total)}回）`
          )
          .join('\n')}`,
      },
    });
  }

  // チャンネル登録者数セクション
  const significantChannelChanges = data.channelChanges.filter((c) => c.change !== 0);
  if (significantChannelChanges.length > 0) {
    blocks.push({ type: 'divider' });
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `📺 *チャンネル登録者数の変化*\n${significantChannelChanges
          .map(
            (c) =>
              `• *${c.name}*：${formatCount(c.subscribers)}人 （${formatChange(c.change)}人）`
          )
          .join('\n')}`,
      },
    });
  }

  // 変化なしの場合のフォールバック
  if (data.viewIncreases.length === 0 && significantChannelChanges.length === 0) {
    blocks.push({ type: 'divider' });
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: '_今回の更新で大きな変化はありませんでした_' },
    });
  }

  // フッター
  blocks.push({ type: 'divider' });
  blocks.push({
    type: 'context',
    elements: [
      { type: 'mrkdwn', text: '📌 YouTube制作ダッシュボードより自動送信' },
    ],
  });

  return { blocks };
}

/**
 * Slack通知を Next.js APIルート経由で送信する
 */
export async function sendSlackNotification(
  data: SlackNotificationData,
  webhookUrl: string
): Promise<void> {
  const payload = buildSlackPayload(data);

  const res = await fetch('/api/slack', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ webhookUrl, payload }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Slack送信エラー: ${res.status}`);
  }
}
