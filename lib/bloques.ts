// Sin "server-only": esta lógica es pura (sin acceso a DB) y la necesita
// tanto código de servidor (páginas, actions) como CalendarioShell.tsx, que
// es un Client Component — a diferencia de malgestoEventos.ts/gestionData.ts
// que sí acceden a la DB y deben quedar server-only.

export type Membresia = {
  bandaId: string;
  bandaNombre: string;
  color: string;
  // Brief "Rediseño de Ausencias §5": opcional -- si la banda no tiene
  // emoji capturado, el calendario sigue usando el punto de color.
  emoji: string | null;
  // Brief "Selector '¿Qué banda?'...": texto secundario debajo del nombre
  // en la tarjeta de selección -- null si la banda no lo tiene cargado.
  genero: string | null;
  rol: string;
  cancionesHabilitado: boolean;
  setlistHabilitado: boolean;
  seteosHabilitado: boolean;
  finanzasHabilitado: boolean;
  stagePlotHabilitado: boolean;
  bloquesVisibles: string[] | null;
};

// Brief 21 §1-2: bloque opcional de una banda (Calendario nunca se
// restringe, no forma parte de este catálogo). "set_list" con guión bajo
// porque así se persiste en miembros_banda.bloques_visibles.
export type NombreBloque = "canciones" | "set_list" | "seteos" | "finanzas" | "stage_plot";

function bandaTieneBloque(m: Membresia, bloque: NombreBloque): boolean {
  switch (bloque) {
    case "canciones":
      return m.cancionesHabilitado;
    case "set_list":
      return m.setlistHabilitado;
    case "seteos":
      return m.seteosHabilitado;
    case "finanzas":
      return m.finanzasHabilitado;
    case "stage_plot":
      return m.stagePlotHabilitado;
  }
}

// Regla de visibilidad efectiva (Brief 21 §1): la banda debe tener el
// bloque activo Y la persona no debe estar restringida para verlo en esa
// banda puntual. Superadmin nunca se restringe (bloques_visibles es
// irrelevante para superadmin), bloquesVisibles null/vacío = sin
// restricción (ve todo lo que la banda activa).
export function bloqueVisible(m: Membresia, bloque: NombreBloque, superadmin: boolean): boolean {
  if (!bandaTieneBloque(m, bloque)) return false;
  if (superadmin) return true;
  if (!m.bloquesVisibles || m.bloquesVisibles.length === 0) return true;
  return m.bloquesVisibles.includes(bloque);
}

// Para los botones flotantes de navegación: unión de todas las bandas del
// usuario (Brief 21 §2) — un bloque aparece si al menos una banda lo activa
// Y la persona no está restringida para verlo en esa banda específica.
export function algunaBandaConBloque(membresias: Membresia[], bloque: NombreBloque, superadmin: boolean): boolean {
  return membresias.some((m) => bloqueVisible(m, bloque, superadmin));
}

// Para el filtro de "banda activa" de cada página (mismo patrón que ya
// usaban Canciones/Set List/Seteos, ahora con la regla efectiva).
export function membresiasConBloque(membresias: Membresia[], bloque: NombreBloque, superadmin: boolean): Membresia[] {
  return membresias.filter((m) => bloqueVisible(m, bloque, superadmin));
}

// Bloques posibles por banda son Calendario (siempre activo) + los 5
// toggleables -- se cuenta así en vez de a mano en cada uso para que el
// criterio de orden (Gestión > Bandas, y Gestión > Integrantes > Bandas
// asignadas) use la misma fuente. Firma estructural (no `Membresia` ni
// `BandaSimple` directamente) para que sirva para cualquier objeto con estos
// 5 campos sin acoplar este archivo -- sin "server-only" -- a gestionData.ts.
export function contarBloquesActivos(b: {
  cancionesHabilitado: boolean;
  setlistHabilitado: boolean;
  seteosHabilitado: boolean;
  finanzasHabilitado: boolean;
  stagePlotHabilitado: boolean;
}): number {
  return 1 + [b.cancionesHabilitado, b.setlistHabilitado, b.seteosHabilitado, b.finanzasHabilitado, b.stagePlotHabilitado].filter(Boolean).length;
}
