import type { CanalRider } from "@/lib/riderData";

// Brief "Rider Técnico: renombrar módulo + rediseñar contenido de Rider"
// §2: extraído de RiderVista.tsx (que mezclaba imagen + Input List +
// resumen en una sola tarjeta) para que "Input" sea su propia pestaña del
// módulo, separada de "Stage" y "Rider" -- mismo markup/datos de siempre
// (CanalRider ya resuelto en lib/riderData.ts), sin cambios de contenido.
export function InputListVista({ canales }: { canales: CanalRider[] }) {
  if (canales.length === 0) {
    return (
      <p className="text-sm" style={{ color: "oklch(0.55 0.02 55)" }}>
        Todavía no hay canales -- se arman solos al colocar músicos/teclados en la pestaña Stage.
      </p>
    );
  }

  return (
    <table className="w-full text-left text-sm">
      <thead>
        <tr className="border-b text-[10px] uppercase tracking-wide" style={{ borderColor: "oklch(0.24 0.02 55)", color: "oklch(0.55 0.02 55)" }}>
          <th className="w-10 py-1 font-mono font-bold">Ch</th>
          <th className="py-1 font-mono font-bold">Fuente</th>
          <th className="py-1 font-mono font-bold">Mic / DI</th>
        </tr>
      </thead>
      <tbody>
        {canales.map((c) => (
          <tr key={c.numero} className="border-b" style={{ borderColor: "oklch(0.91 0.013 78)" }}>
            <td className="py-1.5 font-mono font-bold" style={{ color: "oklch(0.24 0.02 55)" }}>
              {c.numero}
            </td>
            <td className="py-1.5" style={{ color: "oklch(0.3 0.02 55)" }}>
              {c.fuente}
            </td>
            <td className="py-1.5" style={{ color: "oklch(0.55 0.02 55)" }}>
              {c.mic ?? ""}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
