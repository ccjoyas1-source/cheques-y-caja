-- ChequesPro · Esquema de base de datos (Supabase / Postgres)
-- Ejecutar una sola vez en: Supabase Dashboard → SQL Editor → New query → Run

-- Una sola tabla para todas las colecciones. Cada fila es un registro
-- (cheque, cliente, transferencia, ingreso o configuración) guardado como JSON.
create table if not exists public.records (
  collection text not null check (collection in ('checks', 'clients', 'transfers', 'cash_incomes', 'settings')),
  id text not null,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid(),
  primary key (collection, id)
);

create index if not exists records_collection_idx on public.records (collection);

-- Mantener updated_at al día en cada modificación
create or replace function public.touch_records_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$$;

drop trigger if exists records_touch_updated_at on public.records;
create trigger records_touch_updated_at
  before insert or update on public.records
  for each row execute function public.touch_records_updated_at();

-- Seguridad: solo usuarios con sesión iniciada pueden leer o escribir.
-- (Las cuentas de Cristian y María se crean desde Authentication → Users.)
alter table public.records enable row level security;

drop policy if exists "authenticated full access" on public.records;
create policy "authenticated full access" on public.records
  for all to authenticated
  using (true)
  with check (true);

-- Tiempo real: publicar cambios de la tabla para que todos los dispositivos se actualicen al instante
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'records'
  ) then
    alter publication supabase_realtime add table public.records;
  end if;
end;
$$;
