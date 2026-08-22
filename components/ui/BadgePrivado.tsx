// Brief "Calendario: público/privado, nuevo tipo de evento, filtro de
// Presskit" §3: un evento privado no se oculta en ningún lado -- se ve
// igual que cualquier otro para quien ya tiene acceso a esa banda, solo
// que donde sea que se muestre su información debe llevar esta etiqueta.
// Componente compartido (en vez de repetir el mismo estilo de pill en
// EventoDetalle/AgendaView/CalendarioShell/LogisticaPantalla) para que la
// apariencia de "privado" sea una sola definición.
export function BadgePrivado() {
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-1 font-mono text-[11px] font-bold tracking-wide uppercase"
      style={{ background: "oklch(0.9 0.03 320 / 0.5)", color: "oklch(0.42 0.1 320)" }}
    >
      Evento privado
    </span>
  );
}
