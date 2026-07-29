-- =====================================================================
-- Portal del Comité Organizador — Evento 1-sep-2026 (NT / Global Forest)
-- Proyecto Supabase dedicado: NT-Evento-Comite (cytopyytymxjwvfhosvg)
-- Esquema v1 · 29-jul-2026
-- =====================================================================
-- Acceso: cualquier correo @naturaltrade.ca o @globalforest.com.mx
-- Todo lo demás queda fuera (RLS en todas las tablas).
-- =====================================================================

-- ---------- Helpers de identidad -------------------------------------
create or replace function public.ev_email() returns text
  language sql stable security definer set search_path = ''
as $$ select lower(coalesce(auth.jwt() ->> 'email', '')) $$;

create table if not exists public.ev_admin_lista (
  email text primary key
);

create or replace function public.ev_autorizado() returns boolean
  language sql stable security definer set search_path = ''
as $$
  select split_part(public.ev_email(), '@', 2)
         in ('naturaltrade.ca', 'globalforest.com.mx')
$$;

create or replace function public.ev_admin() returns boolean
  language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.ev_admin_lista a where a.email = public.ev_email())
$$;

-- Puede escribir sobre una fila: su autor o un admin
create or replace function public.ev_mio(autor text) returns boolean
  language sql stable security definer set search_path = ''
as $$ select lower(coalesce(autor,'')) = public.ev_email() or public.ev_admin() $$;

-- ---------- Trigger genérico de auditoría ----------------------------
create or replace function public.ev_touch() returns trigger
  language plpgsql security definer set search_path = ''
as $$
begin
  new.actualizado_en := now();
  new.actualizado_por := public.ev_email();
  return new;
end $$;

-- =====================================================================
-- 1. PERSONAS (perfil ligero; se crea al primer ingreso)
-- =====================================================================
create table if not exists public.ev_persona (
  email          text primary key,
  nombre         text not null,
  iniciales      text,
  area           text,             -- comercial | logistica | tecnologia | admin | direccion
  asiste         boolean,          -- ¿va al evento en CDMX?
  color          text,
  creado_en      timestamptz not null default now(),
  visto_en       timestamptz
);

-- =====================================================================
-- 2. ACUERDOS / decisiones tomadas (destilado de la junta)
-- =====================================================================
create table if not exists public.ev_acuerdo (
  id             uuid primary key default gen_random_uuid(),
  texto          text not null,
  detalle        text,
  fuente         text default 'Junta comité 29-jul-2026',
  firme          boolean not null default true,   -- false = a discutir
  orden          numeric not null default 100,
  creado_en      timestamptz not null default now(),
  creado_por     text not null default public.ev_email(),
  actualizado_en timestamptz,
  actualizado_por text
);

-- =====================================================================
-- 3. MENSAJES CLAVE  ("qué quiero que el cliente se lleve")
--    Es el paso 1 que pidieron Carlos y Jorge: definir el mensaje.
-- =====================================================================
create table if not exists public.ev_mensaje (
  id             uuid primary key default gen_random_uuid(),
  texto          text not null,
  categoria      text not null default 'mensaje',
    -- mensaje | diferenciador | to_be_continued | riesgo
  porque         text,             -- por qué importa
  estado         text not null default 'propuesto',  -- propuesto | acordado | descartado
  autor_email    text not null default public.ev_email(),
  autor_nombre   text,
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz,
  actualizado_por text
);

-- =====================================================================
-- 4. PROGRAMA / RUN OF SHOW
-- =====================================================================
create table if not exists public.ev_bloque (
  id             uuid primary key default gen_random_uuid(),
  orden          numeric not null default 100,
  titulo         text not null,
  tipo           text not null default 'vivo',
    -- vivo | video | video_loop | encuesta | mago | networking | logistica | mesas
  minutos        numeric not null default 3,
  objetivo       text,             -- qué debe lograr este bloque
  descripcion    text,
  guion          text,             -- lo que se dice
  pantalla       text,             -- lo que se ve
  estado         text not null default 'idea',   -- idea | borrador | listo
  creado_en      timestamptz not null default now(),
  creado_por     text not null default public.ev_email(),
  actualizado_en timestamptz,
  actualizado_por text
);

