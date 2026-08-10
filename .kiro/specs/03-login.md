# Spec 03: Login con Correo y Contraseña - Acceso Restringido por Registro Manual

## Introducción

La aplicación Ferretería SRV necesita una pantalla de login simple con dos campos: correo electrónico (usuario) y contraseña. El control de acceso **no se basa en un formulario de registro público ni en una lista de correos revisada por código**: se basa en que el administrador (tú) crea manualmente cada cuenta autorizada directamente desde el panel de Supabase (Authentication → Users → Add user), asignándole un correo y una contraseña a cada persona que debe tener acceso. Nadie puede crear su propia cuenta desde la aplicación.

Esta spec **reemplaza el enfoque de autenticación con Google** definido en `02-supabase.md`. Se elimina el botón "Continuar/Iniciar sesión con Google" y la página `confirm.vue` asociada al flujo OAuth, ya que ese método permite que cualquier persona con una cuenta de Google inicie sesión — lo cual es incompatible con el objetivo de esta spec: que **solo las personas registradas manualmente por el administrador puedan entrar**.

> ⚠️ **Aclaración sobre el panel de Supabase (Authentication → Users):** con esta spec, esa tabla sí se convierte en la lista real de personas autorizadas, porque **tú eres quien crea cada fila manualmente**. Esto es distinto de lo que ocurría con el login de Google, donde Supabase creaba una fila automáticamente por cualquiera que presionara el botón, sin que tú lo autorizaras. Con correo/contraseña y los registros públicos desactivados (ver Requisito 4), la única forma de que aparezca una cuenta nueva ahí es que tú la crees desde el panel.

## Objetivo

Modificar `app/pages/index.vue` para mostrar un formulario de login con dos campos (correo y contraseña), que use `signInWithPassword` de Supabase para autenticar. Si las credenciales son correctas, redirigir a `/dashboard`. Si son incorrectas, mostrar un mensaje de error amigable. Eliminar el botón y el flujo de Google (`LoginButton.vue`, `confirm.vue`, `signInWithGoogle`), ya que no aportan al modelo de acceso restringido que se busca. Documentar el paso manual necesario en el panel de Supabase para impedir el autoregistro público, que es lo que realmente garantiza que solo las cuentas creadas por el administrador puedan iniciar sesión.

## Stack Tecnológico (sin librerías nuevas)

- Framework: Nuxt 4.5.2 (carpeta `app/` como `srcDir`)
- Backend/Auth: Supabase, vía `@nuxtjs/supabase` (ya instalado, versión `^2.0.9`)
- Composables de sesión: `useSupabaseClient()`, `useSupabaseUser()` (nativos del módulo)
- UI: TailwindCSS (ya instalado)
- **No se agrega ninguna dependencia nueva a `package.json`.**
- **No se crea ninguna ruta de servidor (`server/api/**`) ni variable de entorno nueva.** El control de acceso se resuelve enteramente dentro de Supabase Auth (paso manual, ver Requisito 4), no con código de la aplicación.

## Paleta de colores (100% alineada con `.kiro/rules.md`)

| Uso | Valor |
|---|---|
| Botón de login, título | `#6B3A2A` |
| Hover del botón | `#8B5A3C` |
| Bordes de los campos, foco | `#D4A574` |
| Fondo general de la página | `#F5E6D3` |
| Texto sobre el botón café | `text-white` |
| Texto de error (credenciales inválidas) | `text-red-600` (único color fuera de la paleta café; la paleta oficial no define un color semántico de error) |
| Placeholder de los campos | `placeholder-gray-400` |

## Cómo funciona el control de acceso (explicación operativa)

1. Tú, como administrador, entras al panel de Supabase → **Authentication → Users → Add user**, y creas una cuenta escribiendo el correo y una contraseña para cada persona que debe tener acceso al sistema.
2. Le compartes ese correo y esa contraseña a la persona por el medio que prefieras (no ocurre dentro de la aplicación).
3. Esa persona abre la app, escribe su correo y contraseña en el formulario de login, y entra.
4. Si alguien que **no** está en esa lista intenta escribir cualquier correo/contraseña, Supabase simplemente rechaza el intento con "credenciales inválidas", porque esa cuenta no existe.
5. Como se desactiva el autoregistro (Requisito 4), nadie puede crear una cuenta nueva por su cuenta para "colarse" en la lista.

