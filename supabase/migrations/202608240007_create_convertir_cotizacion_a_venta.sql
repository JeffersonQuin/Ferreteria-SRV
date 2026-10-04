-- Spec 020: conversión de una cotización en venta.
-- La interfaz solo consulta cotizaciones; la conversión pasa por esta RPC atómica.

alter table public.cotizaciones
  add column if not exists venta_id bigint
    references public.ventas (id) on delete set null;

create index if not exists cotizaciones_venta_id_idx
  on public.cotizaciones (venta_id);

-- Asegura la columna descuento (también la crea la migración de editar_venta).
alter table public.ventas
  add column if not exists descuento numeric(12, 2) not null default 0;

create or replace function public.convertir_cotizacion_a_venta(
  p_cotizacion_id bigint,
  p_monto_ingresado numeric,
  p_descuento numeric default 0
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_cotizacion public.cotizaciones%rowtype;
  v_total_bruto numeric;
  v_ganancia_bruta numeric;
  v_total numeric;
  v_ganancia_total numeric;
  v_pagado numeric(12, 2);
  v_estado text;
  v_venta public.ventas%rowtype;
  v_items_respuesta jsonb;
  v_items_count integer;
  v_limite constant numeric := 9999999999.99;
begin
  if auth.uid() is null then
    raise exception 'Se requiere una sesión autenticada.'
      using errcode = '42501';
  end if;

  if p_cotizacion_id is null or p_cotizacion_id <= 0 then
    raise exception 'La cotización no es válida.'
      using errcode = '22023';
  end if;

  if p_monto_ingresado is null
    or p_monto_ingresado::text in ('NaN', 'Infinity', '-Infinity')
    or p_monto_ingresado < 0
    or p_monto_ingresado > v_limite
    or p_monto_ingresado <> round(p_monto_ingresado, 2)
  then
    raise exception 'El monto ingresado no es válido.'
      using errcode = '22023';
  end if;

  p_descuento := coalesce(p_descuento, 0);

  if p_descuento::text in ('NaN', 'Infinity', '-Infinity')
    or p_descuento < 0
    or p_descuento > v_limite
    or p_descuento <> round(p_descuento, 2)
  then
    raise exception 'El descuento no es válido.'
      using errcode = '22023';
  end if;

  -- Bloquea la cotización para impedir conversiones concurrentes o duplicadas.
  select c.*
  into v_cotizacion
  from public.cotizaciones as c
  where c.id = p_cotizacion_id
  for update of c;

  if not found then
    raise exception 'La cotización seleccionada no existe.'
      using errcode = 'P0002';
  end if;

  if v_cotizacion.venta_id is not null then
    raise exception 'La cotización ya fue convertida en una venta.'
      using errcode = 'P0001';
  end if;

  select count(*)
  into v_items_count
  from public.cotizacion_items as ci
  where ci.cotizacion_id = v_cotizacion.id;

  if v_items_count = 0 then
    raise exception 'La cotización no tiene productos.'
      using errcode = '22023';
  end if;

  -- Mantiene estables los costos del catálogo hasta terminar los inserts.
  perform 1
  from public.productos as p
  where p.id in (
    select ci.producto_id
    from public.cotizacion_items as ci
    where ci.cotizacion_id = v_cotizacion.id
      and ci.producto_id is not null
  )
  order by p.id
  for share of p;

  -- El precio de venta es el cotizado; el costo sale del catálogo actual y,
  -- si el producto ya no existe, del costo guardado en la cotización.
  select
    coalesce(sum(ci.cantidad * ci.precio_venta_unitario), 0),
    coalesce(sum(
      ci.cantidad * (
        ci.precio_venta_unitario
        - coalesce(p.precio_costo, ci.precio_costo_unitario)
      )
    ), 0)
  into v_total_bruto, v_ganancia_bruta
  from public.cotizacion_items as ci
  left join public.productos as p
    on p.id = ci.producto_id
  where ci.cotizacion_id = v_cotizacion.id;

  if v_total_bruto < 0 or v_total_bruto > v_limite then
    raise exception 'El total de la venta excede el máximo permitido.'
      using errcode = '22003';
  end if;

  if p_descuento > v_total_bruto then
    raise exception 'El descuento no puede superar el total.'
      using errcode = '22023';
  end if;

  v_total := greatest(round(v_total_bruto - p_descuento, 2), 0);
  -- La ganancia refleja el precio realmente cobrado (después del descuento).
  v_ganancia_total := round(v_ganancia_bruta - p_descuento, 2);

  if v_ganancia_total < -v_limite or v_ganancia_total > v_limite then
    raise exception 'La ganancia de la venta excede el máximo permitido.'
      using errcode = '22003';
  end if;

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
    descuento,
    ganancia_total,
    pagado,
    estado
  )
  values (
    v_cotizacion.cliente_id,
    v_cotizacion.cliente_nombre,
    v_cotizacion.cliente_celular,
    v_total::numeric(12, 2),
    p_descuento::numeric(12, 2),
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
    ci.producto_id,
    ci.nombre_producto,
    ci.cantidad,
    ci.precio_venta_unitario,
    coalesce(p.precio_costo, ci.precio_costo_unitario)
  from public.cotizacion_items as ci
  left join public.productos as p
    on p.id = ci.producto_id
  where ci.cotizacion_id = v_cotizacion.id
  order by ci.id;

  update public.cotizaciones
  set venta_id = v_venta.id
  where id = v_cotizacion.id;

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
      'id', v_cotizacion.cliente_id,
      'nombre', v_cotizacion.cliente_nombre,
      'celular', v_cotizacion.cliente_celular
    ),
    'cotizacion_id', v_cotizacion.id,
    'items', v_items_respuesta,
    'total', v_venta.total,
    'ganancia_total', v_venta.ganancia_total,
    'pagado', v_venta.pagado,
    'estado', v_venta.estado,
    'fecha', v_venta.fecha
  );
end;
$$;

revoke all on function public.convertir_cotizacion_a_venta(bigint, numeric, numeric)
  from public, anon, authenticated;
grant execute on function public.convertir_cotizacion_a_venta(bigint, numeric, numeric)
  to authenticated;
