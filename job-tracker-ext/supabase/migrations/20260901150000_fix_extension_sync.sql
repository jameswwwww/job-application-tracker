begin;

alter table public.applications
  add column if not exists tags text[] not null default '{}'::text[];

alter table public.applications
  add column if not exists deleted_at timestamptz;

revoke all on table public.applications from anon;
revoke all on table public.application_status_events from anon;

grant select, insert, update, delete
  on table public.applications
  to authenticated;

grant select, insert, update, delete
  on table public.application_status_events
  to authenticated;

alter table public.applications enable row level security;
alter table public.application_status_events enable row level security;

-- Remove policy names used by earlier SQL-editor versions. PostgreSQL combines
-- permissive policies with OR, so leaving a weaker legacy policy would weaken
-- the canonical policies below.
drop policy if exists "Users can read own applications"
  on public.applications;
drop policy if exists "Users can insert own applications"
  on public.applications;
drop policy if exists "Users can update own applications"
  on public.applications;
drop policy if exists "Users can delete own applications"
  on public.applications;
drop policy if exists "Users can view own applications"
  on public.applications;
drop policy if exists "Users can create own applications"
  on public.applications;

drop policy if exists "Users can read own status events"
  on public.application_status_events;
drop policy if exists "Users can insert own status events"
  on public.application_status_events;
drop policy if exists "Users can update own status events"
  on public.application_status_events;
drop policy if exists "Users can delete own status events"
  on public.application_status_events;
drop policy if exists "Users can view own status events"
  on public.application_status_events;

drop policy if exists "job_tracker_applications_select_own"
  on public.applications;
drop policy if exists "job_tracker_applications_insert_own"
  on public.applications;
drop policy if exists "job_tracker_applications_update_own"
  on public.applications;
drop policy if exists "job_tracker_applications_delete_own"
  on public.applications;

create policy "job_tracker_applications_select_own"
  on public.applications
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "job_tracker_applications_insert_own"
  on public.applications
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "job_tracker_applications_update_own"
  on public.applications
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "job_tracker_applications_delete_own"
  on public.applications
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "job_tracker_status_events_select_own"
  on public.application_status_events;
drop policy if exists "job_tracker_status_events_insert_own"
  on public.application_status_events;
drop policy if exists "job_tracker_status_events_update_own"
  on public.application_status_events;
drop policy if exists "job_tracker_status_events_delete_own"
  on public.application_status_events;

create policy "job_tracker_status_events_select_own"
  on public.application_status_events
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "job_tracker_status_events_insert_own"
  on public.application_status_events
  for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.applications
      where applications.id = application_status_events.application_id
        and applications.user_id = (select auth.uid())
    )
  );

create policy "job_tracker_status_events_update_own"
  on public.application_status_events
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.applications
      where applications.id = application_status_events.application_id
        and applications.user_id = (select auth.uid())
    )
  );

create policy "job_tracker_status_events_delete_own"
  on public.application_status_events
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

notify pgrst, 'reload schema';

commit;
