-- Space 07A: esquema histórico de ventas y registro transaccional.
-- La interfaz solo puede consultar estas tablas; toda escritura pasa por registrar_venta.

create table if not exists public.ventas (
  id bigint generated always as identity primary key,
  cliente_id bigint references public.clientes (id) on delete set null,
  cliente_nombre text not null,
  cliente_celular text,
  fecha timestamptz not null default now(),
  total numeric(12, 2) not null,
  ganancia_total numeric(12, 2) not null default 0,
  pagado numeric(12, 2) not null default 0,
  estado text not null,
  created_at timestamptz not null default now(),
  constraint ventas_total_no_negativo check (total >= 0),
  constraint ventas_pagado_valido check (pagado >= 0 and pagado <= total),
  constraint ventas_estado_valido check (
    estado in ('Completo', 'Pendiente', 'No pagado')
  )
);

-- Compatibilidad con un esquema previo de ventas documentado antes del Space 07A.
alter table public.ventas
  add column if not exists id bigint generated always as identity,
  add column if not exists cliente_id bigint,
  add column if not exists cliente_nombre text,
  add column if not exists cliente_celular text,
  add column if not exists fecha timestamptz default now(),
  add column if not exists total numeric(12, 2),
  add column if not exists ganancia_total numeric(12, 2) default 0,
  add column if not exists pagado numeric(12, 2) default 0,
  add column if not exists estado text,
  add column if not exists created_at timestamptz default now();

-- Completa snapshots faltantes de ventas antiguas antes de aplicar NOT NULL.
update public.ventas as v
set
  cliente_nombre = coalesce(v.cliente_nombre, c.nombre),
  cliente_celular = coalesce(v.cliente_celular, c.celular)
from public.clientes as c
where v.cliente_id = c.id
  and (v.cliente_nombre is null or v.cliente_celular is null);

update public.ventas
set
  cliente_nombre = coalesce(cliente_nombre, 'Cliente no disponible'),
  fecha = coalesce(fecha, now()),
  total = coalesce(total, 0),
  ganancia_total = coalesce(ganancia_total, 0),
  pagado = coalesce(pagado, 0),
  created_at = coalesce(created_at, now());

-- El contrato actual aplica al total como máximo el monto que realmente se adeuda.
update public.ventas
set pagado = least(greatest(pagado, 0), greatest(total, 0))
where pagado < 0 or pagado > total;

update public.ventas
set estado = case
  when pagado = 0 then 'No pagado'
  when pagado >= total then 'Completo'
  else 'Pendiente'
end
where estado is null
   or estado not in ('Completo', 'Pendiente', 'No pagado');

alter table public.ventas
  alter column id set not null,
  alter column cliente_id drop not null,
  alter column cliente_nombre set not null,
  alter column cliente_celular drop not null,
  alter column fecha set default now(),
  alter column fecha set not null,
  alter column total set not null,
  alter column ganancia_total set default 0,
  alter column ganancia_total set not null,
  alter column pagado set default 0,
  alter column pagado set not null,
  alter column estado set not null,
  alter column created_at set default now(),
  alter column created_at set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.ventas'::regclass
      and contype = 'p'
  ) then
    alter table public.ventas
      add constraint ventas_pkey primary key (id);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.ventas'::regclass
      and conname = 'ventas_cliente_id_fkey'
  ) then
    alter table public.ventas
      add constraint ventas_cliente_id_fkey
      foreign key (cliente_id)
      references public.clientes (id)
      on delete set null;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.ventas'::regclass
      and conname = 'ventas_total_no_negativo'
  ) then
    alter table public.ventas
      add constraint ventas_total_no_negativo check (total >= 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.ventas'::regclass
      and conname = 'ventas_pagado_valido'
  ) then
    alter table public.ventas
      add constraint ventas_pagado_valido
      check (pagado >= 0 and pagado <= total);
  end if;
end
$$;

-- Sustituye el check histórico que solo admitía Completo/Pendiente.
alter table public.ventas drop constraint if exists ventas_estado_check;
alter table public.ventas drop constraint if exists ventas_estado_valido;
alter table public.ventas
  add constraint ventas_estado_valido
  check (estado in ('Completo', 'Pendiente', 'No pagado'));

