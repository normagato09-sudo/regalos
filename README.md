# Posibles regalos

Listas de deseos de la familia, sin inicio de sesión y pensadas para móvil
(Next.js App Router + Supabase). Se puede instalar como app (PWA).

- **Perfiles personales** (Norma, Martina, Edu, Papá, Mamá al empezar): cada uno ve solo
  su lista y puede añadir y borrar regalos. Nombre, color y foto se editan desde
  "¿Quién eres?" → "Editar perfiles".
- **Familia**: ve las listas de todos, con filtro por persona. Solo lectura y no se edita.

El perfil elegido se guarda en el móvil (localStorage).

## Puesta en marcha

1. Crea un proyecto en [Supabase](https://supabase.com) y ejecuta en el SQL Editor, en este orden:
   - `supabase/schema.sql`: tabla `regalos`, políticas RLS, tiempo real y bucket público `fotos`.
   - `supabase/perfiles.sql`: tabla `perfiles` con los perfiles iniciales y relación
     regalo → perfil por id (migra los regalos existentes; no borra nada y se puede repetir).
2. Copia `.env.local.example` a `.env.local` y rellena la URL y la anon key
   (Project Settings → API).
3. `npm install` y `npm run dev`.

Para desplegar (por ejemplo en Vercel), añade las mismas dos variables de entorno.
