import "server-only";
import { supabaseMalgesto } from "@/lib/supabase/malgesto";
import type { PersonaConCumple } from "@/lib/cumpleanosVirtual";

// Integrantes activos de las bandas dadas que tienen fecha de nacimiento
// cargada — la materia prima que CalendarioShell usa para sintetizar los
// eventos virtuales de cumpleaños (ver lib/cumpleanosVirtual.ts).
export async function obtenerCumpleanosDeMisBandas(bandaIds: string[]): Promise<PersonaConCumple[]> {
  if (bandaIds.length === 0) return [];
  const admin = supabaseMalgesto();

  const [{ data: miembros }, { data: personas }, { data: authData }] = await Promise.all([
    admin.from("miembros_banda").select("usuario_id, banda_id, bandas(nombre)").eq("activo", true).in("banda_id", bandaIds),
    admin.from("personas").select("usuario_id, nombre_mostrar, fecha_nacimiento"),
    admin.auth.admin.listUsers({ page: 1, perPage: 200 }),
  ]);

  const personaPorId = new Map((personas ?? []).map((p) => [p.usuario_id, p]));
  const emailPorId = new Map((authData?.users ?? []).map((u) => [u.id, u.email ?? "Integrante"]));
  const fullNamePorId = new Map(
    (authData?.users ?? []).map((u) => [u.id, (u.user_metadata as { full_name?: string } | undefined)?.full_name ?? null])
  );

  const resultado: PersonaConCumple[] = [];
  for (const m of miembros ?? []) {
    const persona = personaPorId.get(m.usuario_id);
    if (!persona?.fecha_nacimiento) continue;
    const banda = m.bandas as unknown as { nombre: string } | null;
    resultado.push({
      usuarioId: m.usuario_id,
      nombre: persona.nombre_mostrar || fullNamePorId.get(m.usuario_id) || emailPorId.get(m.usuario_id) || "Integrante",
      fechaNacimiento: persona.fecha_nacimiento,
      bandaId: m.banda_id,
      bandaNombre: banda?.nombre ?? "Banda",
    });
  }
  return resultado;
}
