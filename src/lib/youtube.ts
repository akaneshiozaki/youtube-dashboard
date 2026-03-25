import { ChannelData, ChannelVideo } from '@/types';

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
 * チャンネルIDから統計・人気動画トップ5を取得する
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

  // 人気動画を取得（再生回数順）
  const searchRes = await fetch(
    `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&order=viewCount&type=video&maxResults=5&key=${apiKey}`
  );
  const searchData = await searchRes.json();
  const videoIds: string[] = (searchData.items ?? []).map(
    (item: { id: { videoId: string } }) => item.id.videoId
  );

  let topVideos: ChannelVideo[] = [];
  if (videoIds.length > 0) {
    const vRes = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${videoIds.join(',')}&key=${apiKey}`
    );
    const vData = await vRes.json();
    topVideos = (vData.items ?? []).map((v: {
      id: string;
      snippet: { title: string; thumbnails: { medium?: { url: string }; default?: { url: string } }; publishedAt: string };
      statistics: { viewCount?: string };
    }) => ({
      videoId: v.id,
      title: v.snippet.title,
      thumbnail: v.snippet.thumbnails?.medium?.url ?? v.snippet.thumbnails?.default?.url ?? '',
      views: parseInt(v.statistics.viewCount ?? '0', 10),
      publishedAt: v.snippet.publishedAt,
    }));
    topVideos.sort((a, b) => b.views - a.views);
  }

  return {
    channelId,
    name: snippet.title,
    icon: snippet.thumbnails?.medium?.url ?? snippet.thumbnails?.default?.url ?? '',
    subscribers: parseInt(stats.subscriberCount ?? '0', 10),
    totalViews: parseInt(stats.viewCount ?? '0', 10),
    videoCount: parseInt(stats.videoCount ?? '0', 10),
    topVideos,
  };
}
