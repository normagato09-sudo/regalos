import type { NextConfig } from "next";

// Identificador de esta versión: el commit en Vercel, o la hora del build en local.
const APP_VERSION = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ?? `local-${Date.now()}`;

const noCache = [
  { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
];

const nextConfig: NextConfig = {
  env: { APP_VERSION },
  async headers() {
    return [
      // Sin caché para que el navegador detecte siempre las versiones nuevas
      {
        source: "/sw.js",
        headers: [
          ...noCache,
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      { source: "/sw-version.js", headers: noCache },
    ];
  },
};

export default nextConfig;
