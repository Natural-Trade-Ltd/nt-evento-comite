// Constructor de presentación — evento 1-sep-2026 (NT / Global Forest)
// CRUD de láminas, imágenes y videos para constructor.html / presentar.html.
//
// Patrón del repo (igual que evento-registro y espejo): sin login de usuario;
// una CLAVE COMPARTIDA que vive en public.ev_secret.constructor_clave y se
// valida AQUÍ con service role. El HTML público jamás contiene la clave.
// ev_lamina tiene RLS sin policies: nadie entra directo con la publishable key.
//
// ⚠️ Desplegar SIEMPRE con --no-verify-jwt: las páginas llaman sin token.
//
// v2 (19-ago-2026): video por lámina; 'subir_video' entrega URL firmada y el
// navegador sube directo a Storage (un video no cabe en una edge function).
// v4 (24-ago-2026):
//  · UPDATE PARCIAL: solo se tocan las columnas que VIENEN en el cuerpo. Una
//    pestaña vieja del constructor (sin el campo de video) ya no puede borrar
//    el video o la imagen que otro guardó — así se perdió el primer video.
//  · Diseño por lámina: media_tam (chico|normal|grande|lleno) y
//    titulo_modo (lado|arriba|oculto).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const URL_SB = Deno.env.get('SUPABASE_URL')!;
const SRV    = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json', ...CORS } });

const SECCIONES = ['bienvenida', 'quienes_somos', 'diferenciadores', 'portal', 'app', 'cierre'];
const MEDIA_TAM = ['chico', 'normal', 'grande', 'lleno'];
const TITULO_MODO = ['lado', 'arriba', 'oculto'];
const MIMES: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const MIMES_VIDEO: Record<string, string> = {
  'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov',
};
const MAX_IMG = 6 * 1024 * 1024;   // 6 MB ya decodificada (el cliente reduce antes de subir)

const texto = (v: unknown, max: number) => {
  const s = String(v ?? '').trim();
  return s ? s.slice(0, max) : null;
};

