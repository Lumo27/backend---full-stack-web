// server.js  (Receptor v2.3)
// Importamos el framework principal para levantar la arquitectura del servidor local
const express = require('express');
// Importamos el middleware para gestionar los permisos cruzados de seguridad del navegador
const cors = require('cors');
// Importamos el módulo nativo para operar lectura y escritura sobre el disco duro
const fs = require('fs');
// Importamos la lógica de extracción aislada en el archivo del robot
const ejecutarExtraccion = require('./robot');

// Inicializamos la aplicación instanciando el motor de Express
const app = express();
// Definimos el puerto de escucha por el cual ingresan las peticiones del frontend
const PUERTO = 3000;

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
    try {
        // Notificamos el inicio de la comunicacion entre el servidor receptor y el robot extractor 
        console.log('[ROBOT]: Enviando URL al módulo de extracción');
        
        // Delegamos el procesamiento bloqueante al robot y esperamos la respuesta
        const datosDelRobot = await ejecutarExtraccion(urlRecibida);

        // Confirmamos que el robot devolvio información sin interrupciones al servidor
        console.log('[ROBOT]: Extracción completada sin interrupciones');
        
        // Armamos la línea de texto plano con los datos vitales para el archivo de registro
        const lineaLog = `[${new Date().toISOString()}] OBJETIVO: ${urlRecibida} | TÍTULO: ${datosDelRobot.identidad.titulo} | LATENCIA: ${datosDelRobot.metricas.tiempoRespuestaMs}ms | PESO: ${datosDelRobot.metricas.pesoDocumentoKb}KB\n`;
        // Escritura sincrónica: inyectamos la nueva línea al final del historial local
        fs.appendFileSync('historial.log', lineaLog, 'utf8');

        // Registramos la devolución del paquete JSON consolidando hacia la interfaz cliente, el fronted
        console.log('[BACKEND]: Enviando respuesta al frontend');
        
        // Construimos la respuesta exitosa y retornamos el paquete JSON consolidado
        res.json({
            estado: 'EXITO',
            mensaje: 'Sondas recuperadas. Análisis completado.',
            identidad: datosDelRobot.identidad,
            tecnologias: datosDelRobot.tecnologias,
            metricas: datosDelRobot.metricas,
            enlaces: datosDelRobot.enlaces
        });
    } catch (error) {
        // Registramos la interrupción del flujo para facilitar el diagnostico posterior
        console.log('[ROBOT]: Error durante la extracción de datos');
        
        // Interceptamos cualquier ruptura, la logueamos y devolvemos error 500
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// Ponemos el servidor a la escucha en el puerto designado
app.listen(PUERTO, () => {
    console.log(`[BÚNKER CENTRAL]: Escuchando comunicaciones en puerto ${PUERTO}`);
});
