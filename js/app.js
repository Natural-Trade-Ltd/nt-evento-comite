/* =====================================================================
   Portal del Comité Organizador — Evento 1-sep-2026
   Natural Trade / Global Forest
   Backend: Supabase NT-Evento-Comite (cytopyytymxjwvfhosvg)
   ===================================================================== */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const SB_URL = 'https://cytopyytymxjwvfhosvg.supabase.co';
const SB_KEY = 'sb_publishable_IjJWRYALvIWN-yzM11IYVw_GaVEf6RN';
const DOMINIOS = ['naturaltrade.ca', 'globalforest.com.mx'];
const EVENTO   = new Date('2026-09-01T19:00:00-06:00');
const INICIO_EVENTO = 19 * 60;             // 7:00 pm — arranca el evento
const FIN_EVENTO    = 21 * 60;             // 9:00 pm — hora comprometida de cierre
// La junta acordó: 30 min de presentación + ~10 de preguntas. El mago va aparte.
const PRESENTA = ['vivo', 'video', 'encuesta'];
const META_PRESENTA = 30;
const EN_ESCENA = [...PRESENTA, 'mago', 'preguntas'];
const NO_NUCLEO = ['logistica', 'video_loop', 'networking', 'mesas'];

const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: true, detectSessionInUrl: true } });

/* ---------------------------------------------------------------- utils */
const $  = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
const br  = s => esc(s).replace(/\n/g, '<br>');
const pad = n => String(n).padStart(2, '0');
const hhmm = m => { m = Math.round(m); return `${pad(Math.floor(m / 60) % 24)}:${pad(m % 60)}`; };
/* Horas del programa: en la base son `time` (HH:MM:SS); aquí viven como
   minutos desde medianoche y se muestran en 12 h, como se dice en México. */
const mDe = t => { if (t == null || t === '') return null; const p = String(t).split(':'); return +p[0] * 60 + +p[1]; };
const t24 = m => hhmm(m);                   // valor para <input type="time">
const h12 = m => { m = ((Math.round(m) % 1440) + 1440) % 1440;
  return `${Math.floor(m / 60) % 12 || 12}:${pad(m % 60)} ${Math.floor(m / 60) < 12 ? 'am' : 'pm'}`; };
const rango12 = (a, b) => { const A = h12(a), B = h12(b);
  return A.slice(-2) === B.slice(-2) ? `${A.slice(0, -3)}–${B}` : `${A} – ${B}`; };
const fmtMin = n => Number.isInteger(Number(n)) ? Number(n) : Math.round(Number(n) * 10) / 10;
const kb = b => !b ? '' : b < 1024 * 1024 ? `${Math.round(b / 1024)} KB` : `${(b / 1048576).toFixed(1)} MB`;
const uniq = a => [...new Set(a)];
const by = (k, dir = 1) => (a, b) => (a[k] > b[k] ? dir : a[k] < b[k] ? -dir : 0);

function initials(n) {
  const p = String(n || '').trim().split(/\s+/).filter(Boolean);
  return ((p[0]?.[0] || '?') + (p[1]?.[0] || '')).toUpperCase();
}
function toast(msg, bad) {
  const t = $('#toast'); t.textContent = msg; t.className = 'on' + (bad ? ' bad' : '');
  clearTimeout(toast._t); toast._t = setTimeout(() => t.className = '', 3200);
}
function fecha(d) {
  if (!d) return '';
  const x = new Date(d + (String(d).length === 10 ? 'T12:00:00' : ''));
  return x.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
}
function hace(ts) {
  if (!ts) return '';
  const s = (Date.now() - new Date(ts)) / 1000;
  if (s < 90) return 'hace un momento';
  if (s < 3600) return `hace ${Math.round(s / 60)} min`;
  if (s < 86400) return `hace ${Math.round(s / 3600)} h`;
  return `hace ${Math.round(s / 86400)} d`;
}

/* --------------------------------------------------------------- estado */
let me = null;                              // { email, nombre }
const D = {
  persona: [], acuerdo: [], mensaje: [], bloque: [], video: [], escena: [],
  pregunta: [], acto: [], participacion: [], idea: [], tarea: [], asset: [],
  voto: [], comentario: []
};
let TAB = localStorage.getItem('ev_tab') || 'tareas';
let signedCache = {};                       // storage_path -> url

/* ----------------------------------------------------------- catálogos */
const TABS = [
  { k:'tareas',      t:'Tareas',        n:() => D.tarea.filter(t => t.estado !== 'hecha').length },
  { k:'inicio',      t:'Inicio',        n:() => null },
  { k:'mensajes',    t:'Mensajes clave',n:() => D.mensaje.filter(m => m.estado !== 'descartado').length },
  { k:'programa',    t:'Programa',      n:() => D.bloque.length },
  { k:'videos',      t:'Videos',        n:() => D.video.length },
  { k:'audiovisuales', t:'Audiovisuales', n:() => AV.reduce((s, g) => s + g.piezas.length, 0) },
  { k:'interaccion', t:'Encuesta y mago', n:() => D.pregunta.length + D.acto.length },
  { k:'reparto',     t:'Reparto',       n:() => D.participacion.length },
  { k:'repositorio', t:'Repositorio',   n:() => D.asset.length },
  { k:'ideas',       t:'Ideas',         n:() => D.idea.filter(i => i.estado !== 'descartada').length }
];

/* ------------------------------------------------- AUDIOVISUALES FINALES
   Archivos terminados, en Drive: «1. NT-GF PRESENTACION SEPTIEMBRE /
   Audiovisuales finales». Al agregar una pieza nueva basta con sumarla aquí
   con su id de Drive; los enlaces se arman solos.                        */
const AV_CARPETA = '1zbKycCriNAg5yXBFCGWFGp7etzb3fMjQ';
const AV = [
  { g: 'Videos para la pantalla', d: 'Los loops, sin audio. El corte de 1080p es el que va al proyector; el de 720p es para verlo y compartirlo desde el celular.', piezas: [
    { n: 'Teaser de los dos mapas',
      f: 'Teaser_10s_NT-GF_1080p.mp4', id: '1zBBAdgqXz-WPUJCCp33N1Ojf517GyBem',
      c: ['MP4 1920×1080', '12.5 s en loop', '6.6 MB', 'nuevo'],
      t: 'Los dos mapas en uno, con disolvencia entre ambos y entrada y salida por negro para dejarlo en loop. No es un recorte del video largo: las rutas se recorren a la vez, sin rótulos ni etiquetas, con las cifras abajo sobre el mapa en movimiento. En «De Vancouver al mundo» corren las 34 rutas juntas (5 s); en «Puertos de entrada» sólo se ve el movimiento dentro del país —una referencia por puerto y por medio de transporte— con los barcos llegando a los siete puertos marítimos (7.5 s).' },
    { n: 'De Vancouver al mundo — 1080p',
      f: 'De_Vancouver_al_Mundo_65s_NOCHE_1080p.mp4', id: '1h8WYmsiHXRJaj1puuaUf5SjsW8-zGH9l',
      c: ['MP4 1920×1080', '65 s en loop', '44 MB'],
      t: 'De dónde viene la madera. El mapa se abre en Vancouver en el año 2000 y va sumando los 21 países de origen y los 19 de destino hasta 2026. Cierra con cinco segundos donde las 34 rutas se recorren a la vez. Las rutas marítimas rodean por mar de verdad: ningún barco cruza tierra.' },
    { n: 'De Vancouver al mundo — 720p para celular',
      f: 'De_Vancouver_al_Mundo_65s_NOCHE_720p_movil.mp4', id: '1p-hnOuPqgH5k0Z7iW4AklmIocfoSax6t',
      c: ['MP4 1280×720', '65 s en loop', '17 MB'],
      t: 'Mismo video, más ligero. Para revisarlo en el teléfono o mandarlo por WhatsApp.' },
    { n: 'Puertos de entrada a México — 1080p',
      f: 'Puertos_Entrada_Mexico_60s_NOCHE_1080p.mp4', id: '1dmd8Co6Bmmpol2M2xLoIdYDbFAp9dTX1',
      c: ['MP4 1920×1080', '60 s en loop', '24 MB'],
      t: 'Por dónde entra y a dónde llega. Cuatro actos: los 11 cruces terrestres, los 7 puertos marítimos, el reparto a las 45 ciudades y las 12 bodegas y oficinas propias. Los estados se van encendiendo hasta completar los 32.' },
    { n: 'Puertos de entrada a México — 720p para celular',
      f: 'Puertos_Entrada_Mexico_60s_NOCHE_720p_movil.mp4', id: '1Jw5Jpw5FvOknFKSa0ZG_ul1DMSO_6Pei',
      c: ['MP4 1280×720', '60 s en loop', '10 MB'],
      t: 'Mismo video, más ligero.' },
  ]},
  { g: 'Reproductores para revisar', d: 'Un solo archivo HTML que se abre en cualquier navegador, sin instalar nada. Sirve para pausar, mover el tiempo cuadro a cuadro y comparar el tema oscuro con el claro.', piezas: [
    { n: 'De Vancouver al mundo — reproductor',
      f: 'De_Vancouver_al_Mundo_LOOP_65s.html', id: '1XHK9cq2B62NU1mcVJFMzM3c0ZMCTm8N0',
      c: ['HTML', 'se abre solo', '172 KB'],
      t: 'Teclas: espacio pausa · flechas mueven el tiempo · F pantalla completa · T cambia noche/día · R graba un WebM.' },
    { n: 'Puertos de entrada a México — reproductor',
      f: 'Puertos_Entrada_Mexico_LOOP_60s.html', id: '1ayQd3NKQnsbcNGGcdDC6EJ1neDNmhq19',
      c: ['HTML', 'se abre solo', '274 KB'],
      t: 'Mismas teclas. Útil para congelar un momento y sacar una lámina para la presentación.' },
  ]},
  { g: 'Láminas fijas', d: 'El último cuadro de cada video, en alta resolución. Sirven de fondo, de portada o de respaldo si falla el video.', piezas: [
    { n: 'Cierre — De Vancouver al mundo',
      f: 'De_Vancouver_al_Mundo_cierre_NOCHE.png', id: '1Z84d4dNQVlNGRgrPXOsZ-mQpWBBn1UH8',
      c: ['PNG 1920×1080', '464 KB'],
      t: '21 países de origen · 19 de destino · 26 años, con los dos logotipos.' },
    { n: 'Cierre — Puertos de entrada a México',
      f: 'Puertos_Entrada_Mexico_cierre_NOCHE.png', id: '1WNjqbkuYEPLyMeT4MhV0ftWLIG9NUNNu',
      c: ['PNG 1920×1080', '457 KB'],
      t: '18 puertos de entrada · 45 ciudades de destino · 32 estados, con el filete tricolor.' },
  ]},
  { g: 'Los datos detrás', d: 'De dónde salió cada cifra. Todo viene de NetSuite salvo lo que está marcado como estimado o declarado.', piezas: [
    { n: 'Matriz puertos de entrada → destinos',
      f: 'Matriz_Puertos_Entrada_Mexico_V3.xlsx', id: '1_02K_sQPiGEpC6d8mU5MHtbXKJ3KmRgG',
      c: ['Excel', '7 hojas', '28 KB'],
      t: 'Los 18 puertos con su volumen, los 45 destinos agrupados por zona metropolitana, la matriz de 122 carriles reales, las 12 bodegas y los medios de transporte. Marca cuáles de los 32 estados tienen dato de NetSuite y cuáles los declaró Jorge.' },
    { n: 'Volumen movido 2000-2026',
      f: 'Volumen_Movido_2000-2026_NT-GF.xlsx', id: '1yJMQObsZI11BcIQJhAyp52TelxeR8y3P',
      c: ['Excel', 'con gráfica', '12 KB'],
      t: '35,383 camiones equivalentes y 1,078 millones de pies nominales en 26 años. De 2018 en adelante es dato de NetSuite; 2000 lo capturó Jorge y los años intermedios se interpolan con parámetros editables.' },
    { n: 'Países de origen y destino 2000-2026',
      f: 'Reporte_Paises_y_Timeline_Video_NT-GF_2000-2026.xlsx', id: '1upMX09YHQVMvDcXpmp3W2o_aKh52MgdC',
      c: ['Excel', '21 KB'],
      t: 'Año de primer embarque por país y continuidad año por año. Es la fuente del primer video.' },
    { n: 'Guion del video en loop',
      f: 'Guion_Video_Loop_Evento_NT-GF_30seg.pdf', id: '1PyyMVBVQhtAQgbN0JRcpoDdpjjRoared',
      c: ['PDF', '332 KB', 'desactualizado'],
      t: 'Describe el corte original de 30 segundos y una sola versión de tema. El video final quedó en 60 segundos y ya son dos. Sirve para entender el criterio, no como referencia exacta.' },
  ]},
];

const TIPO_BLOQUE = {
  vivo:{ l:'En vivo', i:'🎤' }, video:{ l:'Video', i:'🎬' }, video_loop:{ l:'Loop de fondo', i:'🔁' },
  encuesta:{ l:'Encuesta', i:'📱' }, mago:{ l:'Mago', i:'🎩' }, preguntas:{ l:'Preguntas abiertas', i:'🙋' },
  mesas:{ l:'Mesas 1:1', i:'🪑' }, networking:{ l:'Networking', i:'🥂' }, logistica:{ l:'Logística', i:'📋' }
};
const CAT_MENSAJE = {
  mensaje:{ l:'Mensaje que se llevan', i:'🎯' }, diferenciador:{ l:'Diferenciador', i:'⚔️' },
  to_be_continued:{ l:'To be continued', i:'🔮' }, riesgo:{ l:'Riesgo / cuidado', i:'⚠️' }
};
const AREAS_IDEA = ['general','video','presentacion','encuesta','mago','logistica','tecnologia','cierre'];
const EQUIPOS = ['guion','video','encuesta','assets','av','logistica','app'];
const CARPETAS = [
  ['01_Historicas_NaturalTrade','Históricas Natural Trade'],
  ['02_Historicas_GlobalForest','Históricas Global Forest'],
  ['03_Sitios_Actuales','Sitios y lugares actuales'],
  ['04_Logos','Logos'],
  ['05_Broll_Stock','B-roll y stock'],
  ['06_Equipo','Equipo'],
  ['07_Datos_Excel','Datos y Excel'],
  ['08_Guiones','Guiones y documentos'],
  ['09_Capturas_App','Capturas del portal y la app'],
  ['99_General','General']
];
const EST = {
  idea:'info', borrador:'warn', listo:'ok', propuesto:'info', propuesta:'info', acordado:'ok',
  aprobada:'ok', adoptada:'ok', descartado:'', descartada:'', nueva:'info', en_analisis:'warn',
  pendiente:'', en_progreso:'warn', bloqueada:'bad', hecha:'ok', guion:'warn', assets:'warn',
  edicion:'warn'
};
const ETIQ = { en_analisis:'en análisis', en_progreso:'en progreso', to_be_continued:'to be continued' };
const lbl = s => ETIQ[s] || String(s || '').replace(/_/g, ' ');

