import "server-only";
import { supabaseMalgesto } from "@/lib/supabase/malgesto";
import type { PersonaConCumple } from "@/lib/cumpleanosVirtual";

// Integrantes activos de las bandas dadas que tienen fecha de nacimiento
// cargada — la materia prima que CalendarioShell usa para sintetizar los
// eventos virtuales de cumpleaños (ver lib/cumpleanosVirtual.ts). Una fila
// por persona (nunca una por banda): si pertenece a varias, sus bandas se
// unen en bandaNombre. Regla de confidencialidad: a un usuario normal solo
// se le arma la nota con las bandas que él mismo comparte con esa persona,
// así que acá se filtra miembros_banda por sus propios bandaIds — nunca se
// consulta (ni se filtra) una banda ajena. El superadmin ve todo (rol global,
// ver malgestoEventos.esSuperadminDeMembresias): para él no se filtra por
// bandaIds, así la nota le muestra todas las bandas reales de cada persona.
export async function obtenerCumpleanosDeMisBandas(bandaIds: string[], esSuperadmin: boolean): Promise<PersonaConCumple[]> {
  if (!esSuperadmin && bandaIds.length === 0) return [];
  const admin = supabaseMalgesto();

  const consultaMiembros = admin.from("miembros_banda").select("usuario_id, banda_id, bandas(nombre)").eq("activo", true);

  const [{ data: miembros }, { data: personas }, { data: authData }] = await Promise.all([
    esSuperadmin ? consultaMiembros : consultaMiembros.in("banda_id", bandaIds),
    admin.from("personas").select("usuario_id, nombre_mostrar, fecha_nacimiento"),
    admin.auth.admin.listUsers({ page: 1, perPage: 200 }),
  ]);

  const personaPorId = new Map((personas ?? []).map((p) => [p.usuario_id, p]));
  const emailPorId = new Map((authData?.users ?? []).map((u) => [u.id, u.email ?? "Integrante"]));
  const fullNamePorId = new Map(
    (authData?.users ?? []).map((u) => [u.id, (u.user_metadata as { full_name?: string } | undefined)?.full_name ?? null])
  );

  const bandasPorUsuario = new Map<string, Map<string, string>>();
  for (const m of miembros ?? []) {
    const persona = personaPorId.get(m.usuario_id);
    if (!persona?.fecha_nacimiento) continue;
    const banda = m.bandas as unknown as { nombre: string } | null;
    const bandas = bandasPorUsuario.get(m.usuario_id) ?? new Map<string, string>();
    bandas.set(m.banda_id, banda?.nombre ?? "Banda");
    bandasPorUsuario.set(m.usuario_id, bandas);
  }

  const resultado: PersonaConCumple[] = [];
  for (const [usuarioId, bandas] of bandasPorUsuario) {
    const persona = personaPorId.get(usuarioId)!;
    const bandasOrdenadas = [...bandas.entries()].sort((a, b) => a[1].localeCompare(b[1]));
    resultado.push({
      usuarioId,
      nombre: persona.nombre_mostrar || fullNamePorId.get(usuarioId) || emailPorId.get(usuarioId) || "Integrante",
      fechaNacimiento: persona.fecha_nacimiento!,
      bandaIds: bandasOrdenadas.map(([id]) => id),
      bandaNombre: bandasOrdenadas.map(([, nombre]) => nombre).join(", "),
    });
  }
  return resultado;
}
