'use client';

import { useEffect, useRef } from 'react';
import { AutoRefreshSettings } from '@/types';

interface AutoRefreshPanelProps {
  settings: AutoRefreshSettings;
  isRefreshing: boolean;
  onUpdate: (patch: Partial<AutoRefreshSettings>) => void;
  onTrigger: () => void;
  onClose: () => void;
}

const INTERVAL_OPTIONS: { value: AutoRefreshSettings['intervalHours']; label: string }[] = [
  { value: 1, label: '1時間' },
  { value: 6, label: '6時間' },
  { value: 12, label: '12時間' },
  { value: 24, label: '24時間' },
];

function formatLastUpdated(iso: string | null): string {
  if (!iso) return 'まだ更新されていません';
  const d = new Date(iso);
  return d.toLocaleString('ja-JP', {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function AutoRefreshPanel({
  settings,
  isRefreshing,
  onUpdate,
  onTrigger,
  onClose,
}: AutoRefreshPanelProps) {
  const ref = useRef<HTMLDivElement>(null);

  // パネル外クリックで閉じる
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full mt-2 w-72 bg-white rounded-2xl shadow-xl border border-gray-100 p-4 z-50"
    >
      <h3 className="font-bold text-gray-800 text-sm mb-4">自動更新設定</h3>

      {/* ON/OFF トグル */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm font-medium text-gray-700">自動更新</p>
          <p className="text-xs text-gray-400">動画・チャンネルを定期更新</p>
        </div>
        <button
          onClick={() => onUpdate({ enabled: !settings.enabled })}
          className={`relative w-11 h-6 rounded-full transition-colors ${
            settings.enabled ? 'bg-red-500' : 'bg-gray-200'
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
              settings.enabled ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {/* 更新間隔 */}
      <div className="mb-4">
        <p className="text-xs font-medium text-gray-500 mb-2">更新間隔</p>
        <div className="grid grid-cols-4 gap-1">
          {INTERVAL_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onUpdate({ intervalHours: opt.value })}
              className={`py-1.5 text-xs rounded-lg font-medium transition-colors ${
                settings.intervalHours === opt.value
                  ? 'bg-red-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* 最終更新日時 */}
      <div className="mb-4 bg-gray-50 rounded-xl px-3 py-2.5">
        <p className="text-xs text-gray-400 mb-0.5">最終更新</p>
        <p className="text-xs font-medium text-gray-600">
          {formatLastUpdated(settings.lastUpdatedAt)}
        </p>
      </div>

      {/* 今すぐ更新 */}
      <button
        onClick={() => { onTrigger(); onClose(); }}
        disabled={isRefreshing}
        className="w-full flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium py-2.5 rounded-xl transition-colors"
      >
        {isRefreshing ? (
          <>
            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
            更新中...
          </>
        ) : (
          <>
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            今すぐ更新
          </>
        )}
      </button>
    </div>
  );
}