/* ============================================================== LOGIN */
function gErr(m) {
  const e = $('#gErr'); if (!m) return e.classList.add('hide');
  e.innerHTML = m; e.classList.remove('hide');
}
const limpio = () => location.href.split('#')[0].split('?')[0];

/* Supabase devuelve los errores de OAuth en el query O en el fragmento de la URL.
   Si no los leemos, el usuario solo ve el login otra vez y no sabe qué pasó. */
function errorEnUrl() {
  const p = new URLSearchParams(location.search);
  const h = new URLSearchParams(location.hash.replace(/^#/, ''));
  const cod = p.get('error_code') || h.get('error_code') || p.get('error') || h.get('error');
  if (!cod) return null;
  const desc = (p.get('error_description') || h.get('error_description') || '').replace(/\+/g, ' ');
  return { cod, desc };
}
function explica({ cod, desc }) {
  const d = desc.toLowerCase();
  if (d.includes('unable to exchange external code'))
    return `<b>Google autenticó, pero Supabase no pudo canjear el código.</b><br>
      Casi siempre es que el <b>Client Secret</b> del proveedor Google no corresponde al Client ID
      (o se colaron un espacio o un salto de línea al pegarlo). Hay que volver a pegarlo en
      Authentication → Providers → Google del proyecto.`;
  if (cod === 'otp_expired' || d.includes('expired'))
    return `<b>El enlace ya expiró o se usó.</b> Pide uno nuevo.`;
  if (cod === 'access_denied')
    return `<b>Se canceló el ingreso.</b> Vuelve a intentar con «Continuar con Google».`;
  if (d.includes('provider is not enabled'))
    return `<b>El proveedor Google no está activado</b> en este proyecto de Supabase.`;
  return `<b>No se pudo completar el ingreso.</b><br>${esc(cod)}${desc ? ' — ' + esc(desc) : ''}`;
}

$('#gGoogle').onclick = async () => {
  gErr('');
  const { error } = await sb.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: limpio(), queryParams: { prompt: 'select_account' } }
  });
  if (error) gErr(error.message);
};
$('#gLink').onclick = async () => {
  const email = $('#gMail').value.trim().toLowerCase(); gErr('');
  if (!DOMINIOS.includes(email.split('@')[1])) return gErr('Usa tu correo de Natural Trade o Global Forest.');
  const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: limpio() } });
  error ? gErr(error.message) : toast('Te mandamos un enlace. Revisa tu correo.');
};
$('#gPasteBtn').onclick = async () => {
  const v = $('#gPaste').value.trim(); gErr('');
  const h = v.includes('#') ? v.split('#')[1] : v;
  const p = new URLSearchParams(h);
  if (!p.get('access_token')) return gErr('Ese enlace no trae la sesión. Copia el enlace completo del correo.');
  const { error } = await sb.auth.setSession({ access_token: p.get('access_token'), refresh_token: p.get('refresh_token') });
  error ? gErr(error.message) : route();
};

async function route() {
  const err = errorEnUrl();
  if (err) {
    gErr(explica(err));
    history.replaceState(null, '', limpio());
    return;
  }
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return;
  return abrir(session);
}

async function abrir(session) {
  if (me) return;
  const email = (session.user.email || '').toLowerCase();
  if (!DOMINIOS.includes(email.split('@')[1])) {
    await sb.auth.signOut();
    return gErr('Este portal es solo para correos de Natural Trade y Global Forest.');
  }
  const md = session.user.user_metadata || {};
  me = { email, nombre: md.full_name || md.name || email.split('@')[0] };
  history.replaceState(null, '', limpio());
  $('#gate').classList.add('hide');
  $('#app').classList.remove('hide');
  $('#meAv').textContent = initials(me.nombre);
  $('#meNm').textContent = me.nombre;
  await entrar();
}

async function entrar() {
  await sb.from('ev_persona').upsert(
    { email: me.email, nombre: me.nombre, iniciales: initials(me.nombre), visto_en: new Date().toISOString() },
    { onConflict: 'email' }
  );
  await cargar();
  pintaTabs(); pintaCuenta(); ir(TAB);
}

/* ============================================================== DATOS */
async function cargar() {
  const t = [
    ['persona', 'nombre'], ['acuerdo', 'orden'], ['mensaje', 'creado_en'], ['bloque', 'orden'],
    ['video', 'orden'], ['escena', 'orden'], ['pregunta', 'orden'], ['acto', 'orden'],
    ['participacion', 'creado_en'], ['idea', 'creado_en'], ['tarea', 'orden'],
    ['asset', 'creado_en'], ['voto', 'creado_en'], ['comentario', 'creado_en']
  ];
  const r = await Promise.all(t.map(([n, o]) =>
    sb.from('ev_' + n).select('*').order(o, { ascending: n !== 'asset' })));
  r.forEach((res, i) => {
    if (res.error) { console.error(t[i][0], res.error); toast('No pude leer ' + t[i][0], true); }
    D[t[i][0]] = res.data || [];
  });
}
async function recargar(tabla) {
  const ord = { asset:'creado_en', mensaje:'creado_en', idea:'creado_en', participacion:'creado_en',
                comentario:'creado_en', voto:'creado_en', persona:'nombre' }[tabla] || 'orden';
  const { data, error } = await sb.from('ev_' + tabla).select('*')
    .order(ord, { ascending: tabla !== 'asset' });
  if (error) return toast('Error al recargar: ' + error.message, true);
  D[tabla] = data || [];
}

async function ins(tabla, row) {
  const { error } = await sb.from('ev_' + tabla).insert(row);
  if (error) { toast(error.message, true); return false; }
  await recargar(tabla); pintaTabs(); render(); return true;
}
async function upd(tabla, id, patch, key = 'id') {
  const { error } = await sb.from('ev_' + tabla).update(patch).eq(key, id);
  if (error) { toast(error.message, true); return false; }
  await recargar(tabla); pintaTabs(); render(); return true;
}
async function del(tabla, id, key = 'id') {
  const { error } = await sb.from('ev_' + tabla).delete().eq(key, id);
  if (error) { toast(error.message, true); return false; }
  await recargar(tabla); pintaTabs(); render(); return true;
}

/* -------------------------------------------------------- gente y votos */
const pMap = () => Object.fromEntries(D.persona.map(p => [p.email, p]));
function nombreDe(email) {
  if (!email) return '—';
  if (email === 'junta@naturaltrade.ca') return 'Junta 29-jul';
  return pMap()[email]?.nombre || email.split('@')[0];
}
const roster = () => uniq([
  ...D.persona.map(p => p.email),
  ...D.participacion.map(p => p.persona_email),
  ...D.tarea.map(t => t.responsable), ...D.video.map(v => v.responsable)
].filter(Boolean)).filter(e => e !== 'junta@naturaltrade.ca').sort();

const votos = (ent, id) => D.voto.filter(v => v.entidad === ent && v.ref_id === id).length;
const voteMio = (ent, id) => D.voto.some(v => v.entidad === ent && v.ref_id === id && v.autor_email === me.email);
const coms = (ent, id) => D.comentario.filter(c => c.entidad === ent && c.ref_id === id);

async function toggleVoto(ent, id) {
  if (voteMio(ent, id)) {
    await sb.from('ev_voto').delete().eq('entidad', ent).eq('ref_id', id).eq('autor_email', me.email);
  } else {
    const { error } = await sb.from('ev_voto').insert({ entidad: ent, ref_id: id, autor_email: me.email });
    if (error) return toast(error.message, true);
  }
  await recargar('voto'); render();
}

function vBtn(ent, id) {
  const n = votos(ent, id), on = voteMio(ent, id);
  return `<button class="vote${on ? ' on' : ''}" data-act="voto" data-ent="${ent}" data-id="${id}"
    title="${on ? 'Quitar mi voto' : 'Me parece clave'}">▲ ${n || ''}</button>`;
}
function cBtn(ent, id, titulo) {
  const n = coms(ent, id).length;
  return `<button class="mini" data-act="coms" data-ent="${ent}" data-id="${id}"
    data-t="${esc(titulo)}" title="Comentar">💬 ${n || ''}</button>`;
}
const chipEst = e => `<span class="chip ${EST[e] || ''}">${lbl(e)}</span>`;
const autor = r => `<span class="mut2">${esc(r.autor_nombre || nombreDe(r.autor_email))} · ${hace(r.creado_en)}</span>`;

/* ============================================================== SHELL */
function pintaTabs() {
  $('#tabs').innerHTML = TABS.map(t => {
    const n = t.n();
    return `<button class="tab${t.k === TAB ? ' on' : ''}" data-tab="${t.k}">${t.t}${
      n ? `<span class="n">${n}</span>` : ''}</button>`;
  }).join('');
}
function pintaCuenta() {
  const d = Math.ceil((EVENTO - Date.now()) / 86400000);
  $('#cdEvento').innerHTML = d > 0
    ? `<b>${d}</b><span>días al evento</span>`
    : `<b>${d === 0 ? '¡HOY!' : 'listo'}</b><span>1-sep</span>`;
}
function ir(k) { TAB = k; localStorage.setItem('ev_tab', k); pintaTabs(); render(); window.scrollTo(0, 0); }

$('#tabs').onclick = e => { const b = e.target.closest('[data-tab]'); if (b) ir(b.dataset.tab); };
$('#btnTheme').onclick = () => {
  const l = document.documentElement.classList.toggle('light');
  localStorage.setItem('ev_theme', l ? 'light' : 'dark');
};
if (localStorage.getItem('ev_theme') === 'light') document.documentElement.classList.add('light');
$('#btnAyuda').onclick = ayuda;
$('#btnInvitar').onclick = () => invitarMenu();

/* ============================================================== MODAL */
function modal(titulo, cuerpo, pie) {
  $('#mTitle').textContent = titulo;
  $('#mBody').innerHTML = cuerpo;
  $('#mFoot').innerHTML = pie ?? `<button class="btn" data-cerrar>Cerrar</button>`;
  $('#modal').classList.add('on');
}
function cerrar() { $('#modal').classList.remove('on'); $('#mbox').classList.remove('wide'); }
$('#mX').onclick = cerrar;
$('#modal').onclick = e => { if (e.target.id === 'modal' || e.target.closest('[data-cerrar]')) cerrar(); };
document.addEventListener('keydown', e => { if (e.key === 'Escape') { cerrar(); cerrarProgFinal(); } });

/* Cambios de hora directos en la lista del programa */
document.addEventListener('change', e => {
  const inp = e.target.closest('input.tinp[data-hora]');
  if (inp) guardaHoras(inp.dataset.id);
});
/* En el modal de bloque: inicio/fin ↔ minutos se recalculan en vivo */
document.addEventListener('input', e => {
  const t = e.target.id;
  if (t !== 'bIni' && t !== 'bFin' && t !== 'bMin') return;
  const ini = mDe(val('bIni')), fin = mDe(val('bFin'));
  if (t === 'bMin') { if (ini != null) $('#bFin').value = t24(ini + Number(val('bMin') || 0)); }
  else if (ini != null && fin != null) $('#bMin').value = fmtMin(Math.max(0, fin - ini));
});

function campo(id, etiqueta, valor = '', tipo = 'text', extra = '') {
  const v = esc(valor ?? '');
  if (tipo === 'area')
    return `<label class="f" for="${id}">${etiqueta}</label><textarea id="${id}" ${extra}>${v}</textarea>`;
  if (tipo === 'select')
    return `<label class="f" for="${id}">${etiqueta}</label><select id="${id}">${extra}</select>`;
  return `<label class="f" for="${id}">${etiqueta}</label><input id="${id}" type="${tipo}" value="${v}" ${extra}>`;
}
const opts = (arr, sel) => arr.map(o => {
  const [v, t] = Array.isArray(o) ? o : [o, lbl(o)];
  return `<option value="${esc(v)}"${v === sel ? ' selected' : ''}>${esc(t)}</option>`;
}).join('');
const optPersonas = sel => `<option value="">— sin asignar —</option>` +
  roster().map(e => `<option value="${esc(e)}"${e === sel ? ' selected' : ''}>${esc(nombreDe(e))}</option>`).join('');
const val = id => ($('#' + id)?.value ?? '').trim();

/* ========================================================= COMENTARIOS */
function abreComs(ent, id, titulo) {
  const lista = coms(ent, id);
  modal('Comentarios · ' + titulo, `
    <div id="cList">${lista.length ? lista.map(c => `
      <div class="cmt">
        <div class="who">${esc(c.autor_nombre || nombreDe(c.autor_email))} · ${hace(c.creado_en)}
          ${c.autor_email === me.email ? `<button class="mini" data-act="delcom" data-id="${c.id}" title="Borrar">🗑</button>` : ''}
        </div>
        <div>${br(c.texto)}</div>
      </div>`).join('') : '<div class="empty">Nadie ha comentado todavía.</div>'}</div>
    <label class="f" for="cTxt">Tu comentario</label>
    <textarea id="cTxt" placeholder="Aporta, cuestiona o propón algo mejor…"></textarea>`,
    `<button class="btn" data-cerrar>Cerrar</button>
     <button class="btn p" data-act="addcom" data-ent="${ent}" data-id="${id}" data-t="${esc(titulo)}">Comentar</button>`);
  setTimeout(() => $('#cTxt')?.focus(), 80);
}

/* ============================================================= RENDER */
function render() {
  $$('.sec').forEach(s => s.classList.toggle('on', s.dataset.sec === TAB));
  const el = $(`.sec[data-sec="${TAB}"]`);
  ({ inicio: rInicio, mensajes: rMensajes, programa: rPrograma, videos: rVideos,
     audiovisuales: rAudiovisuales,
     interaccion: rInteraccion, reparto: rReparto, repositorio: rRepositorio,
     ideas: rIdeas, tareas: rTareas })[TAB](el);
}
const head = (t, p, extra = '') => `<div class="secheadwrap"><div class="sechead">
  <div class="grow"><h2>${t}</h2><p>${p}</p></div>${extra}</div></div>`;

