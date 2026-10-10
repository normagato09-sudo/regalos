"use client";

import { useEffect, useState } from "react";
import { COLORES, getSupabase, type Perfil } from "@/lib/supabase";
import Avatar from "./Avatar";

type Props = {
  perfil: Perfil;
  onSaved: (p: Perfil) => void;
  onCancel: () => void;
};

export default function EditProfile({ perfil, onSaved, onCancel }: Props) {
  const [nombre, setNombre] = useState(perfil.nombre);
  const [color, setColor] = useState(perfil.color);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Con llaves: en Chrome reciente scrollTo() devuelve una promesa, y si el efecto
  // la devolviera React la trataría como limpieza ("i is not a function").
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    const supabase = getSupabase();
    if (!supabase) return;
    const limpio = nombre.trim();
    if (!limpio) {
      setError("El nombre no puede estar vacío.");
      return;
    }

    setGuardando(true);
    setError(null);
    const { data, error: updErr } = await supabase
      .from("perfiles")
      .update({ nombre: limpio, color })
      .eq("id", perfil.id)
      .select("id, nombre, color, orden")
      .single();
    if (updErr) {
      setError(updErr.message || "No se pudo guardar. Inténtalo otra vez.");
      setGuardando(false);
      return;
    }
    onSaved(data as Perfil);
  }

  return (
    <form className="edit-profile" onSubmit={guardar}>
      <header className="header">
        <h1>Editar perfil</h1>
      </header>

      <div className="edit-preview">
        <Avatar perfil={{ nombre: nombre || perfil.nombre, color }} size={120} />
      </div>

      <div className="field">
        <label htmlFor="perfil-nombre">Nombre</label>
        <input id="perfil-nombre" type="text" value={nombre} maxLength={40}
          onChange={(e) => setNombre(e.target.value)} required />
      </div>

      <div className="field">
        <span className="field-label">Color</span>
        <div className="swatches" role="radiogroup" aria-label="Color del perfil">
          {COLORES.map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={color.toLowerCase() === c}
              aria-label={c}
              className={`swatch${color.toLowerCase() === c ? " selected" : ""}`}
              style={{ background: c }}
              onClick={() => setColor(c)}
            />
          ))}
        </div>
      </div>

      {error && <p className="error">{error}</p>}

      <div className="sheet-actions">
        <button type="button" className="btn-secondary" onClick={onCancel} disabled={guardando}>
          Cancelar
        </button>
        <button type="submit" className="btn-primary" disabled={guardando}>
          {guardando ? "Guardando…" : "Guardar"}
        </button>
      </div>
    </form>
  );
}
