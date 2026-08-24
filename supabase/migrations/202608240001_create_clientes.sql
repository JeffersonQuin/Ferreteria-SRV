create table if not exists public.clientes (
  id bigint generated always as identity primary key,
  nombre text not null,
  celular text not null,
  created_at timestamptz not null default now()
);

alter table public.clientes enable row level security;

drop policy if exists "Usuarios autenticados pueden consultar clientes" on public.clientes;
create policy "Usuarios autenticados pueden consultar clientes"
on public.clientes
for select
to authenticated
using (true);

drop policy if exists "Usuarios autenticados pueden crear clientes" on public.clientes;
create policy "Usuarios autenticados pueden crear clientes"
on public.clientes
for insert
to authenticated
with check (true);

drop policy if exists "Usuarios autenticados pueden actualizar clientes" on public.clientes;
create policy "Usuarios autenticados pueden actualizar clientes"
on public.clientes
for update
to authenticated
using (true)
with check (true);

drop policy if exists "Usuarios autenticados pueden eliminar clientes" on public.clientes;
create policy "Usuarios autenticados pueden eliminar clientes"
on public.clientes
for delete
to authenticated
using (true);