Este es el mecanismo completo. No se necesita código adicional de verificación de listas, porque Supabase Auth ya actúa como el filtro: **si la cuenta no existe (porque tú no la creaste), no hay forma de iniciar sesión.**

## Requisitos (formato EARS)

### Requisito 1: Página de login con correo y contraseña
**User Story:** Como persona autorizada por el administrador, quiero iniciar sesión con el correo y la contraseña que me asignaron, para acceder al sistema.

**Criterios de aceptación:**
1. CUANDO se acceda a `/` sin sesión activa ENTONCES `app/pages/index.vue` DEBERÁ mostrar un formulario con dos campos: correo (`type="email"`) y contraseña (`type="password"`), ambos `required`.
2. EL FORMULARIO DEBERÁ mostrarse centrado, con diseño mobile-first (ancho máximo cómodo en pantallas pequeñas, sin desbordamiento horizontal), fondo `#F5E6D3`.
3. CUANDO se renderice la página ENTONCES DEBERÁ mostrar el nombre "Ferretería SRV" como título, en `#6B3A2A`.
4. LOS CAMPOS DEBERÁN tener borde `#D4A574` y resaltar el foco con `focus:border-[#6B3A2A]`.

### Requisito 2: Autenticación con `signInWithPassword`
**User Story:** Como usuario, quiero que mis credenciales se validen contra Supabase, para que solo cuentas reales y autorizadas puedan entrar.

**Criterios de aceptación:**
1. CUANDO el usuario envíe el formulario ENTONCES DEBERÁ invocarse `useSupabaseClient().auth.signInWithPassword({ email, password })`.
2. MIENTRAS la petición esté en curso ENTONCES el botón de envío DEBERÁ mostrar el estado `loading` (texto "Ingresando..." y `disabled`), mediante un `ref` reactivo expuesto por `useAuth()`.
3. SI Supabase devuelve un error (credenciales inválidas, cuenta inexistente, etc.) ENTONCES DEBERÁ mostrarse el mensaje "Correo o contraseña incorrectos." en `text-red-600` bajo el formulario, sin exponer el mensaje técnico original de Supabase.
4. SI el login es exitoso ENTONCES DEBERÁ navegarse a `/dashboard`.
5. CUANDO el usuario modifique el correo o la contraseña después de un intento fallido ENTONCES el mensaje de error DEBERÁ limpiarse antes del siguiente envío.

### Requisito 3: Middleware de protección de rutas (sin cambios de comportamiento)
**User Story:** Como responsable del sistema, quiero que `/dashboard` siga protegido igual que hoy, verificando la sesión en servidor y cliente.

**Criterios de aceptación:**
1. `app/middleware/auth.ts` **DEBERÁ mantenerse sin cambios**: sigue usando `useSupabaseUser()`, redirige de `/dashboard` a `/` si no hay sesión, y de `/` a `/dashboard` si ya hay sesión. Esta lógica ya funciona correctamente (verificado en `02-supabase.md` con `curl`, confirmando redirección en SSR) y no depende del método de autenticación usado.
2. NO SE MODIFICA la opción `supabase.redirect: false` en `nuxt.config.ts`.

### Requisito 4: Desactivar el autoregistro público (paso manual obligatorio)
**User Story:** Como administrador, quiero que nadie pueda crear su propia cuenta desde la aplicación, para que la única forma de obtener acceso sea que yo cree la cuenta manualmente.

**Criterios de aceptación:**
1. EN EL PANEL DE SUPABASE, bajo **Authentication → Sign In / Providers → Email**, la opción **"Allow new users to sign up"** DEBERÁ desactivarse. Este es un paso manual en el dashboard de Supabase; no se resuelve con código de la aplicación.
2. CON ESTA OPCIÓN DESACTIVADA, cualquier intento de registro (`signUp`) desde cualquier cliente (incluida esta app, aunque no se construya un formulario de registro) será rechazado por Supabase con un error del tipo "Signups not allowed".
3. LA APLICACIÓN NO DEBERÁ incluir ningún formulario ni botón de "Crear cuenta" o "Registrarse", reforzando a nivel de UI que el único camino de acceso es una cuenta ya creada por el administrador.
4. ESTE PASO QUEDA **fuera del alcance de lo que Kiro puede ejecutar automáticamente**, ya que requiere acceso directo al dashboard del proyecto de Supabase del usuario. Se documenta aquí como tarea manual obligatoria antes de considerar el sistema seguro en producción.

