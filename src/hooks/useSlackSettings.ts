'use client';

import { useState, useEffect, useCallback } from 'react';
import { SlackSettings } from '@/types';

const STORAGE_KEY = 'youtube-dashboard-slack';

export function useSlackSettings() {
  const [settings, setSettings] = useState<SlackSettings>({
    enabled: false,
    webhookUrl: '',
  });
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setSettings(JSON.parse(stored));
      } else {
        // 初回: .env.local の値をデフォルトとしてセット
        setSettings({
          enabled: false,
          webhookUrl: process.env.NEXT_PUBLIC_SLACK_WEBHOOK_URL ?? '',
        });
      }
    } catch {
      // ignore
    }
    setInitialized(true);
  }, []);

  useEffect(() => {
    if (initialized) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    }
  }, [settings, initialized]);

  const updateSlackSettings = useCallback((patch: Partial<SlackSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  return { slackSettings: settings, updateSlackSettings };
}