/* -------------------------------------------------- N. AUDIOVISUALES */
const avBaja = id => `https://drive.google.com/uc?export=download&id=${id}`;
const avVer  = id => `https://drive.google.com/file/d/${id}/view`;
function rAudiovisuales(el) {
  const n = AV.reduce((s, g) => s + g.piezas.length, 0);
  el.innerHTML = head('Audiovisuales finales',
    `Las ${n} piezas terminadas del evento, con enlace directo de descarga. Viven en una sola carpeta de Drive
     — <b>Audiovisuales finales</b>, dentro de «1. NT-GF PRESENTACION SEPTIEMBRE» — y aquí siempre apunta
     a la versión más reciente: cuando se actualiza un archivo, el enlace no cambia.`,
    `<a class="btn" href="https://drive.google.com/drive/folders/${AV_CARPETA}" target="_blank" rel="noopener">Abrir la carpeta</a>`) +
    `<div class="hint" style="margin-bottom:14px">Si un enlace te pide permiso, avísale a Jorge: la carpeta se
      comparte a mano. «Descargar» baja el archivo directo; «Ver en Drive» lo abre en el navegador, que es lo
      cómodo para los videos y los reproductores HTML.</div>` +
    AV.map(g => `
      <div class="secheadwrap" style="margin-top:6px">
        <div class="sechead"><div class="grow"><h2 style="font-size:1.05rem">${esc(g.g)}</h2><p>${esc(g.d)}</p></div></div>
      </div>
      <div class="grid g2">${g.piezas.map(p => `
        <div class="card">
          <h3>${esc(p.n)}</h3>
          <div class="row wrap" style="gap:6px;margin:6px 0 8px">
            ${p.c.map(c => `<span class="chip${c === 'desactualizado' ? ' warn' : ''}">${esc(c)}</span>`).join('')}
          </div>
          <div class="mut tiny">${esc(p.t)}</div>
          <div class="mut2 tiny" style="margin-top:8px;word-break:break-all">${esc(p.f)}</div>
          <div class="row wrap" style="gap:8px;margin-top:10px">
            <a class="btn p sm" href="${avBaja(p.id)}">Descargar</a>
            <a class="btn sm" href="${avVer(p.id)}" target="_blank" rel="noopener">Ver en Drive</a>
          </div>
        </div>`).join('')}</div>`).join('');
}

/* ---------------------------------------------------------- 1. INICIO */
const suma = tipos => D.bloque.filter(x => tipos.includes(x.tipo))
  .reduce((s, x) => s + Number(x.minutos || 0), 0);
function nucleo() {
  return { presenta: suma(PRESENTA), mago: suma(['mago']),
           preguntas: suma(['preguntas']), escena: suma(EN_ESCENA) };
}
const semaforoDe = m => m <= META_PRESENTA ? 'ok' : m <= META_PRESENTA + 5 ? 'warn' : 'bad';

function rInicio(el) {
  const nu = nucleo();
  const semaforo = semaforoDe(nu.presenta);
  const total = D.bloque.reduce((s, x) => s + Number(x.minutos || 0), 0);
  const dJunta = Math.ceil((new Date('2026-08-04T10:00:00-06:00') - Date.now()) / 86400000);
  const misTareas = D.tarea.filter(t => t.responsable === me.email && t.estado !== 'hecha');
  const sinDueno = D.tarea.filter(t => !t.responsable && t.estado !== 'hecha');
  const aDiscutir = D.acuerdo.filter(a => !a.firme);
  const topMsg = [...D.mensaje].filter(m => m.estado !== 'descartado')
    .sort((a, b) => votos('mensaje', b.id) - votos('mensaje', a.id)).slice(0, 3);

  el.innerHTML = head('Aquí construimos el evento del 1 de septiembre',
    `Todo lo que salió en la junta del 29 de julio ya está cargado. Tu trabajo es <b>reaccionar</b>: vota lo que
     te parezca clave, comenta lo que no, agrega lo que falta y sube el material que tengas. De aquí salen
     el programa, los videos, los guiones y quién habla de qué.`) + `

  <div class="grid g4" style="margin-bottom:14px">
    <div class="stat ${semaforo}"><div class="v">${nu.presenta}<span style="font-size:14px;color:var(--tx2)"> min</span></div>
      <div class="k">Presentación · meta ${META_PRESENTA}</div></div>
    <div class="stat"><div class="v">${D.mensaje.filter(m => m.estado === 'acordado').length}<span
      style="font-size:14px;color:var(--tx2)">/${D.mensaje.length}</span></div><div class="k">Mensajes acordados</div></div>
    <div class="stat"><div class="v">${D.video.filter(v => v.estado === 'listo').length}<span
      style="font-size:14px;color:var(--tx2)">/${D.video.length}</span></div><div class="k">Videos listos</div></div>
    <div class="stat ${misTareas.length ? 'warn' : 'ok'}"><div class="v">${misTareas.length}</div>
      <div class="k">Tareas mías abiertas</div></div>
  </div>

  <div class="grid g2">
    <div class="card">
      <h3>📌 Lo que urge esta semana</h3>
      <p class="mut tiny" style="margin:-4px 0 10px">Siguiente junta: <b>martes 4 de agosto</b>${
        dJunta > 0 ? ` · en ${dJunta} día${dJunta === 1 ? '' : 's'}` : ''}. Jorge está fuera del 7 al 14 de agosto,
        así que lo que dependa de él tiene que quedar antes.</p>
      ${D.tarea.filter(t => t.estado !== 'hecha' && t.fecha_limite && t.fecha_limite <= '2026-08-07')
        .sort(by('fecha_limite')).map(t => `
        <div class="row wrap" style="padding:7px 0;border-top:1px solid var(--line)">
          <span class="chip warn">${fecha(t.fecha_limite)}</span>
          <span class="grow">${esc(t.titulo)}</span>
          <span class="mut2">${t.responsable ? esc(nombreDe(t.responsable)) : 'sin dueño'}</span>
        </div>`).join('') || '<div class="empty">Nada con fecha inmediata.</div>'}
      <div class="row" style="margin-top:11px">
        <button class="btn sm" data-act="ir" data-to="tareas">Ver todas las tareas</button>
        ${sinDueno.length ? `<span class="chip bad">${sinDueno.length} sin dueño</span>` : ''}
      </div>
    </div>

    <div class="card">
      <h3>🎯 Los mensajes más votados</h3>
      <p class="mut tiny" style="margin:-4px 0 10px">Lo primero que hay que cerrar: qué queremos que el cliente
        se lleve en la cabeza. Todo el guion cuelga de esto.</p>
      ${topMsg.map(m => `
        <div style="padding:8px 0;border-top:1px solid var(--line)">
          <div class="row" style="align-items:flex-start;gap:9px">
            ${vBtn('mensaje', m.id)}
            <div class="grow">${esc(m.texto)}
              <div class="mut2" style="margin-top:3px">${CAT_MENSAJE[m.categoria]?.i || ''} ${
                esc(m.autor_nombre || nombreDe(m.autor_email))} ${m.estado === 'acordado' ? '· ✅ acordado' : ''}</div>
            </div>
          </div>
        </div>`).join('')}
      <button class="btn sm" style="margin-top:11px" data-act="ir" data-to="mensajes">Aportar mi mensaje</button>
    </div>

    <div class="card">
      <h3>🗓 Cómo va el programa</h3>
      ${tlBar()}
      <div class="mut tiny" style="margin-top:9px">
        Presentación <b>${nu.presenta} min</b> (meta ${META_PRESENTA}) · mago ${nu.mago} · preguntas
        ${nu.preguntas} → <b>${nu.escena} min en escena</b>. Con registro, llegada y mesas: ${total} min.
        ${semaforo !== 'ok' ? `<br><b>Sobran ${nu.presenta - META_PRESENTA} min de presentación.</b>
          Entra a Programa y baja minutos o quita un bloque.` : ''}
      </div>
      <button class="btn sm" style="margin-top:11px" data-act="ir" data-to="programa">Abrir el programa</button>
    </div>

    <div class="card">
      <h3>⚖️ Decisiones pendientes de la junta</h3>
      ${aDiscutir.map(a => `
        <div style="padding:8px 0;border-top:1px solid var(--line)">
          <div class="b">${esc(a.texto)}</div>
          <div class="mut tiny" style="margin-top:3px">${br(a.detalle || '')}</div>
          <div class="row" style="margin-top:6px">${vBtn('acuerdo', a.id)}${cBtn('acuerdo', a.id, a.texto)}</div>
        </div>`).join('') || '<div class="empty">Todo resuelto.</div>'}
      <button class="btn sm" style="margin-top:11px" data-act="acuerdos">Ver los ${D.acuerdo.filter(a => a.firme).length} acuerdos firmes</button>
    </div>
  </div>`;
}

function tlBar() {
  const tot = D.bloque.reduce((s, b) => s + Number(b.minutos || 0), 0) || 1;
  const col = { vivo:'var(--nt)', video:'var(--info)', video_loop:'#7a6fd0', encuesta:'var(--warn)',
                mago:'#e0b355', preguntas:'#8fa8b8', mesas:'var(--gf)', networking:'var(--tx3)',
                logistica:'var(--gf-brown)' };
  const segs = D.bloque.map(b => `<div class="tlseg" style="flex:${b.minutos};background:${col[b.tipo]}"
      title="${esc(b.titulo)} · ${b.minutos} min">${b.minutos >= 5 ? b.minutos : ''}</div>`).join('');
  const usados = uniq(D.bloque.map(b => b.tipo));
  return `<div class="tlbar">${segs}</div>
    <div class="tlleg">${usados.map(t => `<span><i style="background:${col[t]}"></i>${TIPO_BLOQUE[t]?.l || t}</span>`).join('')}</div>`;
}

function acuerdosModal() {
  $('#mbox').classList.add('wide');
  modal('Acuerdos de la junta · 29 de julio', D.acuerdo.filter(a => a.firme).map(a => `
    <div class="item">
      <div class="txt b">${esc(a.texto)}</div>
      <div class="mut tiny" style="margin-top:5px">${br(a.detalle || '')}</div>
      <div class="meta">${vBtn('acuerdo', a.id)}${cBtn('acuerdo', a.id, a.texto)}
        <span class="right mut2">${esc(a.fuente || '')}</span></div>
    </div>`).join(''));
}

/* -------------------------------------------------------- 2. MENSAJES */
function rMensajes(el) {
  const gr = Object.keys(CAT_MENSAJE);
  el.innerHTML = head('Mensajes clave',
    `«Definir qué queremos que los clientes recuerden al terminar la presentación» — con eso abrió Carlos la junta,
     y Jorge insistió en cerrarlo antes del guion. <b>Escribe el tuyo</b> («yo quiero que mi cliente se vaya con
     esto…») y vota los de los demás. Los más votados se marcan como acordados y sobre ellos se escribe todo.`,
    `<button class="btn p" data-act="nuevoMensaje">＋ Aportar mensaje</button>`) +
    gr.map(g => {
      const items = D.mensaje.filter(m => m.categoria === g)
        .sort((a, b) => (b.estado === 'acordado') - (a.estado === 'acordado') || votos('mensaje', b.id) - votos('mensaje', a.id));
      if (!items.length) return '';
      return `<h3 style="margin:18px 0 9px;font-size:14px">${CAT_MENSAJE[g].i} ${CAT_MENSAJE[g].l}
        <span class="mut2">· ${items.length}</span></h3>` + items.map(m => `
        <div class="item ${m.estado}">
          <div class="row" style="align-items:flex-start;gap:10px">
            ${vBtn('mensaje', m.id)}
            <div class="grow">
              <div class="txt">${esc(m.texto)}</div>
              ${m.porque ? `<div class="mut tiny" style="margin-top:5px">${br(m.porque)}</div>` : ''}
              <div class="meta">${chipEst(m.estado)}${autor(m)}
                <span class="acts">
                  ${cBtn('mensaje', m.id, m.texto)}
                  <button class="mini" data-act="estMensaje" data-id="${m.id}" title="Cambiar estado">✓</button>
                  ${m.autor_email === me.email ? `<button class="mini" data-act="delMensaje" data-id="${m.id}" title="Borrar">🗑</button>` : ''}
                </span>
              </div>
            </div>
          </div>
        </div>`).join('');
    }).join('');
}
function nuevoMensaje() {
  modal('Aportar un mensaje clave',
    campo('nmTxt', 'Yo quiero que mi cliente se vaya con esto…', '', 'area',
      'placeholder="Escríbelo como si se lo dijeras al cliente, en una frase."') +
    campo('nmCat', 'Tipo', '', 'select', opts(Object.entries(CAT_MENSAJE).map(([k, v]) => [k, v.i + ' ' + v.l]), 'mensaje')) +
    campo('nmPor', '¿Por qué importa? (opcional)', '', 'area'),
    `<button class="btn" data-cerrar>Cancelar</button><button class="btn p" data-act="guardaMensaje">Guardar</button>`);
  setTimeout(() => $('#nmTxt')?.focus(), 80);
}

/* -------------------------------------------------------- 3. PROGRAMA */
/* Horario efectivo de cada bloque: usa inicio/fin guardados; si a un bloque
   le faltan, se encadena después del anterior (el primero arranca 7:00 pm). */
function horario() {
  let cursor = INICIO_EVENTO;
  return D.bloque.map(b => {
    const ini = mDe(b.inicio) ?? cursor;
    const fin = mDe(b.fin) ?? (ini + Number(b.minutos || 0));
    cursor = Math.max(ini, fin);
    return { b, ini, fin, dur: Math.max(0, fin - ini), invalido: fin < ini };
  });
}
/* Traslapes entre bloques: id -> [{con: título del otro, min: minutos}] */
function traslapes(hs) {
  const m = {};
  for (let i = 0; i < hs.length; i++) for (let j = i + 1; j < hs.length; j++) {
    const ov = Math.min(hs[i].fin, hs[j].fin) - Math.max(hs[i].ini, hs[j].ini);
    if (ov > 0) {
      (m[hs[i].b.id] ??= []).push({ con: hs[j].b.titulo, min: ov });
      (m[hs[j].b.id] ??= []).push({ con: hs[i].b.titulo, min: ov });
    }
  }
  return m;
}

