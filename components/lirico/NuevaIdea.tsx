"use client";

import { useState } from "react";
import { crearIdeaAction } from "@/app/lirico/actions";
import { Boton, CAMPO, Estado, useAccion } from "./ui";
import { useRouter } from "next/navigation";

export function NuevaIdea({ bandaId }: { bandaId: string }) {
  const [abierto, setAbierto] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [texto, setTexto] = useState("");
  const { pending, error, guardado, correr } = useAccion();
  const router = useRouter();
  if (!abierto) {
    return <button type="button" onClick={() => setAbierto(true)} className="text-xs font-bold" style={{ color: "oklch(0.5 0.044 262)" }}>+ Nueva idea</button>;
  }
  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        setTitulo("");
        setTexto("");
        correr(async () => {
          const r = await crearIdeaAction(bandaId, titulo, texto);
          if (r.ok && r.id) router.push(`/lirico?banda=${bandaId}&idea=${r.id}`);
          return r;
        });
      }}
    >
      <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Título de la idea" maxLength={160} className="rounded-xl px-3 py-2 text-sm" style={CAMPO} />
      <textarea value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="La idea, como te salga" rows={4} className="rounded-xl px-3 py-2 text-sm" style={CAMPO} />
      <div className="flex items-center gap-3"><Boton type="submit" pending={pending}>Crear idea</Boton><Estado error={error} guardado={guardado} /></div>
    </form>
  );
}
