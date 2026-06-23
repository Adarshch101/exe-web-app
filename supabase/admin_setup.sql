-- Run this in the Supabase SQL Editor to enable the admin dashboard.

-- Profiles table linked to auth.users
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

-- Auto-create profile when a user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'user')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill profiles for existing auth users
insert into public.profiles (id, email, role)
select id, email, 'user'
from auth.users
on conflict (id) do nothing;

-- Admin check helper
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- Profiles RLS
drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "Admins can read all profiles" on public.profiles;
create policy "Admins can read all profiles"
  on public.profiles for select
  using (public.is_admin());

drop policy if exists "Admins can update all profiles" on public.profiles;
create policy "Admins can update all profiles"
  on public.profiles for update
  using (public.is_admin())
  with check (public.is_admin());

-- Secure RPC for admins to change user roles (bypasses RLS safely)
create or replace function public.update_user_role(target_id uuid, new_role text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.profiles;
begin
  if not public.is_admin() then
    raise exception 'Forbidden: admin access required';
  end if;

  if new_role not in ('user', 'admin') then
    raise exception 'Invalid role';
  end if;

  if target_id = auth.uid() and new_role <> 'admin' then
    raise exception 'You cannot remove your own admin role';
  end if;

  update public.profiles
  set role = new_role
  where id = target_id
  returning * into result;

  if result is null then
    raise exception 'User profile not found';
  end if;

  return row_to_json(result);
end;
$$;

grant execute on function public.update_user_role(uuid, text) to authenticated;

-- Todos admin RLS (users keep their existing policies)
drop policy if exists "Admins can read all todos" on public.todos;
create policy "Admins can read all todos"
  on public.todos for select
  using (public.is_admin());

drop policy if exists "Admins can update all todos" on public.todos;
create policy "Admins can update all todos"
  on public.todos for update
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins can delete all todos" on public.todos;
create policy "Admins can delete all todos"
  on public.todos for delete
  using (public.is_admin());

-- Make yourself admin (replace with your email):
-- update public.profiles set role = 'admin' where email = 'your@email.com';
