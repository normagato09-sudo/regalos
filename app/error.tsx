"use client";

import { useEffect } from "react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="wrap">
      <header className="header">
        <h1>Algo ha fallado</h1>
        <p>No te preocupes, tus regalos están a salvo.</p>
      </header>
      <div className="notice">{error.message || "Error desconocido"}</div>
      <div className="edit-toggle">
        <button className="btn-primary" onClick={reset}>Volver a intentar</button>
      </div>
    </main>
  );
}