function rPrograma(el) {
  const nu = nucleo();
  const sem = semaforoDe(nu.presenta);
  const hs = horario();
  const enc = traslapes(hs);
  const nEnc = Object.keys(enc).length;
  const finReal = hs.length ? Math.max(...hs.map(h => h.fin)) : INICIO_EVENTO;
  el.innerHTML = head('Programa · run of show',
    `El evento corre de <b>7:00 a 9:00 pm</b>. Cada bloque lleva su hora de inicio y de fin — edítalas aquí
     mismo y la duración se recalcula sola. Si dos bloques se enciman, se pintan en ámbar con los minutos
     del traslape. Reordena con ↑↓; <b>⛓ Re-encadenar</b> acomoda cada bloque donde termina el anterior.`,
    `<button class="btn" data-act="progFinal" title="Vista limpia para imprimir o compartir">🖨 Programa final</button>
     <button class="btn" data-act="reencadenar" title="El inicio de cada bloque pasa a ser el fin del anterior; el primero conserva su hora">⛓ Re-encadenar</button>
     <button class="btn p" data-act="nuevoBloque">＋ Bloque</button>`) + `
    <div class="timeline">
      <div class="row wrap" style="margin-bottom:10px">
        <span class="chip ${sem}">Presentación ${nu.presenta} min · meta ${META_PRESENTA}</span>
        <span class="chip gold">🎩 mago ${nu.mago}</span>
        <span class="chip">🙋 preguntas ${nu.preguntas}</span>
        <span class="chip">${nu.escena} min en escena</span>
        ${hs.length ? `<span class="chip">${rango12(hs[0].ini, finReal)}</span>` : ''}
        ${finReal > FIN_EVENTO ? `<span class="chip enc">termina ${fmtMin(finReal - FIN_EVENTO)} min después de las 9:00 pm</span>` : ''}
        ${nEnc ? `<span class="chip enc">⚠ ${nEnc} bloque${nEnc === 1 ? '' : 's'} encimado${nEnc === 1 ? '' : 's'}</span>` : ''}
        ${sem !== 'ok' ? `<span class="chip bad">sobran ${nu.presenta - META_PRESENTA} min</span>` : ''}
      </div>
      ${tlBar()}
    </div>` +
    hs.map((h, i) => {
      const b = h.b, ov = enc[b.id];
      const parts = D.participacion.filter(p => p.bloque_id === b.id);
      return `<div class="bloque${ov || h.invalido ? ' enc' : ''}">
        <div class="btime">
          <label class="tlbl" for="ti-${b.id}">inicia</label>
          <input class="tinp" id="ti-${b.id}" type="time" value="${t24(h.ini)}" data-hora data-id="${b.id}">
          <label class="tlbl" for="tf-${b.id}">termina</label>
          <input class="tinp" id="tf-${b.id}" type="time" value="${t24(h.fin)}" data-hora data-id="${b.id}">
          <div class="m">${fmtMin(h.dur)} min</div>
        </div>
        <div class="bbar ${b.tipo}"></div>
        <div class="grow">
          <div class="row wrap" style="gap:7px">
            <span class="b">${esc(b.titulo)}</span>
            <span class="chip">${rango12(h.ini, h.fin)}</span>
            <span class="chip">${TIPO_BLOQUE[b.tipo]?.i || ''} ${TIPO_BLOQUE[b.tipo]?.l || b.tipo}</span>
            ${chipEst(b.estado)}
            <span class="acts">
              <button class="mini" data-act="mvBloque" data-id="${b.id}" data-dir="-1" ${i === 0 ? 'disabled' : ''} title="Subir">↑</button>
              <button class="mini" data-act="mvBloque" data-id="${b.id}" data-dir="1" ${i === hs.length - 1 ? 'disabled' : ''} title="Bajar">↓</button>
              ${cBtn('bloque', b.id, b.titulo)}
              <button class="mini" data-act="edBloque" data-id="${b.id}" title="Editar">✎</button>
            </span>
          </div>
          ${h.invalido ? `<div class="encleg">⚠ El fin es antes del inicio — corrige la hora.</div>` : ''}
          ${ov ? `<div class="encleg">⚠ ${ov.map(o =>
            `se encima ${fmtMin(o.min)} min con «${esc(o.con)}»`).join(' · ')}</div>` : ''}
          ${b.objetivo ? `<div class="tiny" style="margin-top:5px"><span class="mut2">OBJETIVO ·</span> ${esc(b.objetivo)}</div>` : ''}
          ${b.descripcion ? `<div class="mut tiny" style="margin-top:4px">${br(b.descripcion)}</div>` : ''}
          ${b.pantalla ? `<div class="mut2" style="margin-top:4px">🖥 ${esc(b.pantalla)}</div>` : ''}
          <div class="row wrap" style="margin-top:7px;gap:6px">
            ${parts.map(p => `<span class="chip ${p.confirmado ? 'ok' : 'warn'}">
              <span class="av sm">${initials(nombreDe(p.persona_email))}</span>${esc(nombreDe(p.persona_email))}
              · ${lbl(p.papel)}</span>`).join('')}
            <button class="chip click" data-act="addPart" data-id="${b.id}">＋ voz</button>
          </div>
        </div>
      </div>`;
    }).join('');
}
function edBloque(id) {
  const b = id ? D.bloque.find(x => x.id === id) : {};
  const hs = horario();
  const h = id ? hs.find(x => x.b.id === id) : null;
  const ini = h ? h.ini : (hs.at(-1)?.fin ?? INICIO_EVENTO);   // uno nuevo se encadena al final
  const fin = h ? h.fin : ini + Number(b.minutos ?? 3);
  modal(id ? 'Editar bloque' : 'Nuevo bloque',
    campo('bTit', 'Título', b.titulo) +
    `<div class="row" style="gap:10px"><div class="grow">` +
      campo('bTipo', 'Tipo', '', 'select', opts(Object.entries(TIPO_BLOQUE).map(([k, v]) => [k, v.i + ' ' + v.l]), b.tipo || 'vivo')) +
    `</div><div style="width:130px">` +
      campo('bEst', 'Estado', '', 'select', opts(['idea', 'borrador', 'listo'], b.estado || 'idea')) +
    `</div></div>` +
    `<div class="row" style="gap:10px"><div class="grow">` +
      campo('bIni', 'Inicia', t24(ini), 'time') +
    `</div><div class="grow">` +
      campo('bFin', 'Termina', t24(fin), 'time') +
    `</div><div style="width:110px">` +
      campo('bMin', 'Minutos', fmtMin(Math.max(0, fin - ini)), 'number', 'min="0" step="0.5"') +
    `</div></div>` +
    `<div class="hint">Cambia inicio o fin y los minutos se recalculan; cambia los minutos y se recorre el fin.</div>` +
    campo('bObj', 'Objetivo — qué debe lograr este bloque', b.objetivo, 'area') +
    campo('bDes', 'Descripción / notas', b.descripcion, 'area') +
    campo('bPan', 'Qué se ve en pantalla', b.pantalla) +
    campo('bGui', 'Guion hablado (lo que se dice)', b.guion, 'area'),
    `<button class="btn" data-cerrar>Cancelar</button>
     ${id && b.creado_por === me.email ? `<button class="btn danger" data-act="delBloque" data-id="${id}">Borrar</button>` : ''}
     <button class="btn p" data-act="guardaBloque" data-id="${id || ''}">Guardar</button>`);
}

/* Guardado directo de horas desde la lista (los inputs de cada bloque) */
async function guardaHoras(id) {
  const ini = mDe($(`#ti-${id}`)?.value), fin = mDe($(`#tf-${id}`)?.value);
  if (ini == null || fin == null) return;
  const { error } = await sb.from('ev_bloque')
    .update({ inicio: t24(ini), fin: t24(fin), minutos: Math.max(0, fin - ini) }).eq('id', id);
  if (error) return errHoras(error);
  await recargar('bloque'); pintaTabs(); render();
}
function errHoras(error) {
  toast(error.code === 'PGRST204' && /'(inicio|fin)'/.test(error.message || '')
    ? 'Faltan las columnas de horas: corre sql/02_horas_programa.sql en Supabase.'
    : error.message, true);
}

/* ------------------------------------- programa final (imprimir / PDF) */
function progFinal() {
  const hs = horario(), enc = traslapes(hs);
  const voces = b => D.participacion.filter(p => p.bloque_id === b.id)
    .map(p => nombreDe(p.persona_email)).filter(Boolean).join(', ');
  $('#progFinal').innerHTML = `
    <div class="pfbar no-print">
      <button class="btn" data-act="pfCerrar">← Volver al portal</button>
      <span class="grow"></span>
      <button class="btn p" data-act="pfImprimir">🖨 Imprimir / guardar PDF</button>
    </div>
    <div class="pfhoja">
      <div class="pfeyebrow">Natural Trade · Global Forest</div>
      <div class="pfregla"></div>
      <h1>Programa del evento</h1>
      <div class="pfsub">Martes 1 de septiembre de 2026 · 7:00–9:00 pm<br>
        Presidente Polanco, CDMX · Salón «Feria»</div>
      ${hs.map(h => `
        <div class="pfrow">
          <div class="pfhora">${h12(h.ini)}<span>a ${h12(h.fin)}</span></div>
          <div class="grow">
            <div class="pft">${esc(h.b.titulo)}</div>
            <div class="pfm">${TIPO_BLOQUE[h.b.tipo]?.l || h.b.tipo} · ${fmtMin(h.dur)} min${
              voces(h.b) ? ` · ${esc(voces(h.b))}` : ''}</div>
            ${enc[h.b.id] ? `<div class="pfenc">⚠ se encima ${enc[h.b.id].map(o =>
              `${fmtMin(o.min)} min con «${esc(o.con)}»`).join(' · ')}</div>` : ''}
          </div>
        </div>`).join('')}
      <div class="pffoot">
        <img src="img/nt.png" alt="Natural Trade"><img src="img/gf.png" alt="Global Forest">
        <span>naturaltrade.ca · globalforest.com.mx</span>
      </div>
    </div>`;
  $('#progFinal').classList.remove('hide');
  document.body.classList.add('pfon');
}
function cerrarProgFinal() {
  $('#progFinal').classList.add('hide');
  document.body.classList.remove('pfon');
}

/* ---------------------------------------------------------- 4. VIDEOS */
function rVideos(el) {
  el.innerHTML = head('Videos',
    `Cada tarjeta es una mesa de trabajo: el concepto, el guion escena por escena y el material que le falta.
     Aquí se van metiendo las fotos y los textos de cada video — lo que subes al Repositorio y etiquetas con
     el código del video aparece abajo automáticamente.`,
    `<button class="btn p" data-act="nuevoVideo">＋ Video</button>`) +
    `<div class="grid g2">` + D.video.map(v => {
      const escs = D.escena.filter(e => e.video_id === v.id);
      const asts = D.asset.filter(a => a.video_codigo === v.codigo);
      const listas = escs.filter(e => e.estado === 'listo').length;
      return `<div class="vcard">
        <div class="vtop">
          <div class="row">
            <div class="grow"><div class="vcode">${esc(v.codigo)} · ${lbl(v.uso || '')}</div>
              <div class="vtitle">${esc(v.titulo)}</div></div>
            ${vBtn('video', v.id)}
          </div>
          <div class="row wrap" style="margin-top:8px;gap:6px">
            ${chipEst(v.estado)}
            ${v.duracion_seg ? `<span class="chip">${Math.floor(v.duracion_seg / 60)}:${pad(v.duracion_seg % 60)}</span>` : ''}
            <span class="chip">${escs.length} escena${escs.length === 1 ? '' : 's'}</span>
            <span class="chip ${asts.length ? 'info' : ''}">${asts.length} material${asts.length === 1 ? '' : 'es'}</span>
            ${v.responsable ? `<span class="chip"><span class="av sm">${initials(nombreDe(v.responsable))}</span>${esc(nombreDe(v.responsable))}</span>`
              : '<span class="chip warn">sin responsable</span>'}
          </div>
          ${escs.length ? `<div class="progline" style="margin-top:9px"><i style="width:${Math.round(listas / escs.length * 100)}%"></i></div>` : ''}
        </div>
        <div class="vbody">
          <div class="tiny">${br(v.concepto || '')}</div>
          ${v.notas ? `<div class="help tiny">${br(v.notas)}</div>` : ''}
          <div class="row wrap" style="margin-top:auto;padding-top:6px">
            <button class="btn sm p" data-act="verVideo" data-id="${v.id}">Abrir guion</button>
            <button class="btn sm" data-act="edVideo" data-id="${v.id}">Editar</button>
            ${cBtn('video', v.id, v.codigo + ' · ' + v.titulo)}
          </div>
        </div>
      </div>`;
    }).join('') + `</div>`;
}
function verVideo(id) {
  const v = D.video.find(x => x.id === id);
  const escs = D.escena.filter(e => e.video_id === id);
  const asts = D.asset.filter(a => a.video_codigo === v.codigo);
  $('#mbox').classList.add('wide');
  modal(`${v.codigo} · ${v.titulo}`, `
    <div class="help tiny" style="margin-bottom:14px"><b>Concepto.</b> ${br(v.concepto || '')}</div>
    ${v.notas ? `<div class="card tiny" style="margin-bottom:14px">${br(v.notas)}</div>` : ''}
    <div class="row" style="margin-bottom:8px"><h3 style="margin:0;font-size:14px">Guion por escena</h3>
      <button class="btn sm right" data-act="nuevaEscena" data-id="${id}">＋ Escena</button></div>
    ${escs.map(e => `
      <div class="esc">
        <div class="row"><span class="tc">${esc(e.timecode || '—')}</span>${chipEst(e.estado)}
          <span class="acts">
            <button class="mini" data-act="edEscena" data-id="${e.id}" title="Editar">✎</button>
          </span></div>
        ${e.visual ? `<div class="lbl">Visual / tomas</div><div class="tiny">${br(e.visual)}</div>` : ''}
        ${e.voz ? `<div class="lbl">Locución</div><div class="tiny vo">«${br(e.voz)}»</div>` : ''}
        ${e.pantalla ? `<div class="lbl">Texto en pantalla</div><div class="tiny">${br(e.pantalla)}</div>` : ''}
        ${e.musica ? `<div class="lbl">Música / SFX</div><div class="tiny mut">${br(e.musica)}</div>` : ''}
        ${e.assets_nota ? `<div class="lbl">Material</div><div class="tiny mut">${br(e.assets_nota)}</div>` : ''}
      </div>`).join('') || '<div class="empty">Sin escenas. Agrega la primera.</div>'}
    <h3 style="margin:18px 0 8px;font-size:14px">Material etiquetado para este video · ${asts.length}</h3>
    ${asts.length ? `<div class="row wrap">${asts.map(a => `<span class="chip click" data-act="verAsset" data-id="${a.id}">
      ${a.tipo === 'foto' ? '🖼' : a.tipo === 'video' ? '🎞' : a.tipo === 'link' ? '🔗' : '📄'} ${esc(a.titulo)}</span>`).join('')}</div>`
      : `<div class="empty">Nada todavía. Sube fotos, textos o el Excel en <b>Repositorio</b> y etiquétalos con ${v.codigo}.</div>`}`,
    `<button class="btn" data-cerrar>Cerrar</button>
     <button class="btn p" data-act="ir" data-to="repositorio" data-cerrar>Subir material</button>`);
}
function edVideo(id) {
  const v = id ? D.video.find(x => x.id === id) : {};
  modal(id ? 'Editar video' : 'Nuevo video',
    `<div class="row" style="gap:10px"><div style="width:110px">` + campo('vCod', 'Código', v.codigo || 'V' + (D.video.length + 1)) +
    `</div><div class="grow">` + campo('vTit', 'Título', v.titulo) + `</div></div>` +
    campo('vCon', 'Concepto — qué se ve y qué se siente', v.concepto, 'area') +
    `<div class="row" style="gap:10px"><div class="grow">` +
      campo('vUso', 'Uso', '', 'select', opts([['presentacion','En la presentación'],['loop_fondo','Loop de fondo'],['teaser','Teaser / redes'],['cierre','Cierre']], v.uso || 'presentacion')) +
    `</div><div style="width:120px">` + campo('vDur', 'Duración (s)', v.duracion_seg, 'number', 'min="0"') +
    `</div><div style="width:130px">` +
      campo('vEst', 'Estado', '', 'select', opts(['idea','guion','assets','edicion','listo'], v.estado || 'idea')) + `</div></div>` +
    campo('vResp', 'Responsable', '', 'select', optPersonas(v.responsable)) +
    campo('vNot', 'Notas / pendientes', v.notas, 'area'),
    `<button class="btn" data-cerrar>Cancelar</button>
     ${id && v.creado_por === me.email ? `<button class="btn danger" data-act="delVideo" data-id="${id}">Borrar</button>` : ''}
     <button class="btn p" data-act="guardaVideo" data-id="${id || ''}">Guardar</button>`);
}
function edEscena(id, videoId) {
  const e = id ? D.escena.find(x => x.id === id) : {};
  modal(id ? 'Editar escena' : 'Nueva escena',
    `<div class="row" style="gap:10px"><div class="grow">` + campo('eTc', 'Timecode', e.timecode, 'text', 'placeholder="0:25–1:10"') +
    `</div><div style="width:140px">` + campo('eEst', 'Estado', '', 'select', opts(['pendiente','en_progreso','listo'], e.estado || 'pendiente')) + `</div></div>` +
    campo('eVis', 'Visual / tomas', e.visual, 'area') +
    campo('eVoz', 'Locución (texto literal)', e.voz, 'area') +
    campo('ePan', 'Texto en pantalla', e.pantalla, 'area') +
    campo('eMus', 'Música / SFX', e.musica) +
    campo('eAss', 'Material que hace falta', e.assets_nota, 'area'),
    `<button class="btn" data-cerrar>Cancelar</button>
     ${id ? `<button class="btn danger" data-act="delEscena" data-id="${id}" data-v="${e.video_id}">Borrar</button>` : ''}
     <button class="btn p" data-act="guardaEscena" data-id="${id || ''}" data-v="${videoId || e.video_id}">Guardar</button>`);
}

