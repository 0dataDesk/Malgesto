import { redirect } from "next/navigation";

// Sin selector de banda todavía (Brief 2) — el punto de entrada por ahora es
// el login. Cuando exista el selector, esta ruta deberá decidir entre login,
// selector o vista de bloques según la sesión.
export default function RootPage() {
  redirect("/login");
}
