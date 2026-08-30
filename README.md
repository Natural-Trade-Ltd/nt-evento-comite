# Portal del Comité Organizador — Evento 1-sep-2026

Portal de trabajo colaborativo del cóctel para clientes clave de **Natural Trade / Global Forest**
(martes 1 de septiembre de 2026, 19:00–21:00, Presidente Polanco CDMX, Salón «Feria»).

**En vivo:** https://natural-trade-ltd.github.io/nt-evento-comite/

Nace de la junta del comité del **29-jul-2026**: todo lo que se dijo ahí quedó cargado como punto de
partida (acuerdos, mensajes, programa, videos, preguntas del QR, actos del mago, ideas por autor y
tareas), para que el comité solo tenga que **reaccionar y aportar** en lugar de volver a discutirlo.

---

## Quién entra

Cualquier correo **@naturaltrade.ca** o **@globalforest.com.mx**, con «Continuar con Google»
(magic link como respaldo). No hay altas manuales. Cualquier otro correo se rechaza en el gate
y además no ve nada por RLS.

## Qué hay adentro

| Sección | Para qué |
|---|---|
| **Inicio** | Semáforo de tiempos, lo que urge esta semana, mensajes más votados, decisiones pendientes. |
| **Mensajes clave** | La lluvia de ideas de «qué quiero que mi cliente se lleve». Se vota y lo más votado se marca acordado. Bloquea todo el guion. |
| **Programa** | Run of show con **hora de inicio y fin por bloque**, editables en la lista o en el modal (el evento corre 7:00–9:00 pm). Los traslapes se pintan en ámbar con los minutos encimados; ↑↓ reordena, «⛓ Re-encadenar» acomoda cada bloque donde termina el anterior y «🖨 Programa final» da la hoja limpia para imprimir/compartir. Semáforo: presentación vs. meta de 30 min. |
| **Videos** | Una mesa de trabajo por video (V1–V6): concepto, guion escena por escena y el material etiquetado con ese código. |
| **Encuesta y mago** | Banco de preguntas del QR (registro / intercaladas / cierre) y los actos del mago con lo que necesita de nosotros. |
| **Reparto** | Quién habla en qué bloque; cada quien escribe su propio guion. |
| **Repositorio** | Sube archivos o pega links (quedan activos). Se etiqueta por carpeta y por video. Se espeja a git para el editor. |
| **Ideas** | El muro. Todo lo de la junta ya está, con autor. Se vota, se comenta y lo adoptado se convierte en bloque, video o tarea. |
| **Tareas** | Microequipos con tareas cortas semanales. Si algo no tiene dueño, cualquiera lo toma. |

Transversal: **votos (▲)** y **comentarios (💬)** sobre casi cualquier cosa.

---

## Arquitectura

```
GitHub Pages (este repo, público)  ──▶  Supabase «NT-Evento-Comite» (dedicado)
   index.html + css/app.js                Postgres  ·  tablas ev_*  ·  RLS por dominio
   PWA instalable                         Auth      ·  Google + magic link
                                          Storage   ·  bucket privado «repositorio»
                                                          │
                                                          ▼
                                     Natural-Trade-Ltd/nt-evento-repo (privado)
                                     espejo en git de fotos, docs y datos
                                     → de aquí baja el editor de video
```

- **Proyecto Supabase:** `cytopyytymxjwvfhosvg` (dedicado a propósito: correr migraciones aquí
  no puede tumbar el CMO del equipo ni la quote-api, como ya pasó una vez en un proyecto compartido).
- **URL:** `https://cytopyytymxjwvfhosvg.supabase.co`
- **Publishable key:** `sb_publishable_IjJWRYALvIWN-yzM11IYVw_GaVEf6RN` (pública a propósito; la
  seguridad la da RLS, no la llave).
- El repo es público y **no contiene ningún secreto**. El material sensible vive en Storage privado
  (URLs firmadas de 1 h) y en el repo espejo privado.

### Seguridad (verificada)

`ev_autorizado()` = el dominio del correo está en `naturaltrade.ca` / `globalforest.com.mx`.
Todas las tablas `ev_*` tienen RLS. Probado simulando identidades:

| Identidad | Lo que ve |
|---|---|
| `jorge@naturaltrade.ca` | todo (y es admin) |
| `ericka@globalforest.com.mx` | todo (no admin) |
| `intruso@gmail.com` | **0 filas en todo** |
| anónimo (sin login) | **0 filas en todo** |

- **Documentos colaborativos** (programa, videos, escenas, actos, reparto, tareas, roster):
  cualquiera del comité edita — es un documento de trabajo común.
- **Aportaciones personales** (mensajes, ideas, preguntas, material): el estado lo cambia cualquiera
  (el triage es un acto de grupo), pero **borrar** solo el autor o un admin.
- `ev_admin_lista` no tiene policies: solo `service_role`. Hoy: `jorge@naturaltrade.ca`.

## Estructura

