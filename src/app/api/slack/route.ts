import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { webhookUrl, payload } = await request.json();

    // クライアントからのURLを使用、なければ環境変数にフォールバック
    const url = webhookUrl || process.env.SLACK_WEBHOOK_URL;
    if (!url) {
      return NextResponse.json({ error: 'Webhook URLが設定されていません' }, { status: 400 });
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: `Slack APIエラー: ${text}` }, { status: res.status });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '送信に失敗しました' },
      { status: 500 }
    );
  }
}
