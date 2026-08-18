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

-- Bucket público de SOLO lectura para imágenes de láminas.
-- Lectura: URL pública (no pasa por RLS). Escritura: únicamente la edge
-- function con service role — no hay policies de insert/update/delete.
insert into storage.buckets (id, name, public, file_size_limit)
values ('laminas', 'laminas', true, 8388608)   -- 8 MB por imagen
on conflict (id) do update set public = true, file_size_limit = 8388608;

-- =====================================================================
-- Edge function 'constructor' (deployada aparte; acciones):
--   listar        → deck completo
--   guardar       → alta/edición (nueva entra al final de su sección)
--   borrar        → elimina la fila y su imagen del bucket
--   reordenar     → [{id, orden}] calculados por el cliente
--   subir_imagen  → base64 → archivo en 'laminas' → URL pública
-- Todas exigen { clave } en el cuerpo; 401 si no coincide.
-- =====================================================================
