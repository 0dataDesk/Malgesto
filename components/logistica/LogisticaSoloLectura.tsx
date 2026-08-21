import type { Evento } from "@/lib/malgestoEventos";
import type { PuntoLogistica, MusicoLogistica } from "@/lib/logisticaData";
import { LogisticaPantalla } from "./LogisticaPantalla";

// Brief "Logística: mejoras de interacción y vista de solo lectura" §6:
// vista aparte para un integrante que no arma la logística -- delega en
// LogisticaPantalla con puedeEditar=false en vez de duplicar la matemática
// de posicionamiento del eje (HORA_INICIO_EJE/pixeles por minuto/marcas de
// hora) en un segundo archivo, pero queda como su propio componente para
// que la separación "quien edita" vs "quien solo consulta" sea explícita
// desde la página que decide cuál mostrar (app/logistica/[eventoId]/
// page.tsx). Sin `lugares` -- ese modo nunca abre un formulario que lo
// necesite.
export function LogisticaSoloLectura({
  evento,
  puntos,
  musicos,
}: {
  evento: Evento;
  puntos: PuntoLogistica[];
  musicos: MusicoLogistica[];
}) {
  return <LogisticaPantalla evento={evento} puntosIniciales={puntos} lugares={[]} musicos={musicos} puedeEditar={false} />;
}