```
index.html                 shell + gate de login
css/app.css                estilos (claro/oscuro, marca NT #469466)
js/app.js                  toda la app (módulo ES, sin build)
constructor.html           constructor de la presentación principal (clave compartida)
presentar.html             modo presentar del constructor (mismo motor que presentacion.html)
presentador.html           vista de presentador: notas, reloj y lo que sigue, en la otra pantalla
presentacion.html          NT App pantalla por pantalla (deck aparte, estático)
sql/01_schema.sql          esquema completo, RLS y bucket (referencia)
sql/02_horas_programa.sql  migración aplicada: inicio/fin por bloque del programa
sql/03_constructor.sql     esquema del constructor: ev_lamina + clave + bucket (referencia)
manifest.webmanifest       PWA instalable
sw.js                      service worker (solo el shell; los datos siempre van a la red)
serve.js                   servidor estático para desarrollo local
test/e2e.html              arnés de prueba: la app real con Supabase simulado en memoria
test/mock-supabase.js      el mock (sesión lista y los bloques reales; ?premig=1 simula base vieja)
```

## Constructor de la presentación

`constructor.html` es donde el comité arma la presentación principal de la noche: láminas con
título, puntos, imagen y **video** opcionales, quién la presenta, minutos y notas, agrupadas en
secciones. Se reordena con flechas y hay una vista «por presentador» con los tiempos de cada
quien contra la meta de 30 min. `presentar.html` proyecta ese deck con el mismo motor de
`presentacion.html` (clicker Av/Re Pág, flechas, **B** pantalla en negro, **F** pantalla
completa, **P** vista de presentador, **V** reproduce el video, impresión a PDF).

**Las secciones se administran desde el constructor** (botón «⚙ Secciones»): agregar, renombrar,
reordenar y quitar. Viven en `ev_seccion`; ya no son una lista fija en el código. Al quitar una
con láminas se pregunta a qué sección se mudan — nunca se borra una lámina — y siempre tiene que
quedar al menos una. Ojo: la sección «portal» carga además las 8 láminas del recorrido del Portal,
que viven dentro de `presentar.html` y no se pueden mudar desde ahí.

**Vista de presentador (`presentador.html`, tecla P).** Las notas viven en la ventana que se
proyecta, así que encenderlas delante de la sala las ponía en la pantalla grande. Esta segunda
ventana se queda en la laptop con las notas en grande, la lámina que sigue, el reloj corrido
contra los minutos programados y un índice para saltar (tecla **I**); avanza, retrocede y apaga
la proyección. Las dos ventanas se hablan por `BroadcastChannel` del mismo origen —sin servidor,
sin base y sin red— y con ella conectada la **N** del proyector ya no descubre las notas. Requiere
las pantallas en modo **extendido**: en espejo no hay forma de separarlas.

**Video por lámina:** se pega un enlace de YouTube, Vimeo o Drive (va en iframe) o se sube el
archivo MP4/WebM/MOV hasta 300 MB (va en `<video>` con controles). Una lámina de solo video se
proyecta a pantalla casi completa; con puntos, el video queda al lado del texto. El video se
carga al llegar a su lámina y se apaga al salir, para que no siga sonando detrás de otra. Los
archivos suben **directo del navegador a Storage** con una URL firmada que emite la edge function
— un video no cabe en el cuerpo de una función.

Acceso por **clave compartida** (no requiere el login de Google del portal): la clave vive en
`ev_secret.constructor_clave` y se valida en la edge function `constructor` — nunca en el HTML.
Las láminas (`ev_lamina`, RLS sin policies) y las imágenes (bucket público de solo lectura
`laminas`) viven en el mismo proyecto Supabase del comité; las imágenes se suben como archivo
vía la edge function, nunca en base64 dentro de la página.

Sin build, sin dependencias instaladas: `supabase-js` se importa de esm.sh.
Para desarrollo local: `node serve.js` → http://localhost:8099 (o `PORT=xxxx` para otro puerto).
Para probar sin login ni datos reales: la misma URL + `/test/e2e.html`.

## Convención del repositorio de material

Carpetas (mismas que ya se usaban en Drive, más tres nuevas):

```
01_Historicas_NaturalTrade   05_Broll_Stock        09_Capturas_App
02_Historicas_GlobalForest   06_Equipo             99_General
03_Sitios_Actuales           07_Datos_Excel
04_Logos                     08_Guiones
```

Etiqueta cada cosa con el **código del video** (V1…V6) y aparece sola en la mesa de trabajo de ese
video. Para videos muy pesados, mejor pegar el link que subir el archivo.

## Contexto del evento

- **Presentación:** 30 min + ~10 de preguntas, intercalando video y en vivo. El eje es la
  **tecnología**, no repetir la operación que los clientes ya conocen.
- **Audiencia:** dueños y decisores de tarimeras y embalaje de México, más Wood Pack Global y la
  asociación (puerta a los socios de EUA).
- **Fechas:** junta del comité 4-ago · Jorge fuera 7–14 ago · ensayo general 25-ago · evento 1-sep.
