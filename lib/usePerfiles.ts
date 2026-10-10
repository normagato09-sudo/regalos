"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabase, type Perfil } from "./supabase";

// Perfiles de la tabla "perfiles", actualizados en directo.
export function usePerfiles() {
  const supabase = getSupabase();
  const [perfiles, setPerfiles] = useState<Perfil[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from("perfiles")
      .select("id, nombre, color, orden")
      .order("orden")
      .order("created_at");
    if (error) setError(error.message);
    else {
      setError(null);
      setPerfiles((data ?? []) as Perfil[]);
    }
    setCargando(false);
  }, [supabase]);

  useEffect(() => {
    if (!supabase) {
      setCargando(false);
      return;
    }
    cargar();

    const canal = supabase
      .channel("perfiles")
      .on("postgres_changes", { event: "*", schema: "public", table: "perfiles" }, (payload) => {
        if (payload.eventType === "UPDATE") {
          const p = payload.new as Perfil;
          setPerfiles((prev) => prev.map((x) => (x.id === p.id ? { ...x, ...p } : x)));
        } else {
          cargar();
        }
      })
      .subscribe();

    const alVolver = () => document.visibilityState === "visible" && cargar();
    document.addEventListener("visibilitychange", alVolver);

    return () => {
      document.removeEventListener("visibilitychange", alVolver);
      supabase.removeChannel(canal);
    };
  }, [supabase, cargar]);

  // Para reflejar al instante lo que acabo de guardar (sin esperar al tiempo real)
  const aplicar = useCallback((p: Perfil) => {
    setPerfiles((prev) => prev.map((x) => (x.id === p.id ? p : x)));
  }, []);

  return { perfiles, cargando, error, aplicar };
}
