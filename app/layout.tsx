import type { Metadata } from "next";
import { DM_Sans, Fraunces, Space_Mono } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "700", "800"],
});

// Mono del bundle de Design ('Space Mono') — etiquetas, cifras y datos
// técnicos en Canciones. El resto de la app sigue usando el stack mono del
// sistema (font-mono de Tailwind) donde ya estaba.
const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

// Rediseño "Taller" (28/10/26): títulos grandes (mes, secciones) en Fraunces;
// el resto de la app en DM Sans.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["600", "700"],
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
    <html lang="es" className={`${dmSans.variable} ${fraunces.variable} ${spaceMono.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
