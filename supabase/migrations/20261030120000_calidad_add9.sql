-- Acorde add9 (Cadd9 de Disarm): la hoja lo trae y antes se guardaba simplificado a mayor.
ALTER TABLE malgesto_app.acordes DROP CONSTRAINT acordes_calidad_check;
ALTER TABLE malgesto_app.acordes ADD CONSTRAINT acordes_calidad_check
  CHECK (calidad IN ('mayor','menor','disminuido','aumentado','7','maj7','m7','dim7','m7b5','sus2','sus4','add9'));
ALTER TABLE malgesto_app.letra_acordes DROP CONSTRAINT letra_acordes_calidad_check;
ALTER TABLE malgesto_app.letra_acordes ADD CONSTRAINT letra_acordes_calidad_check
  CHECK (calidad IN ('mayor','menor','disminuido','aumentado','7','maj7','m7','dim7','m7b5','sus2','sus4','add9'));
