-- Posibles regalos · esquema de Supabase
-- Ejecuta todo este archivo en el SQL Editor de tu proyecto.

-- ============ Tabla ============
create table if not exists public.regalos (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null check (char_length(nombre) between 1 and 200),
  enlace      text,
  foto_url    text,
  nota        text,
  persona     text not null check (persona in ('Norma', 'Martina', 'Edu', 'Papá', 'Mamá')),
  created_at  timestamptz not null default now()
);

create index if not exists regalos_persona_idx on public.regalos (persona, created_at desc);

-- ============ RLS (sin login: rol anon) ============
alter table public.regalos enable row level security;

drop policy if exists "regalos leer"    on public.regalos;
drop policy if exists "regalos insertar" on public.regalos;
drop policy if exists "regalos borrar"  on public.regalos;

create policy "regalos leer"     on public.regalos for select to anon, authenticated using (true);
create policy "regalos insertar" on public.regalos for insert to anon, authenticated with check (true);
create policy "regalos borrar"   on public.regalos for delete to anon, authenticated using (true);

-- ============ Tiempo real ============
-- Para que los DELETE lleguen con todos los campos
alter table public.regalos replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'regalos'
  ) then
    alter publication supabase_realtime add table public.regalos;
  end if;
end $$;

-- ============ Storage: bucket público "fotos" ============
insert into storage.buckets (id, name, public)
values ('fotos', 'fotos', true)
on conflict (id) do update set public = true;

drop policy if exists "fotos leer"    on storage.objects;
drop policy if exists "fotos subir"   on storage.objects;
drop policy if exists "fotos borrar"  on storage.objects;

create policy "fotos leer"   on storage.objects for select to anon, authenticated using (bucket_id = 'fotos');
create policy "fotos subir"  on storage.objects for insert to anon, authenticated with check (bucket_id = 'fotos');
create policy "fotos borrar" on storage.objects for delete to anon, authenticated using (bucket_id = 'fotos');
