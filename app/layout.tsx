import type { Metadata, Viewport } from "next";
import ServiceWorker from "@/components/ServiceWorker";
import "./globals.css";

export const metadata: Metadata = {
  title: "Posibles regalos",
  description: "Las listas de deseos de la familia",
  applicationName: "Posibles regalos",
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  // Genera apple-mobile-web-app-capable, -title y -status-bar-style
  appleWebApp: {
    capable: true,
    title: "Regalos",
    statusBarStyle: "default",
  },
  other: {
    // Next solo emite "mobile-web-app-capable"; algunos iOS aún miran la versión con prefijo
    "apple-mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf6f0" },
    { media: "(prefers-color-scheme: dark)", color: "#1c1816" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}
