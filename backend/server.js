// server.js  (Receptor v2.3)
// T16 · Cargamos las variables de entorno desde .env (si dotenv no está, se usan los valores por defecto)
try { require('dotenv').config(); } catch { /* dotenv opcional */ }
// Importamos el framework principal para levantar la arquitectura del servidor local
const express = require('express');
// Importamos el middleware para gestionar los permisos cruzados de seguridad del navegador
const cors = require('cors');
// Importamos la lógica de extracción aislada en el archivo del robot
const ejecutarExtraccion = require('./robot');
// Importamos el registrador central de logs no bloqueante (Contrato N°2 · T1)
const { registrar } = require('./logger');
// Importamos el validador/normalizador de URLs (T9)
const { normalizarYValidar } = require('./validador');
// Módulos nativos para persistir el historial de escaneos (T15)
const fs = require('fs').promises;
const path = require('path');

// Inicializamos la aplicación instanciando el motor de Express
const app = express();
// T16 · Puerto configurable desde .env (con 3000 como valor por defecto)
const PUERTO = Number(process.env.PUERTO) || 3000;

// T15 · Archivo donde se acumulan los resultados de cada escaneo
const RUTA_HISTORIAL = path.join(__dirname, 'historial.json');

// Lee el historial del disco; si no existe o está corrupto, devuelve lista vacía
async function leerHistorial() {
    try {
        return JSON.parse(await fs.readFile(RUTA_HISTORIAL, 'utf8'));
    } catch {
        return [];
    }
}

// Agrega un resultado al historial de forma asíncrona (no bloquea el servidor)
async function guardarEnHistorial(entrada) {
    const historial = await leerHistorial();
    historial.push(entrada);
    await fs.writeFile(RUTA_HISTORIAL, JSON.stringify(historial, null, 2), 'utf8');
}

// Acoplamos los middlewares: habilitar conexiones externas y decodificar paquetes JSON
app.use(cors());
app.use(express.json());
// Exponemos las capturas generadas por el robot para que puedan visualizarse desde el frontend
app.use('/capturas', express.static('capturas'));

// Ruta de entrada para la petición de escaneo (POST para ocultar parámetros)
app.post('/api/escanear', async (req, res) => {
    // Capturamos la dirección objetivo que viaja en el cuerpo de la petición
    const urlRecibida = req.body.url;
    // Alerta inicial en la consola del sistema para control operativo
    console.log(`[ALERTA]: Iniciando escaneo en coordenadas: ${urlRecibida}`);
    // T2 · Dejamos constancia en el archivo de la petición entrante y su objetivo
    registrar('INFO', 'PETICION', 'Petición de escaneo recibida en /api/escanear');
    registrar('INFO', 'PROCESO', `Objetivo recibido: ${urlRecibida}`);

    // T9 · Validamos y normalizamos la URL ANTES de tocar al robot
    let urlObjetivo;
    try {
        urlObjetivo = normalizarYValidar(urlRecibida);
    } catch (errorValidacion) {
        registrar('WARN', 'VALIDACION', `URL rechazada: ${errorValidacion.message}`);
        return res.status(400).json({ estado: 'ERROR', error: errorValidacion.message });
    }

    try {
        // Notificamos el inicio de la comunicacion entre el servidor receptor y el robot extractor
        console.log('[ROBOT]: Enviando URL al módulo de extracción');
        // T3 · Registramos el momento exacto en que le pasamos la orden al robot
        registrar('INFO', 'ROBOT', 'Enviando orden al robot...');

        // Delegamos el procesamiento bloqueante al robot y esperamos la respuesta
        const datosDelRobot = await ejecutarExtraccion(urlObjetivo);

        // Confirmamos que el robot devolvio información sin interrupciones al servidor
        console.log('[ROBOT]: Extracción completada sin interrupciones');
        // T3 · Registramos que el robot respondió correctamente
        registrar('SUCCESS', 'ROBOT', 'El Robot escaneó la URL exitosamente');

        // Registramos la devolución del paquete JSON consolidando hacia la interfaz cliente, el fronted
        console.log('[BACKEND]: Enviando respuesta al frontend');
        // T3 · Registramos el despacho del JSON al frontend con su estado HTTP
        registrar('INFO', 'RETORNO', 'Despachando JSON. Estado: 200');

        // T15 · Guardamos un resumen del escaneo en el historial (sin frenar la respuesta si falla)
        try {
            await guardarEnHistorial({
                fecha: new Date().toISOString(),
                url: urlObjetivo,
                titulo: datosDelRobot.identidad.titulo,
                statusHttp: datosDelRobot.metricas.statusHttp,
                tiempoRespuestaMs: datosDelRobot.metricas.tiempoRespuestaMs
            });
        } catch (errorHistorial) {
            registrar('WARN', 'HISTORIAL', `No se pudo guardar en historial: ${errorHistorial.message}`);
        }

        // Construimos la respuesta exitosa y retornamos el paquete JSON consolidado
        res.json({
            estado: 'EXITO',
            mensaje: 'Sondas recuperadas. Análisis completado.',
            identidad: datosDelRobot.identidad,
            tecnologias: datosDelRobot.tecnologias,
            metricas: datosDelRobot.metricas,
            enlaces: datosDelRobot.enlaces,
            rutasInternas: datosDelRobot.rutasInternas
        });
    } catch (error) {
        // Registramos la interrupción del flujo para facilitar el diagnostico posterior
        console.log('[ROBOT]: Error durante la extracción de datos');
        // T4 · Persistimos el error en el archivo (queda registro aunque se cierre la consola)
        registrar('ERROR', 'ROBOT', error.message);

        // Interceptamos cualquier ruptura, la logueamos y devolvemos error 500
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// T15 · Endpoint para consultar los escaneos históricos (más recientes primero)
app.get('/api/historial', async (req, res) => {
    registrar('INFO', 'PETICION', 'Consulta de historial en /api/historial');
    const historial = await leerHistorial();
    res.json({ estado: 'EXITO', total: historial.length, escaneos: historial.slice().reverse() });
});

// Ponemos el servidor a la escucha en el puerto designado
app.listen(PUERTO, () => {
    console.log(`[BÚNKER CENTRAL]: Escuchando comunicaciones en puerto ${PUERTO}`);
    // T2 · Dejamos constancia del arranque del sistema en el archivo de registro
    registrar('INFO', 'SISTEMA', 'Búnker activo');
    registrar('INFO', 'SISTEMA', `Escuchando en puerto ${PUERTO}`);
});
