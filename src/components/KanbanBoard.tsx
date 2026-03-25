'use client';

import { useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  DragOverlay,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { VideoCard, Stage, STAGES } from '@/types';
import KanbanColumn from './KanbanColumn';
import KanbanCard from './KanbanCard';

interface KanbanBoardProps {
  videos: VideoCard[];
  onAdd: (stage: Stage) => void;
  onEdit: (video: VideoCard) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, stage: Stage) => void;
  onReorder: (videos: VideoCard[]) => void;
}

export default function KanbanBoard({ videos, onAdd, onEdit, onDelete, onMove, onReorder }: KanbanBoardProps) {
  const [activeVideo, setActiveVideo] = useState<VideoCard | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const video = videos.find((v) => v.id === event.active.id);
    setActiveVideo(video ?? null);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeVideo = videos.find((v) => v.id === activeId);
    if (!activeVideo) return;

    // ドロップ先がカラム（ステージ）の場合
    const isOverColumn = STAGES.some((s) => s.id === overId);
    if (isOverColumn && activeVideo.stage !== overId) {
      onMove(activeId, overId as Stage);
      return;
    }

    // ドロップ先が別のカード
    const overVideo = videos.find((v) => v.id === overId);
    if (overVideo && activeVideo.stage !== overVideo.stage) {
      onMove(activeId, overVideo.stage);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveVideo(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    if (activeId === overId) return;

    // 同一カラム内の並び替え
    const activeVideo = videos.find((v) => v.id === activeId);
    const overVideo = videos.find((v) => v.id === overId);

    if (activeVideo && overVideo && activeVideo.stage === overVideo.stage) {
      const oldIndex = videos.indexOf(activeVideo);
      const newIndex = videos.indexOf(overVideo);
      onReorder(arrayMove(videos, oldIndex, newIndex));
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4 px-1">
        {STAGES.map((stage) => (
          <KanbanColumn
            key={stage.id}
            stage={stage.id}
            label={stage.label}
            videos={videos.filter((v) => v.stage === stage.id)}
            onAdd={onAdd}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>

      <DragOverlay>
        {activeVideo ? (
          <div className="opacity-90 rotate-2 shadow-xl">
            <KanbanCard
              video={activeVideo}
              onEdit={() => {}}
              onDelete={() => {}}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
