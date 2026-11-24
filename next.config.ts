import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // El Mapa del EP pasó a llamarse Musical (24/11/26): la dirección vieja redirige.
  async redirects() {
    return [
      { source: "/ep", destination: "/musical", permanent: true },
    ];
  },
  // El bucket `presskit` acepta imágenes de hasta 10MB (Brief "Presskit —
  // vista de captura de datos") -- la subida va por Server Action
  // (subirFotoPresskitAction), cuyo límite de body default (1MB) es
  // insuficiente para eso.
  experimental: {
    serverActions: {
      bodySizeLimit: "12mb",
    },
  },
};

export default nextConfig;
