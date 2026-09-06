-- Cierre del incidente de caída de producción (rename de schemas, 18 ago 2026).
-- Durante ese incidente se crearon como workaround los schemas vacíos `repertorio`
-- y `malgesto`. Verificado el 6 sep 2026 vía consulta directa a pg_class que ambos
-- tenían 0 relations. Se eliminan por limpieza; no los referencia nada.

DROP SCHEMA IF EXISTS repertorio CASCADE;
DROP SCHEMA IF EXISTS malgesto CASCADE;
