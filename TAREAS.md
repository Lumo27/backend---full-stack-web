# TARGET ANALYZER — PLAN DE TAREAS DEL BACKEND

> **Para qué sirve este archivo:** es el mapa de trabajo del equipo de backend (8 personas).
> Cada tarea explica **QUÉ problema resuelve, CÓMO se resuelve y POR QUÉ importa**, en
> palabras simples, para que cualquiera pueda agarrar una tarea, entenderla sola y saber
> en qué andan los demás. Si algo no se entiende, está mal escrito: avisá y lo arreglamos.

---

## 1. EL OBJETIVO (la "consigna", según el diagrama del aula)

El usuario (OPERADOR) escribe una URL en el navegador. El **Frontend** (Subproyecto 1, lo hace
otro grupo) manda esa URL al **Backend** (Subproyecto 2, `server.js`). El Backend le pasa la URL
al **Robot Crawler** (Subproyecto 3, `robot.js`), que entra al sitio, lo analiza y devuelve datos.
El Backend guarda un registro en disco y responde al Frontend, que pinta los **4 paneles**.

```
OPERADOR
   │ 1. ingresa URL y dispara
   ▼
FRONTEND (Subproy. 1)  ──10. inyecta──►  PANELES VISUALES (4 cuadros)
   │ ▲
   │ 2. POST /api/escanear        9. responde HTTP 200
   ▼ │
BACKEND (Subproy. 2 · server.js)  ──8. escribe──►  registro (log)
   │ ▲
   │ 3. delega URL            7. recibe JSON armado
   ▼ │
ROBOT CRAWLER (Subproy. 3 · robot.js)
   │  4. parsea el DOM del OBJETIVO WEB
   │  5. saca métricas
   └─ 6. guarda capturas en  /capturas
```

**Nosotros (backend) somos dueños del Subproyecto 2 (`server.js`) y del Subproyecto 3 (`robot.js`).**
El Frontend lo hace otro grupo, pero coordinamos con ellos el "contrato" (la forma del JSON).

**Los 4 paneles son la consigna.** Cada panel tiene que mostrar algo:

| Panel | Título | De dónde sale el dato | ¿Listo en el MVP? |
|-------|--------|-----------------------|-------------------|
| 1 | **VISTA** | `identidad` (título, descripción) + **captura** | parcial (falta la captura) |
| 2 | **TECNOLOGÍA** | `tecnologias` (servidor, lenguaje, framework) | sí |
| 3 | **ENLACES** | `enlaces` (lista de links) | **NO (vacío)** |
| 4 | **MÉTRICAS** | `metricas` (latencia, peso, SSL) | sí |

> **La nota depende de cuánto y qué tan bien implementemos.** Por eso hay un **NÚCLEO**
> (lo que el diagrama muestra y hoy falta) y **EXTRAS** (que suben la nota).

---

## 2. CÓMO TRABAJAR SIN BLOQUEARNOS (leer antes de empezar)

El miedo es real: muchas tareas dependen de otras. La solución es **acordar los "contratos"
primero** y programar contra ellos, aunque el otro no haya terminado.

**Regla de oro:** nadie espera a que el otro termine. Esperás a que el equipo **acuerde la forma
del dato** (el contrato). Después cada uno trabaja con un *mock* (dato de mentira con esa forma)
hasta que la parte real esté lista.

### 2.1 Contrato N°1 — La forma del JSON de respuesta (FUENTE DE VERDAD)

Este es el objeto que `server.js` le devuelve al Frontend. **Nadie cambia esta forma sin avisar
al grupo.** Cada campo nuevo dice qué tarea lo agrega:

