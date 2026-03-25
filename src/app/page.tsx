'use client';

import { useState, useCallback } from 'react';
import { VideoCard, Stage } from '@/types';
import { useVideos } from '@/hooks/useVideos';
import { useChannels } from '@/hooks/useChannels';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { fetchYouTubeVideoData, fetchChannelData } from '@/lib/youtube';
import KanbanBoard from '@/components/KanbanBoard';
import StatsTable from '@/components/StatsTable';
import VideoModal from '@/components/VideoModal';
import ChannelStats from '@/components/ChannelStats';
import AutoRefreshPanel from '@/components/AutoRefreshPanel';
import Toast from '@/components/Toast';

type Tab = 'kanban' | 'stats' | 'channels';

export default function Home() {
  const { videos, addVideo, updateVideo, deleteVideo, moveVideo, batchUpdateVideos } = useVideos();
  const { channels, addChannel, removeChannel, refreshChannel } = useChannels();

  const [activeTab, setActiveTab] = useState<Tab>('kanban');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingVideo, setEditingVideo] = useState<VideoCard | null>(null);
  const [defaultStage, setDefaultStage] = useState<Stage>('idea');
  const [panelOpen, setPanelOpen] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setToastVisible(true);
  }, []);

  // 全データを更新するコールバック（useAutoRefreshに渡す）
  const handleRefreshAll = useCallback(async () => {
    const targets = videos.filter((v) => v.youtubeVideoId);
    const channelList = [...channels];

    const [videoResults] = await Promise.allSettled([
      // 動画データ更新
      Promise.allSettled(
        targets.map(async (v) => {
          const data = await fetchYouTubeVideoData(v.youtubeVideoId!);
          return { id: v.id, data: { views: data.views, likes: data.likes, comments: data.comments, thumbnail: data.thumbnail } };
        })
      ),
      // チャンネルデータ更新
      Promise.allSettled(
        channelList.map(async (ch) => {
          const data = await fetchChannelData(ch.channelId);
          refreshChannel(ch.id, data);
        })
      ),
    ]);

    // 成功した動画更新をまとめて反映
    if (videoResults.status === 'fulfilled') {
      const updates = videoResults.value
        .filter((r) => r.status === 'fulfilled')
        .map((r) => (r as PromiseFulfilledResult<{ id: string; data: Partial<VideoCard> }>).value);
      if (updates.length > 0) batchUpdateVideos(updates);
    }

    const updatedCount = targets.length + channelList.length;
    showToast(`✓ データを更新しました（${updatedCount}件）`);
  }, [videos, channels, batchUpdateVideos, refreshChannel, showToast]);

  const { settings, updateSettings, triggerRefresh, isRefreshing } = useAutoRefresh(handleRefreshAll);

  const handleAdd = (stage: Stage) => {
    setEditingVideo(null);
    setDefaultStage(stage);
    setModalOpen(true);
  };

  const handleEdit = (video: VideoCard) => {
    setEditingVideo(video);
    setModalOpen(true);
  };

  const handleSave = (data: Omit<VideoCard, 'id' | 'createdAt'>) => {
    if (editingVideo) {
      updateVideo(editingVideo.id, data);
    } else {
      addVideo(data);
    }
  };

  const handleReorder = (newVideos: VideoCard[]) => {
    newVideos.forEach((v) => updateVideo(v.id, { ...v }));
  };

  const totalVideos = videos.length;
  const publishedCount = videos.filter((v) => v.stage === 'published').length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* トースト通知 */}
      <Toast
        message={toastMessage}
        visible={toastVisible}
        onHide={() => setToastVisible(false)}
      />

      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-screen-xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M21.8 8s-.2-1.4-.8-2c-.8-.8-1.7-.8-2.1-.9C16.2 5 12 5 12 5s-4.2 0-6.9.1c-.4.1-1.3.1-2.1.9-.6.6-.8 2-.8 2S2 9.6 2 11.2v1.5c0 1.6.2 3.2.2 3.2s.2 1.4.8 2c.8.8 1.8.8 2.3.8C6.8 19 12 19 12 19s4.2 0 6.9-.2c.4-.1 1.3-.1 2.1-.9.6-.6.8-2 .8-2s.2-1.6.2-3.2v-1.5C22 9.6 21.8 8 21.8 8zM9.7 14.5V9.1l5.7 2.7-5.7 2.7z" />
              </svg>
            </div>
            <div>
              <h1 className="text-base font-bold text-gray-900 leading-tight">YouTube制作ダッシュボード</h1>
              <p className="text-xs text-gray-400">
                全{totalVideos}本 / 公開済み{publishedCount}本
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* タブ */}
            <div className="flex bg-gray-100 rounded-lg p-0.5 text-xs">
              {(['kanban', 'stats', 'channels'] as Tab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                    activeTab === tab ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'
                  }`}
                >
                  {tab === 'kanban' ? 'カンバン' : tab === 'stats' ? '視聴データ' : 'チャンネル統計'}
                </button>
              ))}
            </div>

            {/* 今すぐ更新ボタン */}
            <button
              onClick={() => triggerRefresh()}
              disabled={isRefreshing}
              title="今すぐ更新"
              className="flex items-center gap-1.5 border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium px-3 py-2 rounded-lg transition-colors"
            >
              <svg
                className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {isRefreshing ? '更新中' : '今すぐ更新'}
            </button>

            {/* 自動更新設定ボタン */}
            <div className="relative">
              <button
                onClick={() => setPanelOpen((v) => !v)}
                title="自動更新設定"
                className={`flex items-center gap-1.5 border text-xs font-medium px-3 py-2 rounded-lg transition-colors ${
                  settings.enabled
                    ? 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                自動更新
                {settings.enabled && (
                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                )}
              </button>

              {panelOpen && (
                <AutoRefreshPanel
                  settings={settings}
                  isRefreshing={isRefreshing}
                  onUpdate={updateSettings}
                  onTrigger={triggerRefresh}
                  onClose={() => setPanelOpen(false)}
                />
              )}
            </div>

            {/* 新規追加 */}
            {activeTab !== 'channels' && (
              <button
                onClick={() => handleAdd('idea')}
                className="flex items-center gap-1.5 bg-red-500 hover:bg-red-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                <span className="text-base leading-none">+</span>
                新規追加
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto px-4 py-5">
        {activeTab === 'kanban' && (
          <KanbanBoard
            videos={videos}
            onAdd={handleAdd}
            onEdit={handleEdit}
            onDelete={deleteVideo}
            onMove={moveVideo}
            onReorder={handleReorder}
          />
        )}
        {activeTab === 'stats' && (
          <StatsTable videos={videos} onEdit={handleEdit} />
        )}
        {activeTab === 'channels' && (
          <ChannelStats
            channels={channels}
            addChannel={addChannel}
            removeChannel={removeChannel}
            refreshChannel={refreshChannel}
          />
        )}
      </main>

      {modalOpen && (
        <VideoModal
          video={editingVideo}
          defaultStage={defaultStage}
          onSave={handleSave}
          onClose={() => {
            setModalOpen(false);
            setEditingVideo(null);
          }}
        />
      )}
    </div>
  );
}
