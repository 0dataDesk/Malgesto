// Catálogo de plataformas comunes para los links del presskit (Brief
// "Presskit — vista de captura de datos" §2) -- a diferencia de
// plazas.instrumento, presskit_redes.plataforma no tiene CHECK constraint,
// así que acá se guarda directo la etiqueta legible (o el nombre libre que
// tipeen para "Otra"), sin necesidad de mapear una clave.
export const PLATAFORMAS_COMUNES = [
  "Spotify",
  "YouTube",
  "Instagram",
  "TikTok",
  "Facebook",
  "Apple Music",
  "SoundCloud",
  "Bandcamp",
  "Sitio web",
] as const;

export const PLATAFORMA_OTRA = "Otra";
