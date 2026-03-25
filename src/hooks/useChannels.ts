'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChannelData } from '@/types';
import { v4 as uuidv4 } from 'uuid';

const STORAGE_KEY = 'youtube-dashboard-channels';

export function useChannels() {
  const [channels, setChannels] = useState<ChannelData[]>([]);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // 旧データに allVideos がない場合は topVideos で補完
        const migrated = parsed.map((c: ChannelData) => ({
          ...c,
          allVideos: c.allVideos ?? c.topVideos ?? [],
        }));
        setChannels(migrated);
      } catch {
        setChannels([]);
      }
    }
    setInitialized(true);
  }, []);

  useEffect(() => {
    if (initialized) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(channels));
    }
  }, [channels, initialized]);

  const addChannel = useCallback((data: Omit<ChannelData, 'id' | 'addedAt'>) => {
    const newChannel: ChannelData = {
      ...data,
      id: uuidv4(),
      addedAt: new Date().toISOString(),
    };
    setChannels((prev) => {
      // 同じチャンネルIDが既にある場合は更新
      const exists = prev.find((c) => c.channelId === data.channelId);
      if (exists) {
        return prev.map((c) => (c.channelId === data.channelId ? { ...newChannel, id: c.id, addedAt: c.addedAt } : c));
      }
      return [...prev, newChannel];
    });
  }, []);

  const removeChannel = useCallback((id: string) => {
    setChannels((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const refreshChannel = useCallback((id: string, data: Omit<ChannelData, 'id' | 'addedAt'>) => {
    setChannels((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...data } : c))
    );
  }, []);

  return { channels, addChannel, removeChannel, refreshChannel };
}
