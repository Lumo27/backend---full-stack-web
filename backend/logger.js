// logger.js
// Módulo central de registro (Contrato N°2). Todas las tareas de logs pasan por acá.
// Importamos el módulo nativo de archivos para abrir el flujo de escritura
const fs = require('fs');
// Importamos la utilidad de rutas para ubicar el archivo junto al backend
const path = require('path');

// Abrimos el Write Stream UNA sola vez al levantar el backend: asíncrono y NO bloqueante.
// Con flag 'a' (append) cada línea se agrega al final sin frenar el servidor.
const rutaArchivo = path.join(__dirname, 'registro_bunker.txt');
const flujoRegistro = fs.createWriteStream(rutaArchivo, { flags: 'a', encoding: 'utf8' });

// Arma la marca de tiempo local con el formato exacto YYYY-MM-DD HH:MM:SS
function marcaTiempo() {
    const ahora = new Date();
    const anio = ahora.getFullYear();
    const mes = String(ahora.getMonth() + 1).padStart(2, '0');
    const dia = String(ahora.getDate()).padStart(2, '0');
    const horas = String(ahora.getHours()).padStart(2, '0');
    const minutos = String(ahora.getMinutes()).padStart(2, '0');
    const segundos = String(ahora.getSeconds()).padStart(2, '0');
    return `${anio}-${mes}-${dia} ${horas}:${minutos}:${segundos}`;
}

// Registra un evento en la bitácora de forma asíncrona.
// Formato: [YYYY-MM-DD HH:MM:SS] [NIVEL] [CATEGORIA] mensaje
function registrar(nivel, categoria, mensaje) {
    const linea = `[${marcaTiempo()}] [${nivel}] [${categoria}] ${mensaje}\n`;
    // write() es no bloqueante: encola la escritura y devuelve el control al instante
    flujoRegistro.write(linea);
}

// Exponemos la función para que server.js (y quien lo necesite) la use
module.exports = { registrar };
