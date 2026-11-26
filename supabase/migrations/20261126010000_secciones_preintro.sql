-- Nueva parte de sección: Preintro (lo que suena antes del Intro).
alter table malgesto_app.secciones drop constraint secciones_nombre_check;
alter table malgesto_app.secciones add constraint secciones_nombre_check
  check (nombre ~ '^(Preintro|Intro|Verso|Precoro|Coro|Puente|Solo|Outro|Sección Única)( [1-9][0-9]?)?$');
