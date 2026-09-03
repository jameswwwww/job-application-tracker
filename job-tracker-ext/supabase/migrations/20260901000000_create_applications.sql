begin;

create table if not exists public.applications (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  company text not null,
  job_title text not null,
  location text,
  salary text,
  job_type text,
  platform text not null,
  job_url text not null default '',
  application_date timestamptz not null,
  status text not null,
  extraction_confidence double precision not null default 0.5,
  application_confidence double precision not null default 0.5,
  source text not null default 'manual',
  extraction_method text not null default 'manual',
  user_confirmed boolean not null default false,
  notes text not null default '',
  tags text[] not null default '{}',
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists applications_user_updated_idx
  on public.applications (user_id, updated_at desc);

alter table public.applications enable row level security;

revoke all on table public.applications from anon;
grant select, insert, update, delete
  on table public.applications
  to authenticated;

commit;