create table if not exists public.venta_items (
  id bigint generated always as identity primary key,
  venta_id bigint not null references public.ventas (id) on delete cascade,
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
  constraint venta_items_cantidad_positiva check (cantidad > 0),
  constraint venta_items_precio_venta_no_negativo check (
    precio_venta_unitario >= 0
  ),
  constraint venta_items_precio_costo_no_negativo check (
    precio_costo_unitario >= 0
  )
);

alter table public.venta_items
  add column if not exists id bigint generated always as identity,
  add column if not exists venta_id bigint,
  add column if not exists producto_id bigint,
  add column if not exists nombre_producto text,
  add column if not exists cantidad integer,
  add column if not exists precio_venta_unitario numeric(12, 2),
  add column if not exists precio_costo_unitario numeric(12, 2),
  add column if not exists subtotal numeric(12, 2) generated always as
    (cantidad * precio_venta_unitario) stored,
  add column if not exists ganancia_unitaria numeric(12, 2) generated always as
    (precio_venta_unitario - precio_costo_unitario) stored,
  add column if not exists ganancia_subtotal numeric(12, 2) generated always as
    (cantidad * (precio_venta_unitario - precio_costo_unitario)) stored;

-- Si un esquema anterior creó estas columnas como valores ordinarios, se regeneran
-- desde sus datos fuente para que no puedan ser manipuladas directamente.
do $$
begin
  if exists (
    select 1
    from pg_attribute
    where attrelid = 'public.venta_items'::regclass
      and attname = 'subtotal'
      and not attisdropped
      and attgenerated <> 's'
  ) then
    alter table public.venta_items drop column subtotal;
    alter table public.venta_items
      add column subtotal numeric(12, 2) generated always as
        (cantidad * precio_venta_unitario) stored;
  end if;

  if exists (
    select 1
    from pg_attribute
    where attrelid = 'public.venta_items'::regclass
      and attname = 'ganancia_unitaria'
      and not attisdropped
      and attgenerated <> 's'
  ) then
    alter table public.venta_items drop column ganancia_unitaria;
    alter table public.venta_items
      add column ganancia_unitaria numeric(12, 2) generated always as
        (precio_venta_unitario - precio_costo_unitario) stored;
  end if;

  if exists (
    select 1
    from pg_attribute
    where attrelid = 'public.venta_items'::regclass
      and attname = 'ganancia_subtotal'
      and not attisdropped
      and attgenerated <> 's'
  ) then
    alter table public.venta_items drop column ganancia_subtotal;
    alter table public.venta_items
      add column ganancia_subtotal numeric(12, 2) generated always as
        (cantidad * (precio_venta_unitario - precio_costo_unitario)) stored;
  end if;
end
$$;

-- Completa snapshots faltantes de ítems antiguos antes de aplicar NOT NULL.
update public.venta_items as vi
set
  nombre_producto = coalesce(vi.nombre_producto, p.nombre),
  precio_venta_unitario = coalesce(vi.precio_venta_unitario, p.precio_venta),
  precio_costo_unitario = coalesce(vi.precio_costo_unitario, p.precio_costo)
from public.productos as p
where vi.producto_id = p.id
  and (
    vi.nombre_producto is null
    or vi.precio_venta_unitario is null
    or vi.precio_costo_unitario is null
  );

update public.venta_items
set
  nombre_producto = coalesce(nombre_producto, 'Producto no disponible'),
  cantidad = coalesce(cantidad, 1),
  precio_venta_unitario = coalesce(precio_venta_unitario, 0),
  precio_costo_unitario = coalesce(precio_costo_unitario, 0);

alter table public.venta_items
  alter column id set not null,
  alter column venta_id set not null,
  alter column producto_id drop not null,
  alter column nombre_producto set not null,
  alter column cantidad set not null,
  alter column precio_venta_unitario set not null,
  alter column precio_costo_unitario set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.venta_items'::regclass
      and contype = 'p'
  ) then
    alter table public.venta_items
      add constraint venta_items_pkey primary key (id);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.venta_items'::regclass
      and conname = 'venta_items_venta_id_fkey'
  ) then
    alter table public.venta_items
      add constraint venta_items_venta_id_fkey
      foreign key (venta_id)
      references public.ventas (id)
      on delete cascade;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.venta_items'::regclass
      and conname = 'venta_items_producto_id_fkey'
  ) then
    alter table public.venta_items
      add constraint venta_items_producto_id_fkey
      foreign key (producto_id)
      references public.productos (id)
      on delete set null;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.venta_items'::regclass
      and conname = 'venta_items_cantidad_positiva'
  ) then
    alter table public.venta_items
      add constraint venta_items_cantidad_positiva check (cantidad > 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.venta_items'::regclass
      and conname = 'venta_items_precio_venta_no_negativo'
  ) then
    alter table public.venta_items
      add constraint venta_items_precio_venta_no_negativo
      check (precio_venta_unitario >= 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.venta_items'::regclass
      and conname = 'venta_items_precio_costo_no_negativo'
  ) then
    alter table public.venta_items
      add constraint venta_items_precio_costo_no_negativo
      check (precio_costo_unitario >= 0);
  end if;
