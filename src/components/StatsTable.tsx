'use client';

import { VideoCard } from '@/types';

interface StatsTableProps {
  videos: VideoCard[];
  onEdit: (video: VideoCard) => void;
}

export default function StatsTable({ videos, onEdit }: StatsTableProps) {
  const published = videos.filter((v) => v.stage === 'published');

  const totalViews = published.reduce((sum, v) => sum + (v.views ?? 0), 0);
  const totalLikes = published.reduce((sum, v) => sum + (v.likes ?? 0), 0);
  const totalComments = published.reduce((sum, v) => sum + (v.comments ?? 0), 0);
  const avgEngagement = published.length > 0
    ? ((totalLikes + totalComments) / Math.max(totalViews, 1) * 100).toFixed(1)
    : '0.0';

  const sorted = [...published].sort((a, b) => (b.views ?? 0) - (a.views ?? 0));

  if (published.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
        <p className="text-gray-400 text-sm">公開済みの動画がありません</p>
        <p className="text-gray-300 text-xs mt-1">カンバンボードで「公開済み」に移動した動画の視聴データがここに表示されます</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* サマリーカード */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: '公開動画数', value: published.length.toString(), unit: '本', color: 'text-gray-700' },
          { label: '総再生回数', value: totalViews.toLocaleString(), unit: '回', color: 'text-blue-600' },
          { label: '総高評価数', value: totalLikes.toLocaleString(), unit: '件', color: 'text-red-500' },
          { label: 'エンゲージメント率', value: avgEngagement, unit: '%', color: 'text-green-600' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <p className="text-xs text-gray-400 mb-1">{stat.label}</p>
            <p className={`text-2xl font-bold ${stat.color}`}>
              {stat.value}
              <span className="text-sm font-normal text-gray-400 ml-1">{stat.unit}</span>
            </p>
          </div>
        ))}
      </div>

      {/* テーブル */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-700">公開動画一覧</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs text-gray-500">
                <th className="px-5 py-3"></th>
                <th className="text-left px-5 py-3 font-medium">タイトル</th>
                <th className="text-left px-4 py-3 font-medium">担当者</th>
                <th className="text-left px-4 py-3 font-medium">公開日</th>
                <th className="text-right px-4 py-3 font-medium">再生回数</th>
                <th className="text-right px-4 py-3 font-medium">高評価</th>
                <th className="text-right px-4 py-3 font-medium">コメント</th>
                <th className="text-right px-4 py-3 font-medium">エンゲージメント</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sorted.map((video) => {
                const eng = video.views
                  ? (((video.likes ?? 0) + (video.comments ?? 0)) / video.views * 100).toFixed(1)
                  : '-';
                return (
                  <tr key={video.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-2">
                      {video.thumbnail ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={video.thumbnail} alt="" className="w-20 h-auto rounded-md" />
                      ) : (
                        <div className="w-20 h-11 bg-gray-100 rounded-md" />
                      )}
                    </td>
                    <td className="px-5 py-3 font-medium text-gray-800 max-w-[200px] truncate">
                      {video.youtubeVideoId ? (
                        <a
                          href={`https://www.youtube.com/watch?v=${video.youtubeVideoId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-red-500 transition-colors"
                        >
                          {video.title}
                        </a>
                      ) : (
                        video.title
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{video.assignee || '-'}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {video.publishDate
                        ? new Date(video.publishDate).toLocaleDateString('ja-JP', { year: 'numeric', month: 'short', day: 'numeric' })
                        : '-'}
                    </td>
                    <td className="px-4 py-3 text-right text-blue-600 font-semibold">
                      {video.views?.toLocaleString() ?? '-'}
                    </td>
                    <td className="px-4 py-3 text-right text-red-500">
                      {video.likes?.toLocaleString() ?? '-'}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500">
                      {video.comments?.toLocaleString() ?? '-'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-medium ${parseFloat(eng) > 5 ? 'text-green-600' : 'text-gray-400'}`}>
                        {eng !== '-' ? `${eng}%` : '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => onEdit(video)}
                        className="text-xs text-blue-400 hover:text-blue-600"
                      >
                        編集
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
