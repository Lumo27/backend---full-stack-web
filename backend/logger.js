const fs = require('fs');
const path = require('path');

// Creamos un único stream de escritura para el archivo de registro.
// flags: 'a' significa "append" (agregar al final), sin sobrescribir lo existente.
const rutaArchivo = path.join(__dirname, 'registro_bunker.txt');
const stream = fs.createWriteStream(rutaArchivo, { flags: 'a' });

function registrar(nivel, categoria, mensaje) {
    const ahora = new Date();
    // Formateamos la fecha como YYYY-MM-DD HH:MM:SS (sin milisegundos, sin la "T", sin la "Z")
    const fecha = ahora.toISOString().slice(0, 19).replace('T', ' ');
    const linea = `[${fecha}] [${nivel}] [${categoria}] ${mensaje}\n`;

    // Escribimos en el stream de forma asíncrona y no bloqueante.
    stream.write(linea);
}

module.exports = registrar;