-- =====================================================================
-- 5. VIDEOS  (cada uno es una mesa de trabajo)
-- =====================================================================
create table if not exists public.ev_video (
  id             uuid primary key default gen_random_uuid(),
  codigo         text unique not null,     -- V1, V2, ...
  titulo         text not null,
  concepto       text,
  uso            text,             -- presentacion | loop_fondo | teaser | cierre
  duracion_seg   integer,
  responsable    text,             -- email
  estado         text not null default 'idea',   -- idea | guion | assets | edicion | listo
  orden          numeric not null default 100,
  notas          text,
  creado_en      timestamptz not null default now(),
  creado_por     text not null default public.ev_email(),
  actualizado_en timestamptz,
  actualizado_por text
);

create table if not exists public.ev_escena (
  id             uuid primary key default gen_random_uuid(),
  video_id       uuid not null references public.ev_video(id) on delete cascade,
  orden          numeric not null default 100,
  timecode       text,
  visual         text,             -- tomas / qué se ve
  voz            text,             -- locución literal
  pantalla       text,             -- texto en pantalla
  musica         text,
  assets_nota    text,             -- qué material hace falta
  estado         text not null default 'pendiente',
  creado_en      timestamptz not null default now(),
  creado_por     text not null default public.ev_email(),
  actualizado_en timestamptz,
  actualizado_por text
);

-- =====================================================================
-- 6. ENCUESTA / QR interactivo  (banco de preguntas)
-- =====================================================================
create table if not exists public.ev_pregunta (
  id             uuid primary key default gen_random_uuid(),
  texto          text not null,
  momento        text not null default 'registro',  -- registro | intercalada | cierre
  formato        text not null default 'multiple',  -- multiple | abierta | escala
  opciones       text[],
  objetivo       text,             -- para qué la queremos / a qué bloque conecta
  estado         text not null default 'propuesta', -- propuesta | aprobada | descartada
  orden          numeric not null default 100,
  autor_email    text not null default public.ev_email(),
  autor_nombre   text,
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz,
  actualizado_por text
);

-- =====================================================================
-- 7. MAGO  (actos y cómo se enlazan al mensaje)
-- =====================================================================
create table if not exists public.ev_acto (
  id             uuid primary key default gen_random_uuid(),
  titulo         text not null,
  momento        text,             -- apertura | intermedio | cierre | mesas
  efecto         text,             -- qué hace el mago
  conexion       text,             -- cómo conecta con nuestro mensaje
  necesita       text,             -- qué necesitamos darle
  riesgo         text,             -- ensayo / dependencia
  estado         text not null default 'propuesto',
  orden          numeric not null default 100,
  creado_en      timestamptz not null default now(),
  creado_por     text not null default public.ev_email(),
  actualizado_en timestamptz,
  actualizado_por text
);

-- =====================================================================
-- 8. REPARTO / participaciones
-- =====================================================================
create table if not exists public.ev_participacion (
  id             uuid primary key default gen_random_uuid(),
  bloque_id      uuid references public.ev_bloque(id) on delete cascade,
  persona_email  text not null,
  papel          text not null default 'presenta',  -- presenta | apoya | demo | voz_off | coordina
  minutos        numeric,
  guion_personal text,
  confirmado     boolean not null default false,
  creado_en      timestamptz not null default now(),
  creado_por     text not null default public.ev_email(),
  actualizado_en timestamptz,
  actualizado_por text
);

-- =====================================================================
-- 9. IDEAS / muro de aportaciones
-- =====================================================================
create table if not exists public.ev_idea (
  id             uuid primary key default gen_random_uuid(),
  texto          text not null,
  area           text not null default 'general',
    -- general | video | presentacion | encuesta | mago | logistica | tecnologia | cierre
  estado         text not null default 'nueva',  -- nueva | en_analisis | adoptada | descartada
  origen         text not null default 'portal', -- junta | portal
  autor_email    text not null default public.ev_email(),
  autor_nombre   text,
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz,
  actualizado_por text
);

-- =====================================================================
-- 10. TAREAS  (microequipos, tareas cortas semanales)
-- =====================================================================
create table if not exists public.ev_tarea (
  id             uuid primary key default gen_random_uuid(),
  titulo         text not null,
  detalle        text,
  responsable    text,             -- email
  equipo         text,             -- video | guion | encuesta | assets | av | logistica | app
  fecha_limite   date,
  estado         text not null default 'pendiente', -- pendiente | en_progreso | bloqueada | hecha
  orden          numeric not null default 100,
  creado_en      timestamptz not null default now(),
  creado_por     text not null default public.ev_email(),
  actualizado_en timestamptz,
  actualizado_por text
);

