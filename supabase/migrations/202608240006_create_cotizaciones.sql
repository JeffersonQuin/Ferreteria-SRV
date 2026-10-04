-- Spec 019: cotizaciones (propuesta de precios, sin pago ni descuento).
-- La interfaz solo puede consultar estas tablas; toda escritura pasa por registrar_cotizacion.

create table if not exists public.cotizaciones (
  id bigint generated always as identity primary key,
  cliente_id bigint references public.clientes (id) on delete set null,
  cliente_nombre text not null,
  cliente_celular text,
  fecha timestamptz not null default now(),
  total numeric(12, 2) not null,
  ganancia_total numeric(12, 2) not null default 0,
  created_at timestamptz not null default now(),
  constraint cotizaciones_total_no_negativo check (total >= 0)
);

create table if not exists public.cotizacion_items (
  id bigint generated always as identity primary key,
  cotizacion_id bigint not null
    references public.cotizaciones (id) on delete cascade,
  producto_id bigint references public.productos (id) on delete set null,
  nombre_producto text not null,
  cantidad integer not null,
  precio_venta_unitario numeric(12, 2) not null,
  precio_costo_unitario numeric(12, 2) not null,
  subtotal numeric(12, 2) generated always as
    (cantidad * precio_venta_unitario) stored,
  ganancia_unitaria numeric(12, 2) generated always as
    (precio_venta_unitario - precio_costo_unitario) stored,
  ganancia_subtotal numeric(12, 2) generated always as
    (cantidad * (precio_venta_unitario - precio_costo_unitario)) stored,
  constraint cotizacion_items_cantidad_positiva check (cantidad > 0),
  constraint cotizacion_items_precio_venta_no_negativo check (
    precio_venta_unitario >= 0
  ),
  constraint cotizacion_items_precio_costo_no_negativo check (
    precio_costo_unitario >= 0
  )
);

create index if not exists cotizaciones_cliente_id_idx
  on public.cotizaciones (cliente_id);
create index if not exists cotizaciones_fecha_idx
  on public.cotizaciones (fecha desc);
create index if not exists cotizacion_items_cotizacion_id_idx
  on public.cotizacion_items (cotizacion_id);
create index if not exists cotizacion_items_producto_id_idx
  on public.cotizacion_items (producto_id);

alter table public.cotizaciones enable row level security;
alter table public.cotizacion_items enable row level security;

-- Sin escritura directa para roles cliente. SECURITY DEFINER es la única vía.
revoke all on table public.cotizaciones from public, anon, authenticated;
revoke all on table public.cotizacion_items from public, anon, authenticated;
grant select on table public.cotizaciones to authenticated;
grant select on table public.cotizacion_items to authenticated;

drop policy if exists "Usuarios autenticados pueden consultar cotizaciones"
  on public.cotizaciones;
create policy "Usuarios autenticados pueden consultar cotizaciones"
on public.cotizaciones
for select
to authenticated
using (true);

drop policy if exists "Usuarios autenticados pueden consultar items de cotizacion"
  on public.cotizacion_items;
create policy "Usuarios autenticados pueden consultar items de cotizacion"
on public.cotizacion_items
for select
to authenticated
using (true);

