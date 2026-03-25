'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChannelData } from '@/types';
import { supabase } from '@/lib/supabase';

// ---- DB マッピング ----

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapFromDB(row: any): ChannelData {
  return {
    id: row.id,
    channelId: row.channel_id,
    name: row.name,
    icon: row.icon ?? '',
    subscribers: row.subscribers ?? 0,
    totalViews: row.total_views ?? 0,
    videoCount: row.video_count ?? 0,
    topVideos: row.top_videos ?? [],
    allVideos: row.all_videos ?? [],
    addedAt: row.added_at,
  };
}

function mapToDB(c: Omit<ChannelData, 'id' | 'addedAt'>) {
  return {
    channel_id: c.channelId,
    name: c.name,
    icon: c.icon,
    subscribers: c.subscribers,
    total_views: c.totalViews,
    video_count: c.videoCount,
    top_videos: c.topVideos,
    all_videos: c.allVideos,
  };
}

// ---- フック ----

export function useChannels() {
  const [channels, setChannels] = useState<ChannelData[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('channels').select('*').order('added_at', { ascending: true });
      if (data) setChannels(data.map(mapFromDB));
    };
    load();

    const channel = supabase
      .channel('channels-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'channels' }, (payload) => {
        setChannels((prev) => {
          if (prev.find((c) => c.id === payload.new.id)) return prev;
          return [...prev, mapFromDB(payload.new)];
        });
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'channels' }, (payload) => {
        setChannels((prev) => prev.map((c) => c.id === payload.new.id ? mapFromDB(payload.new) : c));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'channels' }, (payload) => {
        setChannels((prev) => prev.filter((c) => c.id !== payload.old.id));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const addChannel = useCallback(async (data: Omit<ChannelData, 'id' | 'addedAt'>) => {
    // 同じチャンネルIDがある場合はupsert
    const { data: upserted } = await supabase
      .from('channels')
      .upsert([mapToDB(data)], { onConflict: 'channel_id' })
      .select()
      .single();
    if (upserted) {
      setChannels((prev) => {
        const exists = prev.find((c) => c.id === upserted.id);
        if (exists) return prev.map((c) => c.id === upserted.id ? mapFromDB(upserted) : c);
        return [...prev, mapFromDB(upserted)];
      });
    }
  }, []);

  const removeChannel = useCallback(async (id: string) => {
    await supabase.from('channels').delete().eq('id', id);
    setChannels((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const refreshChannel = useCallback(async (id: string, data: Omit<ChannelData, 'id' | 'addedAt'>) => {
    await supabase.from('channels').update(mapToDB(data)).eq('id', id);
    setChannels((prev) => prev.map((c) => c.id === id ? { ...c, ...data } : c));
  }, []);

  return { channels, addChannel, removeChannel, refreshChannel };
}