-- =====================================================================
-- 11. REPOSITORIO de material (archivos, fotos, videos, links)
-- =====================================================================
create table if not exists public.ev_asset (
  id             uuid primary key default gen_random_uuid(),
  tipo           text not null default 'documento',
    -- foto | video | documento | excel | audio | link
  titulo         text not null,
  descripcion    text,
  storage_path   text,             -- ruta en el bucket 'repositorio'
  url_externa    text,             -- si es link (Drive, YouTube, WeTransfer…)
  mime           text,
  bytes          bigint,
  carpeta        text not null default '99_General',
    -- 01_Historicas_NaturalTrade | 02_Historicas_GlobalForest | 03_Sitios_Actuales
    -- 04_Logos | 05_Broll_Stock | 06_Equipo | 07_Datos_Excel | 08_Guiones
    -- 09_Capturas_App | 99_General
  video_codigo   text,             -- a qué video pertenece (V1…)
  etiquetas      text[],
  anio           text,             -- año de la foto/dato, si aplica
  espejado_en    timestamptz,      -- cuándo se copió al repo de GitHub
  autor_email    text not null default public.ev_email(),
  autor_nombre   text,
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz,
  actualizado_por text
);

-- =====================================================================
-- 12. VOTOS y COMENTARIOS genéricos (sobre cualquier entidad)
-- =====================================================================
create table if not exists public.ev_voto (
  entidad        text not null,    -- mensaje | idea | pregunta | acto | bloque | video | asset
  ref_id         uuid not null,
  autor_email    text not null default public.ev_email(),
  creado_en      timestamptz not null default now(),
  primary key (entidad, ref_id, autor_email)
);

create table if not exists public.ev_comentario (
  id             uuid primary key default gen_random_uuid(),
  entidad        text not null,
  ref_id         uuid not null,
  texto          text not null,
  autor_email    text not null default public.ev_email(),
  autor_nombre   text,
  creado_en      timestamptz not null default now()
);

-- ---------- Índices --------------------------------------------------
create index if not exists ix_ev_escena_video   on public.ev_escena(video_id, orden);
create index if not exists ix_ev_voto_ref       on public.ev_voto(entidad, ref_id);
create index if not exists ix_ev_com_ref        on public.ev_comentario(entidad, ref_id, creado_en);
create index if not exists ix_ev_asset_carpeta  on public.ev_asset(carpeta, creado_en desc);
create index if not exists ix_ev_asset_video    on public.ev_asset(video_codigo);
create index if not exists ix_ev_part_bloque    on public.ev_participacion(bloque_id);

