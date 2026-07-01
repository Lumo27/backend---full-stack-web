# TARGET ANALYZER — Subproyecto 3 (Robot)

Tecnicatura Universitaria en Desarrollo de Software — UNP — 2026

App full-stack con estética de terminal (CTU / tema búnker): el usuario ingresa una
URL, el backend la escanea de verdad con un navegador headless y muestra los
resultados en los paneles. Regla de oro: **frontend en el navegador, backend en Node.js**.

## Estructura

```
target-analyzer/
├── backend/                <- corre en Node.js / terminal
│   ├── server.js           <- Receptor (ruta + logs + validación + historial)
│   ├── robot.js            <- Motor de extracción (Puppeteer + Cheerio)
│   ├── logger.js           <- Registro asíncrono no bloqueante (T1)
│   ├── validador.js        <- Validación/normalización de URLs (T9)
│   ├── .env.example        <- Plantilla de configuración (T16)
│   └── package.json
├── frontend/               <- corre en el navegador
│   ├── index.html
│   ├── style.css
│   └── script.js           <- Emisor (validación + abortar + render de paneles)
├── README.md
├── AGENTS.md
└── .gitignore
```

## Cómo levantarlo

### 1. Backend

```bash
cd backend
npm install                # express, cors, cheerio, puppeteer, dotenv
cp .env.example .env        # crea tu config local (o copialo a mano)
node server.js             # o: npm run dev  (se reinicia solo al guardar)
```

Importante: `npm install` con Puppeteer **descarga un binario de Chrome for Testing**
(~100-200 MB) la primera vez. Cuando veas
`[BÚNKER CENTRAL]: Escuchando comunicaciones en puerto 3000`, está listo.

### 2. Frontend

Abrí `frontend/index.html` (doble clic o Live Server). Escribí un dominio
(ej. `ejemplo.com` — el backend le agrega `https://` solo si falta) y tocá
`[INICIAR_ESCANEO]`. Si querés cortar un escaneo en curso, `[ABORTAR]`.

## Configuración por entorno (.env)

El puerto y el timeout salen de `backend/.env` (con valores por defecto si no existe):

| Variable | Por defecto | Qué controla |
|---|---|---|
| `PUERTO` | `3000` | Puerto de escucha del backend |
| `TIMEOUT_MS` | `30000` | Tiempo máximo (ms) que el robot espera a que cargue un sitio |

## Endpoints

| Método | Ruta | Qué hace |
|---|---|---|
| `POST` | `/api/escanear` | Recibe `{ "url": "..." }`, escanea el sitio y devuelve el JSON de análisis |
| `GET` | `/api/historial` | Devuelve los escaneos anteriores (más recientes primero) |
| `GET` | `/capturas/<archivo>.png` | Sirve las capturas generadas por el robot (estático, solo lectura) |

## Forma del JSON de respuesta (Contrato N°1)

```json
{
  "estado": "EXITO",
  "mensaje": "Sondas recuperadas. Análisis completado.",
  "identidad": {
    "titulo": "...",
    "descripcion": "...",
    "captura": "/capturas/dominio_1234567890.png"
  },
  "tecnologias": {
    "servidor": "...",
    "lenguaje": "...",
    "frameworkFront": "...",
    "extras": ["jQuery", "Bootstrap", "Google Fonts"]
  },
  "metricas": {
    "tiempoRespuestaMs": 0,
    "pesoDocumentoKb": "0.00",
    "certSslVigente": true,
    "statusHttp": 200,
    "protocoloTls": "TLS 1.3",
    "conteos": { "imagenes": 0, "scripts": 0, "enlaces": 0 }
  },
  "enlaces": {
    "total": 0,
    "internos": 0,
    "externos": 0,
    "lista": [{ "url": "...", "tipo": "interno", "texto": "..." }]
  },
  "rutasInternas": {
    "total": 0,
    "lista": [{ "url": "...", "titulo": "...", "descripcion": "..." }]
  }
}
```

En caso de error el server responde `status 500` con `{ "error": "<mensaje específico>" }`
(timeout, dominio inexistente, HTTP 4xx/5xx o conexión rechazada — ver T10). Una URL
inválida se rechaza antes de tocar al robot con `status 400`.

## Logs

Todo el registro se escribe de forma **asíncrona y no bloqueante** en
`backend/registro_bunker.txt`, con el formato `[fecha] [NIVEL] [CATEGORIA] mensaje`.
Es solo del lado del servidor y no se sube al repo.

## Notas para el equipo

- `node_modules`, `registro_bunker.txt`, `historial.json`, `historial.log`, `.env` y
  `capturas/` NO se suben (están en `.gitignore`). Cada uno corre `npm install` y copia
  `.env.example` a `.env` en su máquina.
- El escaneo visita sitios reales: necesita internet. Si un sitio se cuelga, el robot
  corta por timeout y cierra Chrome siempre (try/finally), sin dejar procesos zombies.

## Mapa de paneles

- Panel 1 [IDENTIDAD] → `identidad` (título, descripción, captura)
- Panel 2 [TECNOLOGÍA] → `tecnologias`
- Panel 3 [ENLACES] → `enlaces`
- Panel 4 [MÉTRICAS] → `metricas`
