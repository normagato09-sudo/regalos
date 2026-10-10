"use client";

import { useEffect, useRef, useState } from "react";
import { COLORES, getSupabase, storagePath, type Perfil } from "@/lib/supabase";
import Avatar from "./Avatar";

type Props = {
  perfil: Perfil;
  onSaved: (p: Perfil) => void;
  onCancel: () => void;
};

// Recorta la foto al cuadrado central y la reduce a 400x400 (JPEG).
async function recortarCuadrada(file: File, lado = 400): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const s = Math.min(bitmap.width, bitmap.height);
  const sx = (bitmap.width - s) / 2;
  const sy = (bitmap.height - s) / 2;
  const canvas = document.createElement("canvas");
  canvas.width = lado;
  canvas.height = lado;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, sx, sy, s, s, 0, 0, lado, lado);
  bitmap.close();
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", 0.88));
  if (!blob) throw new Error("No se pudo procesar la foto.");
  return blob;
}

export default function EditProfile({ perfil, onSaved, onCancel }: Props) {
  const [nombre, setNombre] = useState(perfil.nombre);
  const [color, setColor] = useState(perfil.color);
  // undefined = sin cambios · null = quitar foto · Blob = foto nueva
  const [foto, setFoto] = useState<Blob | null | undefined>(undefined);
  const [preview, setPreview] = useState<string | null>(null);
  const [procesando, setProcesando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!(foto instanceof Blob)) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(foto);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [foto]);

  useEffect(() => window.scrollTo(0, 0), []);

  const fotoVisible = foto === undefined ? perfil.foto_url : foto === null ? null : preview;

  async function elegirFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // permite volver a elegir la misma foto
    if (!file) return;
    setProcesando(true);
    setError(null);
    try {
      setFoto(await recortarCuadrada(file));
    } catch {
      setError("No se pudo leer esa foto. Prueba con otra.");
    } finally {
      setProcesando(false);
    }
  }

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
    try {
      let foto_url = perfil.foto_url;
      if (foto instanceof Blob) {
        const path = `perfiles/${perfil.id}-${crypto.randomUUID()}.jpg`;
        const { error: upErr } = await supabase.storage
          .from("fotos")
          .upload(path, foto, { contentType: "image/jpeg", upsert: false });
        if (upErr) throw upErr;
        foto_url = supabase.storage.from("fotos").getPublicUrl(path).data.publicUrl;
      } else if (foto === null) {
        foto_url = null;
      }

      const { data, error: updErr } = await supabase
        .from("perfiles")
        .update({ nombre: limpio, color, foto_url })
        .eq("id", perfil.id)
        .select("id, nombre, color, foto_url, orden")
        .single();
      if (updErr) throw updErr;

      // Borra la foto anterior si se ha cambiado o quitado
      if (perfil.foto_url && perfil.foto_url !== foto_url) {
        const viejo = storagePath(perfil.foto_url);
        if (viejo) await supabase.storage.from("fotos").remove([viejo]);
      }

      onSaved(data as Perfil);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar. Inténtalo otra vez.");
      setGuardando(false);
    }
  }

  const ocupado = guardando || procesando;

  return (
    <form className="edit-profile" onSubmit={guardar}>
      <header className="header">
        <h1>Editar perfil</h1>
      </header>

      <div className="edit-photo">
        <Avatar perfil={{ nombre: nombre || perfil.nombre, color, foto_url: null }} size={160} src={fotoVisible} />
        <div className="edit-photo-actions">
          <button type="button" className="btn-primary" onClick={() => inputRef.current?.click()} disabled={ocupado}>
            {procesando ? "Preparando…" : "Cambiar foto"}
          </button>
          {fotoVisible && (
            <button type="button" className="link-btn" onClick={() => setFoto(null)} disabled={ocupado}>
              Quitar foto
            </button>
          )}
        </div>
        {/* Sin "capture": el móvil deja elegir entre galería y cámara */}
        <input ref={inputRef} type="file" accept="image/*" hidden onChange={elegirFoto} />
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
        <button type="submit" className="btn-primary" disabled={ocupado}>
          {guardando ? "Guardando…" : "Guardar"}
        </button>
      </div>
    </form>
  );
}
