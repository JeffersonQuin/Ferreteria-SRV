-- Keep-alive diario con pg_cron para generar actividad en la base de datos.
-- Supabase pausa los proyectos del plan gratuito tras 7 días con poca actividad.

-- 1. Habilitar pg_cron (en Supabase también se puede activar en
--    Database > Extensions > pg_cron).
create extension if not exists pg_cron with schema pg_catalog;

-- 2. Tabla auxiliar. Solo la usa la función de abajo; la API no necesita acceso.
create table if not exists public.keep_alive (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now()
);

alter table public.keep_alive enable row level security;
revoke all on table public.keep_alive from public, anon, authenticated;

-- 3. Función que inserta un registro y lo borra de inmediato.
create or replace function public.keep_alive_ping()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id bigint;
begin
  insert into public.keep_alive default values
  returning id into v_id;

  delete from public.keep_alive
  where id = v_id;
end;
$$;

-- Solo el propietario (y por lo tanto pg_cron) puede ejecutarla; no se expone por la API.
revoke all on function public.keep_alive_ping()
  from public, anon, authenticated;

-- 4. Programar la ejecución diaria. pg_cron trabaja en UTC:
--    '0 12 * * *' = todos los días a las 12:00 UTC (8:00 a. m. en Bolivia).
--    Si el trabajo ya existía, se reemplaza para poder correr este script varias veces.
do $$
begin
  if exists (select 1 from cron.job where jobname = 'keep-alive-diario') then
    perform cron.unschedule('keep-alive-diario');
  end if;
end;
$$;

select cron.schedule(
  'keep-alive-diario',
  '0 12 * * *',
  $$select public.keep_alive_ping();$$
);

-- ── Verificación (ejecutar aparte) ───────────────────────────────────────────
-- Trabajo programado:
--   select jobid, jobname, schedule, command, active from cron.job;
-- Historial de ejecuciones (aparece después de la primera corrida):
--   select status, return_message, start_time, end_time
--   from cron.job_run_details
--   order by start_time desc
--   limit 10;
-- Prueba manual inmediata:
--   select public.keep_alive_ping();
-- Para detener el trabajo:
--   select cron.unschedule('keep-alive-diario');
