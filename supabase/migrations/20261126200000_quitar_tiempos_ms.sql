-- 26/11/26: se retira "grabar tiempos" y el cálculo de tiempos por tempo; el Estudio avanza a mano
-- y los compases se capturan a mano. Se elimina la columna con los tiempos grabados.
ALTER TABLE malgesto_app.canciones DROP COLUMN IF EXISTS tiempos_ms;
