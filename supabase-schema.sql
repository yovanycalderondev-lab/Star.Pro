-- ============================================================
-- SAMAZIL — Esquema de Supabase
-- Ejecutar completo en: Supabase → tu proyecto → SQL Editor → New query
-- ============================================================

-- ---------- Tabla de perfiles (usuarios) ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nombre text not null,
  email text not null,
  tipo text not null default 'consumidor' check (tipo in ('consumidor','emprendedor')),
  categoria text,
  tarifa_hora numeric,
  bio text,
  ubicacion text,
  avatar_url text,
  rating numeric,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Cualquiera (incluso sin sesión) puede ver el catálogo de profesionales
drop policy if exists "profiles_select_public" on public.profiles;
create policy "profiles_select_public"
  on public.profiles for select
  using ( true );

-- Solo cada usuario puede modificar su propio perfil
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using ( auth.uid() = id )
  with check ( auth.uid() = id );

-- ---------- Perfil automático al registrarse ----------
-- Cuando alguien se registra con supabase.auth.signUp(), este trigger
-- crea automáticamente su fila en "profiles" (evita problemas de RLS
-- si el correo requiere confirmación antes de tener sesión activa).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, nombre, email, tipo)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nombre', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data->>'tipo', 'consumidor')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------- Tabla de mensajes ----------
create table if not exists public.messages (
  id bigint generated always as identity primary key,
  de uuid not null references public.profiles(id) on delete cascade,
  para uuid not null references public.profiles(id) on delete cascade,
  texto text not null,
  created_at timestamptz not null default now()
);

alter table public.messages enable row level security;

drop policy if exists "messages_select_thread" on public.messages;
create policy "messages_select_thread"
  on public.messages for select
  using ( auth.uid() = de or auth.uid() = para );

drop policy if exists "messages_insert_own" on public.messages;
create policy "messages_insert_own"
  on public.messages for insert
  with check ( auth.uid() = de );

-- Habilitar tiempo real para el chat
alter publication supabase_realtime add table public.messages;

-- ---------- Storage: fotos de perfil ----------
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "avatars_select_public" on storage.objects;
create policy "avatars_select_public"
  on storage.objects for select
  using ( bucket_id = 'avatars' );

drop policy if exists "avatars_insert_own" on storage.objects;
create policy "avatars_insert_own"
  on storage.objects for insert
  with check ( bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1] );

drop policy if exists "avatars_update_own" on storage.objects;
create policy "avatars_update_own"
  on storage.objects for update
  using ( bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1] );

drop policy if exists "avatars_delete_own" on storage.objects;
create policy "avatars_delete_own"
  on storage.objects for delete
  using ( bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1] );
