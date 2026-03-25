'use client';

import { useState, useCallback } from 'react';
import { VideoCard, Stage, ChannelData, SlackNotificationData } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { useVideos } from '@/hooks/useVideos';
import { useChannels } from '@/hooks/useChannels';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { useSlackSettings } from '@/hooks/useSlackSettings';
import { fetchYouTubeVideoData, fetchChannelData } from '@/lib/youtube';
import { sendSlackNotification } from '@/lib/slack';
import KanbanBoard from '@/components/KanbanBoard';
import StatsTable from '@/components/StatsTable';
import VideoModal from '@/components/VideoModal';
import ChannelStats from '@/components/ChannelStats';
import Analytics from '@/components/Analytics';
import AutoRefreshPanel from '@/components/AutoRefreshPanel';
import Toast from '@/components/Toast';
import LoginPage from '@/components/LoginPage';

type Tab = 'kanban' | 'stats' | 'channels' | 'analytics';

export default function Home() {
  // ── すべての Hook を最上部で宣言（Rules of Hooks）──
  const { user, loading: authLoading, signIn, signUp, signOut } = useAuth();
  const { videos, addVideo, updateVideo, deleteVideo, moveVideo, batchUpdateVideos } = useVideos();
  const { channels, addChannel, removeChannel, refreshChannel } = useChannels();
  const { slackSettings, updateSlackSettings } = useSlackSettings();

  const [activeTab, setActiveTab] = useState<Tab>('kanban');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingVideo, setEditingVideo] = useState<VideoCard | null>(null);
  const [defaultStage, setDefaultStage] = useState<Stage>('idea');
  const [panelOpen, setPanelOpen] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [isSendingSlack, setIsSendingSlack] = useState(false);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setToastVisible(true);
  }, []);

  const handleRefreshAll = useCallback(async () => {
    const targets = videos.filter((v) => v.youtubeVideoId);
    const channelList = [...channels];

    const prevVideoMap = new Map(
      targets.map((v) => [v.id, { title: v.title, views: v.views ?? 0, videoId: v.youtubeVideoId! }])
    );
    const prevChannelMap = new Map(
      channelList.map((c) => [c.id, { name: c.name, subscribers: c.subscribers }])
    );

    const [videoSettled, channelSettled] = await Promise.all([
      Promise.allSettled(
        targets.map(async (v) => {
          const data = await fetchYouTubeVideoData(v.youtubeVideoId!);
          return {
            id: v.id,
            newViews: data.views,
            data: { views: data.views, likes: data.likes, comments: data.comments, thumbnail: data.thumbnail },
          };
        })
      ),
      Promise.allSettled(
        channelList.map(async (ch) => {
          const data = await fetchChannelData(ch.channelId);
          return { id: ch.id, newSubscribers: data.subscribers, data };
        })
      ),
    ]);

    type VideoUpdate = { id: string; newViews: number; data: Partial<VideoCard> };
    const videoUpdates = videoSettled
      .filter((r) => r.status === 'fulfilled')
      .map((r) => (r as PromiseFulfilledResult<VideoUpdate>).value);
    if (videoUpdates.length > 0) {
      batchUpdateVideos(videoUpdates.map((u) => ({ id: u.id, data: u.data })));
    }

    type ChannelUpdate = { id: string; newSubscribers: number; data: Omit<ChannelData, 'id' | 'addedAt'> };
    const channelUpdates = channelSettled
      .filter((r) => r.status === 'fulfilled')
      .map((r) => (r as PromiseFulfilledResult<ChannelUpdate>).value);
    channelUpdates.forEach((u) => refreshChannel(u.id, u.data));

    const viewIncreases = videoUpdates
      .filter((u) => { const p = prevVideoMap.get(u.id); return p && u.newViews - p.views >= 1000; })
      .map((u) => { const p = prevVideoMap.get(u.id)!; return { title: p.title, videoId: p.videoId, increase: u.newViews - p.views, total: u.newViews }; });

    const channelChanges = channelUpdates.map((u) => {
      const p = prevChannelMap.get(u.id);
      return { name: p?.name ?? '', subscribers: u.newSubscribers, change: u.newSubscribers - (p?.subscribers ?? 0) };
    });

    const updatedCount = videoUpdates.length + channelUpdates.length;
    showToast(`✓ データを更新しました（${updatedCount}件）`);

    if (slackSettings.enabled && slackSettings.webhookUrl) {
      const notificationData: SlackNotificationData = { updatedCount, viewIncreases, channelChanges, timestamp: new Date().toISOString() };
      try { await sendSlackNotification(notificationData, slackSettings.webhookUrl); } catch { /* ignore */ }
    }
  }, [videos, channels, batchUpdateVideos, refreshChannel, showToast, slackSettings]);

  const { settings, updateSettings, triggerRefresh, isRefreshing } = useAutoRefresh(handleRefreshAll);

  const handleSendSlack = useCallback(async () => {
    setIsSendingSlack(true);
    try {
      const notificationData: SlackNotificationData = {
        updatedCount: videos.filter((v) => v.youtubeVideoId).length + channels.length,
        viewIncreases: [],
        channelChanges: channels.map((c) => ({ name: c.name, subscribers: c.subscribers, change: 0 })),
        timestamp: new Date().toISOString(),
      };
      await sendSlackNotification(notificationData, slackSettings.webhookUrl);
      showToast('✓ Slack通知を送信しました');
    } finally {
      setIsSendingSlack(false);
    }
  }, [videos, channels, slackSettings.webhookUrl, showToast]);

  // ── 条件付きレンダリング（Hook の後に置く）──

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <svg className="w-8 h-8 text-red-400 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
          </svg>
          <p className="text-sm text-gray-400">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage onSignIn={signIn} onSignUp={signUp} />;
  }

  // ── ダッシュボード ──

  const handleAdd = (stage: Stage) => { setEditingVideo(null); setDefaultStage(stage); setModalOpen(true); };
  const handleEdit = (video: VideoCard) => { setEditingVideo(video); setModalOpen(true); };
  const handleSave = (data: Omit<VideoCard, 'id' | 'createdAt'>) => {
    if (editingVideo) { updateVideo(editingVideo.id, data); } else { addVideo(data); }
  };
  const handleReorder = (newVideos: VideoCard[]) => { newVideos.forEach((v) => updateVideo(v.id, { ...v })); };

  const totalVideos = videos.length;
  const publishedCount = videos.filter((v) => v.stage === 'published').length;

  return (
    <div className="min-h-screen bg-gray-50">
      <Toast message={toastMessage} visible={toastVisible} onHide={() => setToastVisible(false)} />

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
              <p className="text-xs text-gray-400">全{totalVideos}本 / 公開済み{publishedCount}本</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* ユーザー情報 + ログアウト */}
            <div className="flex items-center gap-2 mr-1 border-r border-gray-100 pr-3">
              <div className="w-7 h-7 bg-red-100 rounded-full flex items-center justify-center text-red-600 text-xs font-bold">
                {user.email?.[0].toUpperCase()}
              </div>
              <span className="text-xs text-gray-500 max-w-[120px] truncate hidden sm:block">{user.email}</span>
              <button
                onClick={signOut}
                className="text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-100 px-2 py-1 rounded-lg transition-colors"
              >
                ログアウト
              </button>
            </div>

            {/* タブ */}
            <div className="flex bg-gray-100 rounded-lg p-0.5 text-xs">
              {(['kanban', 'stats', 'channels', 'analytics'] as Tab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1.5 rounded-md font-medium transition-colors ${activeTab === tab ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'}`}
                >
                  {tab === 'kanban' ? 'カンバン' : tab === 'stats' ? '視聴データ' : tab === 'channels' ? 'チャンネル統計' : '分析'}
                </button>
              ))}
            </div>

            {/* 今すぐ更新 */}
            <button
              onClick={() => triggerRefresh()}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium px-3 py-2 rounded-lg transition-colors"
            >
              <svg className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {isRefreshing ? '更新中' : '今すぐ更新'}
            </button>

            {/* 設定パネル */}
            <div className="relative">
              <button
                onClick={() => setPanelOpen((v) => !v)}
                className={`flex items-center gap-1.5 border text-xs font-medium px-3 py-2 rounded-lg transition-colors ${
                  settings.enabled || slackSettings.enabled
                    ? 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                設定
                {(settings.enabled || slackSettings.enabled) && (
                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                )}
              </button>

              {panelOpen && (
                <AutoRefreshPanel
                  settings={settings}
                  isRefreshing={isRefreshing}
                  onUpdate={updateSettings}
                  onTrigger={triggerRefresh}
                  slackSettings={slackSettings}
                  onSlackUpdate={updateSlackSettings}
                  onSendSlack={handleSendSlack}
                  isSendingSlack={isSendingSlack}
                  onClose={() => setPanelOpen(false)}
                />
              )}
            </div>

            {/* 新規追加 */}
            {activeTab !== 'channels' && activeTab !== 'analytics' && (
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
          <KanbanBoard videos={videos} onAdd={handleAdd} onEdit={handleEdit} onDelete={deleteVideo} onMove={moveVideo} onReorder={handleReorder} />
        )}
        {activeTab === 'stats' && <StatsTable videos={videos} onEdit={handleEdit} />}
        {activeTab === 'channels' && (
          <ChannelStats channels={channels} addChannel={addChannel} removeChannel={removeChannel} refreshChannel={refreshChannel} />
        )}
        {activeTab === 'analytics' && <Analytics channels={channels} />}
      </main>

      {modalOpen && (
        <VideoModal
          video={editingVideo}
          defaultStage={defaultStage}
          onSave={handleSave}
          onClose={() => { setModalOpen(false); setEditingVideo(null); }}
        />
      )}
    </div>
  );
}
