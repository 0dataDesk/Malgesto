-- «Compases revisados»: Jorge marca una canción como arreglada al guardar su estructura; mientras no, la lista muestra un foco rojo.
alter table malgesto_app.canciones add column if not exists compases_revisados boolean not null default false;
update malgesto_app.canciones set compases_revisados = true where titulo = 'A Un Minuto de Ti';