### Requisito 5: Retiro del login con Google
**User Story:** Como administrador, quiero eliminar el acceso por Google, porque no permite controlar quién entra (cualquier cuenta de Google válida podría iniciar sesión).

**Criterios de aceptación:**
1. SE ELIMINA `app/components/LoginButton.vue` (botón de Google) y su uso en `index.vue`.
2. SE ELIMINA `app/pages/confirm.vue` (página de callback OAuth), ya que solo existía para el flujo de Google.
3. SE ELIMINA `signInWithGoogle` de `app/composables/useAuth.ts`.
4. **NOTA OPERATIVA IMPORTANTE:** la cuenta que ya inició sesión con Google anteriormente (visible en el panel de Supabase con proveedor "Google", ver la captura compartida) **no podrá volver a entrar** una vez retirado el botón de Google, a menos que el administrador le asigne una contraseña desde el panel de Supabase (Authentication → Users → seleccionar el usuario → "Reset password" o editar credenciales) para que pueda usar el mismo formulario de correo/contraseña. Esto queda como acción manual pendiente del administrador, no como parte del código de esta spec.

### Requisito 6: Manejo de estados de carga y error (regla del proyecto)
**User Story:** Como usuario, quiero saber cuándo el sistema está procesando mi solicitud o si algo falló.

**Criterios de aceptación:**
1. `useAuth().loading` DEBERÁ reflejar el estado de la petición de `signInWithPassword`, conforme a la restricción de `.kiro/rules.md`.
2. `useAuth().error` DEBERÁ contener el mensaje amigable a mostrar, o `null` si no hay error.

### Requisito 7: No romper convenciones del proyecto
**User Story:** Como equipo de desarrollo, quiero que esta spec sea lo más simple posible y no introduzca estructuras innecesarias.

**Criterios de aceptación:**
1. NO SE AGREGA ninguna librería nueva.
2. NO SE CREA ninguna ruta de servidor (`server/api/**`) ni variable de entorno adicional; el control de acceso vive enteramente en la configuración de Supabase Auth (Requisito 4), no en código propio.
3. NO SE CREA un componente de formulario separado; el formulario de correo/contraseña se implementa directamente dentro de `index.vue`.
4. NO SE MODIFICA `app/pages/dashboard.vue`, `app/components/Sidebar.vue` ni `app/components/UserInfo.vue` (fuera de alcance de esta spec; siguen funcionando igual).
5. TODO el código modificado DEBERÁ usar TypeScript.

## Estructura de archivos (modificados/eliminados)

```
MODIFICADO  app/pages/index.vue          (formulario correo/contraseña en vez del botón de Google)
MODIFICADO  app/composables/useAuth.ts   (+ signInWithEmail, + error; - signInWithGoogle)
ELIMINADO   app/pages/confirm.vue        (solo servía al flujo OAuth de Google)
ELIMINADO   app/components/LoginButton.vue (botón de Google)
SIN CAMBIOS app/middleware/auth.ts
SIN CAMBIOS app/pages/dashboard.vue
SIN CAMBIOS app/components/Sidebar.vue
SIN CAMBIOS app/components/UserInfo.vue
SIN CAMBIOS nuxt.config.ts (bloque `supabase` ya configurado en 02-supabase.md sigue siendo válido)
```

## Diseño

### `app/composables/useAuth.ts` (actualizado)

```ts
export function useAuth() {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function signInWithEmail(email: string, password: string) {
    loading.value = true
    error.value = null

    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })

    loading.value = false

    if (authError) {
      error.value = 'Correo o contraseña incorrectos.'
      return false
    }

    await navigateTo('/dashboard')
    return true
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

  return { user, loading, error, signInWithEmail, signOut, getUser, isAuthenticated }
}
```

### `app/pages/index.vue` (actualizado)

