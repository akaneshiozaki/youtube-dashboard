import { ChannelData, ChannelVideo, PeriodFilter, VideoTypeFilter } from '@/types';

export interface YouTubeVideoData {
  title: string;
  views: number;
  likes: number;
  comments: number;
  thumbnail: string;
  videoId: string;
}

/**
 * YouTube URLまたは動画IDから動画IDを抽出する
 */
export function extractVideoId(input: string): string | null {
  const trimmed = input.trim();

  // すでに動画IDのみ（11文字の英数字）
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  // youtu.be/VIDEOID
  const shortMatch = trimmed.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (shortMatch) return shortMatch[1];

  // youtube.com/watch?v=VIDEOID
  const watchMatch = trimmed.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (watchMatch) return watchMatch[1];

  // youtube.com/shorts/VIDEOID
  const shortsMatch = trimmed.match(/\/shorts\/([a-zA-Z0-9_-]{11})/);
  if (shortsMatch) return shortsMatch[1];

  // youtube.com/embed/VIDEOID
  const embedMatch = trimmed.match(/\/embed\/([a-zA-Z0-9_-]{11})/);
  if (embedMatch) return embedMatch[1];

  return null;
}

/**
 * YouTube Data API v3 で動画データを取得する
 */
export async function fetchYouTubeVideoData(input: string): Promise<YouTubeVideoData> {
  const apiKey = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;
  if (!apiKey) {
    throw new Error('YouTube APIキーが設定されていません');
  }

  const videoId = extractVideoId(input);
  if (!videoId) {
    throw new Error('有効な動画URLまたは動画IDを入力してください');
  }

  const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${videoId}&key=${apiKey}`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`APIエラー: ${res.status}`);
  }

  const data = await res.json();

  if (!data.items || data.items.length === 0) {
    throw new Error('動画が見つかりませんでした');
  }

  const item = data.items[0];
  const snippet = item.snippet;
  const stats = item.statistics;

  return {
    videoId,
    title: snippet.title,
    thumbnail:
      snippet.thumbnails?.medium?.url ??
      snippet.thumbnails?.default?.url ??
      '',
    views: parseInt(stats.viewCount ?? '0', 10),
    likes: parseInt(stats.likeCount ?? '0', 10),
    comments: parseInt(stats.commentCount ?? '0', 10),
  };
}

/**
 * チャンネルURLまたはIDからチャンネルIDを解決する
 * @handles youtube.com/@handle, youtube.com/channel/UCxxx, UCxxx直接
 */
export async function resolveChannelId(input: string): Promise<string> {
  const trimmed = input.trim();
  const apiKey = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY!;

  // すでにチャンネルID形式（UC + 22文字）
  if (/^UC[\w-]{22}$/.test(trimmed)) return trimmed;

  // youtube.com/channel/UCxxx
  const channelMatch = trimmed.match(/\/channel\/(UC[\w-]{22})/);
  if (channelMatch) return channelMatch[1];

  // @handle または youtube.com/@handle から handle を抽出
  const handleMatch = trimmed.match(/(?:youtube\.com\/)?@([\w.-]+)/);
  const handle = handleMatch ? handleMatch[1] : trimmed.replace(/^@/, '');

  // forHandle API でチャンネルIDを解決
  const url = `https://www.googleapis.com/youtube/v3/channels?part=id&forHandle=${encodeURIComponent(handle)}&key=${apiKey}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.items?.[0]?.id) return data.items[0].id;

  throw new Error('チャンネルが見つかりませんでした');
}

/**
 * ISO 8601 duration (PT1H2M3S) を秒数に変換する
 */
function parseISO8601Duration(duration: string): number {
  const m = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return 0;
  return (parseInt(m[1] ?? '0') * 3600) + (parseInt(m[2] ?? '0') * 60) + parseInt(m[3] ?? '0');
}

/**
 * 動画詳細（snippet + statistics + contentDetails）を一括取得して ChannelVideo[] に変換
 */
async function fetchVideoDetails(videoIds: string[], apiKey: string): Promise<ChannelVideo[]> {
  if (videoIds.length === 0) return [];
  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${videoIds.join(',')}&key=${apiKey}`
  );
  const data = await res.json();
  return (data.items ?? []).map((v: {
    id: string;
    snippet: {
      title: string;
      thumbnails: { medium?: { url: string }; default?: { url: string } };
      publishedAt: string;
    };
    statistics: { viewCount?: string; likeCount?: string };
    contentDetails: { duration?: string };
  }) => ({
    videoId: v.id,
    title: v.snippet.title,
    thumbnail: v.snippet.thumbnails?.medium?.url ?? v.snippet.thumbnails?.default?.url ?? '',
    views: parseInt(v.statistics.viewCount ?? '0', 10),
    likes: parseInt(v.statistics.likeCount ?? '0', 10),
    publishedAt: v.snippet.publishedAt,
    durationSec: parseISO8601Duration(v.contentDetails.duration ?? 'PT0S'),
  }));
}

/**
 * チャンネルIDから統計・動画一覧（最大50本）を取得する
 */
export async function fetchChannelData(input: string): Promise<Omit<ChannelData, 'id' | 'addedAt'>> {
  const apiKey = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;
  if (!apiKey) throw new Error('YouTube APIキーが設定されていません');

  const channelId = await resolveChannelId(input);

  // チャンネル基本情報を取得
  const chRes = await fetch(
    `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${channelId}&key=${apiKey}`
  );
  if (!chRes.ok) throw new Error(`APIエラー: ${chRes.status}`);
  const chData = await chRes.json();
  if (!chData.items?.length) throw new Error('チャンネルが見つかりませんでした');

  const ch = chData.items[0];
  const snippet = ch.snippet;
  const stats = ch.statistics;

  // 人気動画を最大50本取得（再生回数順）
  const searchRes = await fetch(
    `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&order=viewCount&type=video&maxResults=50&key=${apiKey}`
  );
  const searchData = await searchRes.json();
  const videoIds: string[] = (searchData.items ?? []).map(
    (item: { id: { videoId: string } }) => item.id.videoId
  );

  // 詳細情報（duration含む）を取得。APIは最大50件を一括取得可能
  const allVideos = await fetchVideoDetails(videoIds, apiKey);
  allVideos.sort((a, b) => b.views - a.views);

  const topVideos = allVideos.slice(0, 5);

  return {
    channelId,
    name: snippet.title,
    icon: snippet.thumbnails?.medium?.url ?? snippet.thumbnails?.default?.url ?? '',
    subscribers: parseInt(stats.subscriberCount ?? '0', 10),
    totalViews: parseInt(stats.viewCount ?? '0', 10),
    videoCount: parseInt(stats.videoCount ?? '0', 10),
    topVideos,
    allVideos,
  };
}

/**
 * フィルター条件に基づいて動画を絞り込む
 */
export function filterVideos(
  videos: ChannelVideo[],
  period: PeriodFilter,
  type: VideoTypeFilter
): ChannelVideo[] {
  let result = [...videos];

  // 期間フィルター（公開日基準）
  if (period !== 'all') {
    const days = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 365;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    result = result.filter((v) => new Date(v.publishedAt) >= cutoff);
  }

  // 動画タイプフィルター（60秒以下 = ショート）
  if (type === 'short') {
    result = result.filter((v) => v.durationSec > 0 && v.durationSec <= 60);
  } else if (type === 'video') {
    result = result.filter((v) => v.durationSec > 60);
  }

  return result;
}
