begin;

-- The extension started syncing user-defined tags, but the cloud schema did
-- not receive the matching column. PostgREST rejects the whole upsert when a
-- payload contains a column that is missing from its schema cache.
alter table public.applications
  add column if not exists tags text[] not null default '{}'::text[];

grant select, insert, update, delete
  on table public.applications
  to authenticated;

grant select, insert, update, delete
  on table public.application_status_events
  to authenticated;

alter table public.applications enable row level security;
alter table public.application_status_events enable row level security;

-- Upserts need SELECT, INSERT and UPDATE access. These policies keep every
-- application scoped to the signed-in Supabase user.
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

-- Status events must belong to both the signed-in user and one of that user's
-- applications. Once the application upsert succeeds, its history can sync.
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

-- Make PostgREST notice the new tags column immediately.
notify pgrst, 'reload schema';

commit;
