"use client";

import { useEffect, useRef, useState } from "react";
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

// Configuración (solo en Calendario, la vista principal): un botón de engrane
// que abre un menú corto con Gestión (superadmin) y Cerrar sesión.
function ConfiguracionMenu({ userEmail, esSuperadmin }: { userEmail?: string; esSuperadmin: boolean }) {
  const [abierto, setAbierto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAbierto(false);
    };
    document.addEventListener("mousedown", fuera);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", fuera);
      document.removeEventListener("keydown", esc);
    };
  }, [abierto]);
  const item = { display: "flex", width: "100%", alignItems: "center", gap: 8, padding: "9px 12px", fontSize: 13, fontWeight: 600, textAlign: "left", textDecoration: "none", borderRadius: 10 } as const;
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-label="Configuración"
        aria-expanded={abierto}
        title="Configuración"
        className="flex h-8 w-8 items-center justify-center rounded-full"
        style={{ background: abierto ? "oklch(0.27 0.05 262)" : "oklch(0.93 0.010 85 / 0.9)", color: abierto ? "oklch(0.99 0.006 85)" : "oklch(0.45 0.044 262)", border: "1px solid oklch(0.85 0.010 85)" }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
          <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33h.02a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51h.02a1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82v.02a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z" />
        </svg>
      </button>
      {abierto && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-52 p-1.5"
          style={{ top: "100%", background: "oklch(0.99 0.005 85)", border: "1px solid oklch(0.89 0.008 85)", borderRadius: 14, boxShadow: "0 16px 32px -14px rgba(0,0,0,0.35)" }}
        >
          {userEmail && <div className="truncate px-3 pb-1 pt-1.5 text-[10px]" style={{ color: "oklch(0.55 0.044 262)", fontFamily: "var(--font-space-mono), monospace" }}>{userEmail}</div>}
          {esSuperadmin && (
            <Link href="/gestion" role="menuitem" style={{ ...item, color: "oklch(0.3 0.044 262)" }}>
              Gestión
            </Link>
          )}
          <form action={cerrarSesion}>
            <button type="submit" role="menuitem" style={{ ...item, color: "oklch(0.5 0.18 25)", background: "transparent" }}>
              Cerrar sesión
            </button>
          </form>
        </div>
      )}
    </div>
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
  stage_plot: "Rider Técnico",
  presskit: "Presskit",
};

function NavBoton({ href, activo, label, children }: { href: string; activo: boolean; label: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-label={label}
      aria-current={activo ? "page" : undefined}
      className="flex min-w-[64px] flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 text-[10px] font-bold no-underline"
      style={
        activo
          ? { background: "oklch(0.27 0.05 262)", color: "oklch(0.99 0.006 85)" }
          : { background: "transparent", color: "oklch(0.5 0.044 262)" }
      }
    >
      {children}
      <span>{label}</span>
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

  // Barra inferior fija: deja espacio al final de la página para que no tape contenido.
  useEffect(() => {
    document.body.style.paddingBottom = "76px";
    return () => {
      document.body.style.paddingBottom = "";
    };
  }, []);

  return (
    <>
      {/* Configuración: solo en Calendario (la vista principal). En las demás vistas no hay nada arriba a la derecha. */}
      {activa === "calendario" && (
        <div
          className="fixed z-20 transition-all duration-200"
          style={{
            top: 14,
            right: 14,
            opacity: oculto ? 0 : 1,
            transform: oculto ? "translateY(-10px)" : "translateY(0)",
            pointerEvents: oculto ? "none" : "auto",
          }}
        >
          <ConfiguracionMenu userEmail={userEmail} esSuperadmin={esSuperadmin} />
        </div>
      )}

      {/* Rediseño "Taller" (28/10/26): con solo 4 vistas el menú flotante pasa a
          una barra fija abajo, siempre visible. */}
      <nav
        aria-label="Vistas"
        className="fixed bottom-0 left-0 right-0 z-20 flex items-center justify-around px-2 pb-3 pt-2"
        style={{ background: "oklch(0.99 0.006 85)", borderTop: "1px solid oklch(0.89 0.008 85)" }}
      >
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
        {mostrarPresskit && (
          <NavBoton href="/presskit" activo={activa === "presskit"} label="Presskit">
            <IconoPresskit />
          </NavBoton>
        )}
        {/* Vistas apagadas (ver VISTAS_APAGADAS en lib/bloques.ts): Seteos,
            Finanzas y Rider Técnico siguen en el código; para volver a
            mostrarlas se agregan aquí con su NavBoton. */}
      </nav>
    </>
  );
}
