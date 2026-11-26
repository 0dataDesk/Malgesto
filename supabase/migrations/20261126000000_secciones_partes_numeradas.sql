-- La parte de la sección se elige sin número (Verso, Precoro, Coro…) y el
-- sistema le agrega el consecutivo según el orden («Verso 2»). Se amplía el
-- check: acepta cualquier parte del catálogo, con o sin número. Compatible con
-- los nombres que ya estaban guardados.
alter table malgesto_app.secciones drop constraint secciones_nombre_check;
alter table malgesto_app.secciones add constraint secciones_nombre_check
  check (nombre ~ '^(Intro|Verso|Precoro|Coro|Puente|Solo|Outro|Sección Única)( [1-9][0-9]?)?$');
