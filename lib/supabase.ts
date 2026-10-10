import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type Perfil = {
  id: string;
  nombre: string;
  color: string;
  foto_url: string | null;
  orden: number;
};

export type Regalo = {
  id: string;
  nombre: string;
  enlace: string | null;
  foto_url: string | null;
  nota: string | null;
  perfil_id: string;
  created_at: string;
};

// Colores para los perfiles (cálidos, combinan con la app y llevan texto blanco)
export const COLORES = ["#c0392b", "#d35400", "#b8860b", "#5b8a3c", "#2e8b84", "#3b6ea5", "#8e4b8e"];

let client: SupabaseClient | null = null;

// Se crea bajo demanda para que el build no falle si faltan las variables.
export function getSupabase(): SupabaseClient | null {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  client = createClient(url, key);
  return client;
}

// Ruta del archivo dentro del bucket "fotos" a partir de su URL pública.
export function storagePath(url: string): string | null {
  const marker = "/storage/v1/object/public/fotos/";
  const i = url.indexOf(marker);
  return i === -1 ? null : decodeURIComponent(url.slice(i + marker.length).split("?")[0]);
}
