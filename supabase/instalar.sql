-- =====================================================================
-- Posibles regalos · instalación completa de Supabase
--
-- Ejecuta TODO este archivo en el SQL Editor (New query → pegar → Run).
-- Sirve para un proyecto vacío o para uno que ya tenga parte montada:
-- no borra datos y se puede ejecutar tantas veces como haga falta.
-- =====================================================================


-- ============ 1. Perfiles ============
create table if not exists public.perfiles (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null check (char_length(btrim(nombre)) between 1 and 40),
  color       text not null default '#c0392b' check (color ~ '^#[0-9a-fA-F]{6}$'),
  foto_url    text,
  orden       int  not null default 0,
  created_at  timestamptz not null default now()
);

-- Perfiles iniciales con ids fijos: aunque se cambie un nombre desde la app,
-- volver a ejecutar este archivo no crea perfiles repetidos ni pisa cambios.
insert into public.perfiles (id, nombre, color, orden) values
  ('00000000-0000-4000-8000-000000000001', 'Norma',   '#c0392b', 1),
  ('00000000-0000-4000-8000-000000000002', 'Martina', '#d35400', 2),
  ('00000000-0000-4000-8000-000000000003', 'Edu',     '#3b6ea5', 3),
  ('00000000-0000-4000-8000-000000000004', 'Papá',    '#5b8a3c', 4),
  ('00000000-0000-4000-8000-000000000005', 'Mamá',    '#8e4b8e', 5)
on conflict (id) do nothing;


-- ============ 2. Regalos ============
create table if not exists public.regalos (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null check (char_length(nombre) between 1 and 200),
  enlace      text,
  foto_url    text,
  nota        text,
  perfil_id   uuid references public.perfiles (id) on delete cascade,
  persona     text,  -- histórico de la primera versión (antes se guardaba el nombre)
  created_at  timestamptz not null default now()
);

-- Por si la tabla ya existía de una versión anterior y le falta alguna columna
alter table public.regalos add column if not exists enlace     text;
alter table public.regalos add column if not exists foto_url   text;
alter table public.regalos add column if not exists nota       text;
alter table public.regalos add column if not exists persona    text;
alter table public.regalos add column if not exists created_at timestamptz not null default now();
alter table public.regalos add column if not exists perfil_id  uuid;

-- Relación regalos → perfiles (solo si aún no existe)
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.regalos'::regclass and contype = 'f'
      and confrelid = 'public.perfiles'::regclass
  ) then
    alter table public.regalos
      add constraint regalos_perfil_id_fkey
      foreign key (perfil_id) references public.perfiles (id) on delete cascade;
  end if;
end $$;

-- "persona" ya no es obligatoria ni tiene lista cerrada de nombres
alter table public.regalos drop constraint if exists regalos_persona_check;
alter table public.regalos alter column persona drop not null;

-- Migra los regalos antiguos (que solo tenían el nombre) a su perfil
update public.regalos set perfil_id = case persona
    when 'Norma'   then '00000000-0000-4000-8000-000000000001'::uuid
    when 'Martina' then '00000000-0000-4000-8000-000000000002'::uuid
    when 'Edu'     then '00000000-0000-4000-8000-000000000003'::uuid
    when 'Papá'    then '00000000-0000-4000-8000-000000000004'::uuid
    when 'Mamá'    then '00000000-0000-4000-8000-000000000005'::uuid
  end
where perfil_id is null and persona is not null;

-- Cada regalo debe tener perfil (si quedara alguno huérfano, se avisa y no se fuerza)
do $$
begin
  if not exists (select 1 from public.regalos where perfil_id is null) then
    alter table public.regalos alter column perfil_id set not null;
  else
    raise notice 'Hay regalos sin perfil: revisa la columna persona antes de hacer perfil_id obligatorio.';
  end if;
end $$;

drop index if exists public.regalos_persona_idx;
create index if not exists regalos_perfil_idx on public.regalos (perfil_id, created_at desc);


-- ============ 3. Seguridad (RLS) · sin login ============
alter table public.perfiles enable row level security;
alter table public.regalos  enable row level security;

-- Perfiles: leer y actualizar
drop policy if exists "perfiles leer"       on public.perfiles;
drop policy if exists "perfiles actualizar" on public.perfiles;
create policy "perfiles leer"       on public.perfiles for select to anon, authenticated using (true);
create policy "perfiles actualizar" on public.perfiles for update to anon, authenticated using (true) with check (true);

-- Regalos: leer, añadir y borrar
drop policy if exists "regalos leer"     on public.regalos;
drop policy if exists "regalos insertar" on public.regalos;
drop policy if exists "regalos borrar"   on public.regalos;
create policy "regalos leer"     on public.regalos for select to anon, authenticated using (true);
create policy "regalos insertar" on public.regalos for insert to anon, authenticated with check (true);
create policy "regalos borrar"   on public.regalos for delete to anon, authenticated using (true);


-- ============ 4. Tiempo real ============
-- replica identity full: los DELETE/UPDATE llegan con todos los campos
alter table public.perfiles replica identity full;
alter table public.regalos  replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'perfiles'
  ) then
    alter publication supabase_realtime add table public.perfiles;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'regalos'
  ) then
    alter publication supabase_realtime add table public.regalos;
  end if;
end $$;


-- ============ 5. Fotos (bucket público "fotos") ============
-- Fotos de regalos en la raíz y fotos de perfil en la carpeta "perfiles/"
insert into storage.buckets (id, name, public)
values ('fotos', 'fotos', true)
on conflict (id) do update set public = true;

drop policy if exists "fotos leer"   on storage.objects;
drop policy if exists "fotos subir"  on storage.objects;
drop policy if exists "fotos borrar" on storage.objects;
create policy "fotos leer"   on storage.objects for select to anon, authenticated using (bucket_id = 'fotos');
create policy "fotos subir"  on storage.objects for insert to anon, authenticated with check (bucket_id = 'fotos');
create policy "fotos borrar" on storage.objects for delete to anon, authenticated using (bucket_id = 'fotos');
