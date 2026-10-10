import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const PERSONAS = ["Norma", "Martina", "Edu", "Papá", "Mamá"] as const;
export type Persona = (typeof PERSONAS)[number];
export type Perfil = Persona | "Familia";
export const PERFILES: Perfil[] = [...PERSONAS, "Familia"];

export type Regalo = {
  id: string;
  nombre: string;
  enlace: string | null;
  foto_url: string | null;
  nota: string | null;
  persona: Persona;
  created_at: string;
};

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