end
$$;

create index if not exists ventas_cliente_id_idx
  on public.ventas (cliente_id);
create index if not exists ventas_fecha_idx
  on public.ventas (fecha desc);
create index if not exists venta_items_venta_id_idx
  on public.venta_items (venta_id);
create index if not exists venta_items_producto_id_idx
  on public.venta_items (producto_id);

alter table public.ventas enable row level security;
alter table public.venta_items enable row level security;

-- No existe escritura directa para roles cliente. SECURITY DEFINER es la única vía.
revoke all on table public.ventas from public, anon, authenticated;
revoke all on table public.venta_items from public, anon, authenticated;
grant select on table public.ventas to authenticated;
grant select on table public.venta_items to authenticated;

drop policy if exists "Usuarios autenticados pueden consultar ventas"
  on public.ventas;
create policy "Usuarios autenticados pueden consultar ventas"
on public.ventas
for select
to authenticated
using (true);

drop policy if exists "Usuarios autenticados pueden consultar items de venta"
  on public.venta_items;
create policy "Usuarios autenticados pueden consultar items de venta"
on public.venta_items
for select
to authenticated
using (true);

create or replace function public.registrar_venta(
  p_cliente_id bigint,
  p_monto_ingresado numeric,
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
  v_items_consolidados jsonb;
  v_cantidad_consolidada_max numeric;
  v_productos_solicitados integer;
  v_productos_encontrados integer;
  v_precios_invalidos integer;
  v_total numeric;
  v_ganancia_total numeric;
  v_pagado numeric(12, 2);
  v_estado text;
  v_venta public.ventas%rowtype;
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

  if p_monto_ingresado is null
    or p_monto_ingresado < 0
    or p_monto_ingresado > v_limite
    or p_monto_ingresado <> round(p_monto_ingresado, 2)
  then
    raise exception 'El monto ingresado no es válido.'
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
      or jsonb_typeof(v_item -> 'producto_id') <> 'number'
      or jsonb_typeof(v_item -> 'cantidad') <> 'number'
    then
      raise exception 'Cada ítem debe incluir producto_id y cantidad numéricos.'
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
  end loop;

  with items_agrupados as (
    select
      (value ->> 'producto_id')::bigint as producto_id,
      sum((value ->> 'cantidad')::numeric) as cantidad
    from jsonb_array_elements(p_items)
    group by (value ->> 'producto_id')::bigint
  )
  select max(cantidad)
  into v_cantidad_consolidada_max
  from items_agrupados;

  if v_cantidad_consolidada_max > 2147483647 then
    raise exception 'La cantidad consolidada excede el máximo permitido.'
      using errcode = '22003';
  end if;

  with items_agrupados as (
    select
      (value ->> 'producto_id')::bigint as producto_id,
      sum((value ->> 'cantidad')::numeric)::integer as cantidad
    from jsonb_array_elements(p_items)
    group by (value ->> 'producto_id')::bigint
  )
  select jsonb_agg(
    jsonb_build_object(
      'producto_id', producto_id,
      'cantidad', cantidad
    )
    order by producto_id
  )
  into v_items_consolidados
  from items_agrupados;

  select c.nombre, c.celular
  into v_cliente_nombre, v_cliente_celular
  from public.clientes as c
  where c.id = p_cliente_id
  for share of c;

  if not found then
    raise exception 'El cliente seleccionado no existe.'
      using errcode = 'P0002';
  end if;

  v_productos_solicitados := jsonb_array_length(v_items_consolidados);

  -- Mantiene estables nombres y precios hasta terminar todos los inserts.
  perform 1
  from public.productos as p
  join jsonb_to_recordset(v_items_consolidados)
    as i(producto_id bigint, cantidad integer)
    on i.producto_id = p.id
  order by p.id
  for share of p;

  select
    count(*),
    count(*) filter (
      where p.precio_venta is null
        or p.precio_costo is null
        or p.precio_venta < 0
        or p.precio_costo < 0
    )
  into v_productos_encontrados, v_precios_invalidos
  from public.productos as p
  join jsonb_to_recordset(v_items_consolidados)
    as i(producto_id bigint, cantidad integer)
    on i.producto_id = p.id;

  if v_productos_encontrados <> v_productos_solicitados then
    raise exception 'Uno o más productos no existen.'
      using errcode = 'P0002';
  end if;

  if v_precios_invalidos > 0 then
    raise exception 'Uno o más productos tienen precios no válidos.'
      using errcode = '22023';
  end if;

  select
    coalesce(sum(p.precio_venta * i.cantidad), 0),
    coalesce(sum((p.precio_venta - p.precio_costo) * i.cantidad), 0)
  into v_total, v_ganancia_total
  from public.productos as p
  join jsonb_to_recordset(v_items_consolidados)
    as i(producto_id bigint, cantidad integer)
    on i.producto_id = p.id;

  if v_total < 0 or v_total > v_limite then
    raise exception 'El total de la venta excede el máximo permitido.'
      using errcode = '22003';
  end if;

  if v_ganancia_total < -v_limite or v_ganancia_total > v_limite then
    raise exception 'La ganancia de la venta excede el máximo permitido.'
      using errcode = '22003';
  end if;

  if exists (
    select 1
    from public.productos as p
    join jsonb_to_recordset(v_items_consolidados)
      as i(producto_id bigint, cantidad integer)
      on i.producto_id = p.id
    where p.precio_venta * i.cantidad > v_limite
      or abs((p.precio_venta - p.precio_costo) * i.cantidad) > v_limite
  ) then
    raise exception 'Un subtotal de la venta excede el máximo permitido.'
      using errcode = '22003';
  end if;

  v_total := round(v_total, 2);
  v_ganancia_total := round(v_ganancia_total, 2);
  v_pagado := least(p_monto_ingresado, v_total)::numeric(12, 2);

  v_estado := case
    when p_monto_ingresado = 0 then 'No pagado'
    when v_pagado = v_total then 'Completo'
    else 'Pendiente'
  end;

  insert into public.ventas (
    cliente_id,
    cliente_nombre,
    cliente_celular,
    total,
    ganancia_total,
    pagado,
    estado
  )
  values (
    p_cliente_id,
    v_cliente_nombre,
    v_cliente_celular,
    v_total::numeric(12, 2),
    v_ganancia_total::numeric(12, 2),
    v_pagado,
    v_estado
  )
  returning * into v_venta;

  insert into public.venta_items (
    venta_id,
    producto_id,
    nombre_producto,
    cantidad,
    precio_venta_unitario,
    precio_costo_unitario
  )
  select
    v_venta.id,
    p.id,
    p.nombre,
    i.cantidad,
    p.precio_venta,
    p.precio_costo
  from public.productos as p
  join jsonb_to_recordset(v_items_consolidados)
    as i(producto_id bigint, cantidad integer)
    on i.producto_id = p.id
  order by p.id;

  select coalesce(
    jsonb_agg(to_jsonb(vi) order by vi.id),
    '[]'::jsonb
  )
  into v_items_respuesta
  from public.venta_items as vi
  where vi.venta_id = v_venta.id;

  return jsonb_build_object(
    'venta', to_jsonb(v_venta),
    'cliente', jsonb_build_object(
      'id', p_cliente_id,
      'nombre', v_cliente_nombre,
      'celular', v_cliente_celular
    ),
    'items', v_items_respuesta,
    'total', v_venta.total,
    'ganancia_total', v_venta.ganancia_total,
    'pagado', v_venta.pagado,
    'estado', v_venta.estado,
    'fecha', v_venta.fecha
  );
end;
$$;

revoke all on function public.registrar_venta(bigint, numeric, jsonb)
  from public, anon, authenticated;
grant execute on function public.registrar_venta(bigint, numeric, jsonb)
  to authenticated;