```vue
<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const email = ref('')
const password = ref('')

const { signInWithEmail, loading, error } = useAuth()

async function handleSubmit() {
  await signInWithEmail(email.value, password.value)
}
</script>

<template>
  <div class="flex min-h-screen flex-col items-center justify-center bg-[#F5E6D3] px-4">
    <div class="w-full max-w-sm">
      <h1 class="mb-8 text-center text-2xl font-bold text-[#6B3A2A]">Ferretería SRV</h1>

      <form class="flex flex-col gap-3" @submit.prevent="handleSubmit">
        <input
          v-model="email"
          type="email"
          required
          placeholder="Correo electrónico"
          class="rounded border border-[#D4A574] bg-white px-4 py-2 text-sm placeholder-gray-400 focus:border-[#6B3A2A] focus:outline-none"
        >
        <input
          v-model="password"
          type="password"
          required
          placeholder="Contraseña"
          class="rounded border border-[#D4A574] bg-white px-4 py-2 text-sm placeholder-gray-400 focus:border-[#6B3A2A] focus:outline-none"
        >

        <p v-if="error" class="text-sm text-red-600">{{ error }}</p>

        <button
          type="submit"
          :disabled="loading"
          class="rounded bg-[#6B3A2A] py-2 font-semibold text-white transition-colors hover:bg-[#8B5A3C] disabled:opacity-60"
        >
          {{ loading ? 'Ingresando...' : 'Iniciar sesión' }}
        </button>
      </form>
    </div>
  </div>
</template>
```

### `app/pages/dashboard.vue`, `app/middleware/auth.ts`, `app/components/Sidebar.vue`, `app/components/UserInfo.vue`

Sin cambios respecto a lo ya implementado en `02-supabase.md`. Se listan aquí solo para dejar constancia de que esta spec no los toca.

## Fuera de alcance (esta spec)

- Formulario de registro (`signUp`) — intencionalmente no existe; el registro es exclusivamente manual, vía panel de Supabase.
- Recuperación de contraseña ("olvidé mi contraseña") desde la aplicación. Si un usuario la olvida, el administrador puede restablecerla manualmente desde el panel de Supabase.
- Roles o permisos diferenciados entre usuarios (todas las cuentas creadas manualmente tienen el mismo nivel de acceso).
- Validaciones de fuerza de contraseña en el formulario (la validación de fondo ya la aplica Supabase al crear la cuenta).
- Migrar el control de acceso a una tabla propia con RLS (innecesario: Supabase Auth ya es la fuente de verdad de quién existe como usuario).
- Asignar contraseña a la cuenta que ya se registró con Google (acción manual del administrador, mencionada en el Requisito 5.4, no automatizable por Kiro).

## Tareas de implementación

- [x] 1. Actualizar `app/composables/useAuth.ts`: agregar `signInWithEmail` y `error`; eliminar `signInWithGoogle`.
- [x] 2. Reescribir `app/pages/index.vue` con el formulario de correo/contraseña.
- [x] 3. Eliminar `app/pages/confirm.vue`.
- [x] 4. Eliminar `app/components/LoginButton.vue`.
- [x] 5. Ejecutar `npm run build` y `vue-tsc --noEmit`, verificar ausencia de errores (en particular, que no queden referencias rotas a `LoginButton` o `signInWithGoogle`). (Ambos completados sin errores; `grep` confirmó cero referencias residuales).
- [x] 6. Verificar con curl (sin sesión): `GET /dashboard` → redirect a `/`; `GET /` → `200 OK` con el formulario. (Verificado: `/dashboard` devolvió `302 Found` con `location: /`; `/` devolvió `200 OK` con el formulario renderizado, paleta oficial y manifest/theme-color de la PWA intactos).
- [ ] 7. **Acción manual del usuario (fuera de lo que Kiro ejecuta):** en el panel de Supabase, desactivar "Allow new users to sign up" bajo Authentication → Sign In / Providers → Email.
- [ ] 8. **Acción manual del usuario:** crear al menos una cuenta de prueba desde Authentication → Users → Add user, y verificar que con esas credenciales sí se puede entrar a `/dashboard`, mientras que un correo/contraseña inventado es rechazado.
- [ ] 9. **Acción manual del usuario (opcional):** asignar contraseña a la cuenta ya registrada por Google, si se desea conservar su acceso.

### Notas de verificación (ejecución de esta spec)

- `npm run build` y `npx vue-tsc --noEmit` se ejecutaron sin errores sobre el código final.
- La verificación SSR con `curl` se hizo contra el `.env` real del proyecto (ya configurado por el usuario), confirmando que el middleware sigue funcionando igual que en `02-supabase.md`.
- Las tareas 7, 8 y 9 quedan pendientes porque requieren acceso directo al panel de Supabase del usuario (desactivar autoregistro, crear cuentas de prueba, y opcionalmente asignar contraseña a la cuenta de Google existente). Ninguna de ellas es ejecutable por Kiro.
