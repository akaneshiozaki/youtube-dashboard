export type Stage = 'idea' | 'planning' | 'filming' | 'editing' | 'published';

export const STAGES: { id: Stage; label: string }[] = [
  { id: 'idea', label: 'アイデア' },
  { id: 'planning', label: '企画中' },
  { id: 'filming', label: '撮影中' },
  { id: 'editing', label: '編集中' },
  { id: 'published', label: '公開済み' },
];

export interface VideoCard {
  id: string;
  title: string;
  assignee: string;
  publishDate: string;
  notes: string;
  stage: Stage;
  createdAt: string;
  // 視聴データ（公開済みのみ）
  views?: number;
  likes?: number;
  comments?: number;
  // YouTubeから取得したデータ
  youtubeVideoId?: string;
  thumbnail?: string;
}

export interface ChannelVideo {
  videoId: string;
  title: string;
  thumbnail: string;
  views: number;
  likes: number;
  publishedAt: string;
  durationSec: number;  // 動画の長さ（秒）。ショート判定に使用
}

export interface ChannelData {
  id: string;           // ローカルID（uuid）
  channelId: string;    // YouTube チャンネルID
  name: string;
  icon: string;
  subscribers: number;
  totalViews: number;
  videoCount: number;
  topVideos: ChannelVideo[];  // 後方互換のために残す（全期間・全タイプのトップ5）
  allVideos: ChannelVideo[];  // フィルタリング用（最大50本）
  addedAt: string;
}

export type PeriodFilter = '7d' | '30d' | '90d' | '1y' | 'all';
export type VideoTypeFilter = 'all' | 'video' | 'short';

export interface AutoRefreshSettings {
  enabled: boolean;
  intervalHours: 1 | 6 | 12 | 24;
  lastUpdatedAt: string | null;
}
