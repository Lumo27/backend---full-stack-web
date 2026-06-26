# INFORME DEL TP — Target Analyzer (Backend)

**Materia:** Tecnicatura Universitaria en Desarrollo de Software — UNP — 2026
**Fecha:** 26/06/2026
**Alcance del informe:** estado del backend (Subproyectos 2 y 3) tras la etapa de mejoras sobre el MVP.

---

## 1. Resumen ejecutivo

La consigna era **mejorar el MVP base**: un servidor que recibía una URL, la pasaba a un robot
y devolvía datos parciales, con tres de los cuatro paneles funcionando y un panel (ENLACES)
muerto. Sobre esa base se implementaron **las 16 tareas del plan** (`TAREAS.md`): tanto el
**NÚCLEO obligatorio** (lo que el diagrama de la cátedra exige y faltaba) como **todos los
EXTRAS** previstos para subir nota.

**Resultado:** los 4 paneles funcionan, el sistema de logs cumple el requisito de la cátedra
(no bloqueante), el robot es más robusto, y se agregó persistencia y configuración por entorno.

---

## 2. Punto de partida (el MVP)

| Componente | Estado en el MVP |
|------------|------------------|
| Panel 1 [VISTA] | Parcial: título y descripción, sin captura |
| Panel 2 [TECNOLOGÍA] | OK: servidor, lenguaje, framework |
| Panel 3 [ENLACES] | **Vacío** (el robot no extraía enlaces) |
| Panel 4 [MÉTRICAS] | OK: latencia, peso, SSL |
| Logs | `fs.appendFileSync` — **bloqueante** (prohibido por el PDF) |
| Validación de URL | Solo en el frontend (saltéable) |
| Manejo de errores | Mensaje genérico único |
| Persistencia | Una línea suelta en `historial.log` |
| Configuración | Puerto y timeouts "hardcodeados" |

---

## 3. Qué se hizo (las 16 tareas)

### 🔴 NÚCLEO (obligatorio según el diagrama y el PDF)

| Tarea | Descripción | Estado |
|-------|-------------|--------|
| T1 | Módulo `logger.js` con `registrar()` y write stream **asíncrono** | ✅ |
| T2 | Loguear arranque del sistema y petición entrante | ✅ |
| T3 | Loguear comunicación con el robot y el retorno | ✅ |
| T4 | Loguear errores a archivo + proteger el archivo (gitignore) | ✅ |
| T5 | El robot saca **captura de pantalla** del sitio | ✅ |
| T6 | Exponer la captura en el JSON y servirla al frontend | ✅ |
| T7 | El robot **extrae los enlaces** (absolutos, sin duplicados, int/ext) | ✅ |
| T8 | Agregar `enlaces` al JSON y **renderizar el Panel 3** | ✅ |

### 🟢 EXTRAS (suben nota)

| Tarea | Descripción | Estado |
|-------|-------------|--------|
| T9 | Validar y normalizar la URL **en el backend** | ✅ |
| T10 | Mensajes de error diferenciados (timeout / DNS / conexión) | ✅ |
| T11 | Timeout configurable + cierre garantizado de Puppeteer (`try/finally`) | ✅ |
| T12 | Detectar más tecnologías (jQuery, Bootstrap, GA, Tailwind, WP) | ✅ |
| T13 | Métricas extra: `statusHttp`, `conteos`, `protocoloTls` | ✅ |
| T14 | Profundizar el escaneo en enlaces internos (mini-crawler) | ✅ |
| T15 | Guardar resultados en `historial.json` + `GET /api/historial` | ✅ |
| T16 | Configuración por `.env` + documentación del contrato | ✅ |

---

## 4. Estado de los 4 paneles: antes vs. después

