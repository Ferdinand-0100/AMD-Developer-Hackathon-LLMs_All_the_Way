-- ============================================================
-- Migration 001: Auth & User System
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- ── profiles table ──────────────────────────────────────────
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  username    text not null unique,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Enforce lowercase, alphanumeric + underscore/hyphen, 3–30 chars
alter table public.profiles
  add constraint profiles_username_format
  check (username ~ '^[a-z0-9_-]{3,30}$');

-- ── Row Level Security ───────────────────────────────────────
alter table public.profiles enable row level security;

-- Anyone can read profiles (needed for username lookup / invite by username)
create policy "profiles_select_public"
  on public.profiles for select
  using (true);

-- Users can only update their own profile
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id);

-- Insert is handled by the trigger below (not directly by the user)
create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

-- ── Auto-create profile on signup ───────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    -- username is passed via raw_user_meta_data during signUp()
    lower(trim(new.raw_user_meta_data ->> 'username'))
  );
  return new;
end;
$$;

-- Drop trigger if it already exists (idempotent re-runs)
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── updated_at auto-update ───────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();
