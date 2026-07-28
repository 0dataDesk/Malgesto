import type { Metadata } from "next";
import { Manrope, Bricolage_Grotesque } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["500", "700", "800"],
});

// Fuente de los encabezados en el bundle de Design ('Bricolage Grotesque').
// Manrope sigue siendo la fuente base del body; esta solo cubre los títulos
// grandes (nombre del mes, "Próximas", etc.) para calzar con Design pixel a
// pixel en vez de aproximar todo con una sola tipografía.
const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  weight: ["700", "800"],
});

export const metadata: Metadata = {
  title: "Malgesto App",
  description: "El taller de tus bandas: repertorio, fechas, sets y seteos en un solo lugar.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${manrope.variable} ${bricolage.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
