-- ============================================================
-- Migration 002: Projects, Members & Notifications
-- Run this in your Supabase SQL Editor after migration 001
-- If you already ran a broken version, run the cleanup block
-- at the bottom first.
-- ============================================================

-- ── Cleanup (run this if you already ran a broken version) ───
drop policy if exists "projects_select_member"      on public.projects;
drop policy if exists "projects_insert_auth"        on public.projects;
drop policy if exists "projects_update_owner"       on public.projects;
drop policy if exists "projects_delete_owner"       on public.projects;
drop policy if exists "project_members_select"      on public.project_members;
drop policy if exists "project_members_insert_owner" on public.project_members;
drop policy if exists "project_members_update_own"  on public.project_members;
drop policy if exists "project_members_delete"      on public.project_members;
drop policy if exists "notifications_select_own"    on public.notifications;
drop policy if exists "notifications_insert_auth"   on public.notifications;
drop policy if exists "notifications_update_own"    on public.notifications;
drop policy if exists "notifications_delete_own"    on public.notifications;
drop trigger if exists projects_set_updated_at      on public.projects;
drop function if exists public.is_project_member(uuid, uuid);

drop table if exists public.notifications;
drop table if exists public.project_members;
drop table if exists public.projects;

-- ── 1. Create tables ─────────────────────────────────────────

create table public.projects (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  owner_id    uuid not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.project_members (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  role        text not null default 'Member',
  status      text not null default 'active'
                check (status in ('active', 'invited', 'declined')),
  joined_at   timestamptz not null default now(),
  unique (project_id, user_id)
);

create table public.notifications (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  type         text not null check (type in ('project_invite', 'ping')),
  project_id   uuid references public.projects (id) on delete cascade,
  role         text,
  sender_id    uuid references public.profiles (id) on delete set null,
  message      text,
  read         boolean not null default false,
  created_at   timestamptz not null default now()
);

-- ── 2. Helper function (security definer breaks RLS recursion) ─

-- This function bypasses RLS intentionally — it is only used
-- inside other RLS policies to check membership without
-- triggering the policy on project_members again.
create or replace function public.is_project_member(p_project_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.project_members
    where project_id = p_project_id
      and user_id    = p_user_id
      and status     = 'active'
  );
$$;

-- ── 3. Enable RLS ────────────────────────────────────────────

alter table public.projects        enable row level security;
alter table public.project_members enable row level security;
alter table public.notifications   enable row level security;

-- ── 4. projects policies ─────────────────────────────────────

create policy "projects_select_member"
  on public.projects for select
  using ( public.is_project_member(id, auth.uid()) );

create policy "projects_insert_auth"
  on public.projects for insert
  with check ( owner_id = auth.uid() );

create policy "projects_update_owner"
  on public.projects for update
  using ( owner_id = auth.uid() );

create policy "projects_delete_owner"
  on public.projects for delete
  using ( owner_id = auth.uid() );

-- ── 5. project_members policies ──────────────────────────────
-- No self-referencing subqueries here — recursion is gone.

-- A user can see their own rows, or rows in projects they're active in
-- (uses the security definer function, not a subquery on this table)
create policy "project_members_select"
  on public.project_members for select
  using (
    user_id = auth.uid()
    or public.is_project_member(project_id, auth.uid())
  );

-- Owner inserts members; users can also insert themselves (owner row on creation)
create policy "project_members_insert"
  on public.project_members for insert
  with check (
    user_id = auth.uid()
    or exists (
      select 1 from public.projects p
      where p.id = project_id
        and p.owner_id = auth.uid()
    )
  );

-- Users accept/decline their own invite
create policy "project_members_update_own"
  on public.project_members for update
  using ( user_id = auth.uid() );

-- Members leave; owners remove others
create policy "project_members_delete"
  on public.project_members for delete
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.projects p
      where p.id = project_id
        and p.owner_id = auth.uid()
    )
  );

-- ── 6. notifications policies ────────────────────────────────

create policy "notifications_select_own"
  on public.notifications for select
  using ( user_id = auth.uid() );

create policy "notifications_insert_auth"
  on public.notifications for insert
  with check ( auth.uid() is not null );

create policy "notifications_update_own"
  on public.notifications for update
  using ( user_id = auth.uid() );

create policy "notifications_delete_own"
  on public.notifications for delete
  using ( user_id = auth.uid() );

-- ── 7. updated_at trigger ────────────────────────────────────

create trigger projects_set_updated_at
  before update on public.projects
  for each row execute procedure public.set_updated_at();

-- ── 8. create_project function (atomic, bypasses RLS) ───────
-- Called from the server action. Runs as definer so RLS on
-- projects/project_members doesn't block the bootstrap inserts.

create or replace function public.create_project(
  p_name       text,
  p_owner_id   uuid,
  p_members    jsonb   -- array of {username, role}
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project_id uuid;
  v_member     jsonb;
  v_profile_id uuid;
begin
  -- 1. Insert the project
  insert into public.projects (name, owner_id)
  values (p_name, p_owner_id)
  returning id into v_project_id;

  -- 2. Add owner as active member
  insert into public.project_members (project_id, user_id, role, status)
  values (v_project_id, p_owner_id, 'Owner', 'active');

  -- 3. Invite each member
  for v_member in select * from jsonb_array_elements(p_members)
  loop
    -- Resolve username → id
    select id into v_profile_id
    from public.profiles
    where username = lower(trim(v_member->>'username'));

    if v_profile_id is null or v_profile_id = p_owner_id then
      continue;
    end if;

    -- Insert invited member row
    insert into public.project_members (project_id, user_id, role, status)
    values (
      v_project_id,
      v_profile_id,
      coalesce(nullif(trim(v_member->>'role'), ''), 'Member'),
      'invited'
    )
    on conflict (project_id, user_id) do nothing;

    -- Send notification
    insert into public.notifications (user_id, type, project_id, role, sender_id)
    values (
      v_profile_id,
      'project_invite',
      v_project_id,
      coalesce(nullif(trim(v_member->>'role'), ''), 'Member'),
      p_owner_id
    );
  end loop;

  return v_project_id;
end;
$$;

-- ── 9. Realtime ──────────────────────────────────────────────

alter publication supabase_realtime add table public.notifications;
