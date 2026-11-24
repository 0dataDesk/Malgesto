# Lírico (`/lirico`)

Aula de composición lírica de Malgesto App: un semillero de ideas y letras donde Cosmo enseña y Jorge desarrolla ejercicios, pruebas y borradores, con memoria de lo aprendido. Independiente de **Musical** (composición musical); una letra podrá ligarse después a una canción o EP de Musical, de forma opcional (no existe todavía).
Usa el permiso del bloque Canciones (editan administrador y superadmin de la banda).

## Cómo funciona
- Cosmo lleva ideas al aula (de las Páginas, de Ideas o de las notas de Notion ya guardadas en Supabase: `musica.notas_notion`) y abre lecciones sobre ellas con objetivo y ejercicios.
- Jorge escribe en la pantalla: su idea, la ficha de cada letra (objetivo, premisa, ángulo, plano literal y figurado), versiones y respuestas a los ejercicios. Cosmo escribe lecciones, consignas y correcciones directo en la base.
- Cada letra y cada lección tienen su propio objetivo: no hay molde único. Antes de cada sesión Cosmo revisa qué técnicas ya se vieron (y en qué estado) para no partir de cero, y puede conectar ideas entre sí con un motivo.

## Orden de los datos (esquema `malgesto_app`, migración `20261124100000_lirico.sql`)
`lirico_tecnicas` (catálogo único) · `lirico_ideas` (origen y estado) · `lirico_letras` (nacen de una idea; objetivo obligatorio) · `lirico_versiones` (solo se agregan; un trigger impide modificar el texto) · `lirico_lecciones` (una técnica por idea, con objetivo y estado) · `lirico_ejercicios` (consigna, respuesta, corrección, resultado) · `lirico_conexiones` (par de ideas ordenado, con motivo). Llaves foráneas y CHECK en todo; RLS activa sin políticas (solo servidor).

## Archivos
`app/lirico/page.tsx` y `actions.ts`, `components/lirico/` (`AulaIdea`, `NuevaIdea`, `Tecnicas`, `ui`), `lib/liricoModelo.ts` (puro), `lib/liricoData.ts` (servidor), `scripts/check-lirico.ts` (corre en `npm run check`).
