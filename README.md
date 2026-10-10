# Posibles regalos

Listas de deseos de la familia, sin inicio de sesión y pensadas para móvil
(Next.js App Router + Supabase).

- **Norma, Martina, Edu, Papá, Mamá**: cada uno ve solo su lista y puede añadir y borrar regalos.
- **Familia**: ve las listas de todos, con filtro por persona. Solo lectura.

El perfil elegido se guarda en el móvil (localStorage).

## Puesta en marcha

1. Crea un proyecto en [Supabase](https://supabase.com) y ejecuta `supabase/schema.sql`
   en el SQL Editor (crea la tabla `regalos`, las políticas RLS, el tiempo real y el bucket público `fotos`).
2. Copia `.env.local.example` a `.env.local` y rellena la URL y la anon key
   (Project Settings → API).
3. `npm install` y `npm run dev`.

Para desplegar (por ejemplo en Vercel), añade las mismas dos variables de entorno.
