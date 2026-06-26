# Target Analyzer — Contexto del proyecto (handoff para el agente de código)

Leé esto entero antes de tocar código. Trabajás sobre el **backend**.

## 1. Qué es

**Target Analyzer** — trabajo universitario (UNP, Tecnicatura en Desarrollo de
Software, 2026). App full-stack con estética de terminal de comandos (tema
táctico/búnker): el usuario ingresa una URL, el backend la escanea con un navegador
headless y muestra los resultados en una grilla de 4 paneles.

**Estado actual: Subproyecto 3 implementado.** El robot real ya está escrito y
funcionando (Puppeteer + Cheerio). No partimos de cero: extendemos sobre esta base.

## 2. Mi rol

Desarrollador del **backend**. El frontend ya consume el JSON actual y funciona.
No reescribas el frontend salvo lo necesario para mostrar datos nuevos.

## 3. Stack

- Backend: Node.js + Express + cors + **fs** (nativo). Puerto **3000**.
- Robot: **Puppeteer** (Chrome headless, `headless: 'shell'`) + **Cheerio** (parseo).
- Frontend: HTML + CSS + JavaScript vanilla.
- Git: un solo repo en la raíz. `node_modules`, `historial.log` y `capturas/` en `.gitignore`.

## 4. Estructura

```
target-analyzer/
├── backend/
│   ├── server.js   <- Receptor: ruta /api/escanear, log a historial.log, delega en robot
│   ├── robot.js    <- ejecutarExtraccion(url): Puppeteer + Cheerio, devuelve el objeto de datos
│   └── package.json
├── frontend/
│   ├── index.html  <- input + botones [INICIAR_ESCANEO] y [ABORTAR] + grilla 2x2 de paneles
│   ├── style.css
│   └── script.js   <- valida URL, fetch POST, reparte la respuesta en los paneles
└── (README.md, AGENTS.md, .gitignore)
```

## 5. Cómo corre

- Backend: `cd backend && npm install && node server.js` → escucha en :3000.
  (npm install descarga el Chrome de prueba de Puppeteer la primera vez.)
- Frontend: abrir `frontend/index.html`.

## 6. Contrato del endpoint (NO romper sin actualizar script.js)

Request: `POST http://localhost:3000/api/escanear`, body `{ "url": "<url>" }`.

Response OK (contrato final, tras las 16 tareas):
```json
{
  "estado": "EXITO",
  "mensaje": "Sondas recuperadas. Análisis completado.",
  "identidad":   { "titulo": "...", "descripcion": "...", "captura": "/capturas/objetivo_....png" },
  "tecnologias": { "servidor": "...", "lenguaje": "...", "frameworkFront": "...", "extras": ["jQuery"] },
  "enlaces":     { "total": 42, "internos": 30, "externos": 12,
                   "lista": [ { "url": "https://...", "texto": "...", "tipo": "interno" } ] },
  "metricas":    { "tiempoRespuestaMs": 0, "pesoDocumentoKb": "0.00", "certSslVigente": true,
                   "statusHttp": 200, "conteos": { "imagenes": 12, "scripts": 8, "enlaces": 42 },
                   "protocoloTls": "TLS 1.3" },
  "rutasInternas": [ { "url": "https://...", "titulo": "...", "statusHttp": 200 } ]
}
```
Response error: `status 500` con `{ "error": "<mensaje>" }`.
URL inválida: `status 400` con `{ "error": "URL inválida..." }`.

El frontend mapea: `identidad` → Panel 1 (#panel-vista), `tecnologias` → Panel 2
(#panel-tech), `enlaces` → Panel 3 (#panel-enlaces), `metricas` → Panel 4 (#panel-metricas).

Otros endpoints:
- `GET /api/historial` → últimos escaneos guardados en `historial.json`.
- `GET /capturas/<archivo>.png` → sirve las capturas (estático, solo lectura).

Config por entorno (`.env` en `backend/`): `PUERTO`, `TIMEOUT_NAVEGACION_MS`, `PROFUNDIDAD_MAX`.

## 7. Cómo trabaja robot.js hoy

`ejecutarExtraccion(urlObjetivo)`:
- Lanza Chrome headless, navega con `waitUntil: 'networkidle2'`.
- Mide `tiempoRespuestaMs`, `pesoDocumentoKb`, y `certSslVigente` (vía securityDetails).
- Con Cheerio extrae `title`, `meta[name=description]`, detecta framework
  (React/Vue/Angular por nodos típicos), detecta CMS (WordPress vía meta generator),
  y lee el header `server`.
- Cierra el navegador (también en el catch, para no dejar Chrome huérfano) y retorna
  `{ identidad, tecnologias, metricas }`. En error lanza una excepción.

## 8. Convenciones

- Comentarios y mensajes en español.
- Nomenclatura táctica/militar: `BÚNKER CENTRAL`, `[ALERTA]`, `urlRecibida`,
  `ejecutarExtraccion`, etc. Mantené el tono.
- Estética terminal (no tocar salvo pedido): verde `#00ff41`, ámbar `#ffb000`,
  fondo `#050505`, monoespaciada.
- Manejo de errores con try/catch; cerrar siempre el navegador de Puppeteer.
- Nunca commitear `node_modules`, `historial.log` ni `capturas/`.

## 9. Próximos pasos candidatos (confirmar antes de implementar)

- **Panel 3 [ENLACES]:** en robot.js extraer los `<a href>` con Cheerio, devolver un
  arreglo `enlaces`, y en script.js renderizarlo en #panel-enlaces (ya tiene scroll).
- **Screenshots:** `pagina.screenshot({ path: './capturas/...png', fullPage: true })`.
- **Mapeo de rutas internas:** iterar enlaces internos con nuevas pestañas.

Para cualquiera de estos: primero proponé los cambios de contrato (qué campos nuevos
en el JSON y dónde se renderizan) y esperá confirmación antes de escribir código.
