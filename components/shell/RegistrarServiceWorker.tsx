"use client";

import { useEffect } from "react";

// Registra el service worker para que el navegador ofrezca instalar la app.
export function RegistrarServiceWorker() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
  }, []);
  return null;
}