/* ----------------------------------------------------- 5. INTERACCIÓN */
function rInteraccion(el) {
  const moms = [['registro','En el registro','Se contestan al entrar, antes de que arranque. Acordado: NO por correo — de dos envíos previos llegaron cuatro respuestas.'],
                ['intercalada','Intercaladas en la presentación','Cerradas y rápidas: «¿qué es lo que más te duele?» → pum, aparece la gráfica → «así lo resolvemos».'],
                ['cierre','Al cierre','Las que califican al prospecto y alimentan el año que entra.']];
  el.innerHTML = head('Encuesta por QR y el mago',
    `Los dos motores de interacción de la noche. La encuesta corre en Mentimeter: QR en pantalla y las respuestas
     apareciendo en vivo. El mago no es el centro de atención — es el hilo que amarra el mensaje
     («un mago predice una carta una vez; la app predice tu mercado todos los días»).`,
    `<button class="btn p" data-act="nuevaPregunta">＋ Pregunta</button>`) +
    moms.map(([m, t, d]) => {
      const items = D.pregunta.filter(p => p.momento === m);
      return `<h3 style="margin:18px 0 4px;font-size:14px">📱 ${t} <span class="mut2">· ${items.length}</span></h3>
        <p class="mut tiny" style="margin:0 0 9px;max-width:80ch">${d}</p>` +
        (items.map(p => `
        <div class="item ${p.estado === 'descartada' ? 'descartado' : ''}">
          <div class="row" style="align-items:flex-start;gap:10px">
            ${vBtn('pregunta', p.id)}
            <div class="grow">
              <div class="txt b">${esc(p.texto)}</div>
              ${p.opciones?.length ? `<div class="row wrap" style="margin-top:6px;gap:5px">${
                p.opciones.map(o => `<span class="chip">${esc(o)}</span>`).join('')}</div>`
                : '<div class="mut2" style="margin-top:5px">respuesta abierta</div>'}
              ${p.objetivo ? `<div class="mut tiny" style="margin-top:6px">${br(p.objetivo)}</div>` : ''}
              <div class="meta">${chipEst(p.estado)}${autor(p)}
                <span class="acts">${cBtn('pregunta', p.id, p.texto)}
                  <button class="mini" data-act="estPregunta" data-id="${p.id}" title="Aprobar / descartar">✓</button>
                  <button class="mini" data-act="edPregunta" data-id="${p.id}" title="Editar">✎</button>
                </span>
              </div>
            </div>
          </div>
        </div>`).join('') || '<div class="empty">Sin preguntas en este momento.</div>');
    }).join('') + `
    <div class="row" style="margin:26px 0 9px"><h3 style="margin:0;font-size:14px">🎩 Actos del mago</h3>
      <button class="btn sm right" data-act="nuevoActo">＋ Acto</button></div>
    <div class="grid g2">` + D.acto.map(a => `
      <div class="card">
        <div class="row" style="align-items:flex-start">
          <div class="grow"><h3 style="margin:0">${esc(a.titulo)}</h3>
            <span class="chip gold">${lbl(a.momento || '')}</span> ${chipEst(a.estado)}</div>
          ${vBtn('acto', a.id)}
        </div>
        <dl class="kv" style="margin-top:10px">
          ${a.efecto ? `<dt>Efecto</dt><dd>${br(a.efecto)}</dd>` : ''}
          ${a.conexion ? `<dt>Conecta</dt><dd>${br(a.conexion)}</dd>` : ''}
          ${a.necesita ? `<dt>Necesita</dt><dd>${br(a.necesita)}</dd>` : ''}
          ${a.riesgo ? `<dt>Riesgo</dt><dd>${br(a.riesgo)}</dd>` : ''}
        </dl>
        <div class="row" style="margin-top:10px">${cBtn('acto', a.id, a.titulo)}
          <button class="mini" data-act="edActo" data-id="${a.id}" title="Editar">✎</button></div>
      </div>`).join('') + `</div>`;
}
function edPregunta(id) {
  const p = id ? D.pregunta.find(x => x.id === id) : {};
  modal(id ? 'Editar pregunta' : 'Nueva pregunta',
    campo('pTxt', 'Pregunta', p.texto, 'area') +
    `<div class="row" style="gap:10px"><div class="grow">` +
      campo('pMom', 'Cuándo', '', 'select', opts([['registro','En el registro'],['intercalada','Intercalada'],['cierre','Al cierre']], p.momento || 'registro')) +
    `</div><div class="grow">` +
      campo('pFor', 'Formato', '', 'select', opts([['multiple','Opción múltiple'],['abierta','Abierta']], p.formato || 'multiple')) + `</div></div>` +
    campo('pOps', 'Opciones (una por línea)', (p.opciones || []).join('\n'), 'area',
      'placeholder="Tiempos de entrega&#10;Precio&#10;Aduana&#10;Otro"') +
    campo('pObj', '¿Para qué la queremos? ¿A qué bloque conecta?', p.objetivo, 'area'),
    `<button class="btn" data-cerrar>Cancelar</button>
     ${id && p.autor_email === me.email ? `<button class="btn danger" data-act="delPregunta" data-id="${id}">Borrar</button>` : ''}
     <button class="btn p" data-act="guardaPregunta" data-id="${id || ''}">Guardar</button>`);
}
function edActo(id) {
  const a = id ? D.acto.find(x => x.id === id) : {};
  modal(id ? 'Editar acto' : 'Nuevo acto del mago',
    campo('aTit', 'Título del acto', a.titulo) +
    `<div class="row" style="gap:10px"><div class="grow">` +
      campo('aMom', 'Momento', '', 'select', opts([['apertura','Apertura'],['intermedio','Intermedio'],['cierre','Cierre'],['mesas','En mesas']], a.momento || 'apertura')) +
    `</div><div class="grow">` + campo('aEst', 'Estado', '', 'select', opts(['propuesto','elegido','descartado'], a.estado || 'propuesto')) + `</div></div>` +
    campo('aEfe', 'Efecto — qué hace el mago', a.efecto, 'area') +
    campo('aCon', 'Cómo conecta con nuestro mensaje', a.conexion, 'area') +
    campo('aNec', 'Qué necesitamos darle', a.necesita, 'area') +
    campo('aRie', 'Riesgo / ensayo', a.riesgo, 'area'),
    `<button class="btn" data-cerrar>Cancelar</button>
     ${id && a.creado_por === me.email ? `<button class="btn danger" data-act="delActo" data-id="${id}">Borrar</button>` : ''}
     <button class="btn p" data-act="guardaActo" data-id="${id || ''}">Guardar</button>`);
}

/* --------------------------------------------------------- 6. REPARTO */
function rReparto(el) {
  const mios = D.participacion.filter(p => p.persona_email === me.email);
  const conVoz = D.bloque.filter(b => D.participacion.some(p => p.bloque_id === b.id));
  const sinVoz = D.bloque.filter(b => !NO_NUCLEO.includes(b.tipo) && !D.participacion.some(p => p.bloque_id === b.id));
  const sinEntrar = D.persona.filter(p => !p.visto_en);
  el.innerHTML = head('Reparto de voces',
    `Quién habla, cuándo y qué dice. Jorge lo pidió explícito en la junta: «tener perfectamente el script de cada
     quien para no salirnos y que no se extienda demasiado». Cada quien escribe su propio guion aquí.`,
    `<button class="btn" data-act="nuevaPersona">＋ Persona</button>`) + `

    ${sinEntrar.length ? `<div class="card" style="margin-bottom:14px">
      <h3>✉ Aún no entran · ${sinEntrar.length}</h3>
      <p class="mut tiny" style="margin:-2px 0 10px">Mándales su invitación: se abre tu correo con el texto ya
        escrito, o cópialo para WhatsApp. Si un correo está mal, corrígelo con ＋ Persona.</p>
      <div class="row wrap">${sinEntrar.map(p => `
        <button class="chip click" data-act="invitar" data-v="${esc(p.email)}"
          title="Invitar a ${esc(p.nombre)} (${esc(p.email)})">✉ ${esc(p.nombre)}</button>`).join('')}</div>
    </div>` : ''}

    <div class="card hl" style="margin-bottom:14px">
      <h3>🎤 Mi participación</h3>
      ${mios.length ? mios.map(p => {
        const b = D.bloque.find(x => x.id === p.bloque_id);
        return `<div class="item" style="margin-bottom:8px">
          <div class="row wrap"><span class="b">${esc(b?.titulo || '—')}</span>
            <span class="chip">${lbl(p.papel)}</span>
            <span class="chip">${b?.minutos || '—'} min</span>
            ${p.confirmado ? '<span class="chip ok">confirmado</span>' : '<span class="chip warn">por confirmar</span>'}
            <span class="acts"><button class="mini" data-act="edPart" data-id="${p.id}" title="Editar mi guion">✎</button></span>
          </div>
          ${p.guion_personal ? `<pre class="pl tiny" style="margin-top:8px">${esc(p.guion_personal)}</pre>`
            : '<div class="mut tiny" style="margin-top:6px">Todavía no escribes tu guion. Dale ✎.</div>'}
        </div>`;
      }).join('') : `<div class="empty">No tienes bloques asignados. Puedes anotarte tú mismo en cualquier bloque de abajo.</div>`}
    </div>

    ${sinVoz.length ? `<div class="help" style="margin-bottom:14px"><b>Faltan voces.</b>
      ${sinVoz.length} bloque${sinVoz.length === 1 ? '' : 's'} del programa no tiene${sinVoz.length === 1 ? '' : 'n'}
      nadie asignado: ${sinVoz.map(b => esc(b.titulo)).join(' · ')}.</div>` : ''}

    ${conVoz.map(b => {
      const ps = D.participacion.filter(p => p.bloque_id === b.id);
      return `<div class="item">
        <div class="row wrap"><span class="b">${esc(b.titulo)}</span>
          <span class="chip">${TIPO_BLOQUE[b.tipo]?.i} ${b.minutos} min</span>
          <span class="acts"><button class="chip click" data-act="addPart" data-id="${b.id}">＋ voz</button></span></div>
        <div class="grid g2" style="margin-top:9px">${ps.map(p => `
          <div class="card" style="padding:10px">
            <div class="row"><span class="av sm">${initials(nombreDe(p.persona_email))}</span>
              <span class="grow b tiny">${esc(nombreDe(p.persona_email))}</span>
              <span class="chip">${lbl(p.papel)}</span>
              ${(p.persona_email === me.email || p.creado_por === me.email)
                ? `<button class="mini" data-act="edPart" data-id="${p.id}">✎</button>` : ''}
            </div>
            ${p.guion_personal ? `<pre class="pl tiny mut" style="margin-top:7px">${esc(p.guion_personal)}</pre>` : ''}
          </div>`).join('')}</div>
      </div>`;
    }).join('')}`;
}
function edPart(id, bloqueId) {
  const p = id ? D.participacion.find(x => x.id === id) : {};
  const b = D.bloque.find(x => x.id === (bloqueId || p.bloque_id));
  modal((id ? 'Editar' : 'Agregar') + ' voz · ' + (b?.titulo || ''),
    campo('ptEm', 'Quién', '', 'select', optPersonas(p.persona_email || me.email)) +
    `<div class="row" style="gap:10px"><div class="grow">` +
      campo('ptPap', 'Papel', '', 'select', opts([['presenta','Presenta'],['apoya','Apoya'],['demo','Hace el demo'],['voz_off','Voz en off'],['coordina','Coordina']], p.papel || 'presenta')) +
    `</div><div style="width:170px">` +
      campo('ptCon', '¿Confirmado?', '', 'select', opts([['false','Por confirmar'],['true','Confirmado']], String(p.confirmado ?? false))) + `</div></div>` +
    campo('ptGui', 'Mi guion — lo que voy a decir', p.guion_personal, 'area', 'style="min-height:170px"'),
    `<button class="btn" data-cerrar>Cancelar</button>
     ${id ? `<button class="btn danger" data-act="delPart" data-id="${id}">Quitar</button>` : ''}
     <button class="btn p" data-act="guardaPart" data-id="${id || ''}" data-b="${bloqueId || p.bloque_id}">Guardar</button>`);
}

