# Spec 01: Configuración PWA - Ferretería SRV

## Introducción

La aplicación Ferretería SRV debe funcionar como Progressive Web App (PWA), permitiendo su instalación en dispositivos móviles y de escritorio, con soporte offline básico y una identidad visual consistente con la paleta de colores café definida en `.kiro/rules.md`. La implementación usará el módulo oficial `@vite-pwa/nuxt` (ya presente en `package.json`), evitando estructuras de archivos innecesarias.

## Objetivo

Registrar y configurar `@vite-pwa/nuxt` en `nuxt.config.ts` para que la app sea instalable, tenga un manifest.webmanifest válido con la marca "Ferretería SRV", iconos propios y un service worker que cachee los assets estáticos (estrategia `generateSW`), sin romper el flujo de desarrollo (`nuxt dev`).

## Requisitos (formato EARS)

### Requisito 1: Registro del módulo PWA
**User Story:** Como desarrollador, quiero que `@vite-pwa/nuxt` esté registrado en la configuración de Nuxt, para que el proyecto genere automáticamente el manifest y el service worker en el build.

**Criterios de aceptación:**
1. CUANDO se inspeccione `nuxt.config.ts` ENTONCES el arreglo `modules` DEBERÁ incluir `'@vite-pwa/nuxt'`.
2. CUANDO se ejecute `npm run build` ENTONCES el sistema DEBERÁ generar `manifest.webmanifest` y `sw.js` en la carpeta de salida (`.output/public`).
3. SI el módulo no está instalado en `package.json` ENTONCES el sistema DEBERÁ reportar el error de forma clara antes de continuar (no aplica aquí: ya está en dependencias v1.1.1).

### Requisito 2: Manifest con identidad de marca
**User Story:** Como usuario final, quiero que al instalar la app en mi dispositivo se muestre el nombre, ícono y colores de Ferretería SRV, para reconocerla fácilmente.

**Criterios de aceptación:**
1. CUANDO se genere el manifest ENTONCES `name` DEBERÁ ser `"Ferretería SRV"` y `short_name` DEBERÁ ser `"Ferretería SRV"` o `"FerreSRV"` (máx. 12 caracteres recomendado).
2. CUANDO se genere el manifest ENTONCES `theme_color` DEBERÁ ser `#6B3A2A` (café oscuro) y `background_color` DEBERÁ ser `#F5E6D3` (crema claro).
3. CUANDO se genere el manifest ENTONCES `display` DEBERÁ ser `"standalone"` y `start_url` DEBERÁ ser `"/"`.
4. CUANDO se genere el manifest ENTONCES DEBERÁ incluir al menos un ícono de `192x192` y uno de `512x512`, además de un ícono `maskable` de `512x512`.
5. CUANDO el navegador lea la etiqueta `<meta name="theme-color">` ENTONCES DEBERÁ coincidir con `#6B3A2A`.

### Requisito 3: Soporte offline básico
**User Story:** Como usuario final, quiero poder abrir la app aunque tenga conexión intermitente, para consultar información ya cargada previamente.

**Criterios de aceptación:**
1. CUANDO se compile la app en modo producción ENTONCES el service worker DEBERÁ precachear los assets estáticos generados por Nuxt (`_nuxt/**`, HTML, CSS, JS) usando la estrategia `generateSW` de Workbox.
2. CUANDO el usuario navegue sin conexión después de la primera visita ENTONCES la shell de la aplicación DEBERÁ seguir cargando (sin garantizar datos dinámicos de Supabase).
3. CUANDO haya una nueva versión desplegada ENTONCES el sistema DEBERÁ usar `registerType: 'autoUpdate'` para actualizar el service worker sin requerir intervención manual del usuario.

### Requisito 4: Experiencia en desarrollo
**User Story:** Como desarrollador, quiero poder probar el comportamiento PWA en `nuxt dev` sin afectar el rendimiento habitual del entorno de desarrollo.

**Criterios de aceptación:**
1. CUANDO se ejecute `npm run dev` ENTONCES el PWA DEBERÁ estar deshabilitado por defecto salvo que se habilite explícitamente `devOptions.enabled`.
2. SI se habilita `devOptions.enabled` ENTONCES el sistema DEBERÁ usar `devOptions.type: 'module'` para evitar advertencias de compatibilidad en navegadores modernos.

### Requisito 5: No romper convenciones del proyecto
**User Story:** Como equipo de desarrollo, quiero que la configuración PWA no introduzca carpetas o archivos innecesarios, para mantener la estructura simple establecida en `.kiro/rules.md`.

