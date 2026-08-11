"use client";

// Extraído de BandaFilterChips (Brief "Rediseño de Ausencias, emoji de
// banda...") para reusarse en Gestión > Lugares sin duplicar el fallback: si
// la banda tiene emoji cargado se muestra ese emoji, si no, un punto sólido
// del color de la banda.
export function EmojiOPunto({
  emoji,
  color,
  size = 20,
  fontSize,
}: {
  emoji: string | null;
  color: string;
  size?: number;
  fontSize?: number;
}) {
  return (
    <span
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-full"
      style={{ width: size, height: size, background: emoji ? "transparent" : color }}
    >
      {emoji && <span style={{ fontSize: fontSize ?? size * 0.65, lineHeight: 1 }}>{emoji}</span>}
    </span>
  );
}
