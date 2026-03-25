'use client';

import { VideoCard } from '@/types';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface KanbanCardProps {
  video: VideoCard;
  onEdit: (video: VideoCard) => void;
  onDelete: (id: string) => void;
}

export default function KanbanCard({ video, onEdit, onDelete }: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: video.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 group hover:shadow-md transition-shadow"
    >
      <div className="flex items-start gap-2">
        <div
          {...attributes}
          {...listeners}
          className="mt-0.5 cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-400 flex-shrink-0"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
            <circle cx="4" cy="3" r="1.2" />
            <circle cx="10" cy="3" r="1.2" />
            <circle cx="4" cy="7" r="1.2" />
            <circle cx="10" cy="7" r="1.2" />
            <circle cx="4" cy="11" r="1.2" />
            <circle cx="10" cy="11" r="1.2" />
          </svg>
        </div>

        <div className="flex-1 min-w-0">
          {video.thumbnail && (
            <div className="mb-2 rounded-lg overflow-hidden -mx-0.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={video.thumbnail} alt="サムネイル" className="w-full h-auto" />
            </div>
          )}
          <p className="text-sm font-semibold text-gray-800 leading-tight mb-1 truncate">{video.title}</p>

          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-500 mb-2">
            {video.assignee && (
              <span className="flex items-center gap-1">
                <span>👤</span> {video.assignee}
              </span>
            )}
            {video.publishDate && (
              <span className="flex items-center gap-1">
                <span>📅</span>{' '}
                {new Date(video.publishDate).toLocaleDateString('ja-JP', {
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            )}
          </div>

          {video.notes && (
            <p className="text-xs text-gray-400 line-clamp-2 mb-2">{video.notes}</p>
          )}

          {video.stage === 'published' && video.views !== undefined && (
            <div className="flex gap-2 text-xs bg-gray-50 rounded-lg px-2 py-1.5">
              <span className="text-gray-600">▶ {video.views.toLocaleString()}</span>
              <span className="text-gray-600">👍 {video.likes?.toLocaleString() ?? 0}</span>
              <span className="text-gray-600">💬 {video.comments?.toLocaleString() ?? 0}</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
        <button
          onClick={() => onEdit(video)}
          className="text-xs text-blue-500 hover:text-blue-700 px-2 py-0.5 rounded hover:bg-blue-50 transition-colors"
        >
          編集
        </button>
        <button
          onClick={() => {
            if (confirm(`「${video.title}」を削除しますか？`)) {
              onDelete(video.id);
            }
          }}
          className="text-xs text-red-400 hover:text-red-600 px-2 py-0.5 rounded hover:bg-red-50 transition-colors"
        >
          削除
        </button>
      </div>
    </div>
  );
}
