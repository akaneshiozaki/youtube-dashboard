-- ============================================================
-- YouTube制作ダッシュボード - Supabaseスキーマ
-- Supabaseダッシュボード > SQL Editor で実行してください
-- ============================================================

-- 動画カードテーブル
create table if not exists videos (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  assignee      text not null default '',
  publish_date  text not null default '',
  notes         text not null default '',
  stage         text not null default 'idea',
  views         integer,
  likes         integer,
  comments      integer,
  youtube_video_id text,
  thumbnail     text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- チャンネル統計テーブル
create table if not exists channels (
  id            uuid primary key default gen_random_uuid(),
  channel_id    text not null unique,
  name          text not null,
  icon          text not null default '',
  subscribers   integer not null default 0,
  total_views   integer not null default 0,
  video_count   integer not null default 0,
  top_videos    jsonb not null default '[]',
  all_videos    jsonb not null default '[]',
  added_at      timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- updated_at を自動更新するトリガー
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create or replace trigger videos_updated_at
  before update on videos
  for each row execute function update_updated_at();

create or replace trigger channels_updated_at
  before update on channels
  for each row execute function update_updated_at();

-- Row Level Security を有効化
alter table videos enable row level security;
alter table channels enable row level security;

-- 認証済みユーザーは全データを読み書きできる（チーム共有）
create policy "認証済みユーザーは動画を参照可能" on videos
  for select using (auth.role() = 'authenticated');

create policy "認証済みユーザーは動画を追加可能" on videos
  for insert with check (auth.role() = 'authenticated');

create policy "認証済みユーザーは動画を更新可能" on videos
  for update using (auth.role() = 'authenticated');

create policy "認証済みユーザーは動画を削除可能" on videos
  for delete using (auth.role() = 'authenticated');

create policy "認証済みユーザーはチャンネルを参照可能" on channels
  for select using (auth.role() = 'authenticated');

create policy "認証済みユーザーはチャンネルを追加可能" on channels
  for insert with check (auth.role() = 'authenticated');

create policy "認証済みユーザーはチャンネルを更新可能" on channels
  for update using (auth.role() = 'authenticated');

create policy "認証済みユーザーはチャンネルを削除可能" on channels
  for delete using (auth.role() = 'authenticated');

-- Realtimeを有効化
alter publication supabase_realtime add table videos;
alter publication supabase_realtime add table channels;