function nuevaPersona() {
  modal('Agregar o corregir a alguien del comité', `
    <div class="help tiny" style="margin-bottom:12px">Sirve para poder asignarle bloques y tareas antes de que
      entre por primera vez. Si el correo ya existe, se actualiza el nombre.</div>` +
    campo('psNom', 'Nombre completo', '') +
    campo('psMail', 'Correo', '', 'text', 'placeholder="nombre@naturaltrade.ca"') +
    `<div class="row" style="gap:10px"><div class="grow">` +
      campo('psArea', 'Área', '', 'select', opts([['comercial','Comercial'],['logistica','Logística'],
        ['tecnologia','Tecnología'],['admin','Administración'],['direccion','Dirección']], 'comercial')) +
    `</div><div class="grow">` +
      campo('psVa', '¿Va al evento?', '', 'select', opts([['true','Sí, va a CDMX'],['false','No va']], 'true')) +
    `</div></div>` +
    `<h3 style="margin:18px 0 8px;font-size:14px">Comité cargado</h3>
     <div class="row wrap">${D.persona.map(p => `<span class="chip ${p.visto_en ? 'ok' : 'warn'}"
       title="${esc(p.email)}">${esc(p.nombre)}${p.visto_en ? '' : ' · sin entrar'}</span>`).join('')}</div>`,
    `<button class="btn" data-cerrar>Cancelar</button><button class="btn p" data-act="guardaPersona">Guardar</button>`);
  setTimeout(() => $('#psNom')?.focus(), 80);
}

/* ------------------------------------------------------- invitaciones */
const URL_PORTAL = 'https://natural-trade-ltd.github.io/nt-evento-comite/';
function invitarMenu() {
  const pend = D.persona.filter(p => !p.visto_en);
  modal('Invitar al portal', `
    <p class="mut tiny" style="margin:0 0 12px">La invitación se abre ya escrita: la mandas desde Gmail,
      desde tu app de correo, o la copias para WhatsApp.</p>
    ${pend.length ? `<h3 style="margin:0 0 8px;font-size:14px">Aún no entran · ${pend.length}</h3>
      <div class="row wrap" style="margin-bottom:16px">${pend.map(p => `
        <button class="chip click" data-act="invitar" data-v="${esc(p.email)}"
          title="${esc(p.email)}">✉ ${esc(p.nombre)}</button>`).join('')}</div>`
      : `<div class="empty" style="margin-bottom:16px">Todo el comité ya entró 🎉</div>`}
    <h3 style="margin:0 0 6px;font-size:14px">¿Alguien nuevo? (traders, más equipo)</h3>
    <p class="mut tiny" style="margin:0 0 10px">Dalo de alta con su correo de Natural Trade o Global Forest
      y su invitación se abre sola al guardar.</p>
    <button class="btn p" data-act="nuevaPersona">＋ Agregar persona</button>`);
}
function invitar(email) {
  const p = pMap()[email] || { nombre: email.split('@')[0], email };
  const primer = String(p.nombre || '').split(' ')[0];
  const cuerpo = `Hola ${primer}:

Ya está listo el portal del comité del evento del 1 de septiembre. Todo lo de la junta ya está cargado (programa, videos, encuesta, mago, ideas y tareas) y ahí vamos a ir armando el evento entre todos.

Entra aquí: ${URL_PORTAL}

1. Pica «Continuar con Google» con tu correo de Natural Trade o Global Forest — no hay que registrarse.
2. Empieza en «Mensajes clave»: escribe qué quieres que tu cliente se lleve en la cabeza y vota los de los demás.
3. Pásate por «Tareas»: la matriz muestra quién trae qué. Si algo no tiene dueño, tómalo.

Desde el celular también sirve, y se puede instalar como app («Añadir a inicio»).

Gracias,
${me.nombre}`;
  modal('Invitar a ' + p.nombre,
    campo('invTo', 'Para', p.email) +
    campo('invSub', 'Asunto', 'Tu acceso al portal del comité — evento 1-sep') +
    campo('invBody', 'Mensaje — edítalo si quieres', cuerpo, 'area', 'style="min-height:240px"'),
    `<button class="btn" data-cerrar>Cancelar</button>
     <button class="btn" data-act="invCopiar" title="Para pegarlo en WhatsApp">📋 Copiar</button>
     <button class="btn" data-act="invMailto" title="Abre tu app de correo">Mi correo</button>
     <button class="btn p" data-act="invGmail" title="Abre Gmail con todo listo">Abrir en Gmail</button>`);
}

/* ----------------------------------------------------- 7. REPOSITORIO */
let filtroCarpeta = 'todas', filtroVideo = 'todos';
function rRepositorio(el) {
  let items = D.asset;
  if (filtroCarpeta !== 'todas') items = items.filter(a => a.carpeta === filtroCarpeta);
  if (filtroVideo === '_sin') items = items.filter(a => !a.video_codigo);
  else if (filtroVideo !== 'todos') items = items.filter(a => a.video_codigo === filtroVideo);

  el.innerHTML = head('Repositorio de material',
    `Todo el material del evento vive aquí: fotos históricas, B-roll, logos, el Excel de orígenes, guiones,
     capturas y links. Sube el archivo o pega un link — <b>los links quedan activos</b>. Etiqueta cada cosa con
     el video al que va (V1…V6) y aparece sola en la mesa de trabajo de ese video. Todo se espeja a una carpeta
     de GitHub para que el editor lo baje completo.`,
    `<button class="btn p" data-act="subir">⬆ Subir archivo</button>
     <button class="btn" data-act="nuevoLink">🔗 Agregar link</button>`) + `

    <div class="drop" id="drop" style="margin-bottom:12px">
      Arrastra aquí fotos, videos o documentos · o <button class="btn sm" data-act="subir">elige archivos</button>
      <div class="mut2" style="margin-top:6px">Hasta 500 MB por archivo. Para videos muy pesados, mejor pega el link.</div>
      <div id="uplList"></div>
    </div>

    <div class="row wrap" style="margin-bottom:12px">
      <span class="chip click ${filtroCarpeta === 'todas' ? 'on' : ''}" data-act="fCarp" data-v="todas">Todas · ${D.asset.length}</span>
      ${CARPETAS.map(([k, t]) => {
        const n = D.asset.filter(a => a.carpeta === k).length;
        return n ? `<span class="chip click ${filtroCarpeta === k ? 'on' : ''}" data-act="fCarp" data-v="${k}">${t} · ${n}</span>` : '';
      }).join('')}
    </div>
    <div class="row wrap" style="margin-bottom:14px">
      <span class="mut2">Video:</span>
      <span class="chip click ${filtroVideo === 'todos' ? 'on' : ''}" data-act="fVid" data-v="todos">todos</span>
      ${D.video.map(v => `<span class="chip click ${filtroVideo === v.codigo ? 'on' : ''}" data-act="fVid" data-v="${v.codigo}">${v.codigo}</span>`).join('')}
      <span class="chip click ${filtroVideo === '_sin' ? 'on' : ''}" data-act="fVid" data-v="_sin">sin asignar</span>
    </div>

    ${items.length ? `<div class="assetgrid">` + items.map(a => `
      <div class="asset">
        <div class="athumb" data-act="verAsset" data-id="${a.id}" style="cursor:pointer">
          ${a.storage_path && (a.mime || '').startsWith('image/')
            ? `<img data-img="${esc(a.storage_path)}" alt="${esc(a.titulo)}" loading="lazy">`
            : (a.tipo === 'video' ? '🎞' : a.tipo === 'link' ? '🔗' : a.tipo === 'excel' ? '📊' : a.tipo === 'audio' ? '🎵' : '📄')}
        </div>
        <div class="ainfo">
          <div class="an">${esc(a.titulo)}</div>
          <div class="row wrap" style="gap:4px">
            ${a.video_codigo ? `<span class="chip">${esc(a.video_codigo)}</span>` : ''}
            ${a.anio ? `<span class="chip">${esc(a.anio)}</span>` : ''}
            ${a.bytes ? `<span class="mut2">${kb(a.bytes)}</span>` : ''}
          </div>
          <div class="row" style="margin-top:auto">
            <span class="mut2 grow">${esc(nombreDe(a.autor_email))}</span>
            ${cBtn('asset', a.id, a.titulo)}
          </div>
        </div>
      </div>`).join('') + `</div>` : '<div class="empty">Nada con esos filtros.</div>'}`;

  pintaMiniaturas();
  const dz = $('#drop');
  if (dz) {
    dz.ondragover = e => { e.preventDefault(); dz.classList.add('over'); };
    dz.ondragleave = () => dz.classList.remove('over');
    dz.ondrop = e => { e.preventDefault(); dz.classList.remove('over'); subeArchivos([...e.dataTransfer.files]); };
  }
}
async function pintaMiniaturas() {
  const imgs = $$('img[data-img]');
  const faltan = uniq(imgs.map(i => i.dataset.img)).filter(p => !signedCache[p]);
  if (faltan.length) {
    const { data } = await sb.storage.from('repositorio').createSignedUrls(faltan, 3600);
    (data || []).forEach(d => { if (d.signedUrl) signedCache[d.path] = d.signedUrl; });
  }
  imgs.forEach(i => { const u = signedCache[i.dataset.img]; if (u) i.src = u; });
}
async function urlDe(path) {
  if (signedCache[path]) return signedCache[path];
  const { data } = await sb.storage.from('repositorio').createSignedUrl(path, 3600);
  if (data?.signedUrl) signedCache[path] = data.signedUrl;
  return signedCache[path];
}

function subir() {
  const inp = document.createElement('input');
  inp.type = 'file'; inp.multiple = true;
  inp.onchange = () => subeArchivos([...inp.files]);
  inp.click();
}
function tipoDe(mime, nombre) {
  if ((mime || '').startsWith('image/')) return 'foto';
  if ((mime || '').startsWith('video/')) return 'video';
  if ((mime || '').startsWith('audio/')) return 'audio';
  if (/\.(xlsx?|csv)$/i.test(nombre)) return 'excel';
  return 'documento';
}
async function subeArchivos(files) {
  if (!files.length) return;
  const lista = $('#uplList');
  for (const f of files) {
    const carpeta = filtroCarpeta !== 'todas' ? filtroCarpeta : '99_General';
    const seguro = f.name.normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/[^\w.\-]+/g, '_');
    const path = `${carpeta}/${Date.now()}_${seguro}`;
    const fila = document.createElement('div');
    fila.className = 'upl'; fila.textContent = `⏳ ${f.name} · ${kb(f.size)}`;
    lista?.appendChild(fila);
    const { error } = await sb.storage.from('repositorio').upload(path, f, { cacheControl: '3600', upsert: false });
    if (error) { fila.textContent = `✕ ${f.name} — ${error.message}`; continue; }
    const ok = await ins('asset', {
      tipo: tipoDe(f.type, f.name), titulo: f.name.replace(/\.[^.]+$/, ''),
      storage_path: path, mime: f.type, bytes: f.size, carpeta,
      video_codigo: filtroVideo !== 'todos' && filtroVideo !== '_sin' ? filtroVideo : null,
      autor_email: me.email, autor_nombre: me.nombre
    });
    fila.textContent = ok ? `✓ ${f.name}` : `✕ ${f.name} — no se registró`;
    setTimeout(() => fila.remove(), 4000);
  }
  toast('Material subido. Etiquétalo con su video si aplica.');
}
function nuevoLink() {
  modal('Agregar un link', `
    <div class="help tiny" style="margin-bottom:12px">Para videos pesados, carpetas de Drive, referencias de
      YouTube o documentos que ya viven en otro lado. El link queda activo aquí para todos.</div>` +
    campo('lTit', 'Título', '') + campo('lUrl', 'URL', '', 'text', 'placeholder="https://…"') +
    campo('lDes', 'Para qué sirve', '', 'area') +
    `<div class="row" style="gap:10px"><div class="grow">` +
      campo('lCar', 'Carpeta', '', 'select', opts(CARPETAS, '99_General')) +
    `</div><div style="width:140px">` +
      campo('lVid', 'Video', '', 'select', `<option value="">—</option>` + opts(D.video.map(v => [v.codigo, v.codigo]), '')) + `</div></div>`,
    `<button class="btn" data-cerrar>Cancelar</button><button class="btn p" data-act="guardaLink">Guardar</button>`);
  setTimeout(() => $('#lTit')?.focus(), 80);
}
async function verAsset(id) {
  const a = D.asset.find(x => x.id === id);
  const url = a.url_externa || (a.storage_path ? await urlDe(a.storage_path) : null);
  const esImg = (a.mime || '').startsWith('image/');
  const esVid = (a.mime || '').startsWith('video/');
  $('#mbox').classList.add('wide');
  modal(a.titulo, `
    ${esImg && url ? `<img src="${esc(url)}" style="width:100%;border-radius:10px;margin-bottom:12px">` : ''}
    ${esVid && url ? `<video src="${esc(url)}" controls style="width:100%;border-radius:10px;margin-bottom:12px"></video>` : ''}
    ${a.descripcion ? `<div class="tiny" style="margin-bottom:10px">${br(a.descripcion)}</div>` : ''}
    <dl class="kv">
      <dt>Tipo</dt><dd>${lbl(a.tipo)}</dd>
      <dt>Carpeta</dt><dd>${esc((CARPETAS.find(c => c[0] === a.carpeta) || [, a.carpeta])[1])}</dd>
      ${a.video_codigo ? `<dt>Video</dt><dd>${esc(a.video_codigo)}</dd>` : ''}
      ${a.bytes ? `<dt>Tamaño</dt><dd>${kb(a.bytes)}</dd>` : ''}
      ${a.anio ? `<dt>Año</dt><dd>${esc(a.anio)}</dd>` : ''}
      <dt>Subió</dt><dd>${esc(a.autor_nombre || nombreDe(a.autor_email))} · ${hace(a.creado_en)}</dd>
      ${a.espejado_en ? `<dt>En GitHub</dt><dd>✓ espejado</dd>` : ''}
      ${url ? `<dt>Link</dt><dd><a href="${esc(url)}" target="_blank" rel="noopener">abrir en otra pestaña</a></dd>` : ''}
    </dl>`,
    `<button class="btn" data-cerrar>Cerrar</button>
     <button class="btn" data-act="edAsset" data-id="${id}">Editar datos</button>
     ${url ? `<a class="btn p" href="${esc(url)}" target="_blank" rel="noopener" ${a.storage_path ? `download="${esc(a.titulo)}"` : ''}>Abrir</a>` : ''}`);
}
function edAsset(id) {
  const a = D.asset.find(x => x.id === id);
  modal('Editar material',
    campo('aaTit', 'Título', a.titulo) + campo('aaDes', 'Descripción', a.descripcion, 'area') +
    `<div class="row" style="gap:10px"><div class="grow">` + campo('aaCar', 'Carpeta', '', 'select', opts(CARPETAS, a.carpeta)) +
    `</div><div style="width:120px">` +
      campo('aaVid', 'Video', '', 'select', `<option value="">—</option>` + opts(D.video.map(v => [v.codigo, v.codigo]), a.video_codigo || '')) +
    `</div><div style="width:110px">` + campo('aaAnio', 'Año', a.anio) + `</div></div>` +
    (a.url_externa ? campo('aaUrl', 'URL', a.url_externa) : ''),
    `<button class="btn" data-cerrar>Cancelar</button>
     ${a.autor_email === me.email ? `<button class="btn danger" data-act="delAsset" data-id="${id}">Borrar</button>` : ''}
     <button class="btn p" data-act="guardaAsset" data-id="${id}">Guardar</button>`);
}

