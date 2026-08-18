-- =====================================================================
-- Portal del Comité Organizador — Evento 1-sep-2026 (NT / Global Forest)
-- Migración 02 · Horas de inicio y fin por bloque del programa
-- Aplicada el 18-ago-2026 al proyecto cytopyytymxjwvfhosvg.
-- =====================================================================
-- Aditiva e idempotente: agrega dos columnas y solo rellena filas que
-- no tengan hora. No toca columnas existentes ni borra nada.
--
-- Relleno inicial: se encadenan las duraciones (minutos) en el orden
-- del programa partiendo de las 19:00 — el evento corre 7:00–9:00 pm.
-- Después cada hora se edita a mano desde la pestaña Programa.
-- =====================================================================

alter table public.ev_bloque add column if not exists inicio time;
alter table public.ev_bloque add column if not exists fin    time;

with acum as (
  select id,
         time '19:00'
           + coalesce(sum(minutos) over (order by orden, creado_en
               rows between unbounded preceding and 1 preceding), 0)
             * interval '1 minute'                                   as ini,
         time '19:00'
           + sum(minutos) over (order by orden, creado_en)
             * interval '1 minute'                                   as fn
  from public.ev_bloque
)
update public.ev_bloque b
   set inicio = a.ini,
       fin    = a.fn
  from acum a
 where a.id = b.id
   and b.inicio is null
   and b.fin    is null;
