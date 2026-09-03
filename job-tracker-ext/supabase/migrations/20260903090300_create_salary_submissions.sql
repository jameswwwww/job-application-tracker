begin;

create table if not exists public.salary_submissions (
  id uuid primary key default gen_random_uuid(),
  company text not null check (char_length(trim(company)) between 1 and 200),
  job_title text not null check (char_length(trim(job_title)) between 1 and 200),
  location text check (location is null or char_length(trim(location)) between 1 and 200),
  salary_min numeric(12, 2) not null check (salary_min > 0),
  salary_max numeric(12, 2) not null check (salary_max >= salary_min),
  currency text not null check (currency in ('MYR', 'SGD', 'USD')),
  period text not null check (period in ('hour', 'day', 'month', 'year')),
  created_at timestamptz not null default now()
);

alter table public.salary_submissions enable row level security;

revoke all on public.salary_submissions from anon;
revoke select, update, delete on public.salary_submissions from authenticated;
grant insert on public.salary_submissions to authenticated;

drop policy if exists "Authenticated users can submit anonymous salary ranges"
on public.salary_submissions;

create policy "Authenticated users can submit anonymous salary ranges"
on public.salary_submissions
for insert
to authenticated
with check (true);

notify pgrst, 'reload schema';

commit;
