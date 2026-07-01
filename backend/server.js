// server.js  (Receptor v2.3)
// Importamos el framework principal para levantar la arquitectura del servidor local
const express = require('express');
// Importamos el middleware para gestionar los permisos cruzados de seguridad del navegador
const cors = require('cors');
// Importamos el logger asíncrono para registrar eventos del servidor
const registrar = require('./logger');
// Importamos la lógica de extracción aislada en el archivo del robot
let ejecutarExtraccion;
try {
    ejecutarExtraccion = require('./robot');
} catch (error) {
    registrar('ERROR', 'ROBOT', 'No se pudo cargar el robot: ' + error.message);
    ejecutarExtraccion = async () => {
        throw new Error('Robot no disponible. Comprueba el módulo ./robot.');
    };
}

// Inicializamos la aplicación instanciando el motor de Express
const app = express();
// Definimos el puerto de escucha por el cual ingresan las peticiones del frontend
const PUERTO = 3000;

// Acoplamos los middlewares: habilitar conexiones externas y decodificar paquetes JSON
app.use(cors());
app.use(express.json());

// Ruta de entrada para la petición de escaneo (POST para ocultar parámetros)
app.post('/api/escanear', async (req, res) => {
    registrar('INFO', 'PETICION', 'Nueva petición POST recibida en /api/escanear');
    // Capturamos la dirección objetivo que viaja en el cuerpo de la petición
    const urlRecibida = req.body.url;
    registrar('INFO', 'PROCESO', 'Objetivo recibido: ' + urlRecibida);
    // Alerta inicial en la consola del sistema para control operativo
    console.log(`[ALERTA]: Iniciando escaneo en coordenadas: ${urlRecibida}`);
    try {
        // Notificamos el inicio de la comunicacion entre el servidor receptor y el robot extractor 
        console.log('[ROBOT]: Enviando URL al módulo de extracción');
        registrar('INFO', 'ROBOT', 'Enviando orden al robot...');
        
        // Delegamos el procesamiento bloqueante al robot y esperamos la respuesta
        const datosDelRobot = await ejecutarExtraccion(urlRecibida);

        // Confirmamos que el robot devolvio información sin interrupciones al servidor
        console.log('[ROBOT]: Extracción completada sin interrupciones');
        registrar('SUCCESS', 'ROBOT', 'El Robot escaneó la URL exitosamente');
        
        // Registramos la devolución del paquete JSON consolidando hacia la interfaz cliente, el fronted
        console.log('[BACKEND]: Enviando respuesta al frontend');
        registrar('INFO', 'RETORNO', 'Despachando JSON. Estado: 200');
        
        // Construimos la respuesta exitosa y retornamos el paquete JSON consolidado
        res.json({
            estado: 'EXITO',
            mensaje: 'Sondas recuperadas. Análisis completado.',
            identidad: datosDelRobot.identidad,
            tecnologias: datosDelRobot.tecnologias,
            metricas: datosDelRobot.metricas
        });
    } catch (error) {
        // Registramos la interrupción del flujo y el tipo específico de error para diagnóstico
        console.log('[ROBOT]: Error durante la extracción de datos');
        registrar('ERROR', 'ROBOT', error.message);
        
        // Determinamos el tipo de error para logueo específico
        let tipoError = 'DESCONOCIDO';
        if (error.message.includes('[TIMEOUT]')) tipoError = 'TIMEOUT';
        else if (error.message.includes('[DNS]')) tipoError = 'DNS';
        else if (error.message.includes('[HTTP')) tipoError = 'HTTP';
        else if (error.message.includes('[CONEXIÓN]')) tipoError = 'CONEXIÓN_RECHAZADA';
        
        // Interceptamos cualquier ruptura, la logueamos y devolvemos error 500
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// Ponemos el servidor a la escucha en el puerto designado
app.listen(PUERTO, () => {
    console.log(`[BÚNKER CENTRAL]: Escuchando comunicaciones en puerto ${PUERTO}`);
    registrar('INFO', 'SISTEMA', 'Búnker activo. Escuchando en puerto 3000');
});
