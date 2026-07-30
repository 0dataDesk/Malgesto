import Link from "next/link";
import { cerrarSesion } from "@/app/auth/actions";

// Brief 18 §4: la barra inferior de 4 pestañas (fija, ~70px de alto) se
// reemplaza por botones flotantes — mismo patrón visual que Gestión/Cerrar
// sesión (círculo de 36px), agrupados en su propia esquina para no sentirse
// amontonados con ese otro cluster, y liberando el espacio vertical fijo que
// ocupaba la barra en cada una de las 4 vistas principales.

function CerrarSesionBoton({ userEmail }: { userEmail?: string }) {
  return (
    <form action={cerrarSesion}>
      <button
        type="submit"
        aria-label="Cerrar sesión"
        title={userEmail ? `Cerrar sesión (${userEmail})` : "Cerrar sesión"}
        className="flex h-9 w-9 items-center justify-center rounded-full"
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
      className="flex h-9 w-9 items-center justify-center rounded-full no-underline"
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
}: {
  activa: "calendario" | "canciones" | "setlist" | "seteos";
  userEmail?: string;
  esSuperadmin?: boolean;
  mostrarCanciones?: boolean;
  mostrarSetlist?: boolean;
  mostrarSeteos?: boolean;
}) {
  return (
    <>
      <div className="fixed z-20 flex items-center gap-2" style={{ top: 14, right: 14 }}>
        {esSuperadmin && <GestionBoton />}
        <CerrarSesionBoton userEmail={userEmail} />
      </div>

      <div
        className="fixed z-20 flex items-center gap-1.5 rounded-full p-1.5"
        style={{
          bottom: 14,
          right: 14,
          background: "oklch(0.99 0.008 82 / 0.95)",
          border: "1px solid oklch(0.89 0.013 78)",
          boxShadow: "0 10px 26px -10px rgba(0,0,0,0.28)",
        }}
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
        {mostrarSeteos && (
          <NavBoton href="/seteos" activo={activa === "seteos"} label="Seteos">
            <IconoSeteos />
          </NavBoton>
        )}
      </div>
    </>
  );
}
