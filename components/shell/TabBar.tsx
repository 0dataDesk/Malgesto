"use client";

import { useState } from "react";
import Link from "next/link";
import { cerrarSesion } from "@/app/auth/actions";
import { useOcultarAlScrollear } from "@/lib/useOcultarAlScrollear";

// Brief 18 §4: la barra inferior de 4 pestañas (fija, ~70px de alto) se
// reemplaza por botones flotantes — mismo patrón visual que Gestión/Cerrar
// sesión (círculo de 36px), agrupados en su propia esquina para no sentirse
// amontonados con ese otro cluster, y liberando el espacio vertical fijo que
// ocupaba la barra en cada una de las 4 vistas principales.
//
// Brief "Colores de calendario, botón Hoy...": el menú de vistas se mudó de
// abajo-derecha a arriba-centrado (§4), y Gestión/Cerrar sesión ahora se
// ocultan al scrollear igual que la fila "Todas tus bandas" de Calendario
// (§6). Brief "Colapsar el espacio superior reservado...": el hook
// useOcultarAlScrollear se mudó a lib/ para que EspacioSuperior lo reuse sin
// duplicar el listener -- misma lógica, sin cambios.

function CerrarSesionBoton({ userEmail }: { userEmail?: string }) {
  return (
    <form action={cerrarSesion}>
      <button
        type="submit"
        aria-label="Cerrar sesión"
        title={userEmail ? `Cerrar sesión (${userEmail})` : "Cerrar sesión"}
        className="flex h-8 w-8 items-center justify-center rounded-full"
        style={{
          background: "oklch(0.6 0.15 25 / 0.12)",
          color: "oklch(0.5 0.18 25)",
          border: "1px solid oklch(0.6 0.15 25 / 0.35)",
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>
    </form>
  );
}

// Botón flotante discreto a Gestión (Brief 8 §1) — vive acá porque TabBar es
// el único componente compartido por las 4 vistas principales (Calendario,
// Canciones, Set List, Seteos) y nunca se monta en vistas de edición o
// inmersivas (editor de canción, vista final, armar/vivo de set list,
// detalle de dispositivo), así que ponerlo acá alcanza para cumplir "en
// todas las principales, en ninguna inmersiva" sin lógica extra por página.
function GestionBoton() {
  return (
    <Link
      href="/gestion"
      aria-label="Gestión"
      title="Gestión"
      className="flex h-8 w-8 items-center justify-center rounded-full no-underline"
      style={{
        background: "oklch(0.93 0.016 78 / 0.9)",
        color: "oklch(0.45 0.02 55)",
        border: "1px solid oklch(0.85 0.016 78)",
      }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33h.02a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51h.02a1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82v.02a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z" />
      </svg>
    </Link>
  );
}

function IconoCalendario() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  );
}

function IconoCanciones() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  );
}

function IconoSetlist() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 6h13M8 12h13M8 18h13" />
      <path d="M3 6h.01M3 12h.01M3 18h.01" />
    </svg>
  );
}

function IconoSeteos() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3" />
      <path d="M1 14h6M9 8h6M17 16h6" />
    </svg>
  );
}

function IconoFinanzas() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
    </svg>
  );
}

function IconoStagePlot() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="14" rx="1" />
      <circle cx="8.5" cy="11" r="1.6" />
      <circle cx="15.5" cy="9" r="1.6" />
      <circle cx="12" cy="14.5" r="1.6" />
    </svg>
  );
}

function IconoPresskit() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h13l3 3v13H4z" />
      <path d="M8 10h8M8 14h8M8 18h5" />
    </svg>
  );
}

// Brief "Menú de vistas: acordeón flotante": la etiqueta + ícono de la vista
// activa quedan en el trigger del acordeón, colapsado por default -- mismo
// criterio de interacción que los demás acordeones de la app (ej.
// "Instrumento: Guitarra ▾" en SeteosLista, "Bloques visibles ▾" en
// IntegrantesPanel): botón con label + chevron que rota 180° al abrir,
// contenido (acá, el resto de las vistas) solo se renderiza si está abierto.
const ETIQUETA_VISTA: Record<string, string> = {
  calendario: "Calendario",
  canciones: "Canciones",
  setlist: "Set List",
  seteos: "Seteos",
  finanzas: "Finanzas",
  stage_plot: "Stage Plot",
  presskit: "Presskit",
};

function NavBoton({ href, activo, label, children }: { href: string; activo: boolean; label: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-label={label}
      aria-current={activo ? "page" : undefined}
      title={label}
      className="flex h-9 w-9 items-center justify-center rounded-full no-underline"
      style={
        activo
          ? { background: "oklch(0.64 0.15 34)", color: "oklch(0.99 0.01 82)" }
          : { background: "oklch(0.93 0.016 78 / 0.9)", color: "oklch(0.45 0.02 55)", border: "1px solid oklch(0.85 0.016 78)" }
      }
    >
      {children}
    </Link>
  );
}

