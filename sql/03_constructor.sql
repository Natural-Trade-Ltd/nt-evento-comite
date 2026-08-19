-- =====================================================================
-- Constructor de presentación — evento 1-sep-2026 (NT / Global Forest)
-- Proyecto Supabase: NT-Evento-Comite (cytopyytymxjwvfhosvg)
-- Referencia de la migración 'constructor_presentacion_v1' · 18-ago-2026
-- =====================================================================
-- Patrón de acceso (igual que evento-registro / espejo):
--   · constructor.html y presentar.html NO llevan ninguna llave.
--   · Todo pasa por la edge function 'constructor', que valida la clave
--     compartida contra public.ev_secret.constructor_clave (service role).
--   · ev_lamina tiene RLS SIN policies: nadie entra directo con la
--     publishable key. Rotar la clave = un UPDATE a ev_secret.
-- =====================================================================

create table if not exists public.ev_lamina (
  id             uuid primary key default gen_random_uuid(),
  seccion        text not null default 'bienvenida'
                 check (seccion in ('bienvenida','quienes_somos','diferenciadores','portal','app','cierre')),
  orden          numeric not null default 100,
  titulo         text not null,
  frase          text,             -- subtítulo en cursiva (opcional)
  cuerpo         text,             -- puntos, uno por línea; **negritas** entre asteriscos
  imagen_url     text,             -- URL pública en el bucket 'laminas'
  video_url      text,             -- enlace (YouTube/Vimeo/Drive/.mp4) o archivo del bucket
  presentador    text,             -- quién presenta esta lámina
  minutos        numeric not null default 2,
  notas          text,             -- notas del presentador (tecla N en modo presentar)
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz       -- lo pone la edge function al editar
);
create index if not exists ix_ev_lamina_orden on public.ev_lamina(seccion, orden);
alter table public.ev_lamina enable row level security;   -- sin policies: solo service_role

-- Clave del constructor: hoy el mismo valor que el tablero del padrón
-- (una sola contraseña para el comité), pero en su propia fila — rotarla
-- aquí no toca el otro proyecto.
insert into public.ev_secret (clave, valor)
select 'constructor_clave', '<CLAVE>'    -- el valor real vive solo en la base
where not exists (select 1 from public.ev_secret where clave = 'constructor_clave');

-- Bucket público de SOLO lectura para imágenes y videos de láminas.
-- Lectura: URL pública (no pasa por RLS). Escritura: solo con service role —
-- las imágenes las sube la edge function; los videos van directo del navegador
-- con una URL firmada que la función emite (un video no cabe en base64).
insert into storage.buckets (id, name, public, file_size_limit)
values ('laminas', 'laminas', true, 314572800)   -- 300 MB por archivo (videos)
on conflict (id) do update set public = true, file_size_limit = 314572800;

-- =====================================================================
-- Edge function 'constructor' (deployada aparte; acciones):
--   listar        → deck completo
--   guardar       → alta/edición (nueva entra al final de su sección)
--   borrar        → elimina la fila y su imagen del bucket
--   reordenar     → [{id, orden}] calculados por el cliente
--   subir_imagen  → base64 → archivo en 'laminas' → URL pública
--   subir_video   → URL firmada (vale 2 h); el navegador hace PUT ahí y el
--                   archivo nunca pasa por la función
-- Todas exigen { clave } en el cuerpo; 401 si no coincide.
-- Al editar o borrar una lámina, la función limpia del bucket la imagen o el
-- video que quedaron huérfanos (los enlaces externos no se tocan).
-- =====================================================================