**Criterios de aceptación:**
1. CUANDO se implemente esta spec ENTONCES los únicos archivos nuevos permitidos DEBERÁN ser: `nuxt.config.ts` (modificado) y los íconos PWA dentro de `public/` (o `public/icons/`).
2. CUANDO se agreguen íconos ENTONCES DEBERÁN ubicarse en `public/` para que Nuxt los sirva como assets estáticos sin procesamiento adicional.

## Diseño

### Alcance técnico
- Módulo: `@vite-pwa/nuxt` (ya está en `dependencies`, versión `^1.1.1`).
- Estrategia de service worker: `generateSW` (por defecto del módulo, no requiere `injectManifest`).
- Registro: `registerType: 'autoUpdate'`.
- Iconos: se generan manualmente o con una herramienta (ej. `pwa-asset-generator`) a partir del logo de Ferretería SRV, usando el café oscuro `#6B3A2A` como color de fondo si el logo tiene transparencia.

### Configuración propuesta en `nuxt.config.ts`

```ts
// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: [
    '@vite-pwa/nuxt'
  ],
  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: 'Ferretería SRV',
      short_name: 'Ferretería SRV',
      description: 'Gestión y catálogo de la Ferretería SRV',
      theme_color: '#6B3A2A',
      background_color: '#F5E6D3',
      display: 'standalone',
      start_url: '/',
      lang: 'es',
      icons: [
        {
          src: 'pwa-192x192.png',
          sizes: '192x192',
          type: 'image/png'
        },
        {
          src: 'pwa-512x512.png',
          sizes: '512x512',
          type: 'image/png'
        },
        {
          src: 'maskable-icon-512x512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable'
        }
      ]
    },
    workbox: {
      navigateFallback: '/',
      globPatterns: ['**/*.{js,css,html,png,svg,ico,woff2}']
    },
    devOptions: {
      enabled: false,
      type: 'module'
    }
  }
})
```

### Iconos requeridos en `public/`
| Archivo | Tamaño | Uso |
|---|---|---|
| `pwa-192x192.png` | 192x192 | Icono estándar Android/Chrome |
| `pwa-512x512.png` | 512x512 | Icono estándar de alta resolución |
| `maskable-icon-512x512.png` | 512x512 | Icono adaptable (safe zone) para Android |
| `favicon.ico` | ya existe | Favicon del navegador (sin cambios) |

Todos los íconos deben usar la paleta de marca: fondo café oscuro (`#6B3A2A`) o crema (`#F5E6D3`) con el logo/isotipo de la ferretería en dorado/arena (`#D4A574`) si aplica.

### Registro del manifest en la app
En `app/app.vue` se debe añadir el componente `<VitePwaManifest />` (o `<NuxtPwaManifest />`) para que el `<link rel="manifest">` se inyecte en el `<head>`:

```vue
<template>
  <div>
    <VitePwaManifest />
    <NuxtRouteAnnouncer />
    <NuxtWelcome />
  </div>
</template>
```

### Fuera de alcance (esta spec)
- Lógica de UI para mostrar el prompt de instalación (`$pwa.showInstallPrompt`) o el aviso de actualización (`$pwa.needRefresh`).
- Estrategias de caché avanzadas para datos de Supabase (offline-first de datos).
- Generación automática de los íconos (se asume que se proveerán manualmente o vía herramienta externa).

## Tareas de implementación

- [x] 1. Agregar `'@vite-pwa/nuxt'` al arreglo `modules` en `nuxt.config.ts`.
- [x] 2. Configurar el bloque `pwa` en `nuxt.config.ts` con `manifest`, `workbox`, `registerType` y `devOptions` según el diseño anterior.
- [x] 3. Generar/colocar en `public/` los archivos `pwa-192x192.png`, `pwa-512x512.png` y `maskable-icon-512x512.png` con la paleta café/crema/dorado.
- [x] 4. Añadir `<VitePwaManifest />` en `app/app.vue`.
- [x] 5. Ejecutar `npm run build` y verificar que se generen `manifest.webmanifest` y `sw.js` en `.output/public`.
- [x] 6. Verificar en el navegador (DevTools → Application → Manifest) que `theme_color`, `background_color`, `name` e íconos se muestren correctamente. (Verificado vía HTML renderizado por SSR: `<meta name="theme-color" content="#6B3A2A">` y `<link rel="manifest" href="/manifest.webmanifest">` presentes; contenido de `manifest.webmanifest` confirmado con los valores correctos).
- [ ] 7. (Opcional) Habilitar `devOptions.enabled: true` temporalmente para probar el comportamiento PWA en `npm run dev`, y desactivarlo antes de continuar con otras specs.
