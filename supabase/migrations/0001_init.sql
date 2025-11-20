create table if not exists public.users_wechat (
  id uuid default gen_random_uuid() primary key,
  openid text not null unique,
  unionid text,
  nickname text,
  avatar_url text,
  created_at timestamptz default now(),
  last_login_at timestamptz
);

create table if not exists public.tickets (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references public.users_wechat(id) on delete cascade,
  train_code text not null,
  from_station text not null,
  to_station text,
  start_date date not null,
  depart_time time,
  arrive_time time,
  seat_no text,
  gate text,
  carriage_no text,
  price numeric(10,2),
  source_type text not null default 'manual' check (source_type in ('manual','sms','ocr')),
  raw_sms text,
  raw_ocr_json jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_tickets_user_date on public.tickets(user_id, start_date desc);

create table if not exists public.train_routes_cache (
  train_code text not null,
  depart_date date not null,
  route_json jsonb not null,
  cached_at timestamptz default now(),
  primary key (train_code, depart_date)
);