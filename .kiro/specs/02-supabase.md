# Spec 02: Integración Supabase y Sistema de Autenticación - Ferretería SRV

## Introducción

La aplicación Ferretería SRV (PWA construida con Nuxt 4) necesita integrar Supabase como backend para dos propósitos: (1) tener lista la configuración de conexión a la base de datos PostgreSQL para uso futuro, y (2) implementar un sistema de autenticación con Google OAuth que proteja un dashboard interno, con verificación de sesión en el servidor (SSR) antes de renderizar contenido protegido. Esta spec **no implementa la base de datos** (tablas, migraciones ni políticas RLS); solo prepara las variables de conexión y documenta el esquema como referencia futura.

## Objetivo

Integrar el módulo oficial `@nuxtjs/supabase` para obtener un cliente de Supabase isomórfico (SSR + cliente) con sesión compartida por cookies, crear un composable `useAuth` que envuelva el flujo de login con Google y logout, proteger la ruta `/dashboard` con un middleware que verifique la sesión **antes del renderizado del servidor** (sin flashes de contenido protegido), y construir las páginas y componentes de login/dashboard usando exclusivamente la paleta de colores oficial de `.kiro/rules.md`.

## Stack Tecnológico

- Framework: Nuxt 4.5.2 (estructura con carpeta `app/` como `srcDir`, según convención ya establecida en este proyecto)
- Backend: Supabase (Auth + Database)
- Integración: `@nuxtjs/supabase` (módulo oficial, cliente SSR vía `@supabase/ssr` internamente) — **nueva dependencia a agregar** en esta spec
- Autenticación: Supabase Auth con Google como proveedor OAuth
- UI: TailwindCSS
- Tipo de app: PWA (ya configurada en `01-pwa-setup.md`)

> ℹ️ Esta spec agrega `@nuxtjs/supabase` a `package.json` (versión fijada `^2.0.9`, la más reciente al momento de escribir esta spec). Es una dependencia nueva sobre lo ya instalado (`@supabase/supabase-js` sigue siendo una dependencia transitiva del módulo). Se documenta aquí para que quede explícito antes de ejecutar `npm install`.

## Paleta de colores (100% alineada con `.kiro/rules.md`)

Esta spec **no introduce ningún color nuevo**. Solo se usan los cuatro tonos oficiales, más variables neutras de Tailwind (blanco y la escala `gray-*`) exclusivamente para contraste de texto secundario, sin alterar la paleta de marca:

| Uso | Valor | Origen |
|---|---|---|
| Botones principales, headers, texto destacado | `#6B3A2A` (Principal) | `.kiro/rules.md` |
| Hover de botones, acentos secundarios | `#8B5A3C` (Secundario) | `.kiro/rules.md` |
| Bordes, íconos, detalles decorativos | `#D4A574` (Acento) | `.kiro/rules.md` |
| Fondo general de página | `#F5E6D3` (Fondo) | `.kiro/rules.md` |
| Texto sobre fondos oscuros (botones café) | Blanco (`text-white`) | Neutro Tailwind |
| Texto secundario (descripciones, metadatos) | `text-gray-600` / `text-gray-700` | Neutro Tailwind |
| Tarjetas/contenedores sobre el fondo crema | Blanco (`bg-white`) | Neutro Tailwind |

No se usan `#F5F0EB`, `#1A1A1A`, `#4A4A4A` ni ningún otro valor fuera de esta tabla.

## Requisitos (formato EARS)

### Requisito 1: Instalación e integración del módulo Supabase
**User Story:** Como desarrollador, quiero usar el módulo oficial de Supabase para Nuxt, para obtener soporte SSR de sesión sin implementarlo manualmente.