/* ----------------------------------------------------------- 8. IDEAS */
let filtroArea = 'todas';
function rIdeas(el) {
  let items = filtroArea === 'todas' ? D.idea : D.idea.filter(i => i.area === filtroArea);
  items = [...items].sort((a, b) =>
    (b.estado === 'adoptada') - (a.estado === 'adoptada') ||
    votos('idea', b.id) - votos('idea', a.id) ||
    new Date(b.creado_en) - new Date(a.creado_en));
  el.innerHTML = head('Muro de ideas',
    `Todo lo que se dijo en la junta ya está aquí, con nombre de quien lo propuso. <b>Agrega las tuyas</b>,
     vota las que te parezcan buenas y comenta las que haya que aterrizar. Lo que se adopta pasa al programa,
     a un video o a una tarea.`,
    `<button class="btn p" data-act="nuevaIdea">＋ Mi idea</button>`) + `
    <div class="row wrap" style="margin-bottom:12px">
      <span class="chip click ${filtroArea === 'todas' ? 'on' : ''}" data-act="fArea" data-v="todas">todas · ${D.idea.length}</span>
      ${AREAS_IDEA.map(a => { const n = D.idea.filter(i => i.area === a).length;
        return n ? `<span class="chip click ${filtroArea === a ? 'on' : ''}" data-act="fArea" data-v="${a}">${lbl(a)} · ${n}</span>` : ''; }).join('')}
    </div>` +
    items.map(i => `
      <div class="item ${i.estado === 'adoptada' ? 'acordado' : i.estado === 'descartada' ? 'descartado' : ''}">
        <div class="row" style="align-items:flex-start;gap:10px">
          ${vBtn('idea', i.id)}
          <div class="grow">
            <div class="txt">${br(i.texto)}</div>
            <div class="meta">
              <span class="chip">${lbl(i.area)}</span>${chipEst(i.estado)}
              ${i.origen === 'junta' ? '<span class="chip">de la junta</span>' : ''}
              <span class="mut2">${esc(i.autor_nombre || nombreDe(i.autor_email))}</span>
              <span class="acts">${cBtn('idea', i.id, i.texto.slice(0, 60))}
                <button class="mini" data-act="estIdea" data-id="${i.id}" title="Cambiar estado">✓</button>
                ${i.autor_email === me.email ? `<button class="mini" data-act="delIdea" data-id="${i.id}" title="Borrar">🗑</button>` : ''}
              </span>
            </div>
          </div>
        </div>
      </div>`).join('');
}
function nuevaIdea() {
  modal('Aportar una idea',
    campo('idTxt', 'Tu idea', '', 'area', 'placeholder="Qué haríamos, para qué sirve y en qué momento del evento entra."') +
    campo('idArea', 'Tema', '', 'select', opts(AREAS_IDEA, 'general')),
    `<button class="btn" data-cerrar>Cancelar</button><button class="btn p" data-act="guardaIdea">Guardar</button>`);
  setTimeout(() => $('#idTxt')?.focus(), 80);
}

/* ---------------------------------------------------------- 9. TAREAS */
let fResp = 'todos', fEq = 'todos', fEst = 'abiertas';
const hoyISO = () => new Date().toISOString().slice(0, 10);
const tAbierta = t => t.estado !== 'hecha';
const tVencida = t => tAbierta(t) && t.fecha_limite && t.fecha_limite < hoyISO();
const eqDe = t => t.equipo || 'otros';

function rTareas(el) {
  const abiertas = D.tarea.filter(tAbierta);
  const ordEq = x => { const i = EQUIPOS.indexOf(x); return i < 0 ? 99 : i; };
  const equipos = uniq(D.tarea.map(eqDe)).sort((a, b) => ordEq(a) - ordEq(b));
  const respAb = r => abiertas.filter(t => (t.responsable || '_sin') === r);
  const resps = uniq(abiertas.map(t => t.responsable || '_sin'))
    .sort((a, b) => (a === '_sin') - (b === '_sin') || respAb(b).length - respAb(a).length);
  const celda = (r, e) => abiertas.filter(t => (t.responsable || '_sin') === r && eqDe(t) === e);
  const vencidas = abiertas.filter(tVencida).length;
  const sinDueno = respAb('_sin').length;
  const mias = abiertas.filter(t => t.responsable === me.email).length;

  // ---- matriz responsable × equipo (clic = filtrar, como la matriz del CMO)
  const mx = `<div class="card pad0" style="margin-bottom:12px"><div class="mxwrap"><table class="mx">
    <thead><tr><th style="text-align:left;padding-left:10px">Quién / equipo</th>${equipos.map(e => `
      <th class="${fEq === e ? 'on' : ''}" data-act="fEqT" data-v="${e}"
        title="Ver solo el equipo ${lbl(e)}">${lbl(e)} · ${abiertas.filter(t => eqDe(t) === e).length}</th>`).join('')}
    </tr></thead>
    <tbody>${resps.map(r => `<tr>
      <th><span class="mxr ${fResp === r ? 'on' : ''} ${r === '_sin' ? 'mxsin' : ''}" data-act="fRespT" data-v="${r}"
        title="${r === '_sin' ? 'Ver las tareas sin dueño' : 'Ver solo lo de ' + esc(nombreDe(r))}">
        ${r === '_sin' ? '⚠' : `<span class="av sm">${initials(nombreDe(r))}</span>`}
        ${r === '_sin' ? 'Sin dueño' : esc(nombreDe(r))}<span class="n2">${respAb(r).length}</span></span></th>
      ${equipos.map(e => {
        const ts = celda(r, e), on = fResp === r && fEq === e;
        return `<td class="mxc ${ts.length ? '' : 'zero'} ${on ? 'on' : ''}"
          ${ts.length ? `data-act="fCellT" data-r="${r}" data-e="${e}"` : ''}
          title="${r === '_sin' ? 'Sin dueño' : esc(nombreDe(r))} · ${lbl(e)}${ts.some(tVencida) ? ' · ¡hay vencidas!' : ''}">
          ${ts.length || '·'}${ts.some(tVencida) ? '<i class="late"></i>' : ''}</td>`;
      }).join('')}
    </tr>`).join('')}</tbody></table></div></div>`;

  // ---- lista filtrada
  let items = [...D.tarea];
  if (fEst === 'abiertas') items = items.filter(tAbierta);
  else if (fEst !== 'todas') items = items.filter(t => t.estado === fEst);
  if (fResp === '_sin') items = items.filter(t => !t.responsable);
  else if (fResp !== 'todos') items = items.filter(t => t.responsable === fResp);
  if (fEq !== 'todos') items = items.filter(t => eqDe(t) === fEq);
  items.sort((a, b) => (tVencida(b) ? 1 : 0) - (tVencida(a) ? 1 : 0)
    || String(a.fecha_limite || '9999').localeCompare(String(b.fecha_limite || '9999'))
    || a.orden - b.orden);

  const partes = [];
  if (fResp === '_sin') partes.push('sin dueño');
  else if (fResp !== 'todos') partes.push(fResp === me.email ? 'mías' : nombreDe(fResp));
  if (fEq !== 'todos') partes.push('equipo ' + lbl(fEq));
  if (fEst !== 'abiertas') partes.push(lbl(fEst));

  const ESTS = [['abiertas', 'Abiertas'], ['pendiente', 'Pendiente'], ['en_progreso', 'En progreso'],
                ['bloqueada', 'Bloqueada'], ['hecha', 'Hechas'], ['todas', 'Todas']];
  const nEst = s => s === 'abiertas' ? abiertas.length
    : s === 'todas' ? D.tarea.length : D.tarea.filter(t => t.estado === s).length;

  const fila = t => `
    <div class="item ${t.estado === 'hecha' ? 'descartado' : ''}">
      <div class="row wrap" style="align-items:flex-start">
        <button class="mini" data-act="okTarea" data-id="${t.id}" title="Marcar hecha"
          style="font-size:16px">${t.estado === 'hecha' ? '☑' : '☐'}</button>
        <div class="grow">
          <div class="txt b">${esc(t.titulo)}</div>
          ${t.detalle ? `<div class="mut tiny" style="margin-top:4px">${br(t.detalle)}</div>` : ''}
          <div class="meta">
            ${t.equipo ? `<span class="chip click" data-act="fEqT" data-v="${eqDe(t)}">${lbl(t.equipo)}</span>` : ''}
            ${t.fecha_limite ? `<span class="chip ${tVencida(t) ? 'bad' : 'warn'}">📅 ${fecha(t.fecha_limite)}${tVencida(t) ? ' · vencida' : ''}</span>` : ''}
            ${chipEst(t.estado)}
            ${t.responsable ? `<span class="chip click" data-act="fRespT" data-v="${esc(t.responsable)}">
                <span class="av sm">${initials(nombreDe(t.responsable))}</span>${esc(nombreDe(t.responsable))}</span>`
              : `<button class="chip click bad" data-act="tomar" data-id="${t.id}">sin dueño · tomarla</button>`}
            <span class="acts">${cBtn('tarea', t.id, t.titulo)}
              <button class="mini" data-act="edTarea" data-id="${t.id}" title="Editar">✎</button></span>
          </div>
        </div>
      </div>
    </div>`;

  el.innerHTML = head('Tareas',
    `La matriz muestra quién trae qué. <b>Clic en un nombre, un equipo o una celda filtra la lista</b>;
     vuelve a picarlo para quitar el filtro. El punto rojo avisa que ahí hay tareas vencidas.
     Si una tarea no tiene dueño, tómala.`,
    `<button class="btn p" data-act="nuevaTarea">＋ Tarea</button>`) + `

    <div class="grid g4" style="margin-bottom:12px">
      <div class="stat click" data-act="fLimpiaT" title="Ver todas las abiertas">
        <div class="v">${abiertas.length}</div><div class="k">Abiertas</div></div>
      <div class="stat click ${vencidas ? 'bad' : 'ok'}" data-act="fLimpiaT" title="Las vencidas suben solas al tope">
        <div class="v">${vencidas}</div><div class="k">Vencidas</div></div>
      <div class="stat click ${sinDueno ? 'bad' : 'ok'}" data-act="fRespT" data-v="_sin" title="Ver las tareas sin dueño">
        <div class="v">${sinDueno}</div><div class="k">Sin dueño</div></div>
      <div class="stat click warn" data-act="fRespT" data-v="${me.email}" title="Ver solo las mías">
        <div class="v">${mias}</div><div class="k">Mías</div></div>
    </div>

    ${mx}

    <div class="row wrap" style="margin-bottom:11px">
      ${ESTS.map(([v, t2]) => `<span class="chip click ${fEst === v ? 'on' : ''}" data-act="fEstT" data-v="${v}">${t2} · ${nEst(v)}</span>`).join('')}
      ${partes.length ? `<span class="chip click bad" data-act="fLimpiaT" title="Quitar todos los filtros">✕ Filtrando: ${esc(partes.join(' · '))}</span>` : ''}
    </div>

    ${items.map(fila).join('') || '<div class="empty">Nada con esos filtros. Pica ✕ para limpiarlos.</div>'}`;
}
function edTarea(id) {
  const t = id ? D.tarea.find(x => x.id === id) : {};
  modal(id ? 'Editar tarea' : 'Nueva tarea',
    campo('tTit', 'Qué hay que hacer', t.titulo) +
    campo('tDet', 'Detalle', t.detalle, 'area') +
    `<div class="row" style="gap:10px"><div class="grow">` + campo('tResp', 'Responsable', '', 'select', optPersonas(t.responsable)) +
    `</div><div style="width:150px">` + campo('tEq', 'Equipo', '', 'select', opts(EQUIPOS, t.equipo || 'guion')) + `</div></div>` +
    `<div class="row" style="gap:10px"><div class="grow">` + campo('tFec', 'Fecha límite', t.fecha_limite, 'date') +
    `</div><div class="grow">` + campo('tEst', 'Estado', '', 'select', opts(['pendiente','en_progreso','bloqueada','hecha'], t.estado || 'pendiente')) + `</div></div>`,
    `<button class="btn" data-cerrar>Cancelar</button>
     ${id && t.creado_por === me.email ? `<button class="btn danger" data-act="delTarea" data-id="${id}">Borrar</button>` : ''}
     <button class="btn p" data-act="guardaTarea" data-id="${id || ''}">Guardar</button>`);
}

/* ============================================================== AYUDA */
function ayuda() {
  $('#mbox').classList.add('wide');
  modal('Cómo se usa este portal', `
    <div class="help" style="margin-bottom:14px"><b>La regla.</b> Nada se pierde y nadie tiene que acordarse de
      todo. Lo que se dijo en la junta ya está cargado; de aquí en adelante todo se aporta aquí y el programa
      se va armando solo.</div>
    <dl class="kv">
      <dt>Mensajes clave</dt><dd>Empieza aquí. Escribe qué quieres que tu cliente se lleve en la cabeza y vota
        los de los demás. Es lo que bloquea el guion completo.</dd>
      <dt>Programa</dt><dd>El run of show con hora de inicio y fin por bloque, editables ahí mismo (el evento
        corre de 7:00 a 9:00 pm). Si dos bloques se enciman se pintan en ámbar con los minutos del traslape;
        ⛓ Re-encadenar acomoda cada bloque donde termina el anterior y 🖨 Programa final da la hoja limpia
        para imprimir o compartir.</dd>
      <dt>Videos</dt><dd>Una mesa de trabajo por video. Abre el guion, edita escenas, y todo el material que
        etiquetes con ese código (V1…V6) aparece ahí.</dd>
      <dt>Encuesta y mago</dt><dd>El banco de preguntas del QR (registro, intercaladas, cierre) y los actos del
        mago con lo que necesita de nosotros.</dd>
      <dt>Reparto</dt><dd>Quién habla en qué bloque. Cada quien escribe su propio guion — el de nadie más.</dd>
      <dt>Repositorio</dt><dd>Sube fotos, videos y documentos, o pega links. Etiqueta con carpeta y video.
        Todo se espeja a una carpeta de GitHub para el editor.</dd>
      <dt>Ideas</dt><dd>El muro. Aporta, vota y comenta. Lo que se adopta se convierte en bloque, video o tarea.</dd>
      <dt>Tareas</dt><dd>Si una tarea no tiene dueño, tómala. Si te bloquea algo, coméntala.</dd>
    </dl>
    <h3 style="margin:18px 0 8px;font-size:14px">Los botones</h3>
    <dl class="kv">
      <dt>▲</dt><dd>Vota. Es la forma rápida de decir «esto sí». Vuelve a picarlo para quitar tu voto.</dd>
      <dt>💬</dt><dd>Comenta. Para lo que no cabe en un voto.</dd>
      <dt>✎</dt><dd>Edita.</dd>
      <dt>✓</dt><dd>Cambia el estado (acordado, adoptada, aprobada…). Cualquiera del comité puede hacerlo.</dd>
    </dl>
    <div class="mut tiny" style="margin-top:16px">Entran solo correos <b>@naturaltrade.ca</b> y
      <b>@globalforest.com.mx</b>. Puedes instalarlo como app: en el celular «Añadir a inicio», en la
      computadora el ícono de instalar de la barra de direcciones.</div>`);
}

/* ========================================================== ACCIONES */
document.addEventListener('click', async e => {
  const b = e.target.closest('[data-act]');
  if (!b) return;
  const a = b.dataset.act, id = b.dataset.id;
  const A = {
    ir:        () => ir(b.dataset.to),
    acuerdos:  acuerdosModal,
    voto:      () => toggleVoto(b.dataset.ent, id),
    coms:      () => abreComs(b.dataset.ent, id, b.dataset.t),
    addcom:    async () => {
      const t = val('cTxt'); if (!t) return;
      if (await ins('comentario', { entidad: b.dataset.ent, ref_id: id, texto: t,
        autor_email: me.email, autor_nombre: me.nombre })) abreComs(b.dataset.ent, id, b.dataset.t);
    },
    delcom:    async () => { await del('comentario', id); cerrar(); },

    nuevoMensaje: nuevoMensaje,
    guardaMensaje: async () => {
      const t = val('nmTxt'); if (!t) return toast('Escribe el mensaje', true);
      if (await ins('mensaje', { texto: t, categoria: val('nmCat'), porque: val('nmPor') || null,
        autor_email: me.email, autor_nombre: me.nombre })) { cerrar(); toast('Gracias. Ya lo pueden votar.'); }
    },
    estMensaje: async () => {
      const m = D.mensaje.find(x => x.id === id);
      const sig = { propuesto: 'acordado', acordado: 'descartado', descartado: 'propuesto' }[m.estado];
      await upd('mensaje', id, { estado: sig }); toast('Ahora está «' + lbl(sig) + '»');
    },
    delMensaje: () => del('mensaje', id),

    nuevoBloque: () => edBloque(null),
    edBloque:   () => edBloque(id),
    guardaBloque: async () => {
      const ini = mDe(val('bIni')), fin = mDe(val('bFin'));
      const row = { titulo: val('bTit'), tipo: val('bTipo'), estado: val('bEst'),
        inicio: ini == null ? null : t24(ini), fin: fin == null ? null : t24(fin),
        minutos: ini != null && fin != null ? Math.max(0, fin - ini) : Number(val('bMin') || 0),
        objetivo: val('bObj') || null, descripcion: val('bDes') || null,
        pantalla: val('bPan') || null, guion: val('bGui') || null };
      if (!row.titulo) return toast('Ponle título', true);
      const ok = id ? await upd('bloque', id, row)
        : await ins('bloque', { ...row, orden: (D.bloque.at(-1)?.orden || 0) + 10, creado_por: me.email });
      if (ok) cerrar();
    },
    delBloque:  async () => { await del('bloque', id); cerrar(); },
    mvBloque:   async () => {
      const dir = Number(b.dataset.dir), i = D.bloque.findIndex(x => x.id === id), j = i + dir;
      if (j < 0 || j >= D.bloque.length) return;
      const a1 = D.bloque[i], a2 = D.bloque[j];
      await sb.from('ev_bloque').update({ orden: a2.orden }).eq('id', a1.id);
      await sb.from('ev_bloque').update({ orden: a1.orden }).eq('id', a2.id);
      await recargar('bloque'); render();
      if (D.bloque.some(x => x.inicio != null))
        toast('Orden cambiado. Las horas no se mueven solas: pica ⛓ Re-encadenar si quieres que sigan al orden.');
    },
    reencadenar: async () => {
      const hs = horario();
      if (!hs.length) return;
      let cursor = hs[0].ini;                       // el primer bloque conserva su hora
      for (const h of hs) {
        const d = h.invalido ? Number(h.b.minutos || 0) : h.dur;
        const { error } = await sb.from('ev_bloque')
          .update({ inicio: t24(cursor), fin: t24(cursor + d), minutos: d }).eq('id', h.b.id);
        if (error) return errHoras(error);
        cursor += d;
      }
      await recargar('bloque'); pintaTabs(); render();
      toast(`Bloques encadenados: ${rango12(hs[0].ini, cursor)}.`);
    },
    progFinal:  progFinal,
    pfCerrar:   cerrarProgFinal,
    pfImprimir: () => window.print(),

    nuevoVideo: () => edVideo(null),
    edVideo:    () => edVideo(id),
    verVideo:   () => verVideo(id),
    guardaVideo: async () => {
      const row = { codigo: val('vCod'), titulo: val('vTit'), concepto: val('vCon') || null,
        uso: val('vUso'), duracion_seg: Number(val('vDur')) || null, estado: val('vEst'),
        responsable: val('vResp') || null, notas: val('vNot') || null };
      if (!row.codigo || !row.titulo) return toast('Falta código o título', true);
      const ok = id ? await upd('video', id, row)
        : await ins('video', { ...row, orden: (D.video.at(-1)?.orden || 0) + 10, creado_por: me.email });
      if (ok) cerrar();
    },
    delVideo:   async () => { await del('video', id); cerrar(); },
    nuevaEscena: () => edEscena(null, id),
    edEscena:   () => edEscena(id),
    guardaEscena: async () => {
      const v = b.dataset.v;
      const row = { timecode: val('eTc') || null, visual: val('eVis') || null, voz: val('eVoz') || null,
        pantalla: val('ePan') || null, musica: val('eMus') || null, assets_nota: val('eAss') || null,
        estado: val('eEst') };
      const ok = id ? await upd('escena', id, row)
        : await ins('escena', { ...row, video_id: v,
            orden: (D.escena.filter(x => x.video_id === v).at(-1)?.orden || 0) + 10, creado_por: me.email });
      if (ok) verVideo(v);
    },
    delEscena:  async () => { const v = b.dataset.v; await del('escena', id); verVideo(v); },

    nuevaPregunta: () => edPregunta(null),
    edPregunta: () => edPregunta(id),
    guardaPregunta: async () => {
      const ops = val('pOps').split('\n').map(s => s.trim()).filter(Boolean);
      const row = { texto: val('pTxt'), momento: val('pMom'), formato: val('pFor'),
        opciones: val('pFor') === 'multiple' && ops.length ? ops : null, objetivo: val('pObj') || null };
      if (!row.texto) return toast('Escribe la pregunta', true);
      const ok = id ? await upd('pregunta', id, row)
        : await ins('pregunta', { ...row, orden: (D.pregunta.at(-1)?.orden || 0) + 10,
            autor_email: me.email, autor_nombre: me.nombre });
      if (ok) cerrar();
    },
    estPregunta: async () => {
      const p = D.pregunta.find(x => x.id === id);
      const sig = { propuesta: 'aprobada', aprobada: 'descartada', descartada: 'propuesta' }[p.estado];
      await upd('pregunta', id, { estado: sig }); toast('Ahora está «' + lbl(sig) + '»');
    },
    delPregunta: async () => { await del('pregunta', id); cerrar(); },

    nuevoActo:  () => edActo(null),
    edActo:     () => edActo(id),
    guardaActo: async () => {
      const row = { titulo: val('aTit'), momento: val('aMom'), estado: val('aEst'),
        efecto: val('aEfe') || null, conexion: val('aCon') || null,
        necesita: val('aNec') || null, riesgo: val('aRie') || null };
      if (!row.titulo) return toast('Ponle título', true);
      const ok = id ? await upd('acto', id, row)
        : await ins('acto', { ...row, orden: (D.acto.at(-1)?.orden || 0) + 10, creado_por: me.email });
      if (ok) cerrar();
    },
    delActo:    async () => { await del('acto', id); cerrar(); },

    nuevaPersona: nuevaPersona,
    guardaPersona: async () => {
      const nom = val('psNom'), mail = val('psMail').toLowerCase();
      if (!nom || !DOMINIOS.includes(mail.split('@')[1]))
        return toast('Falta el nombre o el correo no es de NT/GF', true);
      const { error } = await sb.from('ev_persona').upsert(
        { email: mail, nombre: nom, iniciales: initials(nom), area: val('psArea'), asiste: val('psVa') === 'true' },
        { onConflict: 'email' });
      if (error) return toast(error.message, true);
      await recargar('persona'); render(); cerrar();
      toast('Listo. Aquí está su invitación:');
      invitar(mail);
    },
    invitar:   () => invitar(b.dataset.v),
    invCopiar: async () => {
      await navigator.clipboard.writeText(val('invBody'));
      toast('Copiado. Pégalo en WhatsApp o donde quieras.');
    },
    invGmail:  () => window.open('https://mail.google.com/mail/?view=cm&fs=1'
      + '&to=' + encodeURIComponent(val('invTo'))
      + '&su=' + encodeURIComponent(val('invSub'))
      + '&body=' + encodeURIComponent(val('invBody')), '_blank'),
    invMailto: () => window.open('mailto:' + encodeURIComponent(val('invTo'))
      + '?subject=' + encodeURIComponent(val('invSub'))
      + '&body=' + encodeURIComponent(val('invBody'))),

    addPart:    () => edPart(null, id),
    edPart:     () => edPart(id),
    guardaPart: async () => {
      const row = { persona_email: val('ptEm'), papel: val('ptPap'),
        confirmado: val('ptCon') === 'true', guion_personal: val('ptGui') || null };
      if (!row.persona_email) return toast('Elige quién', true);
      const ok = id ? await upd('participacion', id, row)
        : await ins('participacion', { ...row, bloque_id: b.dataset.b, creado_por: me.email });
      if (ok) cerrar();
    },
    delPart:    async () => { await del('participacion', id); cerrar(); },

    subir:      subir,
    nuevoLink:  nuevoLink,
    guardaLink: async () => {
      const t = val('lTit'), u = val('lUrl');
      if (!t || !u) return toast('Falta título o URL', true);
      if (await ins('asset', { tipo: 'link', titulo: t, url_externa: u, descripcion: val('lDes') || null,
        carpeta: val('lCar'), video_codigo: val('lVid') || null,
        autor_email: me.email, autor_nombre: me.nombre })) { cerrar(); toast('Link guardado y activo.'); }
    },
    fCarp:      () => { filtroCarpeta = b.dataset.v; render(); },
    fVid:       () => { filtroVideo = b.dataset.v; render(); },
    verAsset:   () => verAsset(id),
    edAsset:    () => edAsset(id),
    guardaAsset: async () => {
      const row = { titulo: val('aaTit'), descripcion: val('aaDes') || null, carpeta: val('aaCar'),
        video_codigo: val('aaVid') || null, anio: val('aaAnio') || null };
      if ($('#aaUrl')) row.url_externa = val('aaUrl');
      if (await upd('asset', id, row)) cerrar();
    },
    delAsset:   async () => {
      const as = D.asset.find(x => x.id === id);
      if (as.storage_path) await sb.storage.from('repositorio').remove([as.storage_path]);
      await del('asset', id); cerrar();
    },

    nuevaIdea:  nuevaIdea,
    guardaIdea: async () => {
      const t = val('idTxt'); if (!t) return toast('Escribe la idea', true);
      if (await ins('idea', { texto: t, area: val('idArea'), origen: 'portal',
        autor_email: me.email, autor_nombre: me.nombre })) { cerrar(); toast('Gracias. Ya se puede votar.'); }
    },
    estIdea:    async () => {
      const i = D.idea.find(x => x.id === id);
      const sig = { nueva: 'en_analisis', en_analisis: 'adoptada', adoptada: 'descartada', descartada: 'nueva' }[i.estado];
      await upd('idea', id, { estado: sig }); toast('Ahora está «' + lbl(sig) + '»');
    },
    delIdea:    () => del('idea', id),
    fArea:      () => { filtroArea = b.dataset.v; render(); },

    fRespT:   () => { fResp = fResp === b.dataset.v ? 'todos' : b.dataset.v; ir('tareas'); },
    fEqT:     () => { fEq = fEq === b.dataset.v ? 'todos' : b.dataset.v; ir('tareas'); },
    fCellT:   () => {
      const r = b.dataset.r, e2 = b.dataset.e;
      if (fResp === r && fEq === e2) { fResp = 'todos'; fEq = 'todos'; }
      else { fResp = r; fEq = e2; }
      render();
    },
    fEstT:    () => { fEst = b.dataset.v; render(); },
    fLimpiaT: () => { fResp = 'todos'; fEq = 'todos'; fEst = 'abiertas'; render(); },

    nuevaTarea: () => edTarea(null),
    edTarea:    () => edTarea(id),
    guardaTarea: async () => {
      const row = { titulo: val('tTit'), detalle: val('tDet') || null, responsable: val('tResp') || null,
        equipo: val('tEq'), fecha_limite: val('tFec') || null, estado: val('tEst') };
      if (!row.titulo) return toast('Ponle título', true);
      const ok = id ? await upd('tarea', id, row)
        : await ins('tarea', { ...row, orden: (D.tarea.at(-1)?.orden || 0) + 10, creado_por: me.email });
      if (ok) cerrar();
    },
    delTarea:   async () => { await del('tarea', id); cerrar(); },
    okTarea:    async () => {
      const t = D.tarea.find(x => x.id === id);
      await upd('tarea', id, { estado: t.estado === 'hecha' ? 'pendiente' : 'hecha' });
    },
    tomar:      async () => { await upd('tarea', id, { responsable: me.email }); toast('Es tuya.'); }
  }[a];
  if (A) { e.preventDefault(); await A(); }
});

/* ============================================================ ARRANQUE */
// OJO: dentro del callback de onAuthStateChange NO se debe llamar a otra función
// de sb.auth (getSession, etc.): supabase-js tiene tomado el candado de auth y se
// queda colgado sin error visible. Se usa la sesión que llega por parámetro y el
// trabajo async se sale del callback con un setTimeout.
sb.auth.onAuthStateChange((ev, session) => {
  if (session && !me) setTimeout(() => abrir(session), 0);
});
route();
setInterval(pintaCuenta, 60000);
// Auto-actualización: cuando hay una versión nueva del portal, se recarga sola una vez.
// (Sin esto, el CDN de Pages + el service worker dejaban a la gente viendo la app vieja.)
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').then(reg => {
    reg.update();
    reg.addEventListener('updatefound', () => {
      const w = reg.installing;
      w?.addEventListener('statechange', () => {
        if (w.state === 'activated' && navigator.serviceWorker.controller) {
          toast('Actualizando el portal…');
          setTimeout(() => location.reload(), 900);
        }
      });
    });
  }).catch(() => {});
}
