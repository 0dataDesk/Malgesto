// Sin "server-only": esta lógica es pura (sin acceso a DB) y la necesita
// tanto código de servidor (páginas, actions) como CalendarioShell.tsx, que
// es un Client Component — a diferencia de malgestoEventos.ts/gestionData.ts
// que sí acceden a la DB y deben quedar server-only.

export type Membresia = {
  bandaId: string;
  bandaNombre: string;
  rol: string;
  cancionesHabilitado: boolean;
  setlistHabilitado: boolean;
  seteosHabilitado: boolean;
  finanzasHabilitado: boolean;
  bloquesVisibles: string[] | null;
};

// Brief 21 §1-2: bloque opcional de una banda (Calendario nunca se
// restringe, no forma parte de este catálogo). "set_list" con guión bajo
// porque así se persiste en miembros_banda.bloques_visibles.
export type NombreBloque = "canciones" | "set_list" | "seteos" | "finanzas";

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
