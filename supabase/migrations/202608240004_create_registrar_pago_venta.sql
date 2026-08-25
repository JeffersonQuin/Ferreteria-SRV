-- Space 08: transición segura y atómica para completar el pago de una venta.
-- El navegador conserva únicamente SELECT sobre ventas; esta RPC es la única vía
-- habilitada para modificar pagado y estado después del registro inicial.

create or replace function public.registrar_pago_venta(
  p_venta_id bigint,
  p_abono numeric
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_venta public.ventas%rowtype;
  v_saldo numeric(12, 2);
  v_monto_aplicado numeric(12, 2);
  v_cambio numeric;
  v_limite constant numeric := 9999999999.99;
begin
  if auth.uid() is null then
    raise exception 'Se requiere una sesión autenticada.'
      using errcode = '42501';
  end if;

  if p_venta_id is null or p_venta_id <= 0 then
    raise exception 'La venta no es válida.'
      using errcode = '22023';
  end if;

  if p_abono is null
    or p_abono::text in ('NaN', 'Infinity', '-Infinity')
    or p_abono <= 0
    or p_abono > v_limite
    or p_abono <> round(p_abono, 2)
  then
    raise exception 'El monto recibido no es válido.'
      using errcode = '22023';
  end if;

  select v.*
  into v_venta
  from public.ventas as v
  where v.id = p_venta_id
  for update of v;

  if not found then
    raise exception 'La venta seleccionada no existe.'
      using errcode = 'P0002';
  end if;

  v_saldo := round(v_venta.total - v_venta.pagado, 2);

  if v_venta.estado = 'Completo' or v_saldo <= 0 then
    raise exception 'La venta ya se encuentra pagada por completo.'
      using errcode = 'P0001';
  end if;

  if p_abono < v_saldo then
    raise exception 'El monto recibido debe cubrir el saldo pendiente de %.', v_saldo
      using errcode = '22023';
  end if;

  v_monto_aplicado := v_saldo;
  v_cambio := round(p_abono - v_saldo, 2);

  update public.ventas
  set
    pagado = total,
    estado = 'Completo'
  where id = v_venta.id
  returning * into v_venta;

  return jsonb_build_object(
    'venta', jsonb_build_object(
      'id', v_venta.id,
      'cliente_id', v_venta.cliente_id,
      'cliente_nombre', v_venta.cliente_nombre,
      'cliente_celular', v_venta.cliente_celular,
      'fecha', v_venta.fecha,
      'total', v_venta.total,
      'ganancia_total', v_venta.ganancia_total,
      'pagado', v_venta.pagado,
      'estado', v_venta.estado
    ),
    'pago', jsonb_build_object(
      'abono', p_abono,
      'saldo_anterior', v_saldo,
      'monto_aplicado', v_monto_aplicado,
      'cambio', v_cambio
    )
  );
end;
$$;

revoke all on function public.registrar_pago_venta(bigint, numeric)
  from public, anon, authenticated;
grant execute on function public.registrar_pago_venta(bigint, numeric)
  to authenticated;
