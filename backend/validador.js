// validador.js
// Normaliza y valida la URL objetivo antes de mandarla al robot (T9).

// Devuelve la URL absoluta lista para el robot, o lanza un Error con motivo claro.
function normalizarYValidar(entrada) {
    if (!entrada || typeof entrada !== 'string' || !entrada.trim()) {
        throw new Error('No se recibió ninguna URL para escanear.');
    }

    let texto = entrada.trim();

    // Si no trae protocolo http/https lo anteponemos; si trae otro (ftp:, etc.) lo rechazamos
    if (!/^https?:\/\//i.test(texto)) {
        if (/^[a-z][a-z0-9+.-]*:\/\//i.test(texto)) {
            throw new Error('Protocolo no soportado. Solo se admite http:// o https://');
        }
        texto = 'https://' + texto;
    }

    let url;
    try {
        url = new URL(texto);
    } catch {
        throw new Error(`La dirección "${entrada}" no es una URL válida.`);
    }

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        throw new Error('Protocolo no soportado. Solo se admite http:// o https://');
    }

    return url.href;
}

module.exports = { normalizarYValidar };