```json
{
  "estado": "EXITO",
  "mensaje": "Sondas recuperadas. Análisis completado.",

  "identidad": {
    "titulo": "Título de la página",
    "descripcion": "Meta description",
    "captura": "/capturas/objetivo_2026-06-20T20-01-57.png"   // ← NUEVO (Tarea 6)
  },

  "tecnologias": {
    "servidor": "cloudflare",
    "lenguaje": "PHP (WordPress)",
    "frameworkFront": "React",
    "extras": ["jQuery", "Google Analytics"]                  // ← NUEVO (Tarea 12)
  },

  "enlaces": {                                                 // ← NUEVO (Tarea 8)
    "total": 42,
    "internos": 30,
    "externos": 12,
    "lista": [
      { "url": "https://sitio.com/nosotros", "texto": "Nosotros", "tipo": "interno" },
      { "url": "https://twitter.com/cuenta",  "texto": "Twitter",  "tipo": "externo" }
    ]
  },

  "metricas": {
    "tiempoRespuestaMs": 1074,
    "pesoDocumentoKb": "0.55",
    "certSslVigente": true,
    "statusHttp": 200,                                         // ← NUEVO (Tarea 13)
    "conteos": { "imagenes": 12, "scripts": 8, "enlaces": 42 },// ← NUEVO (Tarea 13)
    "protocoloTls": "TLS 1.3"                                  // ← NUEVO (Tarea 13)
  }
}
```

En caso de error, el contrato NO cambia: `status 500` con `{ "error": "<mensaje>" }`.

### 2.2 Contrato N°2 — La función del logger (para la épica de Logs)

Todos los que escriban logs usan esta misma función (la crea la Tarea 1):

```js
// logger.js
registrar(nivel, categoria, mensaje)
//   nivel:     'INFO' | 'SUCCESS' | 'ERROR'
//   categoria: 'SISTEMA' | 'PETICION' | 'PROCESO' | 'ROBOT' | 'RETORNO'
//   mensaje:   texto libre
// Escribe en registro_bunker.txt una línea:  [FECHA HORA] [NIVEL] [CATEGORIA] mensaje
```

Mientras la Tarea 1 no esté lista, el resto puede usar un **mock de una línea**:
`const registrar = (n,c,m) => console.log(`[${n}] [${c}] ${m}`);` y después lo reemplazan.

### 2.3 Reglas de convivencia en el código

- **Una rama de git por tarea** (ej. `tarea-7-extraer-enlaces`). Nada se trabaja en `main`.
- **PRs chicos**: terminás una tarea → PR → que alguien lo revise → merge.
- **`robot.js` y `server.js` los tocan varios.** Para no pisarse: cada tarea agrega su bloque
  en una sección comentada propia (ej. `// === ENLACES (T7) ===`). Si dos tareas tocan la
  misma función, hablen entre ustedes antes.
- **Nunca commitear:** `node_modules/`, `registro_bunker.txt`, `historial.log`, `capturas/`.

---

## 3. MAPA DE DEPENDENCIAS (quién necesita a quién)

```
RAÍCES (se pueden empezar HOY, no dependen de nadie):
  T1 (logger)      T7 (extraer enlaces)      T5 (capturas)      T9 (validar URL)

LUEGO:
  T1 ──► T2, T3, T4        (necesitan la función registrar())
  T7 ──► T8                (necesita la forma de los enlaces)
  T7 ──► T14               (el mapeo de rutas usa la lista de enlaces)
  T5 ──► T6                (exponer/servir la captura)
  T8/T6/T12/T13 ──► tocan el MISMO JSON: coordinar con el Contrato N°1
  T15 ──► usa los datos ya persistidos
  T16 ──► va al final (documenta todos los contratos finales)
```

**Traducción:** empiecen por las RAÍCES. En cuanto el contrato esté acordado, todo lo demás
puede avanzar en paralelo usando mocks.

---

## 4. LAS 16 TAREAS

> Formato de cada tarea: **Problema** (qué está mal hoy) · **Cómo** (qué hacer) ·
> **Por qué** (para qué sirve) · **Archivos** · **Depende de** · **Listo cuando** (cómo sabés
> que terminaste).

---

### 🔴 NÚCLEO — completa lo que el diagrama muestra y hoy falta

---

#### ÉPICA A · LOGS  (Subproyecto 2 · OBLIGATORIO por el PDF de la cátedra)

