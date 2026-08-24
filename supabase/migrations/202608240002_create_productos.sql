create table if not exists public.productos (
  id bigint generated always as identity primary key,
  nombre text not null,
  descripcion text,
  precio_costo numeric(12, 2) not null default 0,
  precio_venta numeric(12, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.productos
  add column if not exists descripcion text,
  add column if not exists precio_costo numeric(12, 2) not null default 0,
  add column if not exists precio_venta numeric(12, 2) not null default 0,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'productos_precio_costo_no_negativo'
      and conrelid = 'public.productos'::regclass
  ) then
    alter table public.productos
      add constraint productos_precio_costo_no_negativo check (precio_costo >= 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'productos_precio_venta_no_negativo'
      and conrelid = 'public.productos'::regclass
  ) then
    alter table public.productos
      add constraint productos_precio_venta_no_negativo check (precio_venta >= 0);
  end if;
end
$$;

create or replace function public.actualizar_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists productos_actualizar_updated_at on public.productos;
create trigger productos_actualizar_updated_at
before update on public.productos
for each row
execute function public.actualizar_updated_at();

alter table public.productos enable row level security;

grant select, insert, update, delete on table public.productos to authenticated;
grant usage, select on sequence public.productos_id_seq to authenticated;

drop policy if exists "Usuarios autenticados pueden consultar productos" on public.productos;
create policy "Usuarios autenticados pueden consultar productos"
on public.productos
for select
to authenticated
using (true);

drop policy if exists "Usuarios autenticados pueden crear productos" on public.productos;
create policy "Usuarios autenticados pueden crear productos"
on public.productos
for insert
to authenticated
with check (true);

drop policy if exists "Usuarios autenticados pueden actualizar productos" on public.productos;
create policy "Usuarios autenticados pueden actualizar productos"
on public.productos
for update
to authenticated
using (true)
with check (true);

drop policy if exists "Usuarios autenticados pueden eliminar productos" on public.productos;
create policy "Usuarios autenticados pueden eliminar productos"
on public.productos
for delete
to authenticated
using (true);
