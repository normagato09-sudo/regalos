-- Posibles regalos · perfiles editables
-- Ejecuta este archivo DESPUÉS de schema.sql. Se puede ejecutar varias veces:
-- no borra datos y no duplica perfiles.

-- ============ Tabla de perfiles ============
create table if not exists public.perfiles (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null check (char_length(btrim(nombre)) between 1 and 40),
  color       text not null default '#c0392b' check (color ~ '^#[0-9a-fA-F]{6}$'),
  foto_url    text,
  orden       int  not null default 0,
  created_at  timestamptz not null default now()
);

-- Perfiles iniciales con ids fijos: si alguien cambia un nombre y se vuelve
-- a ejecutar este archivo, no se crea un perfil repetido.
insert into public.perfiles (id, nombre, color, orden) values
  ('00000000-0000-4000-8000-000000000001', 'Norma',   '#c0392b', 1),
  ('00000000-0000-4000-8000-000000000002', 'Martina', '#d35400', 2),
  ('00000000-0000-4000-8000-000000000003', 'Edu',     '#3b6ea5', 3),
  ('00000000-0000-4000-8000-000000000004', 'Papá',    '#5b8a3c', 4),
  ('00000000-0000-4000-8000-000000000005', 'Mamá',    '#8e4b8e', 5)
on conflict (id) do nothing;

-- ============ Regalos → perfil por id ============
alter table public.regalos
  add column if not exists perfil_id uuid references public.perfiles (id) on delete cascade;

-- Migra los regalos existentes (por el nombre antiguo, que no se ha tocado nunca)
update public.regalos set perfil_id = case persona
    when 'Norma'   then '00000000-0000-4000-8000-000000000001'::uuid
    when 'Martina' then '00000000-0000-4000-8000-000000000002'::uuid
    when 'Edu'     then '00000000-0000-4000-8000-000000000003'::uuid
    when 'Papá'    then '00000000-0000-4000-8000-000000000004'::uuid
    when 'Mamá'    then '00000000-0000-4000-8000-000000000005'::uuid
  end
where perfil_id is null;

-- La columna "persona" se conserva como histórico, pero deja de ser obligatoria
alter table public.regalos drop constraint if exists regalos_persona_check;
alter table public.regalos alter column persona drop not null;

do $$
begin
  if not exists (select 1 from public.regalos where perfil_id is null) then
    alter table public.regalos alter column perfil_id set not null;
  else
    raise notice 'Hay regalos sin perfil: revisa la columna persona antes de hacer perfil_id obligatorio.';
  end if;
end $$;

create index if not exists regalos_perfil_idx on public.regalos (perfil_id, created_at desc);

-- ============ RLS de perfiles (sin login) ============
alter table public.perfiles enable row level security;

drop policy if exists "perfiles leer"      on public.perfiles;
drop policy if exists "perfiles actualizar" on public.perfiles;

create policy "perfiles leer"       on public.perfiles for select to anon, authenticated using (true);
create policy "perfiles actualizar" on public.perfiles for update to anon, authenticated using (true) with check (true);

-- ============ Tiempo real ============
alter table public.perfiles replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'perfiles'
  ) then
    alter publication supabase_realtime add table public.perfiles;
  end if;
end $$;

-- ============ Fotos de perfil ============
-- Van al bucket "fotos" en la carpeta "perfiles/". Las políticas de schema.sql
-- (leer, subir y borrar en el bucket "fotos") ya cubren esa carpeta.
