"use client";

import type { Perfil } from "@/lib/supabase";
import Avatar from "./Avatar";
import { PencilIcon } from "./icons";

type Props = {
  perfiles: Perfil[];
  cargando: boolean;
  error: string | null;
  configurado: boolean;
  onPick: (id: string | "familia") => void;
  onEdit: (perfil: Perfil) => void;
  editando: boolean;
  onToggleEdit: () => void;
};

export default function ProfilePicker({
  perfiles, cargando, error, configurado, onPick, onEdit, editando, onToggleEdit,
}: Props) {
  return (
    <>
      <header className="header">
        <h1>{editando ? "Editar perfiles" : "¿Quién eres?"}</h1>
        <p>{editando ? "Toca un perfil para cambiarlo" : "Elige tu perfil para ver tu lista"}</p>
      </header>

      {!configurado && (
        <div className="notice">
          Falta configurar Supabase: copia <code>.env.local.example</code> a <code>.env.local</code> y
          rellena <code>NEXT_PUBLIC_SUPABASE_URL</code> y <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>.
        </div>
      )}
      {error && <div className="notice">No se pudieron cargar los perfiles: {error}</div>}

      {cargando ? (
        <div className="empty-state">Cargando…</div>
      ) : (
        <div className={`profiles${editando ? " editing" : ""}`}>
          {perfiles.map((p) => (
            <button
              key={p.id}
              className="profile"
              onClick={() => (editando ? onEdit(p) : onPick(p.id))}
              aria-label={editando ? `Editar ${p.nombre}` : p.nombre}
            >
              <span className="avatar-wrap">
                <Avatar perfil={p} size={72} />
                {editando && (
                  <span className="pencil" aria-hidden="true">
                    <PencilIcon />
                  </span>
                )}
              </span>
              <span className="profile-name">{p.nombre}</span>
            </button>
          ))}

          <button
            className="profile familia"
            onClick={() => onPick("familia")}
            disabled={editando}
            aria-label="Familia"
          >
            <span className="avatar family-avatar" style={{ width: 72, height: 72 }} aria-hidden="true">
              🏡
            </span>
            <span className="profile-name">Familia</span>
          </button>
        </div>
      )}

      {configurado && !cargando && perfiles.length > 0 && (
        <div className="edit-toggle">
          <button className={editando ? "btn-primary" : "link-btn"} onClick={onToggleEdit}>
            {editando ? "Listo" : "Editar perfiles"}
          </button>
        </div>
      )}
    </>
  );
}
