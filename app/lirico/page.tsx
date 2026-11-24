import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServerAuth } from "@/lib/supabase/serverClient";
import { obtenerMembresias, esSuperadminDeMembresias, algunaBandaConBloque, membresiasConBloque } from "@/lib/malgestoEventos";
import { leccionesDeBanda, listarIdeas, listarTecnicas, obtenerIdea } from "@/lib/liricoData";
import { ETIQUETA_ESTADO_IDEA, ETIQUETA_ORIGEN, resumenPorTecnica } from "@/lib/liricoModelo";
import { TabBar } from "@/components/shell/TabBar";
import { EspacioSuperior } from "@/components/shell/EspacioSuperior";
import { TarjetaSeleccionarBanda } from "@/components/ui/TarjetaSeleccionarBanda";
import { AulaIdea } from "@/components/lirico/AulaIdea";
import { NuevaIdea } from "@/components/lirico/NuevaIdea";
import { Tecnicas } from "@/components/lirico/Tecnicas";

// Lírico: aula de composición lírica (semillero de ideas + memoria de lo aprendido).
// Independiente de Musical; usa el mismo permiso del bloque Canciones.
const INK = "oklch(0.24 0.044 262)";
const MUTED = "oklch(0.5 0.044 262)";

export default async function LiricoPage({ searchParams }: { searchParams: Promise<{ banda?: string; idea?: string }> }) {
  const { banda: bandaParam, idea: ideaParam } = await searchParams;
  const supabase = await supabaseServerAuth();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) redirect("/login");

  const membresias = await obtenerMembresias(user.id);
  if (membresias.length === 0) redirect("/sin-acceso");
  const superadmin = esSuperadminDeMembresias(membresias);

  const bandasConBloque = membresiasConBloque(membresias, "canciones", superadmin);
  if (bandasConBloque.length === 0) redirect("/inicio");

  const bandaValida = bandasConBloque.some((m) => m.bandaId === bandaParam);
  const tabBar = (
    <TabBar
      activa="lirico"
      userEmail={user.email}
      esSuperadmin={superadmin}
      mostrarSetlist={algunaBandaConBloque(membresias, "set_list", superadmin)}
      mostrarSeteos={algunaBandaConBloque(membresias, "seteos", superadmin)}
      mostrarFinanzas={algunaBandaConBloque(membresias, "finanzas", superadmin)}
      mostrarStagePlot={algunaBandaConBloque(membresias, "stage_plot", superadmin)}
      mostrarPresskit={algunaBandaConBloque(membresias, "presskit", superadmin)}
    />
  );

  if (!bandaValida && bandasConBloque.length > 1) {
    return (
      <div className="min-h-screen pb-20" style={{ background: "oklch(0.965 0.007 85)" }}>
        <EspacioSuperior>
          <div className="font-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: MUTED }}>Lírico</div>
          <h2 className="mt-1 text-[30px] font-extrabold tracking-[-0.02em]" style={{ fontFamily: "var(--font-fraunces), sans-serif", color: INK }}>¿Qué banda?</h2>
          <div className="mt-5 grid grid-cols-2 gap-3">
            {bandasConBloque.map((m) => (
              <TarjetaSeleccionarBanda key={m.bandaId} membresia={m} href={`/lirico?banda=${m.bandaId}`} />
            ))}
          </div>
        </EspacioSuperior>
        {tabBar}
      </div>
    );
  }

  const bandaActiva = bandaValida ? bandaParam! : bandasConBloque[0].bandaId;
  const membresiaActiva = bandasConBloque.find((m) => m.bandaId === bandaActiva)!;
  const puedeEscribir = membresiaActiva.rol === "administrador" || membresiaActiva.rol === "superadmin";

  const [ideas, tecnicas, lecciones] = await Promise.all([listarIdeas(bandaActiva), listarTecnicas(), leccionesDeBanda(bandaActiva)]);
  const idea = ideas.length > 0 ? await obtenerIdea(bandaActiva, ideas.some((i) => i.id === ideaParam) ? ideaParam! : ideas[0].id) : null;
  const resumen = Object.fromEntries(resumenPorTecnica(lecciones));

  return (
    <div className="min-h-screen pb-20" style={{ background: "oklch(0.965 0.007 85)" }}>
      <EspacioSuperior maxWidth="max-w-none">
        <span className="font-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: MUTED }}>{membresiaActiva.bandaNombre}</span>
        <h2 className="mt-1 text-[30px] font-extrabold tracking-[-0.02em]" style={{ fontFamily: "var(--font-fraunces), sans-serif", color: INK }}>
          Lírico
        </h2>
        <p className="mt-1 text-sm" style={{ color: MUTED }}>Aula de composición lírica: tus ideas, tus letras y lo que vas aprendiendo.</p>

        <div className="mt-5 grid gap-8 xl:grid-cols-[270px_minmax(0,1fr)]">
          <aside className="self-start xl:sticky xl:top-6">
            <div className="font-mono text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color: MUTED }}>Ideas ({ideas.length})</div>
            <div className="mt-2 flex flex-col gap-2">
              {ideas.map((i) => {
                const activa = i.id === idea?.id;
                return (
                  <Link
                    key={i.id}
                    href={`/lirico?banda=${bandaActiva}&idea=${i.id}`}
                    className="rounded-2xl px-3.5 py-2.5 no-underline"
                    style={{ background: activa ? "oklch(0.27 0.05 262)" : "oklch(0.99 0.005 85)", border: "1px solid oklch(0.89 0.008 85)", color: activa ? "oklch(0.99 0.006 85)" : INK }}
                  >
                    <div className="text-sm font-bold leading-snug">{i.titulo}</div>
                    <div className="mt-1 font-mono text-[10px] uppercase" style={{ color: activa ? "oklch(0.85 0.02 262)" : MUTED }}>
                      {ETIQUETA_ESTADO_IDEA[i.estado]} · {ETIQUETA_ORIGEN[i.origen]} · {i.nLetras} letra{i.nLetras === 1 ? "" : "s"} · {i.nLecciones} lecc.
                    </div>
                  </Link>
                );
              })}
            </div>
            {puedeEscribir && (
              <div className="mt-4">
                <NuevaIdea bandaId={bandaActiva} />
              </div>
            )}
            <Tecnicas tecnicas={tecnicas} resumen={resumen} />
          </aside>

          <main className="min-w-0">
            {idea ? (
              <AulaIdea key={idea.id} bandaId={bandaActiva} idea={idea} otras={ideas.filter((i) => i.id !== idea.id).map((i) => ({ id: i.id, titulo: i.titulo }))} tecnicas={tecnicas} puedeEscribir={puedeEscribir} />
            ) : (
              <p className="text-sm" style={{ color: MUTED }}>Todavía no hay ideas en {membresiaActiva.bandaNombre}.</p>
            )}
          </main>
        </div>
      </EspacioSuperior>
      {tabBar}
    </div>
  );
}
