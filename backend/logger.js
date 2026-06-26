// logger.js  (Contrato N°2 · TAREA 1)
// El "cuaderno de bitácora" del búnker. Todas las tareas de logs (T2, T3, T4)
// usan ESTA función para dejar registro. Acá no se decide qué anotar: solo se
// escribe la línea. El QUÉ anotar lo deciden quienes llaman a registrar().
const fs = require('fs');
const path = require('path');

// Abrimos el archivo de registro UNA sola vez, en modo "agregar al final" (flag 'a').
// Usamos createWriteStream (ASÍNCRONO): el servidor NO se frena mientras escribe en disco.
// (Lo contrario sería fs.appendFileSync, bloqueante, que el PDF de la cátedra prohíbe.)
const flujoRegistro = fs.createWriteStream(path.join(__dirname, 'registro_bunker.txt'), { flags: 'a' });

// Convierte la fecha actual al formato exacto del contrato: YYYY-MM-DD HH:MM:SS
function marcaDeTiempo() {
    const ahora = new Date();
    // Rellena con un 0 adelante los números de un solo dígito (ej: 9 -> "09")
    const dosDigitos = (numero) => String(numero).padStart(2, '0');
    const fecha = `${ahora.getFullYear()}-${dosDigitos(ahora.getMonth() + 1)}-${dosDigitos(ahora.getDate())}`;
    const hora = `${dosDigitos(ahora.getHours())}:${dosDigitos(ahora.getMinutes())}:${dosDigitos(ahora.getSeconds())}`;
    return `${fecha} ${hora}`;
}

// La función que usa todo el equipo.
//   nivel:     'INFO' | 'SUCCESS' | 'ERROR'                               (qué tan grave es)
//   categoria: 'SISTEMA' | 'PETICION' | 'PROCESO' | 'ROBOT' | 'RETORNO'   (de qué zona habla)
//   mensaje:   texto libre                                                (qué querés contar)
function registrar(nivel, categoria, mensaje) {
    // Armamos la línea con el formato del contrato y un salto de línea al final.
    const linea = `[${marcaDeTiempo()}] [${nivel}] [${categoria}] ${mensaje}\n`;
    // La mandamos al archivo sin bloquear el servidor.
    flujoRegistro.write(linea);
    // Espejo en consola para verlo en vivo mientras desarrollamos (opcional).
    console.log(linea.trim());
}

// Exponemos la función para que server.js (y quien sea) pueda requerirla.
module.exports = registrar;
