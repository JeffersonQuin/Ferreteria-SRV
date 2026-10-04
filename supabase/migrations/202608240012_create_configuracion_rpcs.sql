-- Spec 021: Configuración. Uso de almacenamiento y eliminación de ventas por rango de fechas.

-- ── Uso de almacenamiento ────────────────────────────────────────────────────
create or replace function public.obtener_uso_almacenamiento()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_total_bytes bigint;
  v_tablas jsonb;
begin
  if auth.uid() is null then
    raise exception 'Se requiere una sesión autenticada.'
      using errcode = '42501';
  end if;

  -- Tamaño total de la base de datos actual (datos + índices + TOAST).
  select pg_database_size(current_database()) into v_total_bytes;

  -- Desglose por tabla del esquema public (incluye índices y TOAST de cada tabla).
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'tabla', t.relname,
      'bytes', pg_total_relation_size(t.oid)
    )
    order by pg_total_relation_size(t.oid) desc
  ), '[]'::jsonb)
  into v_tablas
  from pg_class as t
  join pg_namespace as n on n.oid = t.relnamespace
  where n.nspname = 'public'
    and t.relkind = 'r';

  return jsonb_build_object(
    'total_bytes', v_total_bytes,
    'limite_bytes', 524288000,          -- 500 MB
    'umbral_alerta_bytes', 471859200,   -- 450 MB
    'tablas', v_tablas,
    'medido_en', now()
  );
end;
$$;

revoke all on function public.obtener_uso_almacenamiento()
  from public, anon, authenticated;
grant execute on function public.obtener_uso_almacenamiento()
  to authenticated;

-- ── Eliminar ventas por rango de fechas ──────────────────────────────────────
-- Días completos en hora de Bolivia (America/La_Paz). Con p_solo_contar = true
-- solo cuenta las coincidencias (previsualización) y no borra nada.
create or replace function public.eliminar_ventas_por_rango(
  p_desde date,
  p_hasta date,
  p_solo_contar boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_desde timestamptz;
  v_hasta timestamptz;
  v_total integer;
  v_ids bigint[];
begin
  if auth.uid() is null then
    raise exception 'Se requiere una sesión autenticada.'
      using errcode = '42501';
  end if;

  if p_desde is null or p_hasta is null then
    raise exception 'Debe indicar el rango de fechas completo.'
      using errcode = '22023';
  end if;

  if p_desde > p_hasta then
    raise exception 'La fecha "Desde" no puede ser posterior a "Hasta".'
      using errcode = '22023';
  end if;

  -- Inicio del día "desde" y fin (exclusivo) del día "hasta", en hora local.
  v_desde := p_desde::timestamp at time zone 'America/La_Paz';
  v_hasta := (p_hasta + 1)::timestamp at time zone 'America/La_Paz';

  select count(*), coalesce(array_agg(v.id), '{}')
  into v_total, v_ids
  from public.ventas as v
  where v.fecha >= v_desde
    and v.fecha < v_hasta;

  if coalesce(p_solo_contar, false) then
    return jsonb_build_object(
      'eliminadas', 0,
      'coincidencias', v_total,
      'solo_contar', true
    );
  end if;

  if v_total = 0 then
    return jsonb_build_object(
      'eliminadas', 0,
      'coincidencias', 0,
      'solo_contar', false
    );
  end if;

  -- Libera las cotizaciones de origen (si existe la columna) para poder convertirlas de nuevo.
  begin
    update public.cotizaciones
    set venta_id = null
    where venta_id = any(v_ids);
  exception
    when undefined_column or undefined_table then
      null;
  end;

  delete from public.venta_items
  where venta_id = any(v_ids);

  delete from public.ventas
  where id = any(v_ids);

  return jsonb_build_object(
    'eliminadas', v_total,
    'coincidencias', v_total,
    'solo_contar', false
  );
end;
$$;

revoke all on function public.eliminar_ventas_por_rango(date, date, boolean)
  from public, anon, authenticated;
grant execute on function public.eliminar_ventas_por_rango(date, date, boolean)
  to authenticated;

-- Pide a la API de Supabase (PostgREST) que recargue su caché de esquema.
notify pgrst, 'reload schema';