**Criterios de aceptación:**
1. CUANDO se inspeccione `package.json` ENTONCES DEBERÁ incluir `@nuxtjs/supabase` en `dependencies` con una versión fijada (`^2.0.9`).
2. CUANDO se inspeccione `nuxt.config.ts` ENTONCES el arreglo `modules` DEBERÁ incluir `'@nuxtjs/supabase'`.
3. CUANDO se configure el bloque `supabase` en `nuxt.config.ts` ENTONCES DEBERÁ definir `url` y `key` leyendo `process.env.SUPABASE_URL` y `process.env.SUPABASE_KEY`.
4. CUANDO el módulo se inicialice ENTONCES DEBERÁ mantener `useSsrCookies` en su valor por defecto (`true`) para que la sesión se comparta entre servidor y cliente mediante cookies (vía `@supabase/ssr`), habilitando la verificación de sesión durante el renderizado SSR.

### Requisito 2: Seguridad de claves (arquitectura pública/privada)
**User Story:** Como responsable de seguridad del proyecto, quiero que la clave de administración de Supabase nunca llegue al navegador, para evitar que se pueda vulnerar la Row Level Security (RLS).

**Criterios de aceptación:**
1. CUANDO se cree el archivo `.env` ENTONCES DEBERÁ contener `SUPABASE_URL`, `SUPABASE_KEY` (clave pública/anon) y `SUPABASE_SERVICE_ROLE_KEY`.
2. CUANDO se agregue `.env` ENTONCES DEBERÁ estar excluido de git (ya cubierto por `.gitignore` existente) y DEBERÁ crearse un `.env.example` con las mismas claves sin valores reales.
3. `SUPABASE_URL` y `SUPABASE_KEY` DEBERÁN quedar disponibles en `runtimeConfig.public` (mapeadas automáticamente por el módulo `@nuxtjs/supabase` a través de la opción `supabase.url` / `supabase.key`), de forma que el cliente del navegador solo tenga acceso a la clave pública/anon.
4. `SUPABASE_SERVICE_ROLE_KEY` DEBERÁ mapearse **únicamente** a la opción `supabase.secretKey` en `nuxt.config.ts`, la cual el módulo mantiene en `runtimeConfig` privado (server-only) y **nunca** la incluye en el bundle del cliente.
5. EL SISTEMA NUNCA DEBERÁ leer `SUPABASE_SERVICE_ROLE_KEY` desde ningún composable, plugin o componente que se ejecute en el navegador. Su único uso permitido es en rutas de servidor Nitro (`server/api/**`) mediante el helper `serverSupabaseServiceRole` del módulo, y ese uso queda **fuera del alcance** de esta spec (no se crean rutas de servidor aquí).
6. SI `SUPABASE_URL` o `SUPABASE_KEY` no están definidas ENTONCES el arranque de `nuxt dev` DEBERÁ continuar (el módulo registra advertencias en consola), sin romper el resto de la aplicación.

### Requisito 3: Autenticación con Google OAuth (flujo PKCE)
**User Story:** Como usuario del sistema (personal de la ferretería), quiero iniciar sesión con mi cuenta de Google, para acceder al dashboard sin gestionar una contraseña adicional.

**Criterios de aceptación:**
1. CUANDO el usuario presione el botón de login ENTONCES `useAuth().signInWithGoogle()` DEBERÁ invocar `useSupabaseClient().auth.signInWithOAuth({ provider: 'google', options: { redirectTo: '<origin>/confirm' } })`.
2. CUANDO el usuario complete el flujo de Google ENTONCES Supabase DEBERÁ redirigir a la página `app/pages/confirm.vue`, la cual DEBERÁ esperar a que `useSupabaseUser()` se popule y luego navegar a `/dashboard`.
3. CUANDO el usuario esté autenticado ENTONCES `useAuth().getUser()` DEBERÁ retornar los datos del usuario (nombre, email, avatar) provenientes de `user.value.user_metadata`.
4. CUANDO el usuario presione "Cerrar sesión" ENTONCES `useAuth().signOut()` DEBERÁ invocar `useSupabaseClient().auth.signOut()` y redirigir a la página de login (`/`).
5. SI la configuración del proveedor Google no está habilitada en el proyecto de Supabase (paso manual en el dashboard de Supabase + Google Cloud Console) ENTONCES el login fallará con un error de Supabase; esa configuración externa queda fuera del alcance de esta spec.
6. LA URL DE CALLBACK (`/confirm`) DEBERÁ registrarse manualmente en el dashboard de Supabase bajo **Authentication → URL Configuration → Redirect URLs**; esta configuración externa queda fuera del alcance de esta spec.

### Requisito 4: Verificación de sesión en servidor (SSR) antes del renderizado
**User Story:** Como administrador del sistema, quiero que la protección del dashboard se resuelva en el servidor antes de enviar HTML al navegador, para evitar parpadeos de contenido protegido y cierres de seguridad basados solo en JavaScript del cliente.

**Criterios de aceptación:**
1. LA INTEGRACIÓN DEBERÁ usar el cliente universal provisto por `@nuxtjs/supabase` (`useSupabaseClient()`, `useSupabaseUser()`), el cual se ejecuta tanto en el paso de renderizado del servidor (Nitro) como en el cliente, compartiendo la sesión vía cookies SSR (`useSsrCookies: true`).
2. CUANDO un usuario no autenticado solicite `/dashboard` (incluyendo la primera carga SSR, sin JavaScript aún ejecutado en el navegador) ENTONCES el middleware `app/middleware/auth.ts` DEBERÁ leer `useSupabaseUser()` durante el ciclo de renderizado del servidor y redirigir a `/` con `navigateTo` **antes** de que se envíe el HTML del dashboard al cliente.
3. CUANDO un usuario autenticado solicite `/` (login) ENTONCES el mismo middleware DEBERÁ redirigirlo a `/dashboard` durante SSR, evitando mostrar el formulario de login a un usuario ya autenticado.
4. EL MIDDLEWARE `auth.ts` DEBERÁ registrarse explícitamente vía `definePageMeta({ middleware: 'auth' })` en `index.vue`, `dashboard.vue` y `confirm.vue` (para permitir la redirección post-login en `confirm.vue` sin quedar bloqueado por el propio middleware).
5. LA OPCIÓN GLOBAL `redirect` del módulo `@nuxtjs/supabase` DEBERÁ desactivarse (`redirect: false` en el bloque `supabase` de `nuxt.config.ts`) para evitar que el middleware automático del módulo entre en conflicto con la lógica de redirección personalizada del Requisito 4.2 y 4.3.

### Requisito 5: Gestión reactiva de sesión
**User Story:** Como usuario, quiero que la aplicación refleje mi estado de sesión (logueado/no logueado) sin recargar la página, para navegar de forma fluida.

**Criterios de aceptación:**
1. CUANDO cambie el estado de autenticación (login, logout, refresh de token) ENTONCES `useAuth().isAuthenticated()` DEBERÁ reflejar el cambio reactivamente, apoyándose en el `ref` reactivo que expone `useSupabaseUser()`.
2. CUANDO se recargue la aplicación con una sesión válida almacenada en cookies ENTONCES el usuario DEBERÁ permanecer autenticado sin necesidad de volver a iniciar sesión, tanto en SSR como en el cliente.

### Requisito 6: Página de login
**User Story:** Como usuario, quiero una pantalla de login simple con la identidad visual de la ferretería, para iniciar sesión de forma clara.

**Criterios de aceptación:**
1. CUANDO se acceda a `/` sin sesión activa ENTONCES DEBERÁ mostrarse el componente `LoginButton` centrado, con el nombre "Ferretería SRV", sobre fondo `#F5E6D3`.
2. CUANDO se renderice la página ENTONCES el texto destacado (título) DEBERÁ usar `#6B3A2A` y los elementos decorativos (si existen) DEBERÁN usar `#D4A574`, sin introducir otros colores.

### Requisito 7: Dashboard protegido
**User Story:** Como usuario autenticado, quiero ver un dashboard con mi información y navegación básica, para confirmar que el login funcionó y orientarme dentro del sistema.

