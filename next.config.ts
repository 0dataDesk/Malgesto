import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
