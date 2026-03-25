'use client';

import { useEffect, useRef, useState } from 'react';
import { AutoRefreshSettings, SlackSettings } from '@/types';

interface AutoRefreshPanelProps {
  settings: AutoRefreshSettings;
  isRefreshing: boolean;
  onUpdate: (patch: Partial<AutoRefreshSettings>) => void;
  onTrigger: () => void;
  slackSettings: SlackSettings;
  onSlackUpdate: (patch: Partial<SlackSettings>) => void;
  onSendSlack: () => Promise<void>;
  isSendingSlack: boolean;
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
  return new Date(iso).toLocaleString('ja-JP', {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${value ? 'bg-red-500' : 'bg-gray-200'}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${value ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  );
}

export default function AutoRefreshPanel({
  settings, isRefreshing, onUpdate, onTrigger,
  slackSettings, onSlackUpdate, onSendSlack, isSendingSlack,
  onClose,
}: AutoRefreshPanelProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [webhookInput, setWebhookInput] = useState(slackSettings.webhookUrl);
  const [showWebhook, setShowWebhook] = useState(false);
  const [slackError, setSlackError] = useState('');
  const [slackSent, setSlackSent] = useState(false);

  useEffect(() => { setWebhookInput(slackSettings.webhookUrl); }, [slackSettings.webhookUrl]);

  // パネル外クリックで閉じる
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const handleWebhookSave = () => {
    onSlackUpdate({ webhookUrl: webhookInput.trim() });
    setShowWebhook(false);
  };

  const handleSendSlack = async () => {
    setSlackError('');
    setSlackSent(false);
    try {
      await onSendSlack();
      setSlackSent(true);
      setTimeout(() => setSlackSent(false), 3000);
    } catch (e) {
      setSlackError(e instanceof Error ? e.message : '送信に失敗しました');
    }
  };

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 p-4 z-50 max-h-[85vh] overflow-y-auto"
    >
      {/* ── 自動更新設定 ── */}
      <h3 className="font-bold text-gray-800 text-sm mb-4">自動更新設定</h3>

      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm font-medium text-gray-700">自動更新</p>
          <p className="text-xs text-gray-400">動画・チャンネルを定期更新</p>
        </div>
        <Toggle value={settings.enabled} onChange={(v) => onUpdate({ enabled: v })} />
      </div>

      <div className="mb-4">
        <p className="text-xs font-medium text-gray-500 mb-2">更新間隔</p>
        <div className="grid grid-cols-4 gap-1">
          {INTERVAL_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onUpdate({ intervalHours: opt.value })}
              className={`py-1.5 text-xs rounded-lg font-medium transition-colors ${
                settings.intervalHours === opt.value ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4 bg-gray-50 rounded-xl px-3 py-2.5">
        <p className="text-xs text-gray-400 mb-0.5">最終更新</p>
        <p className="text-xs font-medium text-gray-600">{formatLastUpdated(settings.lastUpdatedAt)}</p>
      </div>

      <button
        onClick={() => { onTrigger(); onClose(); }}
        disabled={isRefreshing}
        className="w-full flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium py-2.5 rounded-xl transition-colors mb-5"
      >
        <svg className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        {isRefreshing ? '更新中...' : '今すぐ更新'}
      </button>

      {/* ── Slack通知設定 ── */}
      <div className="border-t border-gray-100 pt-4">
        <div className="flex items-center gap-2 mb-4">
          <svg className="w-4 h-4 text-purple-500" viewBox="0 0 24 24" fill="currentColor">
            <path d="M5.042 15.165a2.528 2.528 0 01-2.52 2.523A2.528 2.528 0 010 15.165a2.527 2.527 0 012.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 012.521-2.52 2.527 2.527 0 012.521 2.52v6.313A2.528 2.528 0 018.834 24a2.528 2.528 0 01-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 01-2.521-2.52A2.528 2.528 0 018.834 0a2.528 2.528 0 012.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 012.521 2.521 2.528 2.528 0 01-2.521 2.521H2.522A2.528 2.528 0 010 8.834a2.528 2.528 0 012.522-2.521h6.312zm10.122 2.521a2.528 2.528 0 012.522-2.521A2.528 2.528 0 0124 8.834a2.528 2.528 0 01-2.522 2.521h-2.522V8.834zm-1.268 0a2.528 2.528 0 01-2.523 2.521 2.527 2.527 0 01-2.52-2.521V2.522A2.527 2.527 0 0115.165 0a2.528 2.528 0 012.523 2.522v6.312zm-2.523 10.122a2.528 2.528 0 012.523 2.522A2.528 2.528 0 0115.165 24a2.527 2.527 0 01-2.52-2.522v-2.522h2.52zm0-1.268a2.527 2.527 0 01-2.52-2.523 2.526 2.526 0 012.52-2.52h6.313A2.527 2.527 0 0124 15.165a2.528 2.528 0 01-2.522 2.523h-6.313z" />
          </svg>
          <h3 className="font-bold text-gray-800 text-sm">Slack通知設定</h3>
        </div>

        {/* Slack ON/OFF */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm font-medium text-gray-700">更新完了時に通知</p>
            <p className="text-xs text-gray-400">自動更新のたびにSlackへ送信</p>
          </div>
          <Toggle value={slackSettings.enabled} onChange={(v) => onSlackUpdate({ enabled: v })} />
        </div>

        {/* Webhook URL 設定 */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-gray-500">Webhook URL</p>
            <button
              onClick={() => setShowWebhook((v) => !v)}
              className="text-xs text-blue-500 hover:text-blue-700"
            >
              {showWebhook ? '閉じる' : '変更'}
            </button>
          </div>
          {showWebhook ? (
            <div className="space-y-2">
              <input
                type="text"
                value={webhookInput}
                onChange={(e) => setWebhookInput(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-purple-400"
                placeholder="https://hooks.slack.com/services/..."
              />
              <button
                onClick={handleWebhookSave}
                disabled={!webhookInput.trim()}
                className="w-full bg-purple-500 hover:bg-purple-600 disabled:opacity-50 text-white text-xs font-medium py-2 rounded-lg transition-colors"
              >
                保存する
              </button>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-lg px-3 py-2">
              <p className="text-xs text-gray-500 truncate font-mono">
                {slackSettings.webhookUrl
                  ? slackSettings.webhookUrl.replace(/\/[^/]+$/, '/••••••••')
                  : '未設定'}
              </p>
            </div>
          )}
        </div>

        {/* 今すぐSlack通知 */}
        <button
          onClick={handleSendSlack}
          disabled={isSendingSlack || !slackSettings.webhookUrl}
          className="w-full flex items-center justify-center gap-2 bg-purple-500 hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium py-2.5 rounded-xl transition-colors"
        >
          {isSendingSlack ? (
            <>
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
              送信中...
            </>
          ) : slackSent ? (
            <>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              送信しました
            </>
          ) : (
            <>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
              今すぐSlack通知を送る
            </>
          )}
        </button>
        {slackError && <p className="text-xs text-red-500 mt-2">{slackError}</p>}
      </div>
    </div>
  );
}
