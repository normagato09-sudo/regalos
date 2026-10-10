import type { Perfil } from "@/lib/supabase";

type Props = {
  perfil: Pick<Perfil, "nombre" | "color">;
  size?: number;
};

// Inicial del nombre sobre el color del perfil
export default function Avatar({ perfil, size = 56 }: Props) {
  const inicial = perfil.nombre.trim().charAt(0).toUpperCase() || "?";
  return (
    <span
      className="avatar"
      style={{ width: size, height: size, background: perfil.color, fontSize: size * 0.42 }}
      aria-hidden="true"
    >
      {inicial}
    </span>
  );
}