export function TabBar({
  activa,
  userEmail,
  esSuperadmin = false,
  mostrarCanciones = true,
  mostrarSetlist = true,
  mostrarSeteos = true,
  mostrarFinanzas = true,
  mostrarStagePlot = true,
  mostrarPresskit = true,
}: {
  activa: "calendario" | "canciones" | "setlist" | "seteos" | "finanzas" | "stage_plot" | "presskit";
  userEmail?: string;
  esSuperadmin?: boolean;
  mostrarCanciones?: boolean;
  mostrarSetlist?: boolean;
  mostrarSeteos?: boolean;
  mostrarFinanzas?: boolean;
  mostrarStagePlot?: boolean;
  mostrarPresskit?: boolean;
}) {
  const oculto = useOcultarAlScrollear();
  // Brief "Menú de vistas: acordeón flotante": colapsado por default, cada
  // página monta TabBar de nuevo (server component padre pasa `activa` por
  // prop) así que este estado arranca en false otra vez después de navegar
  // -- no hace falta cerrarlo a mano al elegir una vista.
  const [menuAbierto, setMenuAbierto] = useState(false);

  const iconoVistaActiva: Record<typeof activa, React.ReactNode> = {
    calendario: <IconoCalendario />,
    canciones: <IconoCanciones />,
    setlist: <IconoSetlist />,
    seteos: <IconoSeteos />,
    finanzas: <IconoFinanzas />,
    stage_plot: <IconoStagePlot />,
    presskit: <IconoPresskit />,
  };

  return (
    <>
      {/* Brief §6: mismo lenguaje visual del menú de vistas de abajo (pill
          agrupada, no 2 círculos sueltos) — ya no hace falta que Gestión y
          Cerrar sesión sean círculos independientes, solo que queden
          agrupados de forma reconocible y sigan accesibles. */}
      <div
        className="fixed z-20 flex items-center gap-1.5 rounded-full p-1.5 transition-all duration-200"
        style={{
          top: 14,
          right: 14,
          opacity: oculto ? 0 : 1,
          transform: oculto ? "translateY(-10px)" : "translateY(0)",
          pointerEvents: oculto ? "none" : "auto",
          background: "oklch(0.99 0.008 82 / 0.95)",
          border: "1px solid oklch(0.89 0.013 78)",
          boxShadow: "0 10px 26px -10px rgba(0,0,0,0.28)",
        }}
      >
        {esSuperadmin && <GestionBoton />}
        <CerrarSesionBoton userEmail={userEmail} />
      </div>

      {/* Brief §4: el menú de vistas se muda de abajo-derecha a
          arriba-centrado — mismo comportamiento flotante, misma posición.
          Brief "TabBar — el menú de vistas también se oculta al
          scrollear": revierte la decisión de §4 de no ocultarlo -- mismo
          `oculto` de arriba, mismas 3 propiedades que ya usa el cluster de
          Gestión/Cerrar sesión, solo que el translateY se combina con el
          translateX(-50%) que ya centraba el menú (un solo `transform`, no
          se puede tener los dos por separado).
          Brief "Menú de vistas: acordeón flotante": colapsado por default --
          el trigger (ícono + nombre de la vista activa + chevron, mismo
          criterio que "Instrumento: Guitarra ▾" en SeteosLista/"Bloques
          visibles ▾" en IntegrantesPanel) siempre está, el resto de las
          vistas solo se monta cuando `menuAbierto`. */}
      <div
        className="fixed z-20 flex items-center gap-1.5 rounded-full p-1.5 transition-all duration-200"
        style={{
          top: 14,
          left: "50%",
          opacity: oculto ? 0 : 1,
          transform: oculto ? "translate(-50%, -10px)" : "translate(-50%, 0)",
          pointerEvents: oculto ? "none" : "auto",
          background: "oklch(0.99 0.008 82 / 0.95)",
          border: "1px solid oklch(0.89 0.013 78)",
          boxShadow: "0 10px 26px -10px rgba(0,0,0,0.28)",
        }}
      >
        <button
          type="button"
          onClick={() => setMenuAbierto((v) => !v)}
          aria-expanded={menuAbierto}
          aria-label="Vistas"
          className="flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3"
          style={{ background: "oklch(0.64 0.15 34)", color: "oklch(0.99 0.01 82)" }}
        >
          {iconoVistaActiva[activa]}
          <span className="text-xs font-bold">{ETIQUETA_VISTA[activa]}</span>
          <span className="text-[10px]" style={{ transform: menuAbierto ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}>
            ▾
          </span>
        </button>

        {menuAbierto && (
          <>
            <NavBoton href="/inicio" activo={activa === "calendario"} label="Calendario">
              <IconoCalendario />
            </NavBoton>
            {mostrarCanciones && (
              <NavBoton href="/canciones" activo={activa === "canciones"} label="Canciones">
                <IconoCanciones />
              </NavBoton>
            )}
            {mostrarSetlist && (
              <NavBoton href="/set-list" activo={activa === "setlist"} label="Set List">
                <IconoSetlist />
              </NavBoton>
            )}
            {mostrarSeteos && (
              <NavBoton href="/seteos" activo={activa === "seteos"} label="Seteos">
                <IconoSeteos />
              </NavBoton>
            )}
            {mostrarFinanzas && (
              <NavBoton href="/finanzas" activo={activa === "finanzas"} label="Finanzas">
                <IconoFinanzas />
              </NavBoton>
            )}
            {mostrarStagePlot && (
              <NavBoton href="/stage-plot" activo={activa === "stage_plot"} label="Stage Plot">
                <IconoStagePlot />
              </NavBoton>
            )}
            {/* Brief "Presskit — vista propia, estatus, liga publicada" §1,
                revisado por Brief "Presskit como bloque...": ya no se entra
                por el botón "Presskit" de Gestión > Bandas -- es un módulo
                de nivel superior más, gateado igual que los demás
                (`presskit_habilitado` por banda + bloques_visibles, ver
                mostrarPresskit en cada página). */}
            {mostrarPresskit && (
              <NavBoton href="/presskit" activo={activa === "presskit"} label="Presskit">
                <IconoPresskit />
              </NavBoton>
            )}
          </>
        )}
      </div>
    </>
  );
}
