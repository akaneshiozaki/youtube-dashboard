'use client';

import { useState, useEffect } from 'react';
import { VideoCard, Stage, STAGES } from '@/types';
import { fetchYouTubeVideoData } from '@/lib/youtube';

interface VideoModalProps {
  video?: VideoCard | null;
  defaultStage?: Stage;
  onSave: (data: Omit<VideoCard, 'id' | 'createdAt'>) => void;
  onClose: () => void;
}

export default function VideoModal({ video, defaultStage = 'idea', onSave, onClose }: VideoModalProps) {
  const [title, setTitle] = useState('');
  const [assignee, setAssignee] = useState('');
  const [publishDate, setPublishDate] = useState('');
  const [notes, setNotes] = useState('');
  const [stage, setStage] = useState<Stage>(defaultStage);
  const [views, setViews] = useState('');
  const [likes, setLikes] = useState('');
  const [comments, setComments] = useState('');
  const [youtubeVideoId, setYoutubeVideoId] = useState('');
  const [thumbnail, setThumbnail] = useState('');

  // YouTube取得用
  const [youtubeInput, setYoutubeInput] = useState('');
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [fetchSuccess, setFetchSuccess] = useState(false);

  useEffect(() => {
    if (video) {
      setTitle(video.title);
      setAssignee(video.assignee);
      setPublishDate(video.publishDate);
      setNotes(video.notes);
      setStage(video.stage);
      setViews(video.views?.toString() ?? '');
      setLikes(video.likes?.toString() ?? '');
      setComments(video.comments?.toString() ?? '');
      setYoutubeVideoId(video.youtubeVideoId ?? '');
      setThumbnail(video.thumbnail ?? '');
      if (video.youtubeVideoId) {
        setYoutubeInput(`https://www.youtube.com/watch?v=${video.youtubeVideoId}`);
      }
    }
  }, [video]);

  const handleFetchYouTube = async () => {
    if (!youtubeInput.trim()) return;
    setFetching(true);
    setFetchError('');
    setFetchSuccess(false);

    try {
      const data = await fetchYouTubeVideoData(youtubeInput);
      setTitle(data.title);
      setViews(data.views.toString());
      setLikes(data.likes.toString());
      setComments(data.comments.toString());
      setYoutubeVideoId(data.videoId);
      setThumbnail(data.thumbnail);
      setFetchSuccess(true);
      // 公開済みに自動変更
      if (stage !== 'published') setStage('published');
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : '取得に失敗しました');
    } finally {
      setFetching(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSave({
      title: title.trim(),
      assignee: assignee.trim(),
      publishDate,
      notes: notes.trim(),
      stage,
      views: views ? parseInt(views) : undefined,
      likes: likes ? parseInt(likes) : undefined,
      comments: comments ? parseInt(comments) : undefined,
      youtubeVideoId: youtubeVideoId || undefined,
      thumbnail: thumbnail || undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-5">
            {video ? '動画を編集' : '新しい動画を追加'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* YouTube自動取得セクション */}
            <div className="bg-red-50 border border-red-100 rounded-xl p-4">
              <p className="text-xs font-semibold text-red-600 mb-2 flex items-center gap-1">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M21.8 8s-.2-1.4-.8-2c-.8-.8-1.7-.8-2.1-.9C16.2 5 12 5 12 5s-4.2 0-6.9.1c-.4.1-1.3.1-2.1.9-.6.6-.8 2-.8 2S2 9.6 2 11.2v1.5c0 1.6.2 3.2.2 3.2s.2 1.4.8 2c.8.8 1.8.8 2.3.8C6.8 19 12 19 12 19s4.2 0 6.9-.2c.4-.1 1.3-.1 2.1-.9.6-.6.8-2 .8-2s.2-1.6.2-3.2v-1.5C22 9.6 21.8 8 21.8 8zM9.7 14.5V9.1l5.7 2.7-5.7 2.7z" />
                </svg>
                YouTubeから自動取得
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={youtubeInput}
                  onChange={(e) => {
                    setYoutubeInput(e.target.value);
                    setFetchSuccess(false);
                    setFetchError('');
                  }}
                  className="flex-1 border border-red-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 bg-white"
                  placeholder="動画URLまたは動画IDを入力"
                />
                <button
                  type="button"
                  onClick={handleFetchYouTube}
                  disabled={fetching || !youtubeInput.trim()}
                  className="bg-red-500 text-white text-xs font-medium px-3 py-2 rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap flex items-center gap-1.5"
                >
                  {fetching ? (
                    <>
                      <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                      </svg>
                      取得中
                    </>
                  ) : '取得'}
                </button>
              </div>
              {fetchError && (
                <p className="text-xs text-red-500 mt-1.5">{fetchError}</p>
              )}
              {fetchSuccess && (
                <p className="text-xs text-green-600 mt-1.5">✓ データを取得しました</p>
              )}
            </div>

            {/* サムネイルプレビュー */}
            {thumbnail && (
              <div className="rounded-xl overflow-hidden border border-gray-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={thumbnail} alt="サムネイル" className="w-full h-auto" />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                タイトル <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                placeholder="動画タイトルを入力"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">担当者</label>
                <input
                  type="text"
                  value={assignee}
                  onChange={(e) => setAssignee(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                  placeholder="担当者名"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">公開予定日</label>
                <input
                  type="date"
                  value={publishDate}
                  onChange={(e) => setPublishDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ステージ</label>
              <select
                value={stage}
                onChange={(e) => setStage(e.target.value as Stage)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
              >
                {STAGES.map((s) => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">メモ</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
                rows={3}
                placeholder="企画メモ・備考など"
              />
            </div>

            <div className="border-t pt-4">
              <p className="text-sm font-medium text-gray-700 mb-3">視聴データ</p>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">再生回数</label>
                  <input
                    type="number"
                    value={views}
                    onChange={(e) => setViews(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                    placeholder="0"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">高評価</label>
                  <input
                    type="number"
                    value={likes}
                    onChange={(e) => setLikes(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                    placeholder="0"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">コメント数</label>
                  <input
                    type="number"
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                    placeholder="0"
                    min="0"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2 text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                キャンセル
              </button>
              <button
                type="submit"
                className="flex-1 bg-red-500 text-white rounded-lg py-2 text-sm font-medium hover:bg-red-600 transition-colors"
              >
                {video ? '更新する' : '追加する'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
