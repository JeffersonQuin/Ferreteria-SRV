// Endpoint de keep-alive para evitar que Supabase pause el proyecto por inactividad.
// Hace una lectura mínima (select id limit 1): genera actividad de API real SIN
// escribir nada, por lo que no consume almacenamiento.
// Lo invoca el Cron Job de Vercel una vez al día (ver vercel.json).

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const url = config.supabaseUrl
  const key = config.supabaseKey

  if (!url || !key) {
    setResponseStatus(event, 500)
    return { ok: false, error: 'Faltan SUPABASE_URL o SUPABASE_KEY en el entorno.' }
  }

  const startedAt = new Date().toISOString()

  try {
    // Petición directa a PostgREST: cuenta como actividad de usuario para Supabase.
    const response = await $fetch.raw(
      `${url}/rest/v1/productos?select=id&limit=1`,
      {
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          // head: no trae filas; solo confirma que la base responde.
          Prefer: 'count=none'
        }
      }
    )

    return {
      ok: true,
      status: response.status,
      checkedAt: startedAt
    }
  } catch (cause) {
    console.error('[keep-alive] Falló el ping a Supabase', cause)
    setResponseStatus(event, 502)
    return {
      ok: false,
      error: 'No fue posible contactar a Supabase.',
      checkedAt: startedAt
    }
  }
})
