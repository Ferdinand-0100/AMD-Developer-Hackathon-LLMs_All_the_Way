-- ============================================================
-- Migration 003: AI Onboarding Profiles, Activity Log & Inference Logs
-- Run after migration 002
-- ============================================================

-- ── project_profiles (per-user, per-project AI config) ──────
create table public.project_profiles (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references public.profiles (id) on delete cascade,
  project_id           uuid not null references public.projects (id) on delete cascade,
  role                 text not null default '',
  responsibilities     text not null default '',
  communication_style  text not null default 'detailed', -- 'bullets' | 'detailed'
  tone                 text not null default 'casual',   -- 'formal' | 'casual'
  working_hours        text not null default '',
  timezone             text not null default '',
  ai_restrictions      text not null default '',
  extra_context        text not null default '',         -- uploaded doc text
  onboarded_at         timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (user_id, project_id)
);

alter table public.project_profiles enable row level security;

create policy "project_profiles_select_own"
  on public.project_profiles for select
  using (user_id = auth.uid());

create policy "project_profiles_insert_own"
  on public.project_profiles for insert
  with check (user_id = auth.uid());

create policy "project_profiles_update_own"
  on public.project_profiles for update
  using (user_id = auth.uid());

-- ── activity_log ─────────────────────────────────────────────
create table public.activity_log (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references public.projects (id) on delete cascade,
  user_id      uuid references public.profiles (id) on delete set null,
  event_type   text not null,
  description  text not null,
  created_at   timestamptz not null default now()
);

alter table public.activity_log enable row level security;

create policy "activity_log_select_member"
  on public.activity_log for select
  using ( public.is_project_member(project_id, auth.uid()) );

create policy "activity_log_insert_auth"
  on public.activity_log for insert
  with check ( auth.uid() is not null );

-- ── inference_logs (AMD Developer Cloud ROCm feedback) ───────
create table public.inference_logs (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid references public.profiles (id) on delete set null,
  project_id        uuid references public.projects (id) on delete set null,
  model             text not null,
  prompt_tokens     int  not null default 0,
  completion_tokens int  not null default 0,
  latency_ms        int  not null default 0,
  endpoint          text not null default '',
  context_type      text not null default '', -- 'away_summary' | 'chat' | 'cross_agent'
  created_at        timestamptz not null default now()
);

alter table public.inference_logs enable row level security;

-- Only the owning user can read their own logs
create policy "inference_logs_select_own"
  on public.inference_logs for select
  using (user_id = auth.uid());

-- Server actions insert logs
create policy "inference_logs_insert_auth"
  on public.inference_logs for insert
  with check (auth.uid() is not null);

-- ── last_seen on project_members ─────────────────────────────
alter table public.project_members
  add column if not exists last_seen_at timestamptz;

-- ── updated_at trigger ───────────────────────────────────────
create trigger project_profiles_set_updated_at
  before update on public.project_profiles
  for each row execute procedure public.set_updated_at();

-- ── Realtime ─────────────────────────────────────────────────
alter publication supabase_realtime add table public.activity_log;
