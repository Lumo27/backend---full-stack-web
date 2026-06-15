/* ============================================================
   TARGET ANALYZER - EL RECEPTOR (Backend)
   Se ejecuta en Node.js, desde la terminal: node server.js
   Queda escuchando en el puerto 3000 esperando al Emisor.
   ============================================================ */

/* 1. IMPORTACIÓN DE MÓDULOS */
const express = require('express');
const cors = require('cors');

/* 2. INICIALIZACIÓN DEL MOTOR */
const app = express();
const PUERTO = 3000;

/* 3. CONFIGURACIÓN DE ADUANA (Middlewares) */
app.use(cors());          // Permite que el navegador (otro origen) nos hable
app.use(express.json());  // Traduce el texto plano JSON a un objeto usable (req.body)

/* 4. LA RUTA TÁCTICA (El receptor) */
app.post('/api/escanear', (req, res) => {
    const urlRecibida = req.body.url;
    console.log(`[ALERTA]: Objetivo recibido en coordenadas: ${urlRecibida}`);

    /* 5. EL RETORNO AL FRONTEND */
    res.json({
        estado: 'EXITO',
        mensaje: '[ENLACE ESTABLECIDO]: Servidor a la espera del Robot.',
        objetivo: urlRecibida
    });
});

/* 6. ENCENDIDO DEL SERVIDOR */
app.listen(PUERTO, () => {
    console.log(`[BÚNKER CENTRAL]: Escuchando comunicaciones en puerto ${PUERTO}`);
});