'use client';

import { useMemo, useState } from 'react';
import {
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line,
} from 'recharts';
import { ChannelData, ChannelVideo } from '@/types';

// ────────────────────────────────────────────────────────────
// 定数・ユーティリティ
// ────────────────────────────────────────────────────────────

const CHANNEL_COLORS = [
  '#ef4444', '#3b82f6', '#10b981', '#f59e0b',
  '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16',
];

const DAYS_JA = ['日', '月', '火', '水', '木', '金', '土'];

const HOUR_LABELS = ['0-3時', '4-7時', '8-11時', '12-15時', '16-19時', '20-23時'];

function formatCount(n: number): string {
  if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(1)}億`;
  if (n >= 10_000) return `${(n / 10_000).toFixed(1)}万`;
  return n.toLocaleString();
}

function shortenName(name: string, max = 10): string {
  return name.length > max ? name.slice(0, max) + '…' : name;
}

function engagementRate(v: ChannelVideo): number {
  if (!v.views || v.views === 0) return 0;
  return (v.likes) / v.views;
}

function isShort(v: ChannelVideo): boolean {
  return v.durationSec > 0 && v.durationSec <= 60;
}

function avg(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

// ────────────────────────────────────────────────────────────
// カスタム Tooltip
// ────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label, formatter }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-4 py-3 text-xs">
      <p className="font-semibold text-gray-700 mb-2">{label}</p>
      {payload.map((p: { color: string; name: string; value: number }, i: number) => (
        <div key={i} className="flex items-center gap-2 mb-1">
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: p.color }} />
          <span className="text-gray-500">{p.name}:</span>
          <span className="font-medium text-gray-800">{formatter ? formatter(p.value) : p.value}</span>
        </div>
      ))}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// セクションラッパー
// ────────────────────────────────────────────────────────────

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="mb-5">
        <h2 className="text-base font-bold text-gray-900">{title}</h2>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// 1. チャンネル横断比較
// ────────────────────────────────────────────────────────────

function ChannelCompare({ channels }: { channels: ChannelData[] }) {
  type Metric = 'subscribers' | 'totalViews' | 'videoCount' | 'avgViews';
  const [metric, setMetric] = useState<Metric>('subscribers');

  const data = channels.map((c, i) => ({
    name: shortenName(c.name),
    value: metric === 'subscribers' ? c.subscribers
      : metric === 'totalViews' ? c.totalViews
      : metric === 'videoCount' ? c.videoCount
      : c.videoCount > 0 ? Math.round(c.totalViews / c.videoCount) : 0,
    color: CHANNEL_COLORS[i % CHANNEL_COLORS.length],
  }));

  const labels: Record<Metric, string> = {
    subscribers: '登録者数',
    totalViews: '総再生回数',
    videoCount: '動画本数',
    avgViews: '動画1本あたり再生数',
  };

  const METRICS: Metric[] = ['subscribers', 'totalViews', 'videoCount', 'avgViews'];

  return (
    <Section title="チャンネル横断比較" subtitle="各チャンネルの主要指標を比較します">
      <div className="flex flex-wrap gap-2 mb-5">
        {METRICS.map((m) => (
          <button
            key={m}
            onClick={() => setMetric(m)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              metric === m ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {labels[m]}
          </button>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} />
          <YAxis tickFormatter={formatCount} tick={{ fontSize: 11, fill: '#6b7280' }} width={55} />
          <Tooltip content={<CustomTooltip formatter={formatCount} />} />
          <Bar dataKey="value" name={labels[metric]} radius={[6, 6, 0, 0]}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      {/* 各バーに個別の色を適用するためのカスタム実装 */}
      <div className="mt-4 flex flex-wrap gap-3">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-1.5 text-xs text-gray-500">
            <span className="w-3 h-3 rounded-full" style={{ background: d.color }} />
            {channels[i]?.name}
          </div>
        ))}
      </div>
    </Section>
  );
}

// ────────────────────────────────────────────────────────────
// 2. ショート vs 通常動画
// ────────────────────────────────────────────────────────────

function ShortVsRegular({ channels }: { channels: ChannelData[] }) {
  type View = 'avgViews' | 'ratio';
  const [view, setView] = useState<View>('avgViews');

  const data = channels.map((c) => {
    const videos = c.allVideos.length > 0 ? c.allVideos : c.topVideos;
    const shorts = videos.filter(isShort);
    const regular = videos.filter((v) => !isShort(v));
    return {
      name: shortenName(c.name),
      shortAvg: Math.round(avg(shorts.map((v) => v.views))),
      regularAvg: Math.round(avg(regular.map((v) => v.views))),
      shortCount: shorts.length,
      regularCount: regular.length,
    };
  });

  return (
    <Section title="ショート vs 通常動画" subtitle="動画タイプ別のパフォーマンスを比較します">
      <div className="flex gap-2 mb-5">
        <button
          onClick={() => setView('avgViews')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${view === 'avgViews' ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          平均再生回数
        </button>
        <button
          onClick={() => setView('ratio')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${view === 'ratio' ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          本数の割合
        </button>
      </div>

      {view === 'avgViews' ? (
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} />
            <YAxis tickFormatter={formatCount} tick={{ fontSize: 11, fill: '#6b7280' }} width={55} />
            <Tooltip content={<CustomTooltip formatter={formatCount} />} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="shortAvg" name="ショート" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            <Bar dataKey="regularAvg" name="通常動画" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="space-y-3">
          {data.map((d, i) => {
            const total = d.shortCount + d.regularCount;
            const shortPct = total > 0 ? Math.round((d.shortCount / total) * 100) : 0;
            return (
              <div key={i}>
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span className="font-medium text-gray-700">{channels[i]?.name}</span>
                  <span>ショート {d.shortCount}本 / 通常 {d.regularCount}本</span>
                </div>
                <div className="flex rounded-full overflow-hidden h-5">
                  <div
                    className="bg-amber-400 flex items-center justify-center text-white text-xs font-bold transition-all"
                    style={{ width: `${shortPct}%` }}
                  >
                    {shortPct > 10 && `${shortPct}%`}
                  </div>
                  <div
                    className="bg-blue-400 flex items-center justify-center text-white text-xs font-bold flex-1"
                  >
                    {100 - shortPct > 10 && `${100 - shortPct}%`}
                  </div>
                </div>
              </div>
            );
          })}
          <div className="flex gap-4 mt-3 text-xs text-gray-500">
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-amber-400" />ショート</div>
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-blue-400" />通常動画</div>
          </div>
        </div>
      )}
    </Section>
  );
}

// ────────────────────────────────────────────────────────────
// 3. エンゲージメント率ランキング
// ────────────────────────────────────────────────────────────

function EngagementRanking({ channels }: { channels: ChannelData[] }) {
  const ranked = useMemo(() => {
    const all: (ChannelVideo & { channelName: string; channelColor: string; engRate: number })[] = [];
    channels.forEach((c, ci) => {
      const videos = c.allVideos.length > 0 ? c.allVideos : c.topVideos;
      videos.forEach((v) => {
        if (v.views > 0) {
          all.push({
            ...v,
            channelName: c.name,
            channelColor: CHANNEL_COLORS[ci % CHANNEL_COLORS.length],
            engRate: engagementRate(v),
          });
        }
      });
    });
    return all.sort((a, b) => b.engRate - a.engRate).slice(0, 10);
  }, [channels]);

  if (ranked.length === 0) {
    return (
      <Section title="エンゲージメント率ランキング TOP10" subtitle="高評価数 ÷ 再生回数 で算出">
        <p className="text-sm text-gray-400 text-center py-8">チャンネルを追加すると表示されます</p>
      </Section>
    );
  }

  const maxRate = ranked[0]?.engRate ?? 1;

  return (
    <Section title="エンゲージメント率ランキング TOP10" subtitle="高評価数 ÷ 再生回数 で算出（チャンネル横断）">
      <div className="space-y-3">
        {ranked.map((v, i) => (
          <div key={v.videoId} className="flex items-center gap-3">
            <span className={`text-sm font-bold w-6 text-center flex-shrink-0 ${i === 0 ? 'text-amber-500' : i === 1 ? 'text-gray-400' : i === 2 ? 'text-amber-700' : 'text-gray-400'}`}>
              {i + 1}
            </span>
            {v.thumbnail && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={v.thumbnail} alt="" className="w-16 h-9 object-cover rounded-md flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <a
                href={`https://youtu.be/${v.videoId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium text-gray-800 hover:text-red-500 transition-colors line-clamp-1"
              >
                {v.title}
              </a>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs px-1.5 py-0.5 rounded-full text-white" style={{ background: v.channelColor }}>
                  {shortenName(v.channelName, 8)}
                </span>
                <span className="text-xs text-gray-400">再生 {formatCount(v.views)}</span>
                <span className="text-xs text-gray-400">高評価 {formatCount(v.likes)}</span>
                {isShort(v) && <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">Short</span>}
              </div>
              <div className="mt-1.5 flex items-center gap-2">
                <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                  <div
                    className="h-1.5 rounded-full bg-red-400"
                    style={{ width: `${Math.min(100, (v.engRate / maxRate) * 100)}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-red-500 w-12 text-right">
                  {(v.engRate * 100).toFixed(2)}%
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

// ────────────────────────────────────────────────────────────
// 4. 投稿月別 再生回数トレンド
// ────────────────────────────────────────────────────────────

type TrendPeriod = '90d' | '1y' | 'all';

function ViewTrend({ channels }: { channels: ChannelData[] }) {
  const [period, setPeriod] = useState<TrendPeriod>('1y');

  const chartData = useMemo(() => {
    const now = Date.now();
    const cutoff = period === '90d' ? now - 90 * 86400_000
      : period === '1y' ? now - 365 * 86400_000
      : 0;

    // 月ごとの平均再生回数を各チャンネルについて集計
    const monthMap: Record<string, Record<string, number[]>> = {};

    channels.forEach((c) => {
      const videos = c.allVideos.length > 0 ? c.allVideos : c.topVideos;
      videos.forEach((v) => {
        const pub = new Date(v.publishedAt).getTime();
        if (pub < cutoff) return;
        const key = v.publishedAt.slice(0, 7); // YYYY-MM
        if (!monthMap[key]) monthMap[key] = {};
        if (!monthMap[key][c.id]) monthMap[key][c.id] = [];
        monthMap[key][c.id].push(v.views);
      });
    });

    const sorted = Object.keys(monthMap).sort();
    return sorted.map((month) => {
      const entry: Record<string, string | number> = {
        month: month.replace('-', '/'),
      };
      channels.forEach((c) => {
        const arr = monthMap[month][c.id] ?? [];
        entry[c.id] = arr.length > 0 ? Math.round(avg(arr)) : 0;
      });
      return entry;
    });
  }, [channels, period]);

  const PERIODS: { value: TrendPeriod; label: string }[] = [
    { value: '90d', label: '直近90日' },
    { value: '1y', label: '直近1年' },
    { value: 'all', label: '全期間' },
  ];

  return (
    <Section title="投稿月別 平均再生回数トレンド" subtitle="動画の公開月ごとの平均再生回数を比較">
      <div className="flex gap-2 mb-5">
        {PERIODS.map((p) => (
          <button
            key={p.value}
            onClick={() => setPeriod(p.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${period === p.value ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {chartData.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">表示できるデータがありません</p>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#6b7280' }} />
              <YAxis tickFormatter={formatCount} tick={{ fontSize: 11, fill: '#6b7280' }} width={55} />
              <Tooltip content={<CustomTooltip formatter={formatCount} />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {channels.map((c, i) => (
                <Line
                  key={c.id}
                  type="monotone"
                  dataKey={c.id}
                  name={shortenName(c.name)}
                  stroke={CHANNEL_COLORS[i % CHANNEL_COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
          <p className="text-xs text-gray-400 mt-2">※ 各月に公開された動画の平均再生回数</p>
        </>
      )}
    </Section>
  );
}

// ────────────────────────────────────────────────────────────
// 5. 投稿タイミング ヒートマップ
// ────────────────────────────────────────────────────────────

function PostingHeatmap({ channels }: { channels: ChannelData[] }) {
  // [dayOfWeek 0-6][hourBlock 0-5] => avgViews
  const grid = useMemo(() => {
    const map: Record<string, number[]> = {};
    for (let d = 0; d < 7; d++) {
      for (let h = 0; h < 6; h++) {
        map[`${d}-${h}`] = [];
      }
    }

    channels.forEach((c) => {
      const videos = c.allVideos.length > 0 ? c.allVideos : c.topVideos;
      videos.forEach((v) => {
        const date = new Date(v.publishedAt);
        const day = date.getDay(); // 0=Sun
        const hourBlock = Math.floor(date.getHours() / 4); // 0-5
        map[`${day}-${hourBlock}`].push(v.views);
      });
    });

    return map;
  }, [channels]);

  const values = Object.values(grid).map((arr) => avg(arr)).filter((v) => v > 0);
  const maxVal = values.length > 0 ? Math.max(...values) : 1;

  function cellColor(day: number, hBlock: number): string {
    const arr = grid[`${day}-${hBlock}`];
    if (!arr || arr.length === 0) return '#f3f4f6';
    const ratio = avg(arr) / maxVal;
    // red gradient
    const r = Math.round(239 - ratio * 0);
    const g = Math.round(68 + ratio * (68 - 200));
    const b = Math.round(68 + ratio * (68 - 200));
    // Use opacity-based approach instead
    const opacity = 0.08 + ratio * 0.82;
    return `rgba(239, 68, 68, ${opacity.toFixed(2)})`;
  }

  function cellAvg(day: number, hBlock: number): number {
    const arr = grid[`${day}-${hBlock}`];
    return arr && arr.length > 0 ? Math.round(avg(arr)) : 0;
  }

  // 最もパフォーマンスが高いセルを探す
  let bestDay = -1, bestHour = -1, bestVal = 0;
  for (let d = 0; d < 7; d++) {
    for (let h = 0; h < 6; h++) {
      const v = cellAvg(d, h);
      if (v > bestVal) { bestVal = v; bestDay = d; bestHour = h; }
    }
  }

  const totalVideos = useMemo(() => {
    return channels.reduce((sum, c) => {
      const v = c.allVideos.length > 0 ? c.allVideos : c.topVideos;
      return sum + v.length;
    }, 0);
  }, [channels]);

  return (
    <Section title="投稿タイミング分析" subtitle="曜日・時間帯別の平均再生回数（色が濃いほど高パフォーマンス）">
      {totalVideos === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">チャンネルを追加すると表示されます</p>
      ) : (
        <>
          {bestDay >= 0 && (
            <div className="flex items-center gap-2 mb-5 p-3 bg-red-50 border border-red-100 rounded-xl">
              <span className="text-red-500 text-lg">🏆</span>
              <div>
                <p className="text-sm font-bold text-red-700">
                  最高パフォーマンス: {DAYS_JA[bestDay]}曜日 {HOUR_LABELS[bestHour]}
                </p>
                <p className="text-xs text-red-500">平均 {formatCount(bestVal)} 再生</p>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr>
                  <th className="w-10 text-gray-400 font-medium pb-2 text-left">曜日</th>
                  {HOUR_LABELS.map((h, i) => (
                    <th key={i} className="text-gray-400 font-medium pb-2 text-center px-1">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DAYS_JA.map((day, d) => (
                  <tr key={d}>
                    <td className="text-gray-600 font-medium py-1 pr-2">{day}</td>
                    {Array.from({ length: 6 }, (_, h) => {
                      const val = cellAvg(d, h);
                      const isBest = d === bestDay && h === bestHour;
                      return (
                        <td key={h} className="py-1 px-1">
                          <div
                            className={`rounded-lg h-10 flex items-center justify-center transition-all cursor-default ${isBest ? 'ring-2 ring-red-400 ring-offset-1' : ''}`}
                            style={{ background: cellColor(d, h) }}
                            title={val > 0 ? `${DAYS_JA[d]}曜 ${HOUR_LABELS[h]}: 平均 ${formatCount(val)} 再生` : 'データなし'}
                          >
                            {val > 0 && (
                              <span className={`text-xs font-medium ${val / maxVal > 0.5 ? 'text-white' : 'text-gray-600'}`}>
                                {formatCount(val)}
                              </span>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center gap-2 mt-4">
            <span className="text-xs text-gray-400">低</span>
            <div className="flex gap-0.5">
              {[0.08, 0.22, 0.40, 0.58, 0.76, 0.90].map((o, i) => (
                <div
                  key={i}
                  className="w-6 h-4 rounded"
                  style={{ background: `rgba(239, 68, 68, ${o})` }}
                />
              ))}
            </div>
            <span className="text-xs text-gray-400">高</span>
          </div>
        </>
      )}
    </Section>
  );
}

// ────────────────────────────────────────────────────────────
// メイン: Analytics
// ────────────────────────────────────────────────────────────

interface AnalyticsProps {
  channels: ChannelData[];
}

export default function Analytics({ channels }: AnalyticsProps) {
  if (channels.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
          </svg>
        </div>
        <h3 className="text-base font-semibold text-gray-700 mb-1">チャンネルが登録されていません</h3>
        <p className="text-sm text-gray-400">「チャンネル統計」タブでYouTubeチャンネルを追加すると<br />分析データが表示されます</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ChannelCompare channels={channels} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ShortVsRegular channels={channels} />
        <EngagementRanking channels={channels} />
      </div>
      <ViewTrend channels={channels} />
      <PostingHeatmap channels={channels} />
    </div>
  );
}
