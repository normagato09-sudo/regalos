// Lo importa public/sw.js. Cambia en cada build, así el navegador detecta
// que hay una versión nueva del service worker.
export const dynamic = "force-static";

export function GET() {
  const version = process.env.APP_VERSION ?? "dev";
  return new Response(`self.APP_VERSION = ${JSON.stringify(version)};\n`, {
    headers: { "Content-Type": "application/javascript; charset=utf-8" },
  });
}
