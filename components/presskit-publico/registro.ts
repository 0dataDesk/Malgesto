import type { ComponentType } from "react";
import type { PresskitPublico } from "@/lib/presskitData";
import { DisenoJuanaLR } from "./disenos/juana-lr";
import { JuanaLRPdfDocument } from "./disenos/juana-lr-pdf";
import { DisenoYelincuente } from "./disenos/yelincuente";
import { YelincuentePdfDocument } from "./disenos/yelincuente-pdf";
import { DisenoGenerico } from "./disenos/generico";
import { GenericoPdfDocument } from "./disenos/generico-pdf";

type ComponenteDiseno = ComponentType<{ datos: PresskitPublico }>;
type EntradaDiseno = { Diseno: ComponenteDiseno; PdfDocumento: ComponenteDiseno };

// Brief "Presskit público: diseño independiente por banda" §2/§4:
// componente-por-banda en vez de una sola plantilla compartida -- cada
// entrada acá es el diseño (web + PDF de una página) que YA se validó con
// Design para esa banda puntual. Único punto que app/presskit-publico/
// [slug]/page.tsx consulta para decidir qué renderizar; la obtención de
// datos reales (obtenerBandaPorSlugPresskit/obtenerPresskitPublico) sigue
// viviendo ahí, sin duplicarse por banda.
//
// Convención para el próximo handoff de Design: cuando Jorge traiga un
// diseño nuevo para una banda, el pedido a Code debe nombrar el archivo de
// ESA banda -- crear (o actualizar) components/presskit-publico/disenos/
// <slug-de-la-banda>.tsx (+ <slug>-pdf.tsx si también hay one-sheet) y
// sumar su entrada acá. Nunca "actualizar el diseño de /presskit-publico"
// a secas: eso es lo que llevó a que el handoff de Yelincuente pisara el
// de Juana LR (ambas compartían un solo componente). Tampoco se edita
// disenos/generico.tsx para dársela a una banda puntual -- ese archivo es
// el respaldo neutro para quien todavía no tiene la suya.
const DISENOS_POR_SLUG: Record<string, EntradaDiseno> = {
  "juana-lr": { Diseno: DisenoJuanaLR, PdfDocumento: JuanaLRPdfDocument },
  yelincuente: { Diseno: DisenoYelincuente, PdfDocumento: YelincuentePdfDocument },
};

const RESPALDO_GENERICO: EntradaDiseno = { Diseno: DisenoGenerico, PdfDocumento: GenericoPdfDocument };

export function resolverDiseno(slug: string): EntradaDiseno {
  return DISENOS_POR_SLUG[slug] ?? RESPALDO_GENERICO;
}