| Panel | Antes | Después |
|-------|-------|---------|
| 1 [VISTA] | Título + descripción | + **captura de pantalla** del sitio |
| 2 [TECNOLOGÍA] | Servidor, lenguaje, framework | + **tecnologías extra** detectadas |
| 3 [ENLACES] | **Vacío** | **Funcional**: total/internos/externos + lista clickeable |
| 4 [MÉTRICAS] | Latencia, peso, SSL | + **status HTTP, TLS, conteos** de recursos |

---

## 5. Cumplimiento de los requisitos del PDF (épica de Logs)

- ✅ **Log no bloqueante:** se reemplazó `appendFileSync` por `createWriteStream` (asíncrono).
- ✅ **Nombre de archivo exigido:** `registro_bunker.txt`.
- ✅ **Formato exigido:** `[YYYY-MM-DD HH:MM:SS] [NIVEL] [CATEGORIA] mensaje`.
- ✅ **Registro de arranque, petición entrante, orden al robot, retorno y errores.**
- ✅ **El log es solo del lado del servidor** y está en `.gitignore` (no se sube ni se sirve al front).

---

## 6. Mejoras de arquitectura y calidad (lo que no se ve en pantalla)

1. **Seguridad básica:** la validación de URL se hace en el backend, no se confía en el cliente.
2. **Estabilidad:** Puppeteer se cierra siempre (`try/finally`), evitando procesos Chrome huérfanos.
3. **Contrato respetado:** todos los campos nuevos se **agregaron** sin romper `identidad`/`tecnologias`/`metricas`.
4. **Persistencia real:** historial estructurado en JSON consultable por endpoint.
5. **Configurabilidad:** puerto, timeout y profundidad se cambian desde `.env` sin tocar código.

---

## 7. Evidencia (pruebas realizadas de punta a punta)

- Escaneo OK de `example.com`, `nodejs.org` y `es.wikipedia.org`: JSON completo y los 4 paneles poblados.
- Wikipedia: **349 enlaces** detectados (241 internos / 108 externos), captura, status 200, TLS 1.3.
- `pepe` y `ftp://x` → rechazados con error **400** (no llegan al robot).
- Dominio inexistente → mensaje de **error de DNS** específico.
- `registro_bunker.txt` se llena con el formato correcto en cada acción.
- `git status` no muestra artefactos (`.txt`, `.json`, `.env`, `capturas/`).

---

## 8. Estimación de mejora respecto del MVP

- **Cobertura del diagrama de la cátedra:** el MVP cubría ~60% (faltaban capturas y enlaces,
  los pasos 4-6 del diagrama). Ahora el flujo del diagrama está **completo**.
- **Núcleo obligatorio:** 8/8 tareas.
- **Extras (suben nota):** 8/8 tareas.
- **Requisitos del PDF de Logs:** cumplidos en su totalidad.

En términos del criterio del propio plan ("la nota depende de cuánto y qué tan bien"):
se cubrió **todo el núcleo y todos los extras previstos**, con pruebas que lo respaldan.

---

## 9. Limitaciones y trabajo pendiente (honestidad técnica)

- **Flujo de git:** esta entrega está consolidada en una sola rama como material de referencia.
  El plan original pide **una rama y un PR por tarea**; eso queda como práctica del equipo.
- **Detección de tecnologías (T12):** se basa en firmas simples en el HTML; puede dar
  falsos negativos en sitios que ofuscan o cargan todo por JS.
- **Mini-crawler (T14):** visita solo los primeros N enlaces internos (configurable). No es un
  crawler recursivo completo (decisión deliberada para no eternizar el escaneo).
- **Apropiación del equipo:** el código está comentado, pero para defenderlo en la entrega
  cada integrante debería entender las partes asíncronas (`async/await`, streams, `try/finally`).

---

## 10. Cómo levantarlo

```bash
cd backend
npm install
node server.js        # → [BÚNKER CENTRAL]: Escuchando ... puerto 3000
```
Abrir `frontend/index.html` y escanear un dominio.
Endpoints: `POST /api/escanear` ({ url }), `GET /api/historial`, `GET /capturas/<archivo>.png`.
