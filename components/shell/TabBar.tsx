import Link from "next/link";
import { cerrarSesion } from "@/app/auth/actions";

// Barra de navegación inferior — Design líneas 104-110. Siempre visible en
// esta vista y en las que sigan. Malgesto App se construye desde cero: nada
// depende de malgesto-repertorio ni de ningún otro repo existente.
function Tab({ activo, children }: { activo: boolean; children: React.ReactNode }) {
  return (
    <div className="text-center">
      <div
        className="text-[11px]"
        style={{ fontWeight: activo ? 600 : 400, color: activo ? "oklch(0.24 0.02 55)" : "oklch(0.55 0.02 55)" }}
      >
        {children}
      </div>
      {activo && <div className="mx-auto mt-[5px] h-[3px] w-5 rounded-[2px]" style={{ background: "oklch(0.64 0.15 34)" }} />}
    </div>
  );
}

// Cerrar sesión, siempre visible (Brief 9 §3) — en rojo/advertencia con
// ícono de "x" para no invitar a tocarlo sin querer, al lado del botón de
// Gestión en el mismo cluster fijo arriba a la derecha.
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
        className="fixed inset-x-0 bottom-0 z-20"
        style={{ background: "oklch(0.99 0.008 82)", borderTop: "1px solid oklch(0.89 0.013 78)" }}
      >
        <div className="mx-auto flex max-w-2xl items-center justify-around px-3" style={{ paddingTop: 14, paddingBottom: 26 }}>
          <Link href="/inicio" className="no-underline">
            <Tab activo={activa === "calendario"}>Calendario</Tab>
          </Link>
          {mostrarCanciones && (
            <Link href="/canciones" className="no-underline">
              <Tab activo={activa === "canciones"}>Canciones</Tab>
            </Link>
          )}
          {mostrarSetlist && (
            <Link href="/set-list" className="no-underline">
              <Tab activo={activa === "setlist"}>Set List</Tab>
            </Link>
          )}
          {mostrarSeteos && (
            <Link href="/seteos" className="no-underline">
              <Tab activo={activa === "seteos"}>Seteos</Tab>
            </Link>
          )}
        </div>
      </div>
    </>
  );
}
