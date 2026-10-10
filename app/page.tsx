"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AddGiftSheet from "@/components/AddGiftSheet";
import Avatar from "@/components/Avatar";
import EditProfile from "@/components/EditProfile";
import GiftCard from "@/components/GiftCard";
import ProfilePicker from "@/components/ProfilePicker";
import { GiftIcon } from "@/components/icons";
import { getSupabase, storagePath, type Perfil, type Regalo } from "@/lib/supabase";
import { usePerfiles } from "@/lib/usePerfiles";

const STORAGE_KEY = "posibles-regalos:perfil";
const FAMILIA = "familia";

// Guarda el id del perfil (o "familia"). Versiones antiguas guardaban el nombre.
function readSeleccion(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function saveSeleccion(v: string | null) {
  try {
    if (v) localStorage.setItem(STORAGE_KEY, v);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* sin almacenamiento: se elige cada vez */
  }
}

export default function Home() {
  const { perfiles, cargando, error, aplicar } = usePerfiles();
  const [ready, setReady] = useState(false);
  const [seleccion, setSeleccion] = useState<string | null>(null);
  const [editandoPerfiles, setEditandoPerfiles] = useState(false);
  const [perfilEnEdicion, setPerfilEnEdicion] = useState<string | null>(null);

  useEffect(() => {
    const v = readSeleccion();
    setSeleccion(v === "Familia" ? FAMILIA : v);
    setReady(true);
  }, []);

  const elegir = useCallback((v: string | null) => {
    saveSeleccion(v);
    setSeleccion(v);
    setEditandoPerfiles(false);
    window.scrollTo(0, 0);
  }, []);

  // Perfil elegido (por id, o por nombre si viene de la versión anterior)
  const perfil = useMemo(
    () =>
      seleccion && seleccion !== FAMILIA
        ? perfiles.find((p) => p.id === seleccion) ?? perfiles.find((p) => p.nombre === seleccion) ?? null
        : null,
    [perfiles, seleccion],
  );

  useEffect(() => {
    if (cargando || !seleccion || seleccion === FAMILIA) return;
    if (perfil && perfil.id !== seleccion) elegir(perfil.id); // migra nombre → id
    else if (!perfil && !error && getSupabase()) elegir(null); // ya no existe
  }, [cargando, seleccion, perfil, error, elegir]);

  const enEdicion = perfilEnEdicion ? perfiles.find((p) => p.id === perfilEnEdicion) : undefined;

  if (!ready) return <main className="wrap" />;

  let contenido: React.ReactNode;
  if (enEdicion) {
    contenido = (
      <EditProfile
        key={enEdicion.id}
        perfil={enEdicion}
        onSaved={(p) => {
          aplicar(p);
          setPerfilEnEdicion(null);
        }}
        onCancel={() => setPerfilEnEdicion(null)}
      />
    );
  } else if (seleccion === FAMILIA) {
    contenido = <Lista perfiles={perfiles} onCambiar={() => elegir(null)} />;
  } else if (perfil) {
    contenido = <Lista perfil={perfil} perfiles={perfiles} onCambiar={() => elegir(null)} />;
  } else if (seleccion && cargando) {
    contenido = <div className="empty-state">Cargando…</div>;
  } else {
    contenido = (
      <ProfilePicker
        perfiles={perfiles}
        cargando={cargando}
        error={error}
        configurado={!!getSupabase()}
        onPick={elegir}
        onEdit={(p) => setPerfilEnEdicion(p.id)}
        editando={editandoPerfiles}
        onToggleEdit={() => setEditandoPerfiles((v) => !v)}
      />
    );
  }

  return <main className="wrap">{contenido}</main>;
}

type ListaProps = {
  // Sin perfil = vista Familia (solo lectura)
  perfil?: Perfil;
  perfiles: Perfil[];
  onCambiar: () => void;
};

function Lista({ perfil, perfiles, onCambiar }: ListaProps) {
  const supabase = getSupabase();
  const esFamilia = !perfil;
  const perfilId = perfil?.id ?? null;
  const [regalos, setRegalos] = useState<Regalo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<string>("todos");
  const [añadiendo, setAñadiendo] = useState(false);

  const porId = useMemo(() => new Map(perfiles.map((p) => [p.id, p])), [perfiles]);

  const cargar = useCallback(async () => {
    if (!supabase) return;
    let q = supabase.from("regalos").select("*").order("created_at", { ascending: false });
    if (perfilId) q = q.eq("perfil_id", perfilId);
    const { data, error } = await q;
    if (error) setError(error.message);
    else {
      setError(null);
      setRegalos((data ?? []) as Regalo[]);
    }
    setCargando(false);
  }, [supabase, perfilId]);

  useEffect(() => {
    if (!supabase) {
      setCargando(false);
      return;
    }
    setCargando(true);
    cargar();

    const canal = supabase
      .channel(`regalos-${perfilId ?? FAMILIA}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "regalos" }, (payload) => {
        if (payload.eventType === "INSERT") {
          const nuevo = payload.new as Regalo;
          if (perfilId && nuevo.perfil_id !== perfilId) return;
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
  }, [supabase, perfilId, cargar]);

  const visibles = useMemo(
    () => (esFamilia && filtro !== "todos" ? regalos.filter((r) => r.perfil_id === filtro) : regalos),
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

  const filtroPerfil = filtro !== "todos" ? porId.get(filtro) : undefined;

  return (
    <>
      <div className="topbar">
        <button className="link-btn" onClick={onCambiar}>Cambiar de perfil</button>
      </div>

      <header className="header">
        {perfil && (
          <div className="header-avatar">
            <Avatar perfil={perfil} size={72} />
          </div>
        )}
        <h1>{perfil ? `Hola, ${perfil.nombre}` : "Posibles regalos"}</h1>
        <p>{perfil ? "Tu lista de deseos" : "Lo que le gustaría a cada uno"}</p>
      </header>

      {error && <div className="notice">No se pudo cargar la lista: {error}</div>}

      {esFamilia && (
        <nav className="filters" aria-label="Filtrar por persona">
          <button
            className={`chip${filtro === "todos" ? " active" : ""}`}
            onClick={() => setFiltro("todos")}
            aria-pressed={filtro === "todos"}
          >
            Todos
          </button>
          {perfiles.map((p) => (
            <button
              key={p.id}
              className={`chip chip-avatar${filtro === p.id ? " active" : ""}`}
              onClick={() => setFiltro(p.id)}
              aria-pressed={filtro === p.id}
            >
              <Avatar perfil={p} size={22} />
              {p.nombre}
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
              ? filtroPerfil
                ? `${filtroPerfil.nombre} todavía no ha añadido regalos.`
                : "Todavía nadie ha añadido regalos."
              : "Aún no tienes regalos. ¡Añade el primero!"}
          </p>
        </div>
      ) : (
        <section className="grid">
          {visibles.map((r) => (
            <GiftCard
              key={r.id}
              regalo={r}
              owner={esFamilia ? porId.get(r.perfil_id) : undefined}
              onDelete={esFamilia ? undefined : borrar}
            />
          ))}
        </section>
      )}

      {perfil && supabase && (
        <div className="fab-bar">
          <button className="btn-primary" onClick={() => setAñadiendo(true)}>+ Añadir regalo</button>
        </div>
      )}

      {añadiendo && perfil && (
        <AddGiftSheet
          perfilId={perfil.id}
          onClose={() => {
            setAñadiendo(false);
            cargar();
          }}
        />
      )}
    </>
  );
}
