'use client';

import { useState } from 'react';
import { ChannelData, ChannelVideo, PeriodFilter, VideoTypeFilter } from '@/types';
import { fetchChannelData, filterVideos } from '@/lib/youtube';

// ---- ユーティリティ ----

function formatCount(n: number): string {
  if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(1)}億`;
  if (n >= 10_000) return `${(n / 10_000).toFixed(1)}万`;
  return n.toLocaleString();
}

const PERIOD_OPTIONS: { value: PeriodFilter; label: string }[] = [
  { value: '7d', label: '直近7日' },
  { value: '30d', label: '30日' },
  { value: '90d', label: '90日' },
  { value: '1y', label: '1年' },
  { value: 'all', label: '全期間' },
];

const TYPE_OPTIONS: { value: VideoTypeFilter; label: string }[] = [
  { value: 'all', label: 'すべて' },
  { value: 'video', label: '動画' },
  { value: 'short', label: 'ショート' },
];

// ---- フィルターバー ----

function FilterBar({
  period,
  type,
  onPeriod,
  onType,
}: {
  period: PeriodFilter;
  type: VideoTypeFilter;
  onPeriod: (v: PeriodFilter) => void;
  onType: (v: VideoTypeFilter) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* 期間 */}
      <div className="flex bg-gray-100 rounded-lg p-0.5">
        {PERIOD_OPTIONS.map((o) => (
          <button
            key={o.value}
            onClick={() => onPeriod(o.value)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              period === o.value ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>

      {/* 動画タイプ */}
      <div className="flex bg-gray-100 rounded-lg p-0.5">
        {TYPE_OPTIONS.map((o) => (
          <button
            key={o.value}
            onClick={() => onType(o.value)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              type === o.value ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>

      {period !== 'all' && (
        <p className="text-xs text-gray-400">※ 公開日が{PERIOD_OPTIONS.find(o => o.value === period)?.label}以内の動画を表示</p>
      )}
    </div>
  );
}

// ---- チャンネルカード ----

function ChannelCard({
  channel,
  period,
  type,
  onRemove,
  onRefresh,
}: {
  channel: ChannelData;
  period: PeriodFilter;
  type: VideoTypeFilter;
  onRemove: () => void;
  onRefresh: () => Promise<void>;
}) {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try { await onRefresh(); } finally { setRefreshing(false); }
  };

  // フィルタリング済み動画
  const filtered = filterVideos(channel.allVideos ?? channel.topVideos, period, type);
  const filteredTop5 = [...filtered].sort((a, b) => b.views - a.views).slice(0, 5);

  const filteredViews = filtered.reduce((s, v) => s + v.views, 0);
  const filteredLikes = filtered.reduce((s, v) => s + v.likes, 0);

  const isFiltered = period !== 'all' || type !== 'all';

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* チャンネルヘッダー */}
      <div className="p-5 border-b border-gray-50">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {channel.icon ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={channel.icon} alt={channel.name} className="w-12 h-12 rounded-full object-cover" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-500 font-bold text-lg">
                {channel.name[0]}
              </div>
            )}
            <div>
              <h3 className="font-bold text-gray-900">{channel.name}</h3>
              <a
                href={`https://www.youtube.com/channel/${channel.channelId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-gray-400 hover:text-red-500 transition-colors"
              >
                YouTubeで開く →
              </a>
            </div>
          </div>
          <div className="flex gap-1">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              title="データを更新"
              className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-40"
            >
              <svg className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            <button
              onClick={() => { if (confirm(`「${channel.name}」を削除しますか？`)) onRemove(); }}
              title="チャンネルを削除"
              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* 統計 */}
        <div className="grid grid-cols-2 gap-2">
          {/* チャンネル全体の固定値 */}
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <p className="text-xs text-gray-400 mb-0.5">登録者数</p>
            <p className="text-lg font-bold text-red-500">{formatCount(channel.subscribers)}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <p className="text-xs text-gray-400 mb-0.5">総動画本数</p>
            <p className="text-lg font-bold text-gray-700">{channel.videoCount.toLocaleString()}本</p>
          </div>

          {/* フィルター対象の集計 */}
          <div className={`rounded-xl p-3 text-center ${isFiltered ? 'bg-blue-50 border border-blue-100' : 'bg-gray-50'}`}>
            <p className="text-xs text-gray-400 mb-0.5">
              再生回数{isFiltered ? <span className="text-blue-400 ml-1">（絞込）</span> : '（合計）'}
            </p>
            <p className="text-lg font-bold text-blue-600">{formatCount(filteredViews)}</p>
            {isFiltered && (
              <p className="text-xs text-gray-400">{filtered.length}本の動画</p>
            )}
          </div>
          <div className={`rounded-xl p-3 text-center ${isFiltered ? 'bg-rose-50 border border-rose-100' : 'bg-gray-50'}`}>
            <p className="text-xs text-gray-400 mb-0.5">
              高評価数{isFiltered ? <span className="text-rose-400 ml-1">（絞込）</span> : '（合計）'}
            </p>
            <p className="text-lg font-bold text-rose-500">{formatCount(filteredLikes)}</p>
          </div>
        </div>
      </div>

      {/* 人気動画TOP5（フィルター反映） */}
      <div className="p-5">
        <h4 className="text-sm font-semibold text-gray-600 mb-3 flex items-center gap-2">
          人気動画 TOP {Math.min(filteredTop5.length, 5)}
          {isFiltered && (
            <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-normal">フィルター適用中</span>
          )}
        </h4>

        {filteredTop5.length === 0 ? (
          <div className="py-6 text-center">
            <p className="text-sm text-gray-400">該当する動画がありません</p>
            <p className="text-xs text-gray-300 mt-1">期間・タイプのフィルターを変更してみてください</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTop5.map((video, i) => (
              <VideoRow key={video.videoId} video={video} rank={i + 1} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function VideoRow({ video, rank }: { video: ChannelVideo; rank: number }) {
  const isShort = video.durationSec > 0 && video.durationSec <= 60;
  return (
    <a
      href={`https://www.youtube.com/watch?v=${video.videoId}`}
      target="_blank"
      rel="noopener noreferrer"
      className="flex gap-3 group"
    >
      <div className="flex-shrink-0 w-6 flex items-center justify-center text-sm font-bold text-gray-300">
        {rank}
      </div>
      <div className="relative flex-shrink-0 w-28 rounded-lg overflow-hidden bg-gray-100">
        {video.thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={video.thumbnail} alt="" className="w-full h-auto" />
        ) : (
          <div className="w-28 h-16 bg-gray-200" />
        )}
        {isShort && (
          <span className="absolute bottom-1 right-1 bg-black/70 text-white text-[10px] px-1 rounded font-medium">
            ショート
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 line-clamp-2 group-hover:text-red-500 transition-colors leading-snug">
          {video.title}
        </p>
        <div className="flex gap-3 mt-1">
          <p className="text-xs text-blue-600 font-semibold">▶ {formatCount(video.views)}回</p>
          {video.likes > 0 && (
            <p className="text-xs text-rose-500">👍 {formatCount(video.likes)}</p>
          )}
        </div>
        <p className="text-xs text-gray-300 mt-0.5">
          {new Date(video.publishedAt).toLocaleDateString('ja-JP', { year: 'numeric', month: 'short', day: 'numeric' })}
        </p>
      </div>
    </a>
  );
}

// ---- メインコンポーネント ----

interface ChannelStatsProps {
  channels: ChannelData[];
  addChannel: (data: Omit<ChannelData, 'id' | 'addedAt'>) => void;
  removeChannel: (id: string) => void;
  refreshChannel: (id: string, data: Omit<ChannelData, 'id' | 'addedAt'>) => void;
}

export default function ChannelStats({ channels, addChannel, removeChannel, refreshChannel }: ChannelStatsProps) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // フィルター状態（全チャンネル共通）
  const [period, setPeriod] = useState<PeriodFilter>('all');
  const [type, setType] = useState<VideoTypeFilter>('all');

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    setLoading(true);
    setError('');
    try {
      const data = await fetchChannelData(input.trim());
      addChannel(data);
      setInput('');
    } catch (err) {
      setError(err instanceof Error ? err.message : '取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async (channel: ChannelData) => {
    try {
      const data = await fetchChannelData(channel.channelId);
      refreshChannel(channel.id, data);
    } catch {
      // 失敗時は既存データを維持
    }
  };

  return (
    <div className="space-y-5">
      {/* チャンネル追加フォーム */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <h2 className="font-bold text-gray-800 mb-3">チャンネルを追加</h2>
        <form onSubmit={handleAdd} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => { setInput(e.target.value); setError(''); }}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
            placeholder="youtube.com/@チャンネル名 または チャンネルID"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="flex items-center gap-2 bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
          >
            {loading ? (
              <>
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
                取得中...
              </>
            ) : (
              <><span className="text-base leading-none">+</span> 追加</>
            )}
          </button>
        </form>
        {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
        <p className="text-xs text-gray-400 mt-2">
          例：youtube.com/@MrBeast　/　@チャンネル名　/　チャンネルID（UCxxxx）
        </p>
      </div>

      {/* フィルターバー */}
      {channels.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-5 py-4">
          <p className="text-xs font-semibold text-gray-500 mb-2">フィルター（全チャンネル共通）</p>
          <FilterBar period={period} type={type} onPeriod={setPeriod} onType={setType} />
        </div>
      )}

      {/* チャンネル一覧 */}
      {channels.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-8 h-8 text-red-300" viewBox="0 0 24 24" fill="currentColor">
              <path d="M21.8 8s-.2-1.4-.8-2c-.8-.8-1.7-.8-2.1-.9C16.2 5 12 5 12 5s-4.2 0-6.9.1c-.4.1-1.3.1-2.1.9-.6.6-.8 2-.8 2S2 9.6 2 11.2v1.5c0 1.6.2 3.2.2 3.2s.2 1.4.8 2c.8.8 1.8.8 2.3.8C6.8 19 12 19 12 19s4.2 0 6.9-.2c.4-.1 1.3-.1 2.1-.9.6-.6.8-2 .8-2s.2-1.6.2-3.2v-1.5C22 9.6 21.8 8 21.8 8zM9.7 14.5V9.1l5.7 2.7-5.7 2.7z" />
            </svg>
          </div>
          <p className="text-gray-400 text-sm">チャンネルがまだ追加されていません</p>
          <p className="text-gray-300 text-xs mt-1">上のフォームにURLを入力して追加してください</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {channels.map((channel) => (
            <ChannelCard
              key={channel.id}
              channel={channel}
              period={period}
              type={type}
              onRemove={() => removeChannel(channel.id)}
              onRefresh={() => handleRefresh(channel)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