-- ---------- Triggers de auditoría ------------------------------------
do $$
declare t text;
begin
  foreach t in array array['ev_acuerdo','ev_mensaje','ev_bloque','ev_video','ev_escena',
                           'ev_pregunta','ev_acto','ev_participacion','ev_idea',
                           'ev_tarea','ev_asset']
  loop
    execute format('drop trigger if exists tg_touch_%1$s on public.%1$s', t);
    execute format('create trigger tg_touch_%1$s before update on public.%1$s
                    for each row execute function public.ev_touch()', t);
  end loop;
end $$;

-- =====================================================================
-- RLS
-- =====================================================================
-- Patrón:
--   SELECT / INSERT  → cualquier autorizado (@naturaltrade.ca / @globalforest.com.mx)
--   UPDATE           → documentos colaborativos: cualquier autorizado
--                      aportaciones personales: autor o admin
--   DELETE           → autor o admin (siempre)
-- =====================================================================

alter table public.ev_admin_lista   enable row level security;  -- sin policies: solo service_role

do $$
declare
  t text;
  colaborativas text[] := array['ev_acuerdo','ev_bloque','ev_video','ev_escena',
                                'ev_acto','ev_participacion','ev_tarea','ev_persona'];
  personales    text[] := array['ev_mensaje','ev_idea','ev_pregunta','ev_asset'];
  autor_col     text;
begin
  -- Colaborativas: todos los autorizados pueden editar (documento de trabajo común)
  foreach t in array colaborativas loop
    execute format('alter table public.%1$s enable row level security', t);
    execute format('drop policy if exists p_sel on public.%1$s', t);
    execute format('drop policy if exists p_ins on public.%1$s', t);
    execute format('drop policy if exists p_upd on public.%1$s', t);
    execute format('drop policy if exists p_del on public.%1$s', t);
    execute format('create policy p_sel on public.%1$s for select using (public.ev_autorizado())', t);
    execute format('create policy p_ins on public.%1$s for insert with check (public.ev_autorizado())', t);
    execute format('create policy p_upd on public.%1$s for update using (public.ev_autorizado()) with check (public.ev_autorizado())', t);
  end loop;

  -- Personales (llevan autor_email): editar/borrar solo el autor o un admin
  foreach t in array personales loop
    execute format('alter table public.%1$s enable row level security', t);
    execute format('drop policy if exists p_sel on public.%1$s', t);
    execute format('drop policy if exists p_ins on public.%1$s', t);
    execute format('drop policy if exists p_upd on public.%1$s', t);
    execute format('drop policy if exists p_del on public.%1$s', t);
    execute format('create policy p_sel on public.%1$s for select using (public.ev_autorizado())', t);
    execute format('create policy p_ins on public.%1$s for insert with check (public.ev_autorizado() and lower(autor_email) = public.ev_email())', t);
    execute format('create policy p_upd on public.%1$s for update using (public.ev_mio(autor_email)) with check (public.ev_mio(autor_email))', t);
    execute format('create policy p_del on public.%1$s for delete using (public.ev_mio(autor_email))', t);
  end loop;
end $$;

-- DELETE en colaborativas: autor original o admin
create policy p_del on public.ev_acuerdo       for delete using (public.ev_mio(creado_por));
create policy p_del on public.ev_bloque        for delete using (public.ev_mio(creado_por));
create policy p_del on public.ev_video         for delete using (public.ev_mio(creado_por));
create policy p_del on public.ev_escena        for delete using (public.ev_mio(creado_por));
create policy p_del on public.ev_acto          for delete using (public.ev_mio(creado_por));
create policy p_del on public.ev_participacion for delete using (public.ev_mio(creado_por));
create policy p_del on public.ev_tarea         for delete using (public.ev_mio(creado_por));
create policy p_del on public.ev_persona       for delete using (public.ev_admin());

-- Votos: cada quien pone y quita el suyo
alter table public.ev_voto enable row level security;
drop policy if exists p_sel on public.ev_voto;
drop policy if exists p_ins on public.ev_voto;
drop policy if exists p_del on public.ev_voto;
create policy p_sel on public.ev_voto for select using (public.ev_autorizado());
create policy p_ins on public.ev_voto for insert with check (public.ev_autorizado() and lower(autor_email) = public.ev_email());
create policy p_del on public.ev_voto for delete using (lower(autor_email) = public.ev_email() or public.ev_admin());

-- Comentarios: todos leen, cada quien escribe lo suyo y borra lo suyo
alter table public.ev_comentario enable row level security;
drop policy if exists p_sel on public.ev_comentario;
drop policy if exists p_ins on public.ev_comentario;
drop policy if exists p_del on public.ev_comentario;
create policy p_sel on public.ev_comentario for select using (public.ev_autorizado());
create policy p_ins on public.ev_comentario for insert with check (public.ev_autorizado() and lower(autor_email) = public.ev_email());
create policy p_del on public.ev_comentario for delete using (lower(autor_email) = public.ev_email() or public.ev_admin());

-- =====================================================================
-- STORAGE — bucket privado 'repositorio'
-- =====================================================================
insert into storage.buckets (id, name, public, file_size_limit)
values ('repositorio', 'repositorio', false, 524288000)   -- 500 MB por archivo
on conflict (id) do update set file_size_limit = 524288000, public = false;

drop policy if exists ev_rep_sel on storage.objects;
drop policy if exists ev_rep_ins on storage.objects;
drop policy if exists ev_rep_upd on storage.objects;
drop policy if exists ev_rep_del on storage.objects;

create policy ev_rep_sel on storage.objects for select
  using (bucket_id = 'repositorio' and public.ev_autorizado());
create policy ev_rep_ins on storage.objects for insert
  with check (bucket_id = 'repositorio' and public.ev_autorizado());
create policy ev_rep_upd on storage.objects for update
  using (bucket_id = 'repositorio' and public.ev_autorizado());
create policy ev_rep_del on storage.objects for delete
  using (bucket_id = 'repositorio' and public.ev_autorizado());

-- ---------- Vista de resumen (para la portada) -----------------------
create or replace view public.ev_resumen as
select
  (select count(*) from public.ev_mensaje  where estado <> 'descartado') as mensajes,
  (select count(*) from public.ev_idea     where estado <> 'descartada') as ideas,
  (select coalesce(sum(minutos),0) from public.ev_bloque)                as minutos_programa,
  (select count(*) from public.ev_video)                                 as videos,
  (select count(*) from public.ev_asset)                                 as assets,
  (select count(*) from public.ev_tarea where estado <> 'hecha')         as tareas_abiertas,
  (select count(*) from public.ev_pregunta where estado = 'aprobada')    as preguntas_ok,
  (select count(*) from public.ev_persona)                               as personas;

grant select on public.ev_resumen to authenticated;