**Criterios de aceptación:**
1. CUANDO se acceda a `/dashboard` autenticado ENTONCES DEBERÁ mostrarse el título "Ferretería SRV - Dashboard".
2. CUANDO se renderice el dashboard ENTONCES DEBERÁ incluir el componente `Sidebar` (navegación básica + nombre de marca, fondo `#6B3A2A`) y el componente `UserInfo` (avatar, nombre, email, botón de logout).
3. CUANDO se visualice en móvil ENTONCES el layout DEBERÁ ser responsivo (sidebar oculta/apilada, sin desbordamiento horizontal).

### Requisito 8: Componentes de UI
**User Story:** Como desarrollador, quiero componentes de presentación aislados para login y datos de usuario, para mantener las páginas simples y reutilizar la UI.

**Criterios de aceptación:**
1. `LoginButton.vue` DEBERÁ mostrar un ícono de Google, el texto "Iniciar sesión con Google", fondo `#6B3A2A` con texto blanco, estado `hover` en `#8B5A3C`, y un estado de carga (`loading`) que deshabilite el botón mientras se procesa el redirect de OAuth.
2. `UserInfo.vue` DEBERÁ mostrar avatar (`user_metadata.avatar_url`, con fallback si es `null`), nombre, email (texto secundario en `text-gray-600`), un contenedor con borde `#D4A574`, y un botón "Cerrar sesión" en `#6B3A2A` con hover `#8B5A3C`.
3. `Sidebar.vue` DEBERÁ mostrar el nombre "Ferretería SRV" sobre fondo `#6B3A2A`, texto blanco, y una lista de navegación básica (puede ser estática, sin rutas adicionales que no existan aún) con hover en `#8B5A3C`.

### Requisito 9: Base de datos no implementada (solo referencia)
**User Story:** Como equipo de desarrollo, quiero documentar el esquema de base de datos planeado sin crearlo aún, para tenerlo listo cuando se implemente la spec de ventas/inventario.

**Criterios de aceptación:**
1. ESTA SPEC NO DEBERÁ ejecutar ninguna migración SQL ni crear tablas en Supabase.
2. EL ESQUEMA (`clientes`, `productos`, `ventas`, `venta_items`, `cotizaciones`, `cotizacion_items`) DEBERÁ quedar documentado en la sección "Esquema de referencia" de esta spec, para uso en una spec futura.

### Requisito 10: No romper convenciones del proyecto
**User Story:** Como equipo de desarrollo, quiero que los archivos nuevos respeten la estructura de carpetas ya establecida, para mantener la coherencia del proyecto.

**Criterios de aceptación:**
1. CUANDO se creen archivos nuevos ENTONCES DEBERÁN ubicarse dentro de `app/` (siguiendo la convención de `srcDir` ya usada por `app/app.vue`), es decir `app/middleware`, `app/pages`, `app/components`, `app/composables`.
2. CUANDO se implemente esta spec ENTONCES los únicos archivos nuevos permitidos DEBERÁN ser los listados en la sección "Estructura de archivos a crear".
3. TODO el código nuevo DEBERÁ usar TypeScript (`<script setup lang="ts">` y tipos explícitos).
4. NO SE DEBERÁ crear un cliente de Supabase manual (`createClient` directo) ni un plugin `.client.ts` propio; el cliente DEBERÁ obtenerse exclusivamente a través de los composables auto-importados del módulo (`useSupabaseClient`, `useSupabaseUser`).

## Estructura de archivos a crear

```
.env                              (no versionado)
.env.example
app/composables/useAuth.ts
app/middleware/auth.ts
app/pages/index.vue
app/pages/confirm.vue
app/pages/dashboard.vue
app/components/LoginButton.vue
app/components/UserInfo.vue
app/components/Sidebar.vue
```

No se crea ningún plugin ni composable de bajo nivel para el cliente de Supabase: el módulo `@nuxtjs/supabase` lo provee mediante auto-imports (`useSupabaseClient`, `useSupabaseUser`).

## Diseño

