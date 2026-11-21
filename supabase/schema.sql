-- CodeQuest Supabase PostgreSQL Schema & Row Level Security (RLS)

create extension if not exists "pgcrypto";

-- 1. Users (mirrors auth.users or standalone)
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  created_at timestamptz not null default now()
);

-- 2. Profiles
create table if not exists public.profiles (
  id uuid primary key references public.users(id) on delete cascade,
  username text unique not null,
  name text not null,
  avatar_url text,
  xp integer not null default 0,
  level integer not null default 1,
  level_title text not null default 'Code Rookie',
  preferred_language text not null default 'javascript',
  experience_level text not null default 'Beginner',
  learning_goal text not null default 'Learn programming',
  daily_time text not null default '30 minutes',
  onboarding_completed boolean not null default false,
  adaptive_difficulty text not null default 'Beginner',
  adaptive_note text,
  active_title text not null default 'Code Rookie',
  sound_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

-- 3. Courses (Worlds)
create table if not exists public.courses (
  id text primary key,
  sort_order integer not null,
  title text not null,
  subtitle text not null,
  description text not null,
  required_xp integer not null default 0
);

-- 4. Lessons
create table if not exists public.lessons (
  id text primary key,
  course_id text not null references public.courses(id) on delete cascade,
  sort_order integer not null,
  title text not null,
  concept text not null,
  xp_reward integer not null default 10
);

-- 5. Challenges
create table if not exists public.challenges (
  id text primary key,
  course_id text not null references public.courses(id) on delete cascade,
  title text not null,
  description text not null,
  difficulty text not null,
  topic text not null,
  xp_reward integer not null default 25
);

-- 6. Submissions
create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  challenge_id text not null,
  language text not null,
  code text not null,
  passed boolean not null,
  passed_count integer not null default 0,
  total_count integer not null default 0,
  execution_ms integer not null default 0,
  hints_used integer not null default 0,
  xp_earned integer not null default 0,
  created_at timestamptz not null default now()
);

-- 7. Progress
create table if not exists public.progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  item_type text not null check (item_type in ('lesson', 'challenge', 'boss', 'project')),
  item_id text not null,
  completed_at timestamptz not null default now(),
  unique(user_id, item_type, item_id)
);

-- 8. Achievements
create table if not exists public.achievements (
  id text primary key,
  title text not null,
  description text not null,
  category text not null,
  xp_bonus integer not null default 20
);

-- 9. User Achievements
create table if not exists public.user_achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  achievement_id text not null references public.achievements(id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  unique(user_id, achievement_id)
);

-- 10. Quests
create table if not exists public.quests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  quest_id text not null,
  progress_value integer not null default 0,
  claimed boolean not null default false,
  claimed_at timestamptz,
  unique(user_id, quest_id)
);

-- 11. Streaks
create table if not exists public.streaks (
  user_id uuid primary key references public.users(id) on delete cascade,
  current_streak integer not null default 0,
  longest_streak integer not null default 0,
  total_active_days integer not null default 0,
  last_active_date date
);

-- 12. Leaderboards (View / Materialized summary)
create table if not exists public.leaderboards (
  user_id uuid primary key references public.users(id) on delete cascade,
  username text not null,
  xp integer not null default 0,
  weekly_xp integer not null default 0,
  level integer not null default 1,
  streak integer not null default 0,
  updated_at timestamptz not null default now()
);

-- 13. Projects
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  project_id text not null,
  submitted_code text not null,
  completed_at timestamptz not null default now(),
  unique(user_id, project_id)
);

-- 14. Mistakes
create table if not exists public.mistakes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  challenge_id text not null,
  challenge_title text not null,
  category text not null,
  summary text not null,
  code_snippet text not null,
  recommended_challenge_id text not null,
  resolved boolean not null default false,
  occurrences integer not null default 1,
  created_at timestamptz not null default now()
);

-- 15. Learning Plans
create table if not exists public.learning_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  current_skill text not null,
  goal text not null,
  hours_per_week integer not null,
  deadline text not null,
  plan_json jsonb not null,
  created_at timestamptz not null default now()
);

-- Enable Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.submissions enable row level security;
alter table public.progress enable row level security;
alter table public.user_achievements enable row level security;
alter table public.quests enable row level security;
alter table public.streaks enable row level security;
alter table public.projects enable row level security;
alter table public.mistakes enable row level security;
alter table public.learning_plans enable row level security;

-- RLS Policies (Users access only their own records; public profiles/leaderboards readable)
create policy "Public profiles readable" on public.profiles for select using (true);
create policy "Users update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users view own submissions" on public.submissions for select using (auth.uid() = user_id);
create policy "Users insert own submissions" on public.submissions for insert with check (auth.uid() = user_id);
create policy "Users manage own progress" on public.progress for all using (auth.uid() = user_id);
create policy "Users view own achievements" on public.user_achievements for select using (auth.uid() = user_id);
create policy "Users manage own quests" on public.quests for all using (auth.uid() = user_id);
create policy "Users manage own streaks" on public.streaks for all using (auth.uid() = user_id);
create policy "Users manage own projects" on public.projects for all using (auth.uid() = user_id);
create policy "Users manage own mistakes" on public.mistakes for all using (auth.uid() = user_id);
create policy "Users manage own learning plans" on public.learning_plans for all using (auth.uid() = user_id);
