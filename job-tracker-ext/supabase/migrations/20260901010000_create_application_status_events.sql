begin;

create table if not exists public.application_status_events (
  id uuid primary key,
  application_id uuid not null
    references public.applications(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null check (
    status in (
      'Saved',
      'Applied',
      'Assessment',
      'Interview',
      'Offer',
      'Rejected',
      'Withdrawn'
    )
  ),
  source text not null check (source in ('manual', 'automatic', 'migration')),
  occurred_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists application_status_events_user_application_idx
  on public.application_status_events (user_id, application_id, occurred_at);

alter table public.application_status_events enable row level security;

revoke all on table public.application_status_events from anon;
grant select, insert, update, delete
  on table public.application_status_events
  to authenticated;

commit;
