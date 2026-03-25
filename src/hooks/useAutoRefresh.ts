'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { AutoRefreshSettings } from '@/types';

const STORAGE_KEY = 'youtube-dashboard-auto-refresh';

const DEFAULT_SETTINGS: AutoRefreshSettings = {
  enabled: false,
  intervalHours: 6,
  lastUpdatedAt: null,
};

export function useAutoRefresh(onRefresh: () => Promise<void>) {
  const [settings, setSettings] = useState<AutoRefreshSettings>(DEFAULT_SETTINGS);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // stale closure 対策: 最新の onRefresh を ref で保持
  const callbackRef = useRef(onRefresh);
  useEffect(() => { callbackRef.current = onRefresh; }, [onRefresh]);

  // localStorage から設定を読み込む
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setSettings(JSON.parse(stored));
    } catch {
      // ignore
    }
    setInitialized(true);
  }, []);

  // 設定変更を localStorage に保存
  useEffect(() => {
    if (initialized) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    }
  }, [settings, initialized]);

  const triggerRefresh = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      await callbackRef.current();
      setSettings((prev) => ({ ...prev, lastUpdatedAt: new Date().toISOString() }));
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing]);

  const updateSettings = useCallback((patch: Partial<AutoRefreshSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  // 自動更新タイマー（1分ごとに時刻チェック）
  useEffect(() => {
    if (!settings.enabled) return;

    const check = () => {
      const now = Date.now();
      const last = settings.lastUpdatedAt ? new Date(settings.lastUpdatedAt).getTime() : 0;
      const intervalMs = settings.intervalHours * 60 * 60 * 1000;
      if (now - last >= intervalMs) {
        triggerRefresh();
      }
    };

    // 初回チェック（タブを開いたとき時間が経過していれば即更新）
    check();

    const timer = setInterval(check, 60_000);
    return () => clearInterval(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.enabled, settings.intervalHours, settings.lastUpdatedAt]);

  return { settings, updateSettings, triggerRefresh, isRefreshing };
}
