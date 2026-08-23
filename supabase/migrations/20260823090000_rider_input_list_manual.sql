-- Brief "Input List manual (editable), aparte del cálculo automático":
-- complemento al Input List calculado (lib/riderData.ts, construirRider) --
-- NO lo reemplaza ni se reconcilia con él. Cubre riders reales con más
-- detalle del que el modelo automático puede representar (desglose por
-- pieza de batería, instrumentos fuera de catálogo, dos micrófonos por
-- persona). Captura libre a propósito: `descripcion` es texto plano (ej.
-- "KICK IN BETA 91"), sin vínculo a plazas/dispositivos -- por eso vive
-- separada de stage_plot_items en vez de forzarse ahí.
CREATE TABLE malgesto_app.rider_input_list_manual (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_plot_id uuid NOT NULL REFERENCES malgesto_app.stage_plots(id) ON DELETE CASCADE,
  numero_canal integer NOT NULL,
  descripcion text NOT NULL,
  orden integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX rider_input_list_manual_stage_plot_idx ON malgesto_app.rider_input_list_manual (stage_plot_id);
