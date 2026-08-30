-- =====================================================================
-- Secciones de la presentación, editables (Jorge, 29-ago)
--
-- Antes las seis secciones vivían hardcodeadas en constructor.html,
-- presentar.html y en un CHECK sobre ev_lamina.seccion: agregar o quitar
-- una sección exigía tocar código y desplegar. Ahora viven aquí y se
-- administran desde el propio constructor (botón "⚙ Secciones").
-- =====================================================================

create table if not exists public.ev_seccion (
  clave      text primary key,
  nombre     text not null,
  orden      int  not null default 0,
  creado_en  timestamptz not null default now()
);

-- Igual que las demás tablas del evento: RLS prendido y sin políticas, así
-- que solo la edge function (service role) entra. La página pública nunca
-- habla con la tabla directo.
alter table public.ev_seccion enable row level security;

-- Arranque con las seis de siempre, respetando el orden con el que ya se
-- presentaba. Idempotente: si ya están, no las pisa.
insert into public.ev_seccion (clave, nombre, orden) values
  ('bienvenida',      'Bienvenida',          10),
  ('quienes_somos',   'Quiénes somos',       20),
  ('diferenciadores', 'Qué nos diferencia',  30),
  ('portal',          'Portal de clientes',  40),
  ('app',             'NT App',              50),
  ('cierre',          'Cierre',              60)
on conflict (clave) do nothing;

-- El CHECK con la lista fija de seis claves impedía que una sección nueva
-- pudiera contener láminas. Lo sustituye una llave foránea: la integridad
-- sigue garantizada, pero contra la tabla viva.
--   on update cascade → renombrar la CLAVE arrastra sus láminas.
--   on delete restrict → nunca se pierde una lámina por borrar su sección;
--     la función 'sec_borrar' obliga a moverlas antes (mover_a).
alter table public.ev_lamina drop constraint if exists ev_lamina_seccion_check;

alter table public.ev_lamina drop constraint if exists ev_lamina_seccion_fkey;
alter table public.ev_lamina
  add constraint ev_lamina_seccion_fkey
  foreign key (seccion) references public.ev_seccion(clave)
  on update cascade
  on delete restrict;

-- =====================================================================
-- Acciones nuevas de la edge function 'constructor':
--   secciones    → lista ordenada (respaldo con las 6 base si está vacía)
--   sec_guardar  → alta o renombrado. { sec?, nombre }. Al crear, la clave
--                  se deriva del nombre; al renombrar NO cambia, para no
--                  dejar huérfanas las láminas que ya la apuntan.
--                  OJO: la llave de la sección viaja como `sec`, porque
--                  `clave` en el cuerpo es la CONTRASEÑA del portal.
--   sec_borrar   → { sec, mover_a? }. Con láminas y sin mover_a responde
--                  { error: 'con_laminas', laminas: n } para que el
--                  constructor pregunte a dónde van. Nunca deja borrar la
--                  última sección.
--   sec_orden    → [{clave, orden}] que calcula el constructor.
-- =====================================================================
