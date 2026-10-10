"use client";

import type { Perfil, Regalo } from "@/lib/supabase";
import Avatar from "./Avatar";
import { GiftIcon, TrashIcon } from "./icons";

type Props = {
  regalo: Regalo;
  // En Familia: de quién es el regalo
  owner?: Perfil;
  onDelete?: (r: Regalo) => void;
};

export default function GiftCard({ regalo, owner, onDelete }: Props) {
  return (
    <article className="card">
      {regalo.foto_url ? (
        <img className="photo" src={regalo.foto_url} alt={regalo.nombre} loading="lazy" />
      ) : (
        <div className="photo empty">
          <GiftIcon />
        </div>
      )}

      {onDelete && (
        <button className="trash" onClick={() => onDelete(regalo)} aria-label={`Borrar ${regalo.nombre}`}>
          <TrashIcon />
        </button>
      )}

      <div className="body">
        {owner && (
          <div className="owner">
            <Avatar perfil={owner} size={22} />
            <span>Lo quiere {owner.nombre}</span>
          </div>
        )}
        <div className="name">{regalo.nombre}</div>
        {regalo.nota && <div className="note">{regalo.nota}</div>}
        <div className="spacer" />
        {regalo.enlace ? (
          <a className="btn-primary" href={regalo.enlace} target="_blank" rel="noopener noreferrer">
            Ver producto
          </a>
        ) : (
          <div className="no-link">Sin enlace</div>
        )}
      </div>
    </article>
  );
}
