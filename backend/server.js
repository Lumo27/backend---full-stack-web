// server.js  (Subproyecto 2 · EL RECEPTOR / JEFE DE OFICINA)
// No escanea nada él mismo: recibe el pedido del frontend, valida, delega en el
// robot, deja registro y devuelve la respuesta. Coordina, no hace el trabajo pesado.

// T16: cargamos las variables de entorno desde .env ANTES que nada,
// así robot.js y este archivo ya las tienen disponibles en process.env.
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const registrar = require('./logger'); // Contrato N°2 (T1)

// T4 · Caso límite del PDF: ¿y si robot.js falla al cargarse o no existe?
// Lo envolvemos en try/catch para que el server no muera al arrancar.
let ejecutarExtraccion;
try {
    ejecutarExtraccion = require('./robot');
} catch (error) {
    registrar('ERROR', 'SISTEMA', 'No se pudo cargar el robot: ' + error.message);
    // Reemplazo de emergencia: si llega un escaneo, responde error controlado.
    ejecutarExtraccion = async () => { throw new Error('Robot no disponible en el búnker.'); };
}

const app = express();
const PUERTO = process.env.PUERTO || 3000; // T16: puerto configurable

app.use(cors());
app.use(express.json());

// T6 · Servimos la carpeta de capturas como estática y de solo lectura,
// para que el frontend pueda pedir las imágenes por URL (/capturas/archivo.png).
app.use('/capturas', express.static(path.join(__dirname, 'capturas')));

// =====================================================================
// RUTA PRINCIPAL: recibe la URL y dispara el escaneo.
// =====================================================================
app.post('/api/escanear', async (req, res) => {
    registrar('INFO', 'PETICION', 'Petición de escaneo entrante.'); // T2

    // T9 · Validamos y normalizamos la URL en el backend (no confiamos en el front).
    const urlObjetivo = normalizarUrl(req.body.url);
    if (!urlObjetivo) {
        registrar('ERROR', 'PETICION', `URL inválida rechazada: ${req.body.url}`); // T4
        return res.status(400).json({ error: 'URL inválida. Verificá el formato del objetivo.' });
    }
    registrar('INFO', 'PROCESO', `Objetivo recibido: ${urlObjetivo}`); // T2

    try {
        registrar('INFO', 'ROBOT', 'Enviando orden al robot...'); // T3
        const datosDelRobot = await ejecutarExtraccion(urlObjetivo);
        registrar('SUCCESS', 'ROBOT', 'El Robot escaneó la URL exitosamente'); // T3

        // T15 · Guardamos un resumen del escaneo en historial.json (no bloqueante).
        guardarEnHistorial({
            fecha: new Date().toISOString(),
            url: urlObjetivo,
            titulo: datosDelRobot.identidad.titulo,
            statusHttp: datosDelRobot.metricas.statusHttp
        });

        // Construimos la respuesta. AGREGAMOS 'enlaces' y 'rutasInternas' sin tocar
        // identidad/tecnologias/metricas (respetamos el contrato existente).
        registrar('INFO', 'RETORNO', 'Despachando JSON. Estado: 200'); // T3
        res.json({
            estado: 'EXITO',
            mensaje: 'Sondas recuperadas. Análisis completado.',
            identidad: datosDelRobot.identidad,
            tecnologias: datosDelRobot.tecnologias,
            enlaces: datosDelRobot.enlaces,           // T8
            metricas: datosDelRobot.metricas,
            rutasInternas: datosDelRobot.rutasInternas // T14
        });
    } catch (error) {
        registrar('ERROR', 'ROBOT', error.message); // T4: errores van al archivo, no solo a consola
        res.status(500).json({ error: error.message });
    }
});

// =====================================================================
// T15 · Endpoint para consultar el histórico de escaneos.
// =====================================================================
app.get('/api/historial', (req, res) => {
    fs.readFile(path.join(__dirname, 'historial.json'), 'utf8', (error, datos) => {
        if (error) return res.json([]); // todavía no hay historial
        try {
            res.json(JSON.parse(datos));
        } catch {
            res.json([]); // archivo corrupto: devolvemos lista vacía
        }
    });
});

// =====================================================================
// AYUDANTES
// =====================================================================

// T9 · Devuelve la URL normalizada (con http/https) o null si es inválida.
function normalizarUrl(entrada) {
    if (!entrada || typeof entrada !== 'string') return null;
    let texto = entrada.trim();
    if (!texto) return null;

    // Si YA trae un protocolo (algo://), no lo tocamos: lo validamos abajo.
    // Si NO trae protocolo, le anteponemos https://
    const yaTieneProtocolo = /^[a-z][a-z0-9+.-]*:\/\//i.test(texto);
    if (!yaTieneProtocolo) {
        texto = 'https://' + texto;
    }

    try {
        const u = new URL(texto);
        // Solo aceptamos http/https (rechazamos ftp://, etc.).
        if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
        // Exigimos un dominio con punto (ej: "sitio.com") para descartar basura tipo "pepe".
        if (!u.hostname.includes('.') && u.hostname !== 'localhost') return null;
        return u.href;
    } catch {
        return null;
    }
}

// T15 · Agrega un registro al principio de historial.json (últimos 50). Asíncrono.
function guardarEnHistorial(registro) {
    const ruta = path.join(__dirname, 'historial.json');
    fs.readFile(ruta, 'utf8', (error, datos) => {
        let historial = [];
        if (!error && datos) {
            try { historial = JSON.parse(datos); } catch { historial = []; }
        }
        historial.unshift(registro);      // el más nuevo primero
        historial = historial.slice(0, 50); // conservamos los últimos 50
        fs.writeFile(ruta, JSON.stringify(historial, null, 2), () => {});
    });
}

// Ponemos el servidor a escuchar.
app.listen(PUERTO, () => {
    registrar('INFO', 'SISTEMA', 'Búnker central activo.');              // T2
    registrar('INFO', 'SISTEMA', `Escuchando en puerto ${PUERTO}`);      // T2
    console.log(`[BÚNKER CENTRAL]: Escuchando comunicaciones en puerto ${PUERTO}`);
});
