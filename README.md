# TARGET ANALYZER — MVP (Base del proyecto)

Tecnicatura Universitaria en Desarrollo de Software — UNP — 2026

Base armada del MVP para arrancar a trabajar en equipo. La regla de oro del
proyecto (del apunte "¿Dónde se ejecuta qué?"): **el frontend vive en el navegador
y el backend vive en Node.js**. Por eso están en carpetas separadas.

## Estructura

```
target-analyzer/
├── backend/            <- EL RECEPTOR (corre en Node.js / terminal)
│   ├── server.js
│   └── package.json
├── frontend/           <- EL EMISOR (corre en el navegador)
│   ├── index.html
│   ├── style.css
│   └── script.js
└── README.md
```

## Cómo levantarlo (en orden)

### 1. Prendé el backend (el búnker que escucha)

```bash
cd backend
npm install        # baja express y cors (crea node_modules)
node server.js     # o: npm start
```

Si todo salió bien, la terminal muestra:

```
[BÚNKER CENTRAL]: Escuchando comunicaciones en puerto 3000
```

Dejá esa terminal abierta. El server queda vivo en un bucle de escucha.

### 2. Abrí el frontend

Opción simple: doble clic en `frontend/index.html`.

Opción recomendada (evita rarezas de `file://`): abrir la carpeta en VS Code y
usar la extensión **Live Server** (botón "Go Live"). Sirve el index en algo como
`http://127.0.0.1:5500`.

### 3. Probá el flujo

Escribí un dominio en el input → `[INICIAR_ESCANEO]`. El emisor dispara un `fetch`
POST a `http://localhost:3000/api/escanear`. El servidor responde y el script
inyecta el mensaje en los paneles. Si el backend está apagado, vas a ver el cartel
rojo `[FALLO DE CONEXIÓN CON BÚNKER CENTRAL]` (eso es el `catch` haciendo su laburo).

## Requisitos

- Node.js instalado (verificá con `node -v`).
- Un navegador.

## Notas para el equipo

- El CORS ya está habilitado en el backend (`app.use(cors())`), así que el navegador
  puede hablarle al server aunque estén en orígenes distintos.
- `node_modules` NO se sube al repo (está en `.gitignore`). Cada uno corre
  `npm install` en su máquina la primera vez.
- El backend es la base para la Clase 3 (robot con Puppeteer + Cheerio + fs). Ahí
  es donde se reemplaza la respuesta "de mentira" actual por el escaneo real.

## Reparto sugerido

- **Backend (server.js):** lógica de `/api/escanear`, integración del robot, persistencia.
- **Frontend (script.js / index.html / style.css):** captura del DOM, inyección de
  resultados en los 4 paneles, mejoras visuales sobre el MVP verde fósforo.
