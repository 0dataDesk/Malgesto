import { Fragment } from "react";

// Un nombre de control puede traer saltos de línea reales (ej. "Pre\nPost",
// "DC IN\n9-18V") para forzar el corte donde el diseño real lo tiene, en vez
// de adivinarlo por cantidad de palabras -- genérico para cualquier
// componente que muestre `control.nombre` como texto visible (brief
// "PanelDispositivo — etiquetas multilínea genéricas y responsivo en
// móvil" §1). Sin salto de línea en el nombre, se ve exactamente igual que
// antes (una sola línea).
export function EtiquetaMultilinea({ texto }: { texto: string }) {
  const lineas = texto.split("\n");
  return (
    <>
      {lineas.map((linea, i) => (
        <Fragment key={i}>
          {i > 0 && <br />}
          {linea}
        </Fragment>
      ))}
    </>
  );
}
