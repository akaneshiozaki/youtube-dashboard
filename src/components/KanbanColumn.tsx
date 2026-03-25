'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { VideoCard, Stage } from '@/types';
import KanbanCard from './KanbanCard';

const STAGE_COLORS: Record<Stage, string> = {
  idea: 'bg-gray-100 border-gray-200',
  planning: 'bg-blue-50 border-blue-200',
  filming: 'bg-yellow-50 border-yellow-200',
  editing: 'bg-purple-50 border-purple-200',
  published: 'bg-green-50 border-green-200',
};

const STAGE_HEADER_COLORS: Record<Stage, string> = {
  idea: 'bg-gray-400',
  planning: 'bg-blue-400',
  filming: 'bg-yellow-400',
  editing: 'bg-purple-400',
  published: 'bg-green-500',
};

interface KanbanColumnProps {
  stage: Stage;
  label: string;
  videos: VideoCard[];
  onAdd: (stage: Stage) => void;
  onEdit: (video: VideoCard) => void;
  onDelete: (id: string) => void;
}

export default function KanbanColumn({ stage, label, videos, onAdd, onEdit, onDelete }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });

  return (
    <div
      className={`flex flex-col rounded-2xl border-2 ${STAGE_COLORS[stage]} ${isOver ? 'ring-2 ring-offset-1 ring-blue-300' : ''} min-w-[220px] w-[220px] flex-shrink-0`}
    >
      <div className="p-3 pb-2">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${STAGE_HEADER_COLORS[stage]}`} />
            <span className="text-sm font-bold text-gray-700">{label}</span>
          </div>
          <span className="text-xs bg-white text-gray-500 rounded-full px-2 py-0.5 font-medium">
            {videos.length}
          </span>
        </div>

        <div ref={setNodeRef} className="flex flex-col gap-2 min-h-[60px]">
          <SortableContext items={videos.map((v) => v.id)} strategy={verticalListSortingStrategy}>
            {videos.map((video) => (
              <KanbanCard key={video.id} video={video} onEdit={onEdit} onDelete={onDelete} />
            ))}
          </SortableContext>
        </div>
      </div>

      <div className="p-2 pt-0">
        <button
          onClick={() => onAdd(stage)}
          className="w-full text-xs text-gray-400 hover:text-gray-600 hover:bg-white/70 rounded-lg py-2 transition-colors flex items-center justify-center gap-1"
        >
          <span className="text-base leading-none">+</span> 追加
        </button>
      </div>
    </div>
  );
}