##### ▶ Tarea 1 — Crear el módulo `logger.js` (la base de todo el log)  🔑 RAÍZ
- **Problema:** hoy el log se escribe con `fs.appendFileSync`, que es **bloqueante**: mientras
  escribe en disco, el servidor se frena. El PDF prohíbe esto ("no puede ponerse lento ni
  congelar el envío al frontend"). Además el archivo debe llamarse `registro_bunker.txt`.
- **Cómo:** crear `logger.js` con una función `registrar(nivel, categoria, mensaje)` que use un
  **write stream asíncrono** (`fs.createWriteStream('registro_bunker.txt', { flags: 'a' })`)
  abierto una sola vez. Cada llamada arma la línea con el formato
  `[YYYY-MM-DD HH:MM:SS] [NIVEL] [CATEGORIA] mensaje` y la escribe sin bloquear.
- **Por qué:** es el "Contrato N°2". Todas las demás tareas de logs lo usan. Si esto está bien,
  el resto es solo llamar a `registrar(...)` en el momento correcto.
- **Archivos:** `logger.js` (nuevo).
- **Depende de:** nadie. **Se empieza HOY.**
- **Listo cuando:** existe `registro_bunker.txt`, se escribe una línea con el formato exacto al
  llamar `registrar('INFO','SISTEMA','prueba')`, y NO se usa ninguna función `...Sync`.

##### ▶ Tarea 2 — Loguear arranque del sistema y petición entrante
- **Problema:** cuando el server arranca o llega una petición, no queda registro en el archivo.
- **Cómo:** en `server.js`, al hacer `app.listen` llamar `registrar('INFO','SISTEMA', ...)` con
  "búnker activo" y "escuchando en puerto 3000". Dentro de la ruta `/api/escanear`, al recibir
  la petición: `registrar('INFO','PETICION', ...)` y `registrar('INFO','PROCESO','Objetivo recibido: '+url)`.
- **Por qué:** el PDF exige registrar el arranque y cada petición entrante con su URL.
- **Archivos:** `server.js`.
- **Depende de:** T1 (o su mock).
- **Listo cuando:** al prender el server y hacer un escaneo, aparecen esas líneas en el `.txt`.

##### ▶ Tarea 3 — Loguear la comunicación con el Robot y el retorno
- **Problema:** no sabemos por el log cuándo se le pidió algo al robot ni cómo respondió.
- **Cómo:** en `server.js`, justo antes de llamar a `ejecutarExtraccion` →
  `registrar('INFO','ROBOT','Enviando orden al robot...')`. Cuando vuelve OK →
  `registrar('SUCCESS','ROBOT','El Robot escaneó la URL exitosamente')`. Al responder al
  frontend → `registrar('INFO','RETORNO','Despachando JSON. Estado: 200')`.
- **Por qué:** el PDF pide registrar "el momento exacto en que le envía la orden al robot y el
  estado de la respuesta". Sirve para diagnosticar si el robot se cuelga.
- **Archivos:** `server.js`.
- **Depende de:** T1 (o su mock).
- **Listo cuando:** un escaneo exitoso deja las 3 líneas (ROBOT enviado, ROBOT éxito, RETORNO 200).

##### ▶ Tarea 4 — Loguear errores a archivo + proteger el archivo
- **Problema:** si algo falla (red caída, o el robot ni siquiera se puede cargar), solo se ve en
  consola y se pierde. Además el `.txt` no debe subirse a git ni verse desde el navegador.
- **Cómo:** en el `catch` de `server.js` → `registrar('ERROR','ROBOT', error.message)`. Probar
  el caso límite del PDF: ¿qué pasa si `require('./robot')` falla o el robot no existe? → manejarlo
  y loguearlo. Agregar `registro_bunker.txt` al `.gitignore`. Confirmar que el archivo vive en la
  carpeta del backend y NO se sirve al frontend.
- **Por qué:** el PDF exige "registro de errores" y que el log sea solo del lado del servidor.
- **Archivos:** `server.js`, `.gitignore`.
- **Depende de:** T1 (o su mock).
- **Listo cuando:** apagás una conexión / rompés algo a propósito y queda una línea `[ERROR]`;
  `git status` no muestra el `.txt`.

---

#### ÉPICA B · CAPTURAS  (Subproyecto 3 · paso 6 del diagrama — HOY NO EXISTE)

##### ▶ Tarea 5 — El robot saca una captura de pantalla del sitio  🔑 RAÍZ
- **Problema:** el diagrama muestra que el robot debe guardar capturas en `/capturas`, pero el
  MVP no lo hace.
- **Cómo:** en `robot.js`, después de cargar la página, antes de cerrar el navegador:
  `await pagina.screenshot({ path: './capturas/<nombre>.png', fullPage: true })`. El `<nombre>`
  tiene que ser único (ej. dominio + fecha-hora) para no pisar capturas anteriores. Crear la
  carpeta `capturas/` si no existe. **Cerrar Puppeteer siempre, también si falla.**
- **Por qué:** es una pieza que el diagrama pide y suma al Panel 1 (evidencia visual).
- **Archivos:** `robot.js`.
- **Depende de:** nadie. **Se empieza HOY.**
- **Listo cuando:** tras un escaneo aparece un `.png` nuevo dentro de `capturas/`.

##### ▶ Tarea 6 — Exponer la captura en el JSON y servirla al frontend
- **Problema:** la captura existe en disco pero el frontend no tiene cómo mostrarla.
- **Cómo:** que `robot.js` devuelva el nombre/ruta de la captura y `server.js` lo incluya en
  `identidad.captura` (ver Contrato N°1). Servir la carpeta como estática y de solo lectura:
  `app.use('/capturas', express.static('capturas'))`, así el front la pide por URL. Agregar
  `capturas/` al `.gitignore`.
- **Por qué:** sin esto, el Panel 1 no puede mostrar la imagen. Conecta el robot con la pantalla.
- **Archivos:** `robot.js`, `server.js`, `.gitignore`.
- **Depende de:** T5 (necesita la captura) + Contrato N°1 (campo `identidad.captura`).
- **Listo cuando:** el JSON trae `identidad.captura` y abrir esa URL en el navegador muestra la imagen.

---

#### ÉPICA C · ENLACES  (Panel 3 — su título es parte de la consigna, HOY VACÍO)

##### ▶ Tarea 7 — El robot extrae los enlaces de la página  🔑 RAÍZ
- **Problema:** el Panel 3 [ENLACES] queda inerte porque el robot no junta los `<a href>`.
- **Cómo:** en `robot.js`, con Cheerio recorrer `$('a[href]')`. Para cada uno: resolver la URL
  relativa a absoluta con `new URL(href, urlObjetivo)`; descartar `#`, `mailto:`, `tel:`,
  `javascript:`; eliminar duplicados (con un `Set`); y marcar si es **interno** (mismo dominio)
  o **externo** (otro dominio). Guardar también el texto visible del link.
- **Por qué:** es el dato que llena el Panel 3 y, además, lo que después usa el mapeo de rutas (T14).
- **Archivos:** `robot.js`.
- **Depende de:** nadie. **Se empieza HOY.**
- **Listo cuando:** la función devuelve una lista de enlaces absolutos, sin repetidos, cada uno
  clasificado interno/externo.

##### ▶ Tarea 8 — Agregar `enlaces` al JSON y coordinar el render del Panel 3
- **Problema:** aunque el robot extraiga los enlaces, hay que meterlos en el JSON con una forma
  fija y avisarle al frontend cómo pintarlos.
- **Cómo:** armar el objeto `enlaces { total, internos, externos, lista[] }` (ver Contrato N°1) y
  sumarlo a la respuesta **sin tocar** identidad/tecnologias/metricas. Pasarle al grupo de
  frontend la forma exacta para que rendericen la `lista` en `#panel-enlaces` (ese panel ya tiene
  scroll). Sugerencia para el front: links clickeables, color distinto para internos vs externos.
- **Por qué:** es el puente entre el dato (T7) y la pantalla. Cierra el Panel 3.
- **Archivos:** `robot.js`/`server.js` (+ handoff a `script.js` del otro grupo).
- **Depende de:** T7 + Contrato N°1.
- **Listo cuando:** el JSON trae `enlaces` con totales correctos y el front lo muestra en el Panel 3.

---

### 🟢 EXTRAS — no son obligatorios, pero suben la nota

---

#### ÉPICA D · ROBUSTEZ (que el robot no explote con cualquier sitio)

##### ▶ Tarea 9 — Validar y normalizar la URL en el backend  🔑 RAÍZ
- **Problema:** hoy se confía en que el frontend manda una URL válida. Si llega basura, el robot
  explota feo.
- **Cómo:** en `server.js`/`robot.js`, validar con `new URL(...)`; si no trae `http://`/`https://`
  anteponerlo; rechazar cualquier otra cosa devolviendo un error claro (sin llamar al robot).
- **Por qué:** evita caídas y da mensajes entendibles. Defensa básica del backend.
- **Archivos:** `server.js` (o un mini `validador.js`).
- **Depende de:** nadie. **Se empieza HOY.**
- **Listo cuando:** mandar `"pepe"` o `"ftp://x"` devuelve error controlado, no un crash.

##### ▶ Tarea 10 — Mensajes de error diferenciados
- **Problema:** todos los fallos devuelven el mismo texto genérico; no se sabe qué pasó.
- **Cómo:** en `robot.js`, distinguir tipos de error (timeout, dominio inexistente/DNS, página
  4xx/5xx) y devolver un mensaje específico por cada uno. Que cada error se loguee (usa T4).
- **Por qué:** ayuda a diagnosticar y mejora la experiencia. Suma puntos de calidad.
- **Archivos:** `robot.js`.
- **Depende de:** ideal después de T1/T4 (para loguear), pero se puede codear en paralelo.
- **Listo cuando:** escanear un dominio que no existe vs. uno que tarda mucho da mensajes distintos.

##### ▶ Tarea 11 — Timeout configurable y cierre garantizado de Puppeteer
- **Problema:** si un sitio nunca termina de cargar, el robot puede quedarse colgado y dejar
  Chrome abierto consumiendo RAM.
- **Cómo:** poner un timeout en `pagina.goto(..., { timeout: N })` y asegurar `navegador.close()`
  en TODOS los caminos (éxito y error) con `try/finally`.
- **Por qué:** estabilidad. Un robot que deja procesos zombies es un robot que rompe la máquina.
- **Archivos:** `robot.js`.
- **Depende de:** nadie (pero coordinar con T5/T10 que tocan el mismo flujo del robot).
- **Listo cuando:** un sitio que cuelga corta a los N segundos y no quedan procesos Chrome vivos.

---

#### ÉPICA E · EXTRACCIÓN AMPLIADA (más datos = paneles más ricos)

##### ▶ Tarea 12 — Detectar más tecnologías
- **Problema:** hoy solo detecta React/Vue/Angular y WordPress. Es pobre para el Panel 2.
- **Cómo:** sumar detección de más herramientas (jQuery, Bootstrap, Google Analytics, etc.)
  buscando sus firmas con Cheerio. Devolverlas en `tecnologias.extras` (array, ver Contrato N°1).
- **Por qué:** un Panel 2 más completo se ve mejor y demuestra más trabajo.
- **Archivos:** `robot.js`.
- **Depende de:** Contrato N°1 (campo `tecnologias.extras`).
- **Listo cuando:** al escanear un sitio con jQuery, aparece "jQuery" en `tecnologias.extras`.

##### ▶ Tarea 13 — Métricas extra para el Panel 4
- **Problema:** el Panel 4 solo muestra latencia, peso y SSL. Se puede mostrar mucho más.
- **Cómo:** agregar al objeto `metricas`: `statusHttp` (código HTTP de la respuesta),
  `conteos` (nº de imágenes, scripts y enlaces, contados con Cheerio) y `protocoloTls`
  (del `securityDetails`). Ver Contrato N°1.
- **Por qué:** más métricas reales = Panel 4 más interesante y más nota.
- **Archivos:** `robot.js`.
- **Depende de:** Contrato N°1.
- **Listo cuando:** el JSON trae esos campos con valores reales del sitio escaneado.

---

#### ÉPICA F · MAPEO DE RUTAS INTERNAS (roadmap que dejó la cátedra)

##### ▶ Tarea 14 — Profundizar el escaneo en enlaces internos
- **Problema:** solo se analiza la página principal. La cátedra planteó "profundizar" entrando
  a los enlaces internos.
- **Cómo:** en `robot.js`, tomar los enlaces **internos** (de T7), elegir los más importantes
  (ej. los primeros N), abrir cada uno en una nueva pestaña, y repetir el análisis (captura +
  datos básicos). Todo asíncrono y cerrando bien cada pestaña.
- **Por qué:** convierte al "analizador de una página" en un "crawler" de verdad. Es la mejora
  más vistosa para la nota.
- **Archivos:** `robot.js`.
- **Depende de:** **T7** (necesita la lista de enlaces internos). Es la tarea más avanzada: empezar
  cuando T7 esté lista.
- **Listo cuando:** un escaneo recorre también algunas páginas internas y reporta datos de cada una.

---

#### ÉPICA G · HISTÓRICO E INFRAESTRUCTURA

##### ▶ Tarea 15 — Guardar resultados y endpoint para consultarlos
- **Problema:** cada escaneo se pierde; no hay forma de ver los anteriores desde la app.
- **Cómo:** guardar cada resultado en un archivo estructurado (ej. `historial.json`) y crear un
  endpoint `GET /api/historial` que devuelva los últimos escaneos.
- **Por qué:** habilita ver el histórico y, más adelante, estadísticas. Demuestra manejo de
  persistencia y de rutas GET.
- **Archivos:** `server.js`.
- **Depende de:** nada duro, pero conviene después de que el JSON esté estable.
- **Listo cuando:** `GET /api/historial` devuelve la lista de escaneos hechos.

##### ▶ Tarea 16 — Configuración por entorno + documentación final
- **Problema:** el puerto y los timeouts están "hardcodeados"; y los contratos nuevos no están
  documentados para el resto del equipo.
- **Cómo:** mover valores a un `.env` (PUERTO, timeouts) y leerlos en el código. Actualizar
  `README.md` y `AGENTS.md` con la forma final del JSON y los endpoints.
- **Por qué:** prolijidad y que cualquiera (incluida la cátedra) entienda el proyecto. Va al final
  porque documenta lo que las otras tareas dejaron hecho.
- **Archivos:** `.env`, `server.js`, `README.md`, `AGENTS.md`.
- **Depende de:** que el resto esté casi terminado.
- **Listo cuando:** cambiar el puerto se hace desde `.env` y la doc refleja los contratos reales.

---

## 5. REPARTO SUGERIDO (8 personas · 2 tareas c/u)

| Pareja | Tareas | Foco |
|--------|--------|------|
| 1 | T1, T2 | Logs (base + arranque/petición) |
| 2 | T3, T4 | Logs (robot/retorno + errores) |
| 3 | T5, T6 | Capturas |
| 4 | T7, T8 | Enlaces (Panel 3) |
| 5 | T9, T10 | Robustez (validación + errores) |
| 6 | T11, T12 | Robustez (timeout) + Tecnologías |
| 7 | T13, T15 | Métricas extra + Histórico |
| 8 | T14, T16 | Mapeo rutas internas + Config/Docs |

**Primer movimiento del equipo (día 1):**
1. Acordar entre todos el **Contrato N°1 (JSON)** y el **Contrato N°2 (logger)**. 15 minutos de
   charla que evitan días de conflictos.
2. Las RAÍCES arrancan ya: **T1, T5, T7, T9**.
3. El resto codea contra los contratos usando mocks hasta que las raíces estén listas.

---

## 6. GLOSARIO RÁPIDO

- **Épica:** un grupo de tareas que persiguen un mismo objetivo (ej. "Logs"). Sirve para organizar.
- **Contrato:** acuerdo sobre la forma de un dato o la firma de una función. Si todos lo respetan,
  pueden trabajar en paralelo sin romperse entre sí.
- **Mock:** dato de mentira con la forma correcta, para trabajar mientras la parte real no está.
- **Asíncrono / no bloqueante:** que no frena al servidor mientras hace algo lento (como escribir disco).
- **Endpoint:** una dirección de la API (ej. `POST /api/escanear`).
- **RAÍZ:** tarea que no depende de ninguna otra → se puede empezar ya.
