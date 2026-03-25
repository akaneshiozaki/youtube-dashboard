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
