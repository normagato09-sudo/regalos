import type { Perfil } from "@/lib/supabase";

type Props = {
  perfil: Pick<Perfil, "nombre" | "color" | "foto_url">;
  size?: number;
  // Para la vista previa al editar (foto aún sin subir)
  src?: string | null;
};

export default function Avatar({ perfil, size = 56, src }: Props) {
  const foto = src !== undefined ? src : perfil.foto_url;
  const inicial = perfil.nombre.trim().charAt(0).toUpperCase() || "?";
  return (
    <span
      className="avatar"
      style={{ width: size, height: size, background: perfil.color, fontSize: size * 0.42 }}
      aria-hidden="true"
    >
      {foto ? <img src={foto} alt="" /> : inicial}
    </span>
  );
}
