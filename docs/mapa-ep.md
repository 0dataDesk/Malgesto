# Musical, antes Mapa del EP (`/musical`; `/ep` redirige)

Desde el 24/11/26 la herramienta se llama **Musical** y tiene su botón propio en la barra (ya no cuelga de Canciones). Su par es **Lírico** (`docs/lirico.md`); son procesos distintos y pueden ligarse después, de forma opcional.

Herramienta de Malgesto App para **planear un EP o álbum** como curvas calculadas de siete indicadores por escena. Vive aparte de Canciones (no mezcla la armonía de canciones reales) y usa el permiso del bloque Canciones (editan administrador y superadmin de la banda). Pertenece al satélite **Producción** de Cosmos (`galaxias/produccion.md` en el repo privado `0dataDesk/Cosmos`). Para retomar el proyecto o mejorar la herramienta: `orbita/encargos/retomar-produccion.md` de ese repo.

## Qué hace
- **Vista del EP completo:** dos gráficas calculadas (Intensidad y Peso), una tira de escenas con su tamaño en compases y, por canción, siete medidores con el **promedio** de cada indicador. Mover o escribir un promedio sube o baja todas las escenas de esa canción conservando su forma. Rayas punteadas de promedio por canción.
- **Vista de una canción:** el detalle de cada escena: siete medidores (cuerpo primero, de sub a altos; luego núcleo) con cajas para escribir 0-100, la referencia de lo elegido para la canción (raya, banda con el rango de su palabra y texto «EP 10 · calma») y la ficha (escena, parte, compases, intención, notas y armonía).
- **Nada tiene tope:** Jorge puede pasarse a propósito.
- Autoguardado con protección contra pantallas desactualizadas.

## Modelo (`lib/epModelo.ts`, sin acceso a base de datos)
- Escena: `nombre` (la escena, cómo se imagina), `parte` (Intro, Verso, Dub, Coro…, secundaria), `compases`, `transmite` (intención), `armonia`, y siete valores 0-100: **núcleo** `energia`, `animo`, `tension`; **cuerpo** `altos`, `medios`, `graves`, `sub`.
- Canción (`Pieza`): `titulo`, `tonalidad`, `bpm`, `idea`, `referencia` (en la base, columna `niveles` jsonb: lo que se eligió para toda la canción), `secciones`.
- Proyecto: `nombre`, `tipo` (ep/album), `historia`, `version` (= `updated_at`), `piezas`.
- **Intensidad** = 65 % energía + 35 % tensión (color de la línea = ánimo; rayas = tensión). **Peso** = 30 % sub + 30 % graves + 25 % medios + 15 % altos (capas apiladas, sub abajo). Pesos en `PESO_INTENSIDAD` y `PESO_CUERPO` (de diseño, ajustables).
- Cada medidor tiene escala (qué es 0, qué es 100 y cinco palabras): `NUCLEO` y `CUERPO`, `palabraDe`.
- `promedioDe` (ponderado por compases), `moverPromedio` (sube acercando cada escena a 100 y baja acercándola a 0 en la misma proporción), `referenciaDe`.
- `tramosDe` reparte el ancho por compases; `curvaSuave` (S entre puntos, nunca tramos rectos) y `capaEntre` dibujan.
- `normalizarProyecto` valida todo lo que llega del cliente (rangos, ids únicos, tamaños máximos: 12 canciones, 40 escenas).

## Archivos
- `app/musical/page.tsx` (ruta, permisos, selector de banda), `app/musical/actions.ts` (crear, guardar, eliminar; el guardado devuelve un resultado con `desactualizado`).
- `components/ep/MapaEP.tsx` (toda la pantalla: SVG de ancho completo medido con `ResizeObserver`, `Medidor`, `CajaValor`), `components/ep/NuevoProyecto.tsx`.
- `lib/epModelo.ts` (modelo), `lib/epData.ts` (lectura y guardado en Supabase; solo servidor).
- `scripts/check-ep.ts` (corre dentro de `npm run check`, antes de cada build: cálculos, escalas, colores del ánimo, geometría, curvas, promedios, referencia, validación).
- `supabase/migrations/20261120*` y `20261121*`: `proyectos_musicales`, `proyecto_piezas`, `proyecto_secciones` y sus columnas (`energia`, `animo`, `parte`, `niveles`, `techos`). `techos` y `niveles` antiguos del intento de «zoom» están sin uso o reutilizados como referencia (ver nota en la migración).

## Datos (Supabase `bnsrxjuerbejkcroddax`, esquema `malgesto_app`)
`proyectos_musicales` → `proyecto_piezas` → `proyecto_secciones`, con RLS activa y sin políticas (solo el servidor con la llave de servicio). Columnas sin uso en pantalla (se conservan): `nivel`, `espacio`, `densidad`, `ritmo`, `etapa`, `instrumentos` de las escenas, `ajuste` de las canciones y `techos` del proyecto.

## Qué se probó y se descartó (no repetir sin hablar con Jorge)
Etapas de colores (estorbaban), techo global del EP (no servía), zoom por canción (nivel × porcentaje; no lo necesitó), curva de emoción editable (ahora todo se calcula), puntos sobre la curva de intensidad (estorbaban).

## Cómo trabajar aquí
- Describir con un ejemplo con sus números los cambios que alteren cómo se piensa la herramienta y esperar su visto bueno; los ajustes visuales y errores se publican de inmediato.
- Nunca transformar sus datos con pérdida: partir siempre de la forma original.
- `npm run check`, `npx tsc --noEmit` y `npm run build` antes de subir. El build a veces falla con «next/font/google queries have exactly one entry» (descarga de la tipografía, pasajero): borrar `.next` y reintentar; no subir si no compiló.
- Después de cambiar datos en Supabase, subir `proyectos_musicales.updated_at` para que las pantallas abiertas se recarguen.
- Verificar el despliegue READY en Vercel (proyecto `malgesto`).

## Estructura técnica de la canción (20-24/11/26)
- Cada escena es una **parte** de una lista fija y general para el género: Intro, Verso, Coro, Puente, Solo y Outro. Verso, Coro, Puente y Solo se pueden repetir; el nombre se genera solo (`etiquetaDe` en `lib/epModelo.ts`): «Verso», o «Verso 1», «Verso 2» si hay más de uno. No hay nombre libre de escena.
- «Dub» ya no es una parte: es un recurso creativo que puede ocurrir en cualquier escena.
- En la vista de una canción, la barra bajo la gráfica trae «Agregar» con las seis partes (después de la escena elegida o al final), subir/bajar, duplicar y eliminar. Una canción puede quedar **sin estructura** (nace así).
- Una escena nueva parte de los siete valores que se eligieron para la canción en la vista del EP.
- Al guardar, el servidor escribe el nombre técnico en `proyecto_secciones.nombre` (la parte va en `parte`). Los datos anteriores con otras partes (Dub, Pre-coro, Final…) no se transforman: conservan su nombre hasta que se rehagan.
