-- DAY 1: Foundation schema for H4CK3D Builder

-- 1) Profiles table (auto-created on signup)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create policy "Profiles are viewable by everyone"
  on public.profiles for select using (true);
create policy "Users can insert their own profile"
  on public.profiles for insert with check (auth.uid() = id);
create policy "Users can update their own profile"
  on public.profiles for update using (auth.uid() = id);

-- 2) Roles (separate table, security definer fn)
create type public.app_role as enum ('admin', 'moderator', 'user');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

create policy "Users can view their own roles"
  on public.user_roles for select using (auth.uid() = user_id);
create policy "Admins can view all roles"
  on public.user_roles for select using (public.has_role(auth.uid(), 'admin'));
create policy "Admins can manage roles"
  on public.user_roles for all using (public.has_role(auth.uid(), 'admin'));

-- 3) Projects
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  slug text not null,
  visibility text not null default 'private' check (visibility in ('private','unlisted','public')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, slug)
);
alter table public.projects enable row level security;

create policy "Owners can view their projects"
  on public.projects for select using (auth.uid() = owner_id);
create policy "Public projects are viewable by everyone"
  on public.projects for select using (visibility = 'public');
create policy "Owners can insert their projects"
  on public.projects for insert with check (auth.uid() = owner_id);
create policy "Owners can update their projects"
  on public.projects for update using (auth.uid() = owner_id);
create policy "Owners can delete their projects"
  on public.projects for delete using (auth.uid() = owner_id);

create index projects_owner_idx on public.projects(owner_id, updated_at desc);

-- 4) Builds (iteration tree)
create table public.builds (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  parent_build_id uuid references public.builds(id) on delete set null,
  prompt text not null,
  html text not null default '',
  model text not null default 'flash',
  tokens_in integer,
  tokens_out integer,
  created_at timestamptz not null default now()
);
alter table public.builds enable row level security;

create policy "Owners can view their builds"
  on public.builds for select using (auth.uid() = owner_id);
create policy "Builds of public projects are viewable"
  on public.builds for select using (
    exists (select 1 from public.projects p where p.id = project_id and p.visibility = 'public')
  );
create policy "Owners can insert their builds"
  on public.builds for insert with check (auth.uid() = owner_id);
create policy "Owners can update their builds"
  on public.builds for update using (auth.uid() = owner_id);
create policy "Owners can delete their builds"
  on public.builds for delete using (auth.uid() = owner_id);

create index builds_project_idx on public.builds(project_id, created_at desc);

-- 5) Helper: updated_at trigger
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end$$;

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();
create trigger projects_touch before update on public.projects
  for each row execute function public.touch_updated_at();

-- 6) Auto-create profile + default 'user' role on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role)
  values (new.id, 'user')
  on conflict do nothing;

  return new;
end$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();