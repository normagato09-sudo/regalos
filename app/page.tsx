"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AddGiftSheet from "@/components/AddGiftSheet";
import GiftCard from "@/components/GiftCard";
import ProfilePicker from "@/components/ProfilePicker";
import { GiftIcon } from "@/components/icons";
import { getSupabase, PERFILES, PERSONAS, type Perfil, type Persona, type Regalo } from "@/lib/supabase";

const STORAGE_KEY = "posibles-regalos:perfil";

function readPerfil(): Perfil | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v && (PERFILES as string[]).includes(v) ? (v as Perfil) : null;
  } catch {
    return null;
  }
}

function savePerfil(p: Perfil | null) {
  try {
    if (p) localStorage.setItem(STORAGE_KEY, p);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* sin almacenamiento: se elige cada vez */
  }
}

// Ruta del archivo dentro del bucket a partir de su URL pública.
function storagePath(url: string): string | null {
  const marker = "/storage/v1/object/public/fotos/";
  const i = url.indexOf(marker);
  return i === -1 ? null : decodeURIComponent(url.slice(i + marker.length));
}

export default function Home() {
  const [ready, setReady] = useState(false);
  const [perfil, setPerfil] = useState<Perfil | null>(null);

  useEffect(() => {
    setPerfil(readPerfil());
    setReady(true);
  }, []);

  const elegir = (p: Perfil | null) => {
    savePerfil(p);
    setPerfil(p);
    window.scrollTo(0, 0);
  };

  if (!ready) return <main className="wrap" />;

  return (
    <main className="wrap">
      {perfil ? (
        <Lista perfil={perfil} onCambiar={() => elegir(null)} />
      ) : (
        <ProfilePicker onPick={elegir} />
      )}
    </main>
  );
}

function Lista({ perfil, onCambiar }: { perfil: Perfil; onCambiar: () => void }) {
  const supabase = getSupabase();
  const esFamilia = perfil === "Familia";
  const [regalos, setRegalos] = useState<Regalo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<Persona | "Todos">("Todos");
  const [añadiendo, setAñadiendo] = useState(false);

  const cargar = useCallback(async () => {
    if (!supabase) return;
    let q = supabase.from("regalos").select("*").order("created_at", { ascending: false });
    if (!esFamilia) q = q.eq("persona", perfil);
    const { data, error } = await q;
    if (error) setError(error.message);
    else {
      setError(null);
      setRegalos((data ?? []) as Regalo[]);
    }
    setCargando(false);
  }, [supabase, esFamilia, perfil]);

  useEffect(() => {
    if (!supabase) {
      setCargando(false);
      return;
    }
    setCargando(true);
    cargar();

    const canal = supabase
      .channel(`regalos-${perfil}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "regalos" }, (payload) => {
        if (payload.eventType === "INSERT") {
          const nuevo = payload.new as Regalo;
          if (!esFamilia && nuevo.persona !== perfil) return;
          setRegalos((prev) => (prev.some((r) => r.id === nuevo.id) ? prev : [nuevo, ...prev]));
        } else if (payload.eventType === "DELETE") {
          const id = (payload.old as Partial<Regalo>).id;
          setRegalos((prev) => prev.filter((r) => r.id !== id));
        } else {
          cargar();
        }
      })
      .subscribe();

    // Al volver a la app en el móvil, refresca por si se perdió algún evento.
    const alVolver = () => document.visibilityState === "visible" && cargar();
    document.addEventListener("visibilitychange", alVolver);

    return () => {
      document.removeEventListener("visibilitychange", alVolver);
      supabase.removeChannel(canal);
    };
  }, [supabase, perfil, esFamilia, cargar]);

  const visibles = useMemo(
    () => (esFamilia && filtro !== "Todos" ? regalos.filter((r) => r.persona === filtro) : regalos),
    [regalos, esFamilia, filtro],
  );

  async function borrar(r: Regalo) {
    if (!supabase) return;
    if (!window.confirm(`¿Borrar "${r.nombre}" de tu lista?`)) return;
    const anteriores = regalos;
    setRegalos((prev) => prev.filter((x) => x.id !== r.id));
    const { error } = await supabase.from("regalos").delete().eq("id", r.id);
    if (error) {
      setRegalos(anteriores);
      window.alert("No se pudo borrar: " + error.message);
      return;
    }
    const path = r.foto_url && storagePath(r.foto_url);
    if (path) await supabase.storage.from("fotos").remove([path]);
  }

  return (
    <>
      <div className="topbar">
        <button className="link-btn" onClick={onCambiar}>Cambiar de perfil</button>
      </div>

      <header className="header">
        <h1>{esFamilia ? "Posibles regalos" : `Hola, ${perfil}`}</h1>
        <p>{esFamilia ? "Lo que le gustaría a cada uno" : "Tu lista de deseos"}</p>
      </header>

      {!supabase && (
        <div className="notice">
          Falta configurar Supabase: copia <code>.env.local.example</code> a <code>.env.local</code> y
          rellena <code>NEXT_PUBLIC_SUPABASE_URL</code> y <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>.
        </div>
      )}
      {error && <div className="notice">No se pudo cargar la lista: {error}</div>}

      {esFamilia && (
        <nav className="filters" aria-label="Filtrar por persona">
          {(["Todos", ...PERSONAS] as const).map((p) => (
            <button
              key={p}
              className={`chip${filtro === p ? " active" : ""}`}
              onClick={() => setFiltro(p)}
              aria-pressed={filtro === p}
            >
              {p}
            </button>
          ))}
        </nav>
      )}

      {cargando ? (
        <div className="empty-state">Cargando…</div>
      ) : visibles.length === 0 ? (
        <div className="empty-state">
          <div className="big"><GiftIcon size={48} /></div>
          <p>
            {esFamilia
              ? filtro === "Todos"
                ? "Todavía nadie ha añadido regalos."
                : `${filtro} todavía no ha añadido regalos.`
              : "Aún no tienes regalos. ¡Añade el primero!"}
          </p>
        </div>
      ) : (
        <section className="grid">
          {visibles.map((r) => (
            <GiftCard
              key={r.id}
              regalo={r}
              showOwner={esFamilia}
              onDelete={esFamilia ? undefined : borrar}
            />
          ))}
        </section>
      )}

      {!esFamilia && supabase && (
        <div className="fab-bar">
          <button className="btn-primary" onClick={() => setAñadiendo(true)}>+ Añadir regalo</button>
        </div>
      )}

      {añadiendo && !esFamilia && (
        <AddGiftSheet
          persona={perfil}
          onClose={() => {
            setAñadiendo(false);
            cargar();
          }}
        />
      )}
    </>
  );
}
