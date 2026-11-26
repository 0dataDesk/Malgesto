-- Género de la canción (texto libre, opcional): para filtrar y ordenar la lista de Canciones.
alter table malgesto_app.canciones add column if not exists genero text;
