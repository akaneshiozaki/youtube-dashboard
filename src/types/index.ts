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
}
