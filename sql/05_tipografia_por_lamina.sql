-- =====================================================================
-- Tipografía por lámina (Jorge, 30-ago)
--
-- Antes la fuente y el tamaño eran de todo el deck: para que una lámina
-- respirara distinta había que tocar CSS. Ahora cada una elige.
--
-- Aditivas y con default, así que ninguna lámina existente cambia de
-- aspecto: 'casa' es exactamente lo que se venía viendo y escala 1 deja
-- mandar al ajuste automático del proyector.
-- =====================================================================

alter table public.ev_lamina add column if not exists fuente text not null default 'casa';
alter table public.ev_lamina add column if not exists escala numeric not null default 1;

-- casa       = títulos serif + texto sans (el de siempre)
-- serif      = todo en la serif de la casa
-- sans       = todo en la sans del sistema
-- condensada = la de las láminas del Portal
-- mono       = monoespaciada
-- Todas son pilas del SISTEMA: si el salón se queda sin red a media
-- presentación, no hay una fuente web que se quede sin cargar.
alter table public.ev_lamina drop constraint if exists ev_lamina_fuente_check;
alter table public.ev_lamina
  add constraint ev_lamina_fuente_check
  check (fuente in ('casa','serif','sans','condensada','mono'));

-- Multiplicador sobre el tamaño que el proyector calcula solo para llenar la
-- lámina. Acotado: nadie deja una lámina ilegible ni una que se salga.
alter table public.ev_lamina drop constraint if exists ev_lamina_escala_check;
alter table public.ev_lamina
  add constraint ev_lamina_escala_check
  check (escala >= 0.6 and escala <= 1.8);

-- =====================================================================
-- Nota sobre el TÍTULO (mismo pedido, sin migración): ev_lamina.titulo ya
-- era texto libre, así que admite saltos de línea tal cual. Lo que cambió
-- es que el constructor dejó de aplanarlos (input → textarea) y que el
-- proyector los respeta (white-space:pre-line). La edge function recorta a
-- 4 renglones y quita los vacíos de los extremos.
-- =====================================================================
