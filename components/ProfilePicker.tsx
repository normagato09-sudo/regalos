"use client";

import { PERFILES, type Perfil } from "@/lib/supabase";

const EMOJI: Record<Perfil, string> = {
  Norma: "🌸",
  Martina: "🌼",
  Edu: "⚽",
  Papá: "🧔",
  Mamá: "💐",
  Familia: "🏡",
};

export default function ProfilePicker({ onPick }: { onPick: (p: Perfil) => void }) {
  return (
    <>
      <header className="header">
        <h1>¿Quién eres?</h1>
        <p>Elige tu perfil para ver tu lista</p>
      </header>
      <div className="profiles">
        {PERFILES.map((p) => (
          <button
            key={p}
            className={`profile${p === "Familia" ? " familia" : ""}`}
            onClick={() => onPick(p)}
          >
            <span className="avatar" aria-hidden="true">{EMOJI[p]}</span>
            {p}
          </button>
        ))}
      </div>
    </>
  );
}
