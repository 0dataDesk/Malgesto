import Link from "next/link";

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

export function TabBar({ activa }: { activa: "calendario" | "canciones" | "setlist" | "seteos" }) {
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-20"
      style={{ background: "oklch(0.99 0.008 82)", borderTop: "1px solid oklch(0.89 0.013 78)" }}
    >
      <div className="mx-auto flex max-w-2xl items-center justify-around px-3" style={{ paddingTop: 14, paddingBottom: 26 }}>
        <Link href="/inicio" className="no-underline">
          <Tab activo={activa === "calendario"}>Calendario</Tab>
        </Link>
        <Link href="/canciones" className="no-underline">
          <Tab activo={activa === "canciones"}>Canciones</Tab>
        </Link>
        <Link href="/set-list" className="no-underline">
          <Tab activo={activa === "setlist"}>Set List</Tab>
        </Link>
        <Link href="/seteos" className="no-underline">
          <Tab activo={activa === "seteos"}>Seteos</Tab>
        </Link>
      </div>
    </div>
  );
}
