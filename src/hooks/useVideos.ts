'use client';

import { useState, useEffect, useCallback } from 'react';
import { VideoCard, Stage } from '@/types';
import { v4 as uuidv4 } from 'uuid';

const STORAGE_KEY = 'youtube-dashboard-videos';

const SAMPLE_DATA: VideoCard[] = [
  {
    id: uuidv4(),
    title: '2024年のYouTube戦略まとめ',
    assignee: '田中',
    publishDate: '2026-04-01',
    notes: 'アナリティクスデータを使って解説する',
    stage: 'published',
    createdAt: new Date().toISOString(),
    views: 12500,
    likes: 480,
    comments: 63,
  },
  {
    id: uuidv4(),
    title: '撮影機材レビュー2026',
    assignee: '鈴木',
    publishDate: '2026-04-10',
    notes: '新しいカメラと比較検証',
    stage: 'editing',
    createdAt: new Date().toISOString(),
  },
  {
    id: uuidv4(),
    title: 'チャンネル登録者10万人達成の軌跡',
    assignee: '山田',
    publishDate: '2026-04-20',
    notes: '感謝動画、コメントを読み上げる',
    stage: 'filming',
    createdAt: new Date().toISOString(),
  },
  {
    id: uuidv4(),
    title: 'ショート動画の伸ばし方',
    assignee: '田中',
    publishDate: '2026-05-01',
    notes: 'アルゴリズム解説と実例紹介',
    stage: 'planning',
    createdAt: new Date().toISOString(),
  },
  {
    id: uuidv4(),
    title: 'コラボ企画（未定）',
    assignee: '鈴木',
    publishDate: '',
    notes: '他チャンネルとのコラボを検討中',
    stage: 'idea',
    createdAt: new Date().toISOString(),
  },
];

export function useVideos() {
  const [videos, setVideos] = useState<VideoCard[]>([]);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setVideos(JSON.parse(stored));
      } catch {
        setVideos(SAMPLE_DATA);
      }
    } else {
      setVideos(SAMPLE_DATA);
    }
    setInitialized(true);
  }, []);

  useEffect(() => {
    if (initialized) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(videos));
    }
  }, [videos, initialized]);

  const addVideo = useCallback((data: Omit<VideoCard, 'id' | 'createdAt'>) => {
    const newVideo: VideoCard = {
      ...data,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
    };
    setVideos((prev) => [...prev, newVideo]);
    return newVideo;
  }, []);

  const updateVideo = useCallback((id: string, data: Partial<VideoCard>) => {
    setVideos((prev) =>
      prev.map((v) => (v.id === id ? { ...v, ...data } : v))
    );
  }, []);

  const deleteVideo = useCallback((id: string) => {
    setVideos((prev) => prev.filter((v) => v.id !== id));
  }, []);

  const moveVideo = useCallback((id: string, stage: Stage) => {
    setVideos((prev) =>
      prev.map((v) => (v.id === id ? { ...v, stage } : v))
    );
  }, []);

  // 複数動画を一括更新（自動更新用）
  const batchUpdateVideos = useCallback((updates: { id: string; data: Partial<VideoCard> }[]) => {
    const map = new Map(updates.map((u) => [u.id, u.data]));
    setVideos((prev) =>
      prev.map((v) => (map.has(v.id) ? { ...v, ...map.get(v.id) } : v))
    );
  }, []);

  return { videos, addVideo, updateVideo, deleteVideo, moveVideo, batchUpdateVideos };
}