// Borra del bucket 'laminas' lo que hubiera subido el comité (no toca enlaces externos).
const limpiar = async (db: ReturnType<typeof createClient>, url: unknown) => {
  const marca = '/object/public/laminas/';
  const s = String(url ?? '');
  if (!s.includes(marca)) return;
  await db.storage.from('laminas').remove([decodeURIComponent(s.split(marca)[1])]);
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'method' }, 405);
  let b: Record<string, unknown>;
  try { b = await req.json(); } catch { return json({ error: 'bad_json' }, 400); }

  const db = createClient(URL_SB, SRV, { auth: { persistSession: false } });

  // La clave vive en la base (rotarla es un UPDATE), nunca en el HTML público.
  const { data: sec } = await db.from('ev_secret').select('valor').eq('clave', 'constructor_clave').single();
  if (!sec?.valor || String(b.clave ?? '') !== sec.valor) return json({ error: 'clave' }, 401);

  // ── Deck completo (constructor y modo presentar) ──
  if (b.action === 'listar') {
    const { data, error } = await db.from('ev_lamina').select('*').order('orden').order('creado_en');
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true, laminas: data ?? [] });
  }

  // ── Alta / edición ──
  if (b.action === 'guardar') {
    const titulo = String(b.titulo ?? '').trim().slice(0, 140);
    if (titulo.length < 2) return json({ error: 'titulo_requerido' }, 400);
    const seccion = SECCIONES.includes(String(b.seccion)) ? String(b.seccion) : 'bienvenida';
    // Solo entran las columnas PRESENTES en el cuerpo: un cliente viejo que no
    // conoce un campo no lo puede vaciar por accidente (candado del 24-ago).
    const fila: Record<string, unknown> = { seccion, titulo };
    if ('frase'       in b) fila.frase       = texto(b.frase, 220);
    if ('cuerpo'      in b) fila.cuerpo      = texto(b.cuerpo, 4000);
    if ('imagen_url'  in b) fila.imagen_url  = texto(b.imagen_url, 500);
    if ('video_url'   in b) fila.video_url   = texto(b.video_url, 500);
    if ('presentador' in b) fila.presentador = texto(b.presentador, 80);
    if ('notas'       in b) fila.notas       = texto(b.notas, 4000);
    if ('minutos'     in b) fila.minutos     = Math.min(60, Math.max(0, Number(b.minutos ?? 2) || 0));
    if ('media_tam'   in b && MEDIA_TAM.includes(String(b.media_tam)))     fila.media_tam   = String(b.media_tam);
    if ('titulo_modo' in b && TITULO_MODO.includes(String(b.titulo_modo))) fila.titulo_modo = String(b.titulo_modo);
    if (b.id) {
      // Si cambiaron la imagen o el video, el archivo viejo del bucket sobra.
      const { data: antes } = await db.from('ev_lamina')
        .select('imagen_url, video_url').eq('id', String(b.id)).maybeSingle();
      fila.actualizado_en = new Date().toISOString();
      const { error } = await db.from('ev_lamina').update(fila).eq('id', String(b.id));
      if (error) return json({ error: error.message }, 500);
      if ('imagen_url' in fila && antes?.imagen_url && antes.imagen_url !== fila.imagen_url) await limpiar(db, antes.imagen_url);
      if ('video_url'  in fila && antes?.video_url  && antes.video_url  !== fila.video_url)  await limpiar(db, antes.video_url);
      return json({ ok: true, id: b.id });
    }
    // Nueva lámina: entra al final de su sección.
    const { data: ult } = await db.from('ev_lamina').select('orden').eq('seccion', seccion)
      .order('orden', { ascending: false }).limit(1).maybeSingle();
    fila.orden = Number(ult?.orden ?? 0) + 10;
    const { data: ins, error } = await db.from('ev_lamina').insert(fila).select('id').single();
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true, id: ins?.id });
  }

  // ── Borrar (limpia también sus archivos del bucket) ──
  if (b.action === 'borrar') {
    const id = String(b.id ?? '');
    if (!id) return json({ error: 'id' }, 400);
    const { data: fila } = await db.from('ev_lamina')
      .select('imagen_url, video_url').eq('id', id).maybeSingle();
    const { error } = await db.from('ev_lamina').delete().eq('id', id);
    if (error) return json({ error: error.message }, 500);
    await limpiar(db, fila?.imagen_url);
    await limpiar(db, fila?.video_url);
    return json({ ok: true });
  }

  // ── Reordenar: [{id, orden}] calculados por el cliente ──
  if (b.action === 'reordenar') {
    const lista = Array.isArray(b.ordenes) ? b.ordenes.slice(0, 200) : [];
    let cambiadas = 0;
    for (const o of lista) {
      const id = String((o as Record<string, unknown>)?.id ?? '');
      const n = Number((o as Record<string, unknown>)?.orden);
      if (!id || !Number.isFinite(n)) continue;
      const { error } = await db.from('ev_lamina').update({ orden: n }).eq('id', id);
      if (!error) cambiadas++;
    }
    return json({ ok: true, cambiadas });
  }

  // ── Subir imagen (base64) → URL pública del bucket ──
  if (b.action === 'subir_imagen') {
    const mime = String(b.mime ?? '');
    const ext = MIMES[mime];
    if (!ext) return json({ error: 'mime' }, 400);
    let bytes: Uint8Array;
    try {
      const bin = atob(String(b.base64 ?? ''));
      bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    } catch { return json({ error: 'base64' }, 400); }
    if (!bytes.length || bytes.length > MAX_IMG) return json({ error: 'tamano' }, 400);
    const ruta = `${crypto.randomUUID()}.${ext}`;
    const { error } = await db.storage.from('laminas')
      .upload(ruta, new Blob([bytes], { type: mime }), { contentType: mime, upsert: false });
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true, url: `${URL_SB}/storage/v1/object/public/laminas/${ruta}` });
  }

  // ── Subir VIDEO: URL firmada para que el navegador suba directo a Storage ──
  if (b.action === 'subir_video') {
    const mime = String(b.mime ?? '');
    const ext = MIMES_VIDEO[mime];
    if (!ext) return json({ error: 'mime' }, 400);
    const ruta = `${crypto.randomUUID()}.${ext}`;
    const { data, error } = await db.storage.from('laminas').createSignedUploadUrl(ruta);
    if (error || !data) return json({ error: error?.message ?? 'firma' }, 500);
    return json({
      ok: true,
      subida: data.signedUrl,   // absoluta; el navegador hace PUT aquí
      url: `${URL_SB}/storage/v1/object/public/laminas/${ruta}`,
    });
  }

  return json({ error: 'action' }, 400);
});
