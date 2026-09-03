-- =====================================================================
-- Tipo de lámina: LÍNEA DE TIEMPO (Jorge, 1-sep)
--
-- Hasta ahora la única lámina que se revelaba por pasos era el recorrido
-- del Portal, que vive escrito a mano dentro de presentar.html. El motor
-- de pasos (data-step + el clicker) ya era general; lo que faltaba era una
-- lámina de la BASE que lo pudiera usar.
--
-- Aditiva y con default, así que ninguna lámina existente cambia.
-- =====================================================================

alter table public.ev_lamina add column if not exists tipo text not null default 'normal';

alter table public.ev_lamina drop constraint if exists ev_lamina_tipo_check;
alter table public.ev_lamina
  add constraint ev_lamina_tipo_check
  check (tipo in ('normal', 'linea_tiempo'));

-- =====================================================================
-- Cómo se llena una línea de tiempo:
--   tipo   = 'linea_tiempo'
--   cuerpo = un hito por renglón, con el formato «fecha | qué es»
--
--     1 de octubre | Lanzamiento a clientes
--     1 de noviembre | Asistente interactivo
--     1 de enero | Inventarios y calculadora de merma
--     1 de marzo | + Novedades
--
-- El proyector pinta los hitos repartidos en partes iguales sobre un eje y
-- los descubre UNO A UNO con el mismo clicker (data-step). El primero lleva
-- el punto más grande: es el lanzamiento. Al regresar, la lámina llega
-- completa, igual que las del Portal.
-- =====================================================================
