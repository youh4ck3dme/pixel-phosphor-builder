-- ============ Snapshots table (Day 6) ============
create table public.snapshots (
  id uuid primary key default gen_random_uuid(),
  build_id uuid not null references public.builds(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  owner_id uuid not null,
  label text not null,
  note text,
  created_at timestamp with time zone not null default now()
);

create index idx_snapshots_project on public.snapshots(project_id);
create index idx_snapshots_owner on public.snapshots(owner_id);

alter table public.snapshots enable row level security;

create policy "Owners can view their snapshots"
  on public.snapshots for select
  using (auth.uid() = owner_id);

create policy "Snapshots of public projects are viewable"
  on public.snapshots for select
  using (
    exists (
      select 1 from public.projects p
      where p.id = snapshots.project_id
        and p.visibility in ('public','unlisted')
    )
  );

create policy "Owners can insert snapshots"
  on public.snapshots for insert
  with check (auth.uid() = owner_id);

create policy "Owners can update their snapshots"
  on public.snapshots for update
  using (auth.uid() = owner_id);

create policy "Owners can delete their snapshots"
  on public.snapshots for delete
  using (auth.uid() = owner_id);

-- ============ Day 7: extend public visibility to "unlisted" ============
drop policy if exists "Public projects are viewable by everyone" on public.projects;
create policy "Public or unlisted projects are viewable"
  on public.projects for select
  using (visibility in ('public','unlisted'));

drop policy if exists "Builds of public projects are viewable" on public.builds;
create policy "Builds of public or unlisted projects are viewable"
  on public.builds for select
  using (
    exists (
      select 1 from public.projects p
      where p.id = builds.project_id
        and p.visibility in ('public','unlisted')
    )
  );
