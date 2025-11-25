create table if not exists public.reminders (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references public.users_wechat(id) on delete cascade,
  title text not null,
  description text,
  icon text,
  all_day boolean not null default false,
  start_date date not null,
  start_time time,
  repeat text not null default 'none',
  repeat_day_of_week int,
  end_repeat text not null default 'never',
  end_date date,
  remind_time time not null,
  notify_enabled boolean not null default false,
  status text not null default 'active',
  next_fire_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_reminders_user_next on public.reminders(user_id, next_fire_at);
create index if not exists idx_reminders_user_status on public.reminders(user_id, status);

create table if not exists public.reminder_subscriptions (
  id uuid default gen_random_uuid() primary key,
  reminder_id uuid not null references public.reminders(id) on delete cascade,
  user_id uuid not null references public.users_wechat(id) on delete cascade,
  template_id text not null,
  authorized_at timestamptz not null,
  send_at timestamptz not null,
  status text not null default 'pending',
  result_code int,
  result_msg text,
  created_at timestamptz default now(),
  unique(reminder_id, send_at)
);

create index if not exists idx_subscriptions_due on public.reminder_subscriptions(status, send_at);

create table if not exists public.reminder_dispatch_log (
  id uuid default gen_random_uuid() primary key,
  reminder_id uuid not null references public.reminders(id) on delete cascade,
  subscription_id uuid references public.reminder_subscriptions(id) on delete set null,
  due_time timestamptz not null,
  sent_at timestamptz,
  status text not null,
  detail text,
  created_at timestamptz default now()
);

create index if not exists idx_dispatch_log_reminder_due on public.reminder_dispatch_log(reminder_id, due_time);

