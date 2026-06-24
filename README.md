# TARGET ANALYZER — Subproyecto 3 (Robot)

Tecnicatura Universitaria en Desarrollo de Software — UNP — 2026

App full-stack con estética de terminal (CTU / tema búnker): el usuario ingresa una
URL, el backend la escanea de verdad con un navegador headless y muestra los
resultados en los paneles. Regla de oro: **frontend en el navegador, backend en Node.js**.

## Estructura

```
target-analyzer/
├── backend/                <- corre en Node.js / terminal
│   ├── server.js           <- Receptor v2.3 (ruta + log + delega en el robot)
│   ├── robot.js            <- Motor de extracción (Puppeteer + Cheerio)
│   └── package.json
├── frontend/               <- corre en el navegador
│   ├── index.html
│   ├── style.css
│   └── script.js           <- Emisor v2.0 (validación + abortar + render de paneles)
├── README.md
├── AGENTS.md
└── .gitignore
```

## Cómo levantarlo

### 1. Backend

```bash
cd backend
npm install        # instala express, cors, cheerio y puppeteer
node server.js     # o: npm run dev  (se reinicia solo al guardar)
```

Importante: `npm install` con Puppeteer **descarga un binario de Chrome for Testing**
(~100-200 MB) la primera vez. Tarda un poco y necesita internet. Cuando termine y
veas `[BÚNKER CENTRAL]: Escuchando comunicaciones en puerto 3000`, está listo.

### 2. Frontend

Abrí `frontend/index.html` (doble clic o Live Server). Escribí un dominio
(ej. `ejemplo.com` — el frontend le agrega `https://` solo si falta) y tocá
`[INICIAR_ESCANEO]`. Si querés cortar un escaneo en curso, `[ABORTAR]`.

## Flujo de datos (de punta a punta)

1. El frontend (`script.js`) valida la URL y la manda por `fetch` POST a `/api/escanear`.
2. `server.js` recibe, llama a `ejecutarExtraccion(url)` del robot y espera.
3. `robot.js` lanza Chrome headless con Puppeteer, navega al sitio, saca el HTML
   renderizado, mide latencia/peso/SSL, y con Cheerio extrae título, descripción,
   framework, lenguaje (CMS) y servidor.
4. `server.js` escribe una línea en `historial.log` y devuelve el JSON con tres capas:
   `identidad`, `tecnologias`, `metricas`.
5. El frontend reparte esos datos en los paneles: identidad → Panel 1, tecnologías →
   Panel 2, métricas → Panel 4.

## Forma del JSON de respuesta

```json
{
  "estado": "EXITO",
  "mensaje": "Sondas recuperadas. Análisis completado.",
  "identidad":   { "titulo": "...", "descripcion": "..." },
  "tecnologias": { "servidor": "...", "lenguaje": "...", "frameworkFront": "..." },
  "metricas":    { "tiempoRespuestaMs": 0, "pesoDocumentoKb": "0.00", "certSslVigente": true }
}
```

En caso de error el robot lanza una excepción y el server responde
`status 500` con `{ "error": "..." }`.

## Notas para el equipo

- `node_modules`, `historial.log` y `capturas/` NO se suben (están en `.gitignore`).
  Cada uno corre `npm install` en su máquina.
- El escaneo visita sitios reales: necesita internet y algunos sitios pueden tardar
  o bloquear navegadores headless (el server lo maneja con error 500, no se cae).
- **Panel 3 [ENLACES]** queda reservado para la etapa siguiente (extraer y listar los
  `<a href>` del sitio). Hoy el robot todavía no los extrae.

## Reparto sugerido

- **Backend:** `server.js` y `robot.js` (extracción, métricas, persistencia, futura
  extracción de enlaces y screenshots).
- **Frontend:** render de los paneles, estilos, y el futuro Panel 3 de enlaces.
