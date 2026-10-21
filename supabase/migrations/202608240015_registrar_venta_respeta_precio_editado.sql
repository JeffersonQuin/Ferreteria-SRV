-- Spec 030: registrar_venta persiste el P. Venta editado en el carrito.
-- El total, la ganancia, el descuento, el pago y el estado se calculan con
-- precio_venta_unitario recibido, mientras el precio_costo sigue saliendo del catálogo.

create or replace function public.registrar_venta(
  p_cliente_id bigint,
  p_monto_ingresado numeric,
  p_descuento numeric,
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
  v_costos_invalidos integer;
  v_total_bruto numeric;
  v_ganancia_bruta numeric;
  v_total numeric;
  v_ganancia_total numeric;
  v_pagado numeric(12, 2);
  v_descuento numeric;
  v_estado text;
  v_venta public.ventas%rowtype;
  v_items_respuesta jsonb;
  v_limite constant numeric := 9999999999.99;
begin
  if auth.uid() is null then
    raise exception 'Se requiere una sesión autenticada.' using errcode = '42501';
  end if;

  if p_cliente_id is null or p_cliente_id <= 0 then
    raise exception 'El cliente no es válido.' using errcode = '22023';
  end if;

  if p_monto_ingresado is null
    or p_monto_ingresado::text in ('NaN', 'Infinity', '-Infinity')
    or p_monto_ingresado < 0
    or p_monto_ingresado > v_limite
    or p_monto_ingresado <> round(p_monto_ingresado, 2)
  then
    raise exception 'El monto ingresado no es válido.' using errcode = '22023';
  end if;

  v_descuento := coalesce(p_descuento, 0);
  if v_descuento::text in ('NaN', 'Infinity', '-Infinity')
    or v_descuento < 0
    or v_descuento > v_limite
    or v_descuento <> round(v_descuento, 2)
  then
    raise exception 'El descuento no es válido.' using errcode = '22023';
  end if;

  if p_items is null
    or jsonb_typeof(p_items) <> 'array'
    or jsonb_array_length(p_items) = 0
  then
    raise exception 'Debe incluir al menos un producto.' using errcode = '22023';
  end if;

  for v_item in select value from jsonb_array_elements(p_items) loop
    if jsonb_typeof(v_item) <> 'object'
      or not (v_item ? 'producto_id')
      or not (v_item ? 'cantidad')
      or not (v_item ? 'precio_venta_unitario')
      or jsonb_typeof(v_item -> 'producto_id') <> 'number'
      or jsonb_typeof(v_item -> 'cantidad') <> 'number'
      or jsonb_typeof(v_item -> 'precio_venta_unitario') <> 'number'
    then
      raise exception 'Cada ítem debe incluir producto_id, cantidad y precio_venta_unitario numéricos.'
        using errcode = '22023';
    end if;

    if (v_item ->> 'producto_id')::numeric <= 0
      or (v_item ->> 'producto_id')::numeric > 9223372036854775807
      or trunc((v_item ->> 'producto_id')::numeric) <> (v_item ->> 'producto_id')::numeric
    then
      raise exception 'Cada producto_id debe ser un entero positivo válido.' using errcode = '22023';
    end if;

    if (v_item ->> 'cantidad')::numeric <= 0
      or (v_item ->> 'cantidad')::numeric > 99999999.99
      or (v_item ->> 'cantidad')::numeric <> round((v_item ->> 'cantidad')::numeric, 2)
    then
      raise exception 'Cada cantidad debe ser mayor que cero (máximo 2 decimales).'
        using errcode = '22023';
    end if;

    if (v_item ->> 'precio_venta_unitario')::numeric < 0
      or (v_item ->> 'precio_venta_unitario')::numeric > v_limite
      or (v_item ->> 'precio_venta_unitario')::numeric
        <> round((v_item ->> 'precio_venta_unitario')::numeric, 2)
    then
      raise exception 'El precio de venta de un ítem no es válido.' using errcode = '22023';
    end if;
  end loop;

  -- El carrito del frontend mantiene un solo ítem por producto. Rechazar duplicados
  -- evita aplicar precios diferentes al mismo producto de forma ambigua.
  if exists (
    select 1
    from jsonb_to_recordset(p_items) as i(producto_id bigint)
    group by i.producto_id
    having count(*) > 1
  ) then
    raise exception 'Un producto no puede aparecer más de una vez en la venta.'
      using errcode = '22023';
  end if;

  select c.nombre, c.celular
  into v_cliente_nombre, v_cliente_celular
  from public.clientes as c
  where c.id = p_cliente_id
  for share of c;

  if not found then
    raise exception 'El cliente seleccionado no existe.' using errcode = 'P0002';
  end if;

  v_productos_solicitados := jsonb_array_length(p_items);

  -- Mantiene estables los costos del catálogo durante el cálculo y el insert.
  perform 1
  from public.productos as p
  join jsonb_to_recordset(p_items)
    as i(producto_id bigint, cantidad numeric, precio_venta_unitario numeric)
    on i.producto_id = p.id
  order by p.id
  for share of p;

  select
    count(*),
    count(*) filter (where p.precio_costo is null or p.precio_costo < 0)
  into v_productos_encontrados, v_costos_invalidos
  from public.productos as p
  join jsonb_to_recordset(p_items)
    as i(producto_id bigint, cantidad numeric, precio_venta_unitario numeric)
    on i.producto_id = p.id;

  if v_productos_encontrados <> v_productos_solicitados then
    raise exception 'Uno o más productos no existen.' using errcode = 'P0002';
  end if;

  if v_costos_invalidos > 0 then
    raise exception 'Uno o más productos tienen un costo no válido.' using errcode = '22023';
  end if;

  if exists (
    select 1
    from public.productos as p
    join jsonb_to_recordset(p_items)
      as i(producto_id bigint, cantidad numeric, precio_venta_unitario numeric)
      on i.producto_id = p.id
    where round(i.precio_venta_unitario * i.cantidad, 2) > v_limite
      or abs(round((i.precio_venta_unitario - p.precio_costo) * i.cantidad, 2)) > v_limite
  ) then
    raise exception 'Un subtotal de la venta excede el máximo permitido.' using errcode = '22003';
  end if;

  -- El precio de venta procede del carrito; el costo procede del catálogo.
  select
    coalesce(sum(round(i.precio_venta_unitario * i.cantidad, 2)), 0),
    coalesce(sum(round((i.precio_venta_unitario - p.precio_costo) * i.cantidad, 2)), 0)
  into v_total_bruto, v_ganancia_bruta
  from public.productos as p
  join jsonb_to_recordset(p_items)
    as i(producto_id bigint, cantidad numeric, precio_venta_unitario numeric)
    on i.producto_id = p.id;

  v_total_bruto := round(v_total_bruto, 2);
  v_ganancia_bruta := round(v_ganancia_bruta, 2);

  if v_total_bruto < 0 or v_total_bruto > v_limite then
    raise exception 'El total de la venta excede el máximo permitido.' using errcode = '22003';
  end if;

  if v_descuento > v_total_bruto then
    raise exception 'El descuento no puede superar el total.' using errcode = '22023';
  end if;

  v_total := greatest(round(v_total_bruto - v_descuento, 2), 0)::numeric(12, 2);
  v_ganancia_total := round(v_ganancia_bruta - v_descuento, 2)::numeric(12, 2);

  if v_ganancia_total < -v_limite or v_ganancia_total > v_limite then
    raise exception 'La ganancia de la venta excede el máximo permitido.' using errcode = '22003';
  end if;

  -- Se compara con el total real (precios editados menos descuento), no con el catálogo.
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
    p_cliente_id,
    v_cliente_nombre,
    v_cliente_celular,
    v_total,
    v_descuento,
    v_ganancia_total,
    v_pagado,
    v_estado
  )
  returning * into v_venta;

  -- Se persiste el P. Venta recibido; el precio del catálogo no se modifica.
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
    i.precio_venta_unitario,
    p.precio_costo
  from public.productos as p
  join jsonb_to_recordset(p_items)
    as i(producto_id bigint, cantidad numeric, precio_venta_unitario numeric)
    on i.producto_id = p.id
  order by p.id;

  select coalesce(jsonb_agg(to_jsonb(vi) order by vi.id), '[]'::jsonb)
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

revoke all on function public.registrar_venta(bigint, numeric, numeric, jsonb)
  from public, anon, authenticated;
grant execute on function public.registrar_venta(bigint, numeric, numeric, jsonb)
  to authenticated;
