"use client";

import { useEffect, useState } from "react";
import { getSupabase, type Persona } from "@/lib/supabase";

type Props = {
  persona: Persona;
  onClose: () => void;
};

// Reduce la foto del móvil antes de subirla (máx. 1200px, JPEG).
async function compress(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const max = 1200;
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", 0.85));
    return blob ?? file;
  } catch {
    return file;
  }
}

function normalizeUrl(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  return /^https?:\/\//i.test(s) ? s : `https://${s}`;
}

export default function AddGiftSheet({ persona, onClose }: Props) {
  const [nombre, setNombre] = useState("");
  const [enlace, setEnlace] = useState("");
  const [nota, setNota] = useState("");
  const [foto, setFoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!foto) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(foto);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [foto]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const supabase = getSupabase();
    if (!supabase) {
      setError("Falta configurar Supabase.");
      return;
    }
    if (!nombre.trim()) {
      setError("Ponle un nombre al regalo.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      let foto_url: string | null = null;
      if (foto) {
        const blob = await compress(foto);
        const ext = blob.type === "image/jpeg" ? "jpg" : foto.name.split(".").pop() || "img";
        const path = `${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("fotos")
          .upload(path, blob, { contentType: blob.type || foto.type, upsert: false });
        if (upErr) throw upErr;
        foto_url = supabase.storage.from("fotos").getPublicUrl(path).data.publicUrl;
      }

      const { error: insErr } = await supabase.from("regalos").insert({
        nombre: nombre.trim(),
        enlace: normalizeUrl(enlace),
        nota: nota.trim() || null,
        foto_url,
        persona,
      });
      if (insErr) throw insErr;
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar. Inténtalo otra vez.");
      setSaving(false);
    }
  }

  return (
    <div className="overlay" onClick={() => !saving && onClose()}>
      <form className="sheet" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h2>Añadir regalo</h2>

        <div className="field">
          <label htmlFor="nombre">Nombre</label>
          <input id="nombre" type="text" value={nombre} onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej. Zapatillas rojas" maxLength={200} autoFocus required />
        </div>

        <div className="field">
          <label htmlFor="enlace">Enlace a la tienda <span className="opt">(opcional)</span></label>
          <input id="enlace" type="text" inputMode="url" autoCapitalize="off" autoCorrect="off"
            value={enlace} onChange={(e) => setEnlace(e.target.value)} placeholder="https://…" />
        </div>

        <div className="field">
          <label htmlFor="foto">Foto <span className="opt">(opcional)</span></label>
          <label className="photo-pick" htmlFor="foto">
            {preview ? <img src={preview} alt="" /> : <span aria-hidden="true">📷</span>}
            <span>{foto ? "Cambiar foto" : "Elegir o hacer una foto"}</span>
          </label>
          <input id="foto" type="file" accept="image/*" hidden
            onChange={(e) => setFoto(e.target.files?.[0] ?? null)} />
        </div>

        <div className="field">
          <label htmlFor="nota">Nota <span className="opt">(opcional)</span></label>
          <textarea id="nota" value={nota} onChange={(e) => setNota(e.target.value)}
            placeholder="Talla, color, lo que sea…" maxLength={500} />
        </div>

        {error && <p className="error">{error}</p>}

        <div className="sheet-actions">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </form>
    </div>
  );
}
