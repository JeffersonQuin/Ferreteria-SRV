-- Spec 012: RPC para editar una venta ya registrada eliminando ítems y recalculando totales.
-- Solo puede eliminar ítems; no puede vaciar la venta (debe quedar al menos 1 ítem).
-- Recalcula total, ganancia_total y estado dentro de una transacción atómica.

-- Asegurar que la columna descuento existe (puede haber sido agregada fuera de migraciones)
alter table public.ventas
  add column if not exists descuento numeric(12, 2) not null default 0;

create or replace function public.editar_venta(
  p_venta_id        bigint,
  p_items_a_eliminar bigint[]
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_venta             public.ventas%rowtype;
  v_nuevo_total       numeric(12, 2);
  v_nueva_ganancia    numeric(12, 2);
  v_items_restantes   integer;
  v_nuevo_pagado      numeric(12, 2);
  v_nuevo_estado      text;
  v_descuento         numeric(12, 2);
  v_limite constant   numeric := 9999999999.99;
begin
  -- ── Autenticación ──────────────────────────────────────────────────────────
  if auth.uid() is null then
    raise exception 'Se requiere una sesión autenticada.'
      using errcode = '42501';
  end if;

  -- ── Validar parámetros de entrada ──────────────────────────────────────────
  if p_venta_id is null or p_venta_id <= 0 then
    raise exception 'El identificador de venta no es válido.'
      using errcode = '22023';
  end if;

  if p_items_a_eliminar is null or array_length(p_items_a_eliminar, 1) is null then
    raise exception 'Debe indicar al menos un ítem a eliminar.'
      using errcode = '22023';
  end if;

  -- ── Bloquear fila de venta para evitar concurrencia ────────────────────────
  select v.*
  into v_venta
  from public.ventas as v
  where v.id = p_venta_id
  for update of v;

  if not found then
    raise exception 'La venta seleccionada no existe.'
      using errcode = 'P0002';
  end if;

  -- ── Verificar que todos los ítems a eliminar pertenecen a esta venta ───────
  if exists (
    select 1
    from unnest(p_items_a_eliminar) as uid(item_id)
    where not exists (
      select 1
      from public.venta_items as vi
      where vi.id = uid.item_id
        and vi.venta_id = p_venta_id
    )
  ) then
    raise exception 'Uno o más ítems no pertenecen a la venta indicada.'
      using errcode = '22023';
  end if;

  -- ── Verificar que quedaría al menos 1 ítem tras la eliminación ─────────────
  select count(*)::integer
  into v_items_restantes
  from public.venta_items as vi
  where vi.venta_id = p_venta_id
    and vi.id <> all(p_items_a_eliminar);

  if v_items_restantes < 1 then
    raise exception 'Debe quedar al menos un producto en la venta.'
      using errcode = '22023';
  end if;

  -- ── Eliminar los ítems indicados ───────────────────────────────────────────
  delete from public.venta_items
  where venta_id = p_venta_id
    and id = any(p_items_a_eliminar);

  -- ── Recalcular totales desde los ítems restantes ───────────────────────────
  select
    coalesce(sum(vi.subtotal), 0),
    coalesce(sum(vi.ganancia_subtotal), 0)
  into v_nuevo_total, v_nueva_ganancia
  from public.venta_items as vi
  where vi.venta_id = p_venta_id;

  v_nuevo_total    := round(v_nuevo_total, 2);
  v_nueva_ganancia := round(v_nueva_ganancia, 2);

  -- Aplicar descuento original si existe (columna descuento en ventas)
  -- descuento se lee del registro bloqueado; puede ser NULL en ventas antiguas
  v_descuento := coalesce(v_venta.descuento, 0);
  if v_descuento > 0 then
    v_nuevo_total := greatest(round(v_nuevo_total - v_descuento, 2), 0);
  end if;

  if v_nuevo_total > v_limite then
    raise exception 'El total recalculado excede el máximo permitido.'
      using errcode = '22003';
  end if;

  -- ── Recalcular pagado (no puede superar el nuevo total) ────────────────────
  v_nuevo_pagado := least(v_venta.pagado, v_nuevo_total);

  -- ── Recalcular estado ──────────────────────────────────────────────────────
  v_nuevo_estado := case
    when v_nuevo_total = 0 then 'Completo'
    when v_nuevo_pagado = 0 then 'No pagado'
    when v_nuevo_pagado >= v_nuevo_total then 'Completo'
    else 'Pendiente'
  end;

  -- ── Actualizar cabecera de la venta ────────────────────────────────────────
  update public.ventas
  set
    total         = v_nuevo_total,
    ganancia_total = v_nueva_ganancia,
    pagado        = v_nuevo_pagado,
    estado        = v_nuevo_estado
  where id = p_venta_id
  returning * into v_venta;

  -- ── Devolver la fila actualizada con el mismo formato que VENTA_COLUMNS ────
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

revoke all on function public.editar_venta(bigint, bigint[])
  from public, anon, authenticated;
grant execute on function public.editar_venta(bigint, bigint[])
  to authenticated;
