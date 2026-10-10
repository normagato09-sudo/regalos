"use client";

import { useEffect, useRef, useState } from "react";

export default function ServiceWorker() {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
  const [updating, setUpdating] = useState(false);
  const regRef = useRef<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    // En desarrollo no queremos caché: quita cualquier service worker anterior.
    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((r) => r.unregister()));
      return;
    }

    let cancelled = false;

    const watch = (reg: ServiceWorkerRegistration) => {
      // Solo avisamos si ya había una versión controlando la página (no en la primera instalación).
      if (reg.waiting && navigator.serviceWorker.controller) setWaiting(reg.waiting);

      reg.addEventListener("updatefound", () => {
        const nuevo = reg.installing;
        if (!nuevo) return;
        nuevo.addEventListener("statechange", () => {
          if (nuevo.state === "installed" && navigator.serviceWorker.controller && !cancelled) {
            setWaiting(nuevo);
          }
        });
      });
    };

    const check = () => {
      regRef.current?.update().catch(() => {});
    };

    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then((reg) => {
        if (cancelled) return;
        regRef.current = reg;
        watch(reg);
        check(); // comprobar al abrir la app
      })
      .catch(() => {});

    // ...y cada vez que vuelve a primer plano
    const onVisible = () => document.visibilityState === "visible" && check();
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  function actualizar() {
    if (!waiting) return;
    setUpdating(true);
    let recargado = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (recargado) return;
      recargado = true;
      window.location.reload();
    });
    waiting.postMessage({ type: "SKIP_WAITING" });
  }

  if (!waiting) return null;

  return (
    <div className="update-toast" role="status">
      <span>Hay una versión nueva</span>
      <button className="btn-primary" onClick={actualizar} disabled={updating}>
        {updating ? "Actualizando…" : "Actualizar"}
      </button>
    </div>
  );
}
