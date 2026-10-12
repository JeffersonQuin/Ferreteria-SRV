-- Spec 028: editar_venta permite eliminar items y modificar su cantidad o precio.
-- La firma anterior se conserva temporalmente para no interrumpir clientes desplegados.

create or replace function public.editar_venta(
  p_venta_id          bigint,
  p_items_a_eliminar  bigint[],
  p_items_modificados jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_venta           public.ventas%rowtype;
  v_nuevo_total     numeric(12, 2);
  v_nueva_ganancia  numeric(12, 2);
  v_items_restantes integer;
  v_nuevo_pagado    numeric(12, 2);
  v_nuevo_estado    text;
  v_descuento       numeric(12, 2);
  v_item            jsonb;
  v_limite constant numeric := 9999999999.99;
begin
  if auth.uid() is null then
    raise exception 'Se requiere una sesión autenticada.' using errcode = '42501';
  end if;

  if p_venta_id is null or p_venta_id <= 0 then
    raise exception 'El identificador de venta no es válido.' using errcode = '22023';
  end if;

  if p_items_modificados is not null and jsonb_typeof(p_items_modificados) <> 'array' then
    raise exception 'Los ítems modificados tienen un formato no válido.' using errcode = '22023';
  end if;

  if (p_items_a_eliminar is null or array_length(p_items_a_eliminar, 1) is null)
     and (p_items_modificados is null or jsonb_array_length(p_items_modificados) = 0)
  then
    raise exception 'No hay cambios que guardar.' using errcode = '22023';
  end if;

  select v.* into v_venta
  from public.ventas as v
  where v.id = p_venta_id
  for update of v;

  if not found then
    raise exception 'La venta seleccionada no existe.' using errcode = 'P0002';
  end if;

  if p_items_a_eliminar is not null and array_length(p_items_a_eliminar, 1) is not null then
    if exists (
      select 1
      from unnest(p_items_a_eliminar) as uid(item_id)
      where not exists (
        select 1
        from public.venta_items as vi
        where vi.id = uid.item_id and vi.venta_id = p_venta_id
      )
    ) then
      raise exception 'Uno o más ítems a eliminar no pertenecen a la venta.' using errcode = '22023';
    end if;
  end if;

  if p_items_modificados is not null and jsonb_array_length(p_items_modificados) > 0 then
    for v_item in select value from jsonb_array_elements(p_items_modificados) loop
      if not (v_item ? 'id') or not (v_item ? 'cantidad') or not (v_item ? 'precio_venta_unitario') then
        raise exception 'Cada ítem modificado requiere id, cantidad y precio_venta_unitario.'
          using errcode = '22023';
      end if;

      if not exists (
        select 1
        from public.venta_items as vi
        where vi.id = (v_item ->> 'id')::bigint and vi.venta_id = p_venta_id
      ) then
        raise exception 'Uno o más ítems modificados no pertenecen a la venta.' using errcode = '22023';
      end if;

      if (v_item ->> 'cantidad')::numeric <= 0
        or (v_item ->> 'cantidad')::numeric > 99999999.99
        or (v_item ->> 'cantidad')::numeric <> round((v_item ->> 'cantidad')::numeric, 2)
      then
        raise exception 'La cantidad debe ser mayor que cero (máximo 2 decimales).' using errcode = '22023';
      end if;

      if (v_item ->> 'precio_venta_unitario')::numeric < 0
        or (v_item ->> 'precio_venta_unitario')::numeric > v_limite
        or (v_item ->> 'precio_venta_unitario')::numeric <> round((v_item ->> 'precio_venta_unitario')::numeric, 2)
      then
        raise exception 'El precio de venta no es válido.' using errcode = '22023';
      end if;
    end loop;
  end if;

  if p_items_a_eliminar is not null
     and array_length(p_items_a_eliminar, 1) is not null
     and p_items_modificados is not null
     and jsonb_array_length(p_items_modificados) > 0
  then
    if exists (
      select 1
      from jsonb_to_recordset(p_items_modificados)
        as m(id bigint, cantidad numeric, precio_venta_unitario numeric)
      where m.id = any(p_items_a_eliminar)
    ) then
      raise exception 'Un ítem no puede eliminarse y modificarse a la vez.' using errcode = '22023';
    end if;
  end if;

  if p_items_a_eliminar is not null and array_length(p_items_a_eliminar, 1) is not null then
    delete from public.venta_items
    where venta_id = p_venta_id and id = any(p_items_a_eliminar);
  end if;

  -- subtotal y ganancia_subtotal son columnas GENERATED ALWAYS; PostgreSQL
  -- las recalcula automáticamente al cambiar cantidad o precio.
  if p_items_modificados is not null and jsonb_array_length(p_items_modificados) > 0 then
    update public.venta_items as vi
    set
      cantidad              = round(m.cantidad, 2),
      precio_venta_unitario = round(m.precio_venta_unitario, 2)
    from jsonb_to_recordset(p_items_modificados)
      as m(id bigint, cantidad numeric, precio_venta_unitario numeric)
    where vi.id = m.id and vi.venta_id = p_venta_id;
  end if;

  select count(*)::integer into v_items_restantes
  from public.venta_items as vi
  where vi.venta_id = p_venta_id;

  if v_items_restantes < 1 then
    raise exception 'Debe quedar al menos un producto en la venta.' using errcode = '22023';
  end if;

  select coalesce(sum(vi.subtotal), 0), coalesce(sum(vi.ganancia_subtotal), 0)
  into v_nuevo_total, v_nueva_ganancia
  from public.venta_items as vi
  where vi.venta_id = p_venta_id;

  v_nuevo_total := round(v_nuevo_total, 2);
  v_nueva_ganancia := round(v_nueva_ganancia, 2);

  v_descuento := coalesce(v_venta.descuento, 0);
  if v_descuento > 0 then
    v_nuevo_total := greatest(round(v_nuevo_total - v_descuento, 2), 0);
  end if;

  if v_nuevo_total > v_limite then
    raise exception 'El total recalculado excede el máximo permitido.' using errcode = '22003';
  end if;

  v_nuevo_pagado := least(v_venta.pagado, v_nuevo_total);
  v_nuevo_estado := case
    when v_nuevo_total = 0 then 'Completo'
    when v_nuevo_pagado = 0 then 'No pagado'
    when v_nuevo_pagado >= v_nuevo_total then 'Completo'
    else 'Pendiente'
  end;

  update public.ventas
  set
    total = v_nuevo_total,
    ganancia_total = v_nueva_ganancia,
    pagado = v_nuevo_pagado,
    estado = v_nuevo_estado
  where id = p_venta_id
  returning * into v_venta;

  return jsonb_build_object(
    'id',              v_venta.id,
    'cliente_id',      v_venta.cliente_id,
    'cliente_nombre',  v_venta.cliente_nombre,
    'cliente_celular', v_venta.cliente_celular,
    'fecha',           v_venta.fecha,
    'total',           v_venta.total,
    'descuento',       v_venta.descuento,
    'ganancia_total',  v_venta.ganancia_total,
    'pagado',          v_venta.pagado,
    'estado',          v_venta.estado,
    'created_at',      v_venta.created_at
  );
end;
$$;

revoke all on function public.editar_venta(bigint, bigint[], jsonb)
  from public, anon, authenticated;
grant execute on function public.editar_venta(bigint, bigint[], jsonb)
  to authenticated;
