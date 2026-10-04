-- Eliminar una venta desde el historial de ventas.
-- Borra los ítems y la venta en una sola transacción. Si la venta provenía de la
-- conversión de una cotización, esa cotización vuelve a quedar disponible para convertir.

create or replace function public.eliminar_venta(
  p_venta_id bigint
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id bigint;
begin
  if auth.uid() is null then
    raise exception 'Se requiere una sesión autenticada.'
      using errcode = '42501';
  end if;

  if p_venta_id is null or p_venta_id <= 0 then
    raise exception 'El identificador de venta no es válido.'
      using errcode = '22023';
  end if;

  -- Bloquea la venta para evitar borrados, pagos o ediciones concurrentes.
  select v.id
  into v_id
  from public.ventas as v
  where v.id = p_venta_id
  for update of v;

  if not found then
    raise exception 'La venta seleccionada no existe o ya fue eliminada.'
      using errcode = 'P0002';
  end if;

  -- Libera la cotización de origen (si existe la columna) para poder convertirla de nuevo.
  begin
    update public.cotizaciones
    set venta_id = null
    where venta_id = v_id;
  exception
    when undefined_column or undefined_table then
      null;
  end;

  delete from public.venta_items
  where venta_id = v_id;

  delete from public.ventas
  where id = v_id;

  return jsonb_build_object('id', v_id);
end;
$$;

revoke all on function public.eliminar_venta(bigint)
  from public, anon, authenticated;
grant execute on function public.eliminar_venta(bigint)
  to authenticated;

-- Pide a la API de Supabase (PostgREST) que recargue su caché de esquema.
notify pgrst, 'reload schema';