### Variables de entorno (`.env.example`)

```
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_KEY=tu-anon-key-publica
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key
```

### `nuxt.config.ts` (adición)

```ts
export default defineNuxtConfig({
  // ...configuración existente (PWA, devtools, etc.)
  modules: [
    '@vite-pwa/nuxt',
    '@nuxtjs/supabase'
  ],
  supabase: {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_KEY,
    // Server-only: el módulo NUNCA expone esta clave al cliente.
    secretKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    // Desactivado: la redirección se maneja con nuestro propio middleware (Requisito 4).
    redirect: false
  }
})
```

### `app/composables/useAuth.ts`

```ts
export function useAuth() {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()
  const loading = ref(false)

  async function signInWithGoogle() {
    loading.value = true
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/confirm` }
    })
    loading.value = false
    if (error) console.error('[Auth] Error en login con Google:', error.message)
  }

  async function signOut() {
    await supabase.auth.signOut()
    await navigateTo('/')
  }

  function getUser() {
    return user.value
  }

  function isAuthenticated() {
    return !!user.value
  }

  return { user, loading, signInWithGoogle, signOut, getUser, isAuthenticated }
}
```

### `app/middleware/auth.ts`

Se ejecuta tanto en SSR como en el cliente (comportamiento por defecto de `defineNuxtRouteMiddleware`), leyendo `useSupabaseUser()` que ya está hidratado desde la cookie de sesión antes de renderizar:

```ts
export default defineNuxtRouteMiddleware((to) => {
  const user = useSupabaseUser()

  if (!user.value && to.path === '/dashboard') {
    return navigateTo('/')
  }

  if (user.value && to.path === '/') {
    return navigateTo('/dashboard')
  }
})
```

### `app/pages/index.vue`

```vue
<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
</script>

<template>
  <div class="flex min-h-screen flex-col items-center justify-center bg-[#F5E6D3] px-4">
    <h1 class="mb-8 text-2xl font-bold text-[#6B3A2A]">Ferretería SRV</h1>
    <LoginButton />
  </div>
</template>
```

### `app/pages/confirm.vue`

```vue
<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const user = useSupabaseUser()

