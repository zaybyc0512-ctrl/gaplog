-- GapLog Phase 1 Initial Schema
-- UTC Timezone Rule enforced

-- 1. Contexts (Backgrounds/Environments like 'School', 'Cram School')
create table contexts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid default auth.uid() not null,
  name text not null,
  color text default '#000000',
  created_at timestamptz default now()
);

-- 2. Categories (Subjects like 'Math', 'English')
create table categories (
  id uuid default gen_random_uuid() primary key,
  context_id uuid references contexts(id) on delete cascade not null,
  name text not null,
  created_at timestamptz default now()
);

-- 3. Task Masters (Defined tasks like 'Blue Chart', 'Textbook A')
create table task_masters (
  id uuid default gen_random_uuid() primary key,
  category_id uuid references categories(id) on delete cascade not null,
  name text not null,
  default_unit text not null, -- e.g. 'page', 'question'
  default_unit_time integer default 10, -- minutes
  created_at timestamptz default now()
);

-- 4. Tasks (Actual instances)
create table tasks (
  id uuid default gen_random_uuid() primary key,
  user_id uuid default auth.uid() not null,
  master_id uuid references task_masters(id) on delete set null, -- nullable for one-off tasks
  title text not null,
  status text default 'todo' check (status in ('todo', 'in_progress', 'done')),
  bucket_type text default 'daily' check (bucket_type in ('daily', 'weekly', 'monthly', 'none')),
  deadline_at timestamptz, -- UTC
  estimated_time integer, -- minutes
  difficulty_level integer check (difficulty_level between 1 and 5),
  completed_at timestamptz,
  deleted_at timestamptz, -- Logical deletion
  created_at timestamptz default now()
);

-- Indexes
create index idx_tasks_user_id on tasks(user_id);
create index idx_tasks_status on tasks(status);
create index idx_tasks_bucket on tasks(bucket_type);

-- RLS Policies
alter table contexts enable row level security;
alter table categories enable row level security;
alter table task_masters enable row level security;
alter table tasks enable row level security;

-- Contexts
create policy "Users can view own contexts" on contexts for select using (auth.uid() = user_id);
create policy "Users can insert own contexts" on contexts for insert with check (auth.uid() = user_id);
create policy "Users can update own contexts" on contexts for update using (auth.uid() = user_id);
create policy "Users can delete own contexts" on contexts for delete using (auth.uid() = user_id);

-- Categories (Check via Context ownership - simplified to accessible context)
-- Since we don't have user_id on categories directly, we check context's user_id or trust the context_id provided.
-- To simplify, we can do join check or add user_id denormalized. 
-- For strict RLS without denormalization:
create policy "Users can view own categories" on categories for select using (
  exists (select 1 from contexts where contexts.id = categories.context_id and contexts.user_id = auth.uid())
);
create policy "Users can insert own categories" on categories for insert with check (
  exists (select 1 from contexts where contexts.id = categories.context_id and contexts.user_id = auth.uid())
);
create policy "Users can update own categories" on categories for update using (
  exists (select 1 from contexts where contexts.id = categories.context_id and contexts.user_id = auth.uid())
);
create policy "Users can delete own categories" on categories for delete using (
  exists (select 1 from contexts where contexts.id = categories.context_id and contexts.user_id = auth.uid())
);

-- Task Masters
create policy "Users can view own masters" on task_masters for select using (
  exists (select 1 from categories join contexts on categories.context_id = contexts.id where categories.id = task_masters.category_id and contexts.user_id = auth.uid())
);
create policy "Users can insert own masters" on task_masters for insert with check (
  exists (select 1 from categories join contexts on categories.context_id = contexts.id where categories.id = task_masters.category_id and contexts.user_id = auth.uid())
);
create policy "Users can update own masters" on task_masters for update using (
  exists (select 1 from categories join contexts on categories.context_id = contexts.id where categories.id = task_masters.category_id and contexts.user_id = auth.uid())
);
create policy "Users can delete own masters" on task_masters for delete using (
  exists (select 1 from categories join contexts on categories.context_id = contexts.id where categories.id = task_masters.category_id and contexts.user_id = auth.uid())
);

-- Tasks
create policy "Users can view own tasks" on tasks for select using (auth.uid() = user_id);
create policy "Users can insert own tasks" on tasks for insert with check (auth.uid() = user_id);
create policy "Users can update own tasks" on tasks for update using (auth.uid() = user_id);
create policy "Users can delete own tasks" on tasks for delete using (auth.uid() = user_id);
