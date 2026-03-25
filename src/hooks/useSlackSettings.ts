'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { SlackSettings } from '@/types';

const STORAGE_KEY = 'youtube-dashboard-slack';

export function useSlackSettings() {
  const [settings, setSettings] = useState<SlackSettings>({
    enabled: false,
    webhookUrl: '',
  });
  // 初期化完了フラグ。false の間は localStorage への書き込みを行わない
  const initializedRef = useRef(false);

  // 起動時に localStorage から読み込む
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: SlackSettings = JSON.parse(stored);
        // enabled が明示的に boolean で保存されていることを保証
        setSettings({
          enabled: parsed.enabled === true,
          webhookUrl: parsed.webhookUrl ?? '',
        });
      } else {
        // 初回: .env.local の値をデフォルトとしてセット（enabled は必ず false）
        setSettings({
          enabled: false,
          webhookUrl: process.env.NEXT_PUBLIC_SLACK_WEBHOOK_URL ?? '',
        });
      }
    } catch {
      // ignore
    }
    initializedRef.current = true;
  }, []);

  // 設定変更時に localStorage へ保存
  // initializedRef.current が true になってからのみ保存する
  const updateSlackSettings = useCallback((patch: Partial<SlackSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      if (initializedRef.current) {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {
          // ignore
        }
      }
      return next;
    });
  }, []);

  return { slackSettings: settings, updateSlackSettings };
}