watch(user, () => {
  if (user.value) {
    navigateTo('/dashboard')
  }
}, { immediate: true })
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-[#F5E6D3]">
    <p class="text-[#6B3A2A]">Confirmando sesión...</p>
  </div>
</template>
```

### `app/pages/dashboard.vue`

```vue
<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
useHead({ title: 'Ferretería SRV - Dashboard' })
</script>

<template>
  <div class="flex min-h-screen bg-[#F5E6D3]">
    <Sidebar />
    <main class="flex-1 p-4 sm:p-6">
      <h1 class="mb-6 text-2xl font-bold text-[#6B3A2A]">Ferretería SRV - Dashboard</h1>
      <UserInfo />
    </main>
  </div>
</template>
```

### `app/components/LoginButton.vue`

```vue
<script setup lang="ts">
const { signInWithGoogle, loading } = useAuth()
</script>

<template>
  <button
    type="button"
    :disabled="loading"
    class="flex items-center gap-3 rounded bg-[#6B3A2A] px-6 py-3 font-semibold text-white transition-colors hover:bg-[#8B5A3C] disabled:opacity-60"
    @click="signInWithGoogle"
  >
    <svg class="h-5 w-5" viewBox="0 0 48 48" aria-hidden="true"><!-- ícono de Google --></svg>
    {{ loading ? 'Conectando...' : 'Iniciar sesión con Google' }}
  </button>
</template>
```

### `app/components/UserInfo.vue`

```vue
<script setup lang="ts">
const { user, signOut } = useAuth()
</script>

<template>
  <div class="flex items-center gap-4 rounded-lg border border-[#D4A574] bg-white p-4">
    <img
      :src="user?.user_metadata?.avatar_url ?? '/placeholder-avatar.png'"
      :alt="user?.user_metadata?.full_name ?? 'Usuario'"
      class="h-12 w-12 rounded-full object-cover"
    >
    <div class="flex flex-col">
      <span class="font-semibold text-[#6B3A2A]">{{ user?.user_metadata?.full_name }}</span>
      <span class="text-sm text-gray-600">{{ user?.email }}</span>
    </div>
    <button
      type="button"
      class="ml-auto rounded bg-[#6B3A2A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#8B5A3C]"
      @click="signOut"
    >
      Cerrar sesión
    </button>
  </div>
</template>
```

### `app/components/Sidebar.vue`

```vue
<template>
  <aside class="hidden w-56 flex-col bg-[#6B3A2A] p-4 text-white sm:flex">
    <span class="mb-6 text-lg font-bold">Ferretería SRV</span>
    <nav class="flex flex-col gap-2 text-sm">
      <span class="rounded px-2 py-1 hover:bg-[#8B5A3C]">Dashboard</span>
    </nav>
  </aside>
</template>
```

## Esquema de referencia (NO implementar en esta spec)

```sql
create table clientes (
  id bigint generated always as identity primary key,
  nombre text not null,
  celular text not null,
  created_at timestamptz not null default now()
);

create table productos (
  id bigint generated always as identity primary key,
  nombre text not null,
  descripcion text,
  precio_costo numeric(12, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table ventas (
  id bigint generated always as identity primary key,
  cliente_id bigint references clientes (id) on delete set null,
  cliente_nombre text not null,
  cliente_celular text,
  fecha timestamptz not null default now(),
  total numeric(12, 2) not null default 0,
  pagado numeric(12, 2) not null default 0,
  estado text not null check (estado in ('Completo', 'Pendiente')),
  created_at timestamptz not null default now()
);

create table venta_items (
  id bigint generated always as identity primary key,
  venta_id bigint not null references ventas (id) on delete cascade,
  producto_id bigint references productos (id) on delete set null,
  nombre_producto text not null,
  cantidad int not null check (cantidad > 0),
  precio_venta_unitario numeric(12, 2) not null,
  precio_costo_unitario numeric(12, 2) not null,
  subtotal numeric(12, 2) generated always as (cantidad * precio_venta_unitario) stored,
  ganancia_unitaria numeric(12, 2) generated always as (precio_venta_unitario - precio_costo_unitario) stored,
  ganancia_subtotal numeric(12, 2) generated always as (
    cantidad * (precio_venta_unitario - precio_costo_unitario)
  ) stored
);

create table cotizaciones (
  id bigint generated always as identity primary key,
  cliente_id bigint references clientes (id) on delete set null,
  cliente_nombre text not null,
  cliente_celular text,
  fecha timestamptz not null default now(),
  total numeric(12, 2) not null default 0,
  created_at timestamptz not null default now()
);

create table cotizacion_items (
  id bigint generated always as identity primary key,
  cotizacion_id bigint not null references cotizaciones (id) on delete cascade,
  producto_id bigint references productos (id) on delete set null,
  nombre_producto text not null,
  cantidad int not null check (cantidad > 0)
);
```

## Fuera de alcance (esta spec)

- Creación de las tablas anteriores en Supabase (migraciones/RLS).
- Habilitar el proveedor Google en el dashboard de Supabase y configurar el OAuth consent screen en Google Cloud Console (paso manual fuera del código).
- Registrar la URL de callback (`/confirm`) en el dashboard de Supabase (paso manual).
- Roles/permisos diferenciados por usuario (todo usuario autenticado con Google tiene el mismo acceso al dashboard).
- Rutas de servidor Nitro (`server/api/**`) que usen `SUPABASE_SERVICE_ROLE_KEY` vía `serverSupabaseServiceRole` (se reserva la variable de entorno y la opción `secretKey` para specs futuras).
- Cualquier lógica de negocio de `productos`, `ventas`, `clientes` o `cotizaciones` (pertenece a una spec futura de inventario/ventas).
- Generación de tipos TypeScript desde el esquema de Supabase (opción `supabase.types` del módulo); se puede activar en una spec futura una vez existan tablas reales.
- Unificación con cualquier otro cliente de Supabase definido en specs de catálogo/productos (si existiera un cliente manual en otra spec, deberá migrarse a `useSupabaseClient()` para evitar dos fuentes de verdad).

## Tareas de implementación

- [x] 1. Ejecutar `npm install @nuxtjs/supabase@^2.0.9` y verificar que se agregue a `package.json`. (Instalado como `^2.0.9`).
- [x] 2. Crear `.env.example` con `SUPABASE_URL`, `SUPABASE_KEY` y `SUPABASE_SERVICE_ROLE_KEY`.
- [x] 3. Agregar `'@nuxtjs/supabase'` a `modules` y el bloque `supabase` (`url`, `key`, `secretKey`, `redirect: false`) en `nuxt.config.ts`.
- [x] 4. Crear `app/composables/useAuth.ts` (`signInWithGoogle`, `signOut`, `getUser`, `isAuthenticated`) basado en `useSupabaseClient`/`useSupabaseUser`.
- [x] 5. Crear `app/middleware/auth.ts` con las redirecciones descritas en el Requisito 4.
- [x] 6. Crear `app/pages/index.vue` (login), `app/pages/confirm.vue` (callback OAuth) y `app/pages/dashboard.vue` (protegida), todas con `definePageMeta({ middleware: 'auth' })`. (También se actualizó `app/app.vue`, reemplazando `<NuxtWelcome />` por `<NuxtPage />`, cambio no listado originalmente en "Estructura de archivos a crear" pero necesario para que el router de Nuxt renderice las páginas nuevas).
- [x] 7. Crear `app/components/LoginButton.vue`, `UserInfo.vue` y `Sidebar.vue` usando exclusivamente la paleta oficial. (`LoginButton.vue` incluye el ícono SVG multicolor real de Google en vez de un comentario placeholder).
- [ ] 8. Habilitar manualmente el proveedor Google en Supabase Auth y registrar `https://<dominio>/confirm` en las URLs de redirect permitidas. (Pendiente: requiere acceso al dashboard de Supabase y Google Cloud Console del usuario; fuera del alcance de lo que Kiro puede ejecutar).
- [ ] 9. Ejecutar `npm run dev` y verificar manualmente el flujo: login con Google → `/confirm` → `/dashboard` → datos de usuario visibles → logout → redirect a `/`. (Pendiente: requiere un proyecto Supabase real con el proveedor Google habilitado; no verificable sin credenciales reales).
- [x] 10. Verificar con curl o "ver código fuente" (sin JavaScript) que al pedir `/dashboard` sin sesión, el HTML devuelto por el servidor ya es un redirect a `/` y no el contenido del dashboard (confirma que la protección ocurre en SSR, no solo en el cliente). (Verificado con `curl -i http://localhost:3000/dashboard` usando credenciales dummy: respuesta `HTTP/1.1 302 Found` con `location: /`, sin contenido del dashboard. `curl -i http://localhost:3000/` devolvió `200 OK` con el login renderizado. El `.env` temporal usado para esta prueba fue eliminado al finalizar).

### Notas de verificación (ejecución de esta spec)

- `npm run build` se ejecutó dos veces sin errores: sin `.env` (el módulo registra warnings de `NUXT_PUBLIC_SUPABASE_URL`/`KEY` faltantes pero no rompe el build, cumpliendo el Requisito 2.6) y con `.env` de prueba (sin warnings).
- `npx vue-tsc --noEmit` se ejecutó sin errores de tipos sobre todo el proyecto.
- Las tareas 8 y 9 quedan pendientes porque requieren configuración manual en el dashboard de Supabase y en Google Cloud Console (habilitar el proveedor OAuth, registrar la URL de callback) con credenciales reales del proyecto, las cuales no están disponibles en este entorno. El resto de la implementación (código, configuración, build, TypeScript y protección SSR) fue verificado exitosamente.
