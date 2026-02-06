create table daily_capacities (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  date date not null,
  wake_time time,
  sleep_time time,
  available_minutes integer not null default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  unique(user_id, date)
);

alter table daily_capacities enable row level security;

create policy "Users can view their own capacities"
  on daily_capacities for select
  using (auth.uid() = user_id);

create policy "Users can insert their own capacities"
  on daily_capacities for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own capacities"
  on daily_capacities for update
  using (auth.uid() = user_id);

create policy "Users can delete their own capacities"
  on daily_capacities for delete
  using (auth.uid() = user_id);
