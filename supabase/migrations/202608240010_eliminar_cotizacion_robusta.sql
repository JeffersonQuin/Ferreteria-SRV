-- Spec 020 (ajuste): eliminar_cotizacion no depende de ON DELETE CASCADE.
-- Borra explícitamente los ítems y luego la cotización, dentro de la misma transacción.
-- Reemplaza la función creada en la migración 202608240009.

create or replace function public.eliminar_cotizacion(
  p_cotizacion_id bigint
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

  if p_cotizacion_id is null or p_cotizacion_id <= 0 then
    raise exception 'La cotización no es válida.'
      using errcode = '22023';
  end if;

  -- Bloquea la cotización para evitar borrados o conversiones concurrentes.
  select c.id
  into v_id
  from public.cotizaciones as c
  where c.id = p_cotizacion_id
  for update of c;

  if not found then
    raise exception 'La cotización seleccionada no existe o ya fue eliminada.'
      using errcode = 'P0002';
  end if;

  delete from public.cotizacion_items
  where cotizacion_id = v_id;

  delete from public.cotizaciones
  where id = v_id;

  return jsonb_build_object('id', v_id);
end;
$$;

revoke all on function public.eliminar_cotizacion(bigint)
  from public, anon, authenticated;
grant execute on function public.eliminar_cotizacion(bigint)
  to authenticated;

-- Pide a la API de Supabase (PostgREST) que recargue su caché de esquema
-- para que la función nueva esté disponible de inmediato.
notify pgrst, 'reload schema';
