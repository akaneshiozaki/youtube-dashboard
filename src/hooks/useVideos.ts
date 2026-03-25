'use client';

import { useState, useEffect, useCallback } from 'react';
import { VideoCard, Stage } from '@/types';
import { supabase } from '@/lib/supabase';

// ---- DB マッピング ----

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapFromDB(row: any): VideoCard {
  return {
    id: row.id,
    title: row.title,
    assignee: row.assignee ?? '',
    publishDate: row.publish_date ?? '',
    notes: row.notes ?? '',
    stage: row.stage as Stage,
    createdAt: row.created_at,
    views: row.views ?? undefined,
    likes: row.likes ?? undefined,
    comments: row.comments ?? undefined,
    youtubeVideoId: row.youtube_video_id ?? undefined,
    thumbnail: row.thumbnail ?? undefined,
  };
}

function mapToDB(v: Omit<VideoCard, 'id' | 'createdAt'>) {
  return {
    title: v.title,
    assignee: v.assignee,
    publish_date: v.publishDate,
    notes: v.notes,
    stage: v.stage,
    views: v.views ?? null,
    likes: v.likes ?? null,
    comments: v.comments ?? null,
    youtube_video_id: v.youtubeVideoId ?? null,
    thumbnail: v.thumbnail ?? null,
  };
}

function mapPartialToDB(v: Partial<VideoCard>) {
  const row: Record<string, unknown> = {};
  if (v.title !== undefined)         row.title = v.title;
  if (v.assignee !== undefined)      row.assignee = v.assignee;
  if (v.publishDate !== undefined)   row.publish_date = v.publishDate;
  if (v.notes !== undefined)         row.notes = v.notes;
  if (v.stage !== undefined)         row.stage = v.stage;
  if ('views' in v)                  row.views = v.views ?? null;
  if ('likes' in v)                  row.likes = v.likes ?? null;
  if ('comments' in v)               row.comments = v.comments ?? null;
  if ('youtubeVideoId' in v)         row.youtube_video_id = v.youtubeVideoId ?? null;
  if ('thumbnail' in v)              row.thumbnail = v.thumbnail ?? null;
  return row;
}

// ---- フック ----

export function useVideos() {
  const [videos, setVideos] = useState<VideoCard[]>([]);

  // 初期ロード + リアルタイム購読
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('videos').select('*').order('created_at', { ascending: true });
      if (data) setVideos(data.map(mapFromDB));
    };
    load();

    const channel = supabase
      .channel('videos-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'videos' }, (payload) => {
        setVideos((prev) => {
          if (prev.find((v) => v.id === payload.new.id)) return prev;
          return [...prev, mapFromDB(payload.new)];
        });
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'videos' }, (payload) => {
        setVideos((prev) => prev.map((v) => v.id === payload.new.id ? mapFromDB(payload.new) : v));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'videos' }, (payload) => {
        setVideos((prev) => prev.filter((v) => v.id !== payload.old.id));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const addVideo = useCallback(async (data: Omit<VideoCard, 'id' | 'createdAt'>) => {
    const { data: inserted } = await supabase.from('videos').insert([mapToDB(data)]).select().single();
    if (inserted) {
      setVideos((prev) => {
        if (prev.find((v) => v.id === inserted.id)) return prev;
        return [...prev, mapFromDB(inserted)];
      });
    }
  }, []);

  const updateVideo = useCallback(async (id: string, data: Partial<VideoCard>) => {
    await supabase.from('videos').update(mapPartialToDB(data)).eq('id', id);
    setVideos((prev) => prev.map((v) => v.id === id ? { ...v, ...data } : v));
  }, []);

  const deleteVideo = useCallback(async (id: string) => {
    await supabase.from('videos').delete().eq('id', id);
    setVideos((prev) => prev.filter((v) => v.id !== id));
  }, []);

  const moveVideo = useCallback(async (id: string, stage: Stage) => {
    await supabase.from('videos').update({ stage }).eq('id', id);
    setVideos((prev) => prev.map((v) => v.id === id ? { ...v, stage } : v));
  }, []);

  const batchUpdateVideos = useCallback(async (updates: { id: string; data: Partial<VideoCard> }[]) => {
    await Promise.all(
      updates.map(({ id, data }) => supabase.from('videos').update(mapPartialToDB(data)).eq('id', id))
    );
    const map = new Map(updates.map((u) => [u.id, u.data]));
    setVideos((prev) => prev.map((v) => map.has(v.id) ? { ...v, ...map.get(v.id) } : v));
  }, []);

  return { videos, addVideo, updateVideo, deleteVideo, moveVideo, batchUpdateVideos };
}
