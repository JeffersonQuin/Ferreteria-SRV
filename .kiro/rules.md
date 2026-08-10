# Reglas del Proyecto - Ferretería SRV

## Stack Tecnológico
- Framework: Nuxt 3 (Fullstack, Composition API, `<script setup>`)
- Backend/DB: Supabase (Auth + PostgreSQL + RLS)
- Estilos: Tailwind CSS
- PWA: @vite-pwa/nuxt

## Paleta de Colores Exclusiva
- Principal: #6B3A2A (Café oscuro)
- Secundario: #8B5A3C (Café medio)
- Acento: #D4A574 (Dorado/Arena)
- Fondo: #F5E6D3 (Crema claro)

## Restricciones de Código
- NO crear estructuras complejas de archivos si no se solicitan explícitamente.
- Priorizar la carpeta `pages/` y `components/` nativas de Nuxt.
- Usar siempre TypeScript y manejar estados de carga (`loading`) y error en Supabase.