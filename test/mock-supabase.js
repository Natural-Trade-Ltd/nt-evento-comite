/* =====================================================================
   Mock de @supabase/supabase-js SOLO para pruebas locales (test/e2e.html).
   No toca el proyecto real: todo vive en memoria y se pierde al recargar.

   Simula la base DESPUÉS de la migración sql/02_horas_programa.sql
   (ev_bloque ya trae inicio/fin). El último bloque se siembra SIN horas
   a propósito, para probar el encadenado derivado.

   Con ?premig=1 en la URL simula la base SIN esas columnas: los SELECT
   no las regresan y los UPDATE/INSERT que las traen fallan con PGRST204,
   igual que PostgREST.
   ===================================================================== */

const PREMIG = new URLSearchParams(location.search).has('premig');
const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : 'id-' + Math.random().toString(36).slice(2));
const now = () => new Date().toISOString();

/* ------------------------------------------------ datos sembrados ---- */
/* Los 15 bloques reales del programa (18-ago-2026), con las horas que
   dejó el backfill de la migración 02 (encadenadas desde las 19:00).    */
const JUNTA = 'junta@naturaltrade.ca';
const blq = (id, orden, titulo, tipo, min, estado, ini, fin) => ({
  id, orden, titulo, tipo, minutos: min, estado,
  inicio: ini, fin,
  objetivo: null, descripcion: null, guion: null, pantalla: null,
  creado_en: '2026-07-29T20:00:00Z', creado_por: JUNTA,
  actualizado_en: null, actualizado_por: null
});

const T = {
  persona: [
    { email: 'jorge@naturaltrade.ca', nombre: 'Jorge (prueba local)', iniciales: 'JP',
      area: 'direccion', asiste: true, color: null, creado_en: now(), visto_en: now() },
    { email: 'demo@globalforest.com.mx', nombre: 'Demo Comité', iniciales: 'DC',
      area: 'comercial', asiste: true, color: null, creado_en: now(), visto_en: now() }
  ],
  acuerdo: [], mensaje: [],
  bloque: [
    blq('b01', 10,  'Registro y entrega de Gafetes', 'logistica', 15, 'borrador', '19:00:00', '19:15:00'),
    blq('b02', 20,  'Llegada · videos en loop de fondo', 'video_loop', 30, 'borrador', '19:15:00', '19:45:00'),
    blq('b03', 30,  'Bienvenida y agradecimiento', 'vivo', 5, 'borrador', '19:45:00', '19:50:00'),
    blq('b04', 40,  'Quiénes somos hoy · liderazgo', 'vivo', 3, 'borrador', '19:50:00', '19:53:00'),
    blq('b05', 50,  'Video · 25 años de trayectoria', 'video', 3, 'borrador', '19:53:00', '19:56:00'),
    blq('b06', 60,  'Mago · apertura: «El desvanecimiento de la cotización»', 'mago', 4, 'borrador', '19:56:00', '20:00:00'),
    blq('b07', 80,  'Video · cobertura: NT global + GF en todo México', 'video', 2, 'idea', '20:00:00', '20:02:00'),
    blq('b08', 100, 'Video corto · qué es el portal y la app', 'video', 2, 'idea', '20:02:00', '20:04:00'),
    blq('b09', 110, 'DEMO EN VIVO de la app · efecto WOW', 'vivo', 8, 'borrador', '20:04:00', '20:12:00'),
    blq('b10', 120, 'Información de mercado global', 'vivo', 3, 'idea', '20:12:00', '20:15:00'),
    blq('b11', 130, 'Video · «To be continued»: los próximos 12 meses', 'video', 2, 'idea', '20:15:00', '20:17:00'),
    blq('b12', 140, 'Cierre · llamado a la acción + premio de la encuesta', 'vivo', 2, 'borrador', '20:17:00', '20:19:00'),
    blq('b13', 150, 'Mago · cierre: «La predicción del mercado»', 'mago', 10, 'borrador', '20:19:00', '20:29:00'),
    blq('b14', 160, 'Preguntas abiertas', 'preguntas', 10, 'idea', '20:29:00', '20:39:00'),
    blq('b15', 170, 'Mesas 1:1 · networking + mago en mesas', 'mesas', 38, 'borrador', null, null)
  ],
  video: [], escena: [], pregunta: [], acto: [],
  participacion: [
    { id: 'p01', bloque_id: 'b03', persona_email: 'jorge@naturaltrade.ca', papel: 'presenta',
      minutos: null, guion_personal: null, confirmado: true, creado_en: now(), creado_por: JUNTA },
    { id: 'p02', bloque_id: 'b09', persona_email: 'demo@globalforest.com.mx', papel: 'demo',
      minutos: null, guion_personal: null, confirmado: false, creado_en: now(), creado_por: JUNTA }
  ],
  idea: [], tarea: [], asset: [], voto: [], comentario: []
};

/* --------------------------------------------- constructor de queries */
const HORAS = ['inicio', 'fin'];
const err204 = col => ({
  code: 'PGRST204',
  message: `Could not find the '${col}' column of 'ev_bloque' in the schema cache`
});
const cmp = (a, b) => (a == null) - (b == null) || (a > b ? 1 : a < b ? -1 : 0);

class Q {
  constructor(tabla) { this.t = tabla.replace(/^ev_/, ''); this.eqs = []; }
  select() { this.op ??= 'select'; return this; }
  order(col, o = {}) { this.ord = [col, o.ascending !== false]; return this; }
  insert(row) { this.op = 'insert'; this.row = row; return this; }
  update(patch) { this.op = 'update'; this.row = patch; return this; }
  delete() { this.op = 'delete'; return this; }
  upsert(row, o = {}) { this.op = 'upsert'; this.row = row; this.conf = o.onConflict || 'id'; return this; }
  eq(k, v) { this.eqs.push([k, v]); return this; }
  _hit(r) { return this.eqs.every(([k, v]) => String(r[k]) === String(v)); }
  _run() {
    const rows = T[this.t];
    if (!rows) return { data: null, error: { message: 'mock: tabla desconocida ev_' + this.t } };
    const conHoras = this.row && HORAS.some(k => k in this.row);
    if (PREMIG && this.t === 'bloque' && conHoras)
      return { data: null, error: err204(HORAS.find(k => k in this.row)) };
    switch (this.op) {
      case 'insert': {
        rows.push({ id: uuid(), creado_en: now(), ...this.row });
        return { data: null, error: null };
      }
      case 'update': {
        rows.filter(r => this._hit(r)).forEach(r =>
          Object.assign(r, this.row, { actualizado_en: now(), actualizado_por: SESION.user.email }));
        return { data: null, error: null };
      }
      case 'delete': {
        for (let i = rows.length - 1; i >= 0; i--) if (this._hit(rows[i])) rows.splice(i, 1);
        return { data: null, error: null };
      }
      case 'upsert': {
        const k = this.conf, ya = rows.find(r => String(r[k]) === String(this.row[k]));
        ya ? Object.assign(ya, this.row) : rows.push({ creado_en: now(), ...this.row });
        return { data: null, error: null };
      }
      default: {
        let out = rows.map(r => ({ ...r }));
        if (PREMIG && this.t === 'bloque') out.forEach(r => HORAS.forEach(k => delete r[k]));
        if (this.eqs.length) out = out.filter(r => this._hit(r));
        if (this.ord) { const [c, asc] = this.ord; out.sort((a, b) => cmp(a[c], b[c]) * (asc ? 1 : -1)); }
        return { data: out, error: null };
      }
    }
  }
  then(res, rej) { return Promise.resolve().then(() => this._run()).then(res, rej); }
}

/* -------------------------------------------------- auth y storage --- */
const SESION = {
  access_token: 'mock', refresh_token: 'mock',
  user: { email: 'jorge@naturaltrade.ca', user_metadata: { full_name: 'Jorge (prueba local)' } }
};

export function createClient() {
  console.info('%c⚠ PRUEBA LOCAL: Supabase simulado (test/mock-supabase.js)' +
    (PREMIG ? ' · modo PRE-migración' : ''), 'color:#9A6A12;font-weight:bold');
  return {
    auth: {
      getSession: async () => ({ data: { session: SESION }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      signInWithOAuth: async () => ({ error: null }),
      signInWithOtp: async () => ({ error: null }),
      setSession: async () => ({ error: null }),
      signOut: async () => ({ error: null })
    },
    from: t => new Q(t),
    storage: {
      from: () => ({
        createSignedUrls: async paths => ({ data: paths.map(p => ({ path: p, signedUrl: '' })) }),
        createSignedUrl: async () => ({ data: { signedUrl: '' } }),
        upload: async () => ({ error: { message: 'mock: sin storage en pruebas' } }),
        remove: async () => ({ data: null, error: null })
      })
    }
  };
}
