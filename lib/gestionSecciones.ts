// Sin "use client": necesita ser importable desde app/gestion/page.tsx
// (server) sin cruzar el boundary de cliente — un export nombrado desde un
// módulo "use client" llega al server como referencia de hidratación, no
// como el valor real (eso rompió /gestion entero: "SECCIONES.includes is
// not a function", digest 3681979226).
export const SECCIONES = ["bandas", "integrantes", "lugares"] as const;
export type Seccion = (typeof SECCIONES)[number];