create or replace function public.registrar_cotizacion(
  p_cliente_id bigint,
  p_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_cliente_nombre text;
  v_cliente_celular text;
  v_item jsonb;
  v_productos_solicitados integer;
  v_productos_encontrados integer;
  v_total numeric;
  v_ganancia_total numeric;
  v_cotizacion public.cotizaciones%rowtype;
  v_items_respuesta jsonb;
  v_limite constant numeric := 9999999999.99;
begin
  if auth.uid() is null then
    raise exception 'Se requiere una sesión autenticada.'
      using errcode = '42501';
  end if;

  if p_cliente_id is null or p_cliente_id <= 0 then
    raise exception 'El cliente no es válido.'
      using errcode = '22023';
  end if;

  if p_items is null
    or jsonb_typeof(p_items) <> 'array'
    or jsonb_array_length(p_items) = 0
  then
    raise exception 'Debe incluir al menos un producto.'
      using errcode = '22023';
  end if;

  for v_item in
    select value from jsonb_array_elements(p_items)
  loop
    if jsonb_typeof(v_item) <> 'object'
      or not (v_item ? 'producto_id')
      or not (v_item ? 'cantidad')
      or not (v_item ? 'precio_venta_unitario')
      or jsonb_typeof(v_item -> 'producto_id') <> 'number'
      or jsonb_typeof(v_item -> 'cantidad') <> 'number'
      or jsonb_typeof(v_item -> 'precio_venta_unitario') <> 'number'
    then
      raise exception
        'Cada ítem debe incluir producto_id, cantidad y precio_venta_unitario numéricos.'
        using errcode = '22023';
    end if;

    if (v_item ->> 'producto_id')::numeric <= 0
      or (v_item ->> 'producto_id')::numeric > 9223372036854775807
      or trunc((v_item ->> 'producto_id')::numeric)
        <> (v_item ->> 'producto_id')::numeric
    then
      raise exception 'Cada producto_id debe ser un entero positivo válido.'
        using errcode = '22023';
    end if;

    if (v_item ->> 'cantidad')::numeric <= 0
      or (v_item ->> 'cantidad')::numeric > 2147483647
      or trunc((v_item ->> 'cantidad')::numeric)
        <> (v_item ->> 'cantidad')::numeric
    then
      raise exception 'Cada cantidad debe ser un entero positivo.'
        using errcode = '22023';
    end if;

    if (v_item ->> 'precio_venta_unitario')::numeric < 0
      or (v_item ->> 'precio_venta_unitario')::numeric > v_limite
      or (v_item ->> 'precio_venta_unitario')::numeric
        <> round((v_item ->> 'precio_venta_unitario')::numeric, 2)
    then
      raise exception 'Cada precio de venta debe ser válido (máximo 2 decimales).'
        using errcode = '22023';
    end if;
  end loop;

  select c.nombre, c.celular
  into v_cliente_nombre, v_cliente_celular
  from public.clientes as c
  where c.id = p_cliente_id
  for share of c;

  if not found then
    raise exception 'El cliente seleccionado no existe.'
      using errcode = 'P0002';
  end if;

  select count(distinct (value ->> 'producto_id')::bigint)
  into v_productos_solicitados
  from jsonb_array_elements(p_items);

  -- Mantiene estables nombres y costos hasta terminar los inserts.
  perform 1
  from public.productos as p
  where p.id in (
    select (value ->> 'producto_id')::bigint
    from jsonb_array_elements(p_items)
  )
  order by p.id
  for share of p;

  select count(*)
  into v_productos_encontrados
  from public.productos as p
  where p.id in (
    select (value ->> 'producto_id')::bigint
    from jsonb_array_elements(p_items)
  );

  if v_productos_encontrados <> v_productos_solicitados then
    raise exception 'Uno o más productos no existen.'
      using errcode = 'P0002';
  end if;

  -- El precio de venta lo define el usuario; el costo siempre sale del catálogo.
  select
    coalesce(sum(
      (e.value ->> 'precio_venta_unitario')::numeric
      * (e.value ->> 'cantidad')::numeric
    ), 0),
    coalesce(sum(
      ((e.value ->> 'precio_venta_unitario')::numeric - p.precio_costo)
      * (e.value ->> 'cantidad')::numeric
    ), 0)
  into v_total, v_ganancia_total
  from jsonb_array_elements(p_items) as e(value)
  join public.productos as p
    on p.id = (e.value ->> 'producto_id')::bigint;

  if v_total < 0 or v_total > v_limite then
    raise exception 'El total de la cotización excede el máximo permitido.'
      using errcode = '22003';
  end if;

  if v_ganancia_total < -v_limite or v_ganancia_total > v_limite then
    raise exception 'La ganancia de la cotización excede el máximo permitido.'
      using errcode = '22003';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_items) as e(value)
    join public.productos as p
      on p.id = (e.value ->> 'producto_id')::bigint
    where (e.value ->> 'precio_venta_unitario')::numeric
          * (e.value ->> 'cantidad')::numeric > v_limite
      or abs(
        ((e.value ->> 'precio_venta_unitario')::numeric - p.precio_costo)
        * (e.value ->> 'cantidad')::numeric
      ) > v_limite
  ) then
    raise exception 'Un subtotal de la cotización excede el máximo permitido.'
      using errcode = '22003';
  end if;

  insert into public.cotizaciones (
    cliente_id,
    cliente_nombre,
    cliente_celular,
    total,
    ganancia_total
  )
  values (
    p_cliente_id,
    v_cliente_nombre,
    v_cliente_celular,
    round(v_total, 2)::numeric(12, 2),
    round(v_ganancia_total, 2)::numeric(12, 2)
  )
  returning * into v_cotizacion;

  insert into public.cotizacion_items (
    cotizacion_id,
    producto_id,
    nombre_producto,
    cantidad,
    precio_venta_unitario,
    precio_costo_unitario
  )
  select
    v_cotizacion.id,
    p.id,
    p.nombre,
    (e.value ->> 'cantidad')::integer,
    round((e.value ->> 'precio_venta_unitario')::numeric, 2),
    p.precio_costo
  from jsonb_array_elements(p_items) with ordinality as e(value, ord)
  join public.productos as p
    on p.id = (e.value ->> 'producto_id')::bigint
  order by e.ord;

  select coalesce(
    jsonb_agg(to_jsonb(ci) order by ci.id),
    '[]'::jsonb
  )
  into v_items_respuesta
  from public.cotizacion_items as ci
  where ci.cotizacion_id = v_cotizacion.id;

  return jsonb_build_object(
    'cotizacion', to_jsonb(v_cotizacion),
    'cliente', jsonb_build_object(
      'id', p_cliente_id,
      'nombre', v_cliente_nombre,
      'celular', v_cliente_celular
    ),
    'items', v_items_respuesta,
    'total', v_cotizacion.total,
    'ganancia_total', v_cotizacion.ganancia_total,
    'fecha', v_cotizacion.fecha
  );
end;
$$;

revoke all on function public.registrar_cotizacion(bigint, jsonb)
  from public, anon, authenticated;
grant execute on function public.registrar_cotizacion(bigint, jsonb)
  to authenticated;
