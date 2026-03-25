'use client';

import { useState } from 'react';
import { VideoCard, Stage } from '@/types';
import { useVideos } from '@/hooks/useVideos';
import KanbanBoard from '@/components/KanbanBoard';
import StatsTable from '@/components/StatsTable';
import VideoModal from '@/components/VideoModal';
import ChannelStats from '@/components/ChannelStats';

type Tab = 'kanban' | 'stats' | 'channels';

export default function Home() {
  const { videos, addVideo, updateVideo, deleteVideo, moveVideo } = useVideos();
  const [activeTab, setActiveTab] = useState<Tab>('kanban');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingVideo, setEditingVideo] = useState<VideoCard | null>(null);
  const [defaultStage, setDefaultStage] = useState<Stage>('idea');

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
    newVideos.forEach((v) => {
      updateVideo(v.id, { ...v });
    });
  };

  const totalVideos = videos.length;
  const publishedCount = videos.filter((v) => v.stage === 'published').length;

  return (
    <div className="min-h-screen bg-gray-50">
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

          <div className="flex items-center gap-3">
            <div className="flex bg-gray-100 rounded-lg p-0.5 text-xs">
              <button
                onClick={() => setActiveTab('kanban')}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                  activeTab === 'kanban' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'
                }`}
              >
                カンバン
              </button>
              <button
                onClick={() => setActiveTab('stats')}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                  activeTab === 'stats' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'
                }`}
              >
                視聴データ
              </button>
              <button
                onClick={() => setActiveTab('channels')}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                  activeTab === 'channels' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'
                }`}
              >
                チャンネル統計
              </button>
            </div>

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
          <ChannelStats />
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
