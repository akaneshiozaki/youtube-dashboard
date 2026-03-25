'use client';

import { useState } from 'react';
import { ChannelData } from '@/types';
import { fetchChannelData } from '@/lib/youtube';
import { useChannels } from '@/hooks/useChannels';

function formatCount(n: number): string {
  if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(1)}億`;
  if (n >= 10_000) return `${(n / 10_000).toFixed(1)}万`;
  return n.toLocaleString();
}

function ChannelCard({
  channel,
  onRemove,
  onRefresh,
}: {
  channel: ChannelData;
  onRemove: () => void;
  onRefresh: () => void;
}) {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* チャンネルヘッダー */}
      <div className="p-5 border-b border-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {channel.icon ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={channel.icon}
                alt={channel.name}
                className="w-12 h-12 rounded-full object-cover"
              />
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
          <div className="flex gap-2">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              title="データを更新"
              className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-40"
            >
              <svg
                className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            <button
              onClick={() => {
                if (confirm(`「${channel.name}」を削除しますか？`)) onRemove();
              }}
              title="チャンネルを削除"
              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* 統計数値 */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          {[
            { label: '登録者数', value: formatCount(channel.subscribers), color: 'text-red-500' },
            { label: '総再生回数', value: formatCount(channel.totalViews), color: 'text-blue-600' },
            { label: '動画本数', value: `${channel.videoCount.toLocaleString()}本`, color: 'text-gray-700' },
          ].map((stat) => (
            <div key={stat.label} className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-400 mb-0.5">{stat.label}</p>
              <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 人気動画トップ5 */}
      <div className="p-5">
        <h4 className="text-sm font-semibold text-gray-600 mb-3">人気動画 TOP {channel.topVideos.length}</h4>
        {channel.topVideos.length === 0 ? (
          <p className="text-xs text-gray-400">動画データがありません</p>
        ) : (
          <div className="space-y-3">
            {channel.topVideos.map((video, i) => (
              <a
                key={video.videoId}
                href={`https://www.youtube.com/watch?v=${video.videoId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex gap-3 group"
              >
                <div className="flex-shrink-0 w-6 flex items-center justify-center text-sm font-bold text-gray-300">
                  {i + 1}
                </div>
                <div className="relative flex-shrink-0 w-28 rounded-lg overflow-hidden bg-gray-100">
                  {video.thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={video.thumbnail} alt="" className="w-full h-auto" />
                  ) : (
                    <div className="w-28 h-16 bg-gray-200" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 line-clamp-2 group-hover:text-red-500 transition-colors leading-snug">
                    {video.title}
                  </p>
                  <p className="text-xs text-blue-600 font-semibold mt-1">
                    ▶ {formatCount(video.views)}回
                  </p>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ChannelStats() {
  const { channels, addChannel, removeChannel, refreshChannel } = useChannels();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
              <>
                <span className="text-base leading-none">+</span>
                追加
              </>
            )}
          </button>
        </form>
        {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
        <p className="text-xs text-gray-400 mt-2">
          例：youtube.com/@MrBeast　/　youtube.com/channel/UCX6OQ3DkcsbYNE6H8uQQuVA　/　@チャンネル名
        </p>
      </div>

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
              onRemove={() => removeChannel(channel.id)}
              onRefresh={() => handleRefresh(channel)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
