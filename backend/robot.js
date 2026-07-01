// robot.js
// Importamos la librería de parseo rápido para estructurar el HTML estático en memoria
const cheerio = require('cheerio');
// Importamos el motor de automatización para controlar el navegador en segundo plano
const puppeteer = require('puppeteer');

// Definimos la función principal asincrónica que recibe la URL a escanear
async function ejecutarExtraccion(urlObjetivo) {
    // Inicializamos la variable del navegador fuera del try para poder cerrarla en el catch
    let navegador;
    try {
        // Lanzamos el binario aislado de Chrome suprimiendo la interfaz gráfica por rendimiento
        navegador = await puppeteer.launch({ headless: 'shell' });
        // Abrimos una pestaña limpia en el motor de renderizado
        const pagina = await navegador.newPage();
        // Registramos la marca de tiempo inicial para calcular la latencia posterior
        const tiempoInicio = Date.now();
        // Navegamos esperando a que el tráfico de red se estabilice
        const respuestaRed = await pagina.goto(urlObjetivo, { waitUntil: 'networkidle2', timeout: 30000 });
        
        // Verificamos si la respuesta devolvió un código de estado HTTP (4xx/5xx)
        if (respuestaRed && respuestaRed.status() >= 400) {
            await navegador.close();
            throw new Error(`ERROR HTTP ${respuestaRed.status()}: Servidor respondió con error.`);
        }
        
        // Extraemos la fotografía estática del DOM ya renderizado por el motor V8
        const codigoHtml = await pagina.content();
        // Calculamos el tiempo total del proceso de carga en milisegundos
        const tiempoRespuestaMs = Date.now() - tiempoInicio;
        // Verificamos si la conexión HTTPS es válida interceptando la respuesta de red
        const certSslVigente = respuestaRed.securityDetails() !== null;
        // Medimos el peso del documento HTML capturado en kilobytes
        const pesoDocumentoKb = (Buffer.byteLength(codigoHtml, 'utf8') / 1024).toFixed(2);

        // Montamos el código HTML plano en la memoria del servidor (función de consulta de Cheerio)
        const $ = cheerio.load(codigoHtml);
        // Rastreamos y limpiamos la etiqueta de título de la cabecera
        const tituloPagina = $('title').text().trim() || 'Sin título';
        // Aislamos el atributo content del metadato de descripción
        const descripcionPagina = $('meta[name="description"]').attr('content') || 'Sin descripción';

        // Detección de framework por la existencia estructural de nodos característicos
        let frameworkFront = 'Desconocido';
        if ($('[data-reactroot], #root').length > 0) frameworkFront = 'React';
        else if ($('[data-v-app], #app').length > 0) frameworkFront = 'Vue';
        else if ($('[ng-version], ng-app').length > 0) frameworkFront = 'Angular';

        // Detección de CMS/lenguaje vía el metadato generator (normalizado a minúsculas)
        let lenguaje = 'HTML Estático / Desconocido';
        if ($('meta[name="generator"]').attr('content')?.toLowerCase().includes('wordpress')) {
            lenguaje = 'PHP (WordPress)';
        }

        // Interceptamos las cabeceras de red para identificar el servidor que aloja el sitio
        const servidor = respuestaRed.headers()['server'] || 'Oculto';

        // Apagamos la instancia de Chrome para liberar la memoria RAM del equipo
        await navegador.close();

        // Ensamblamos y retornamos el objeto JSON con las tres capas de datos tácticos
        return {
            identidad: {
                titulo: tituloPagina,
                descripcion: descripcionPagina
            },
            tecnologias: {
                servidor: servidor,
                lenguaje: lenguaje,
                frameworkFront: frameworkFront
            },
            metricas: {
                tiempoRespuestaMs: tiempoRespuestaMs,
                pesoDocumentoKb: pesoDocumentoKb,
                certSslVigente: certSslVigente
            }
        };
    } catch (error) {
        // Garantizamos que el proceso de Chrome no quede huérfano consumiendo RAM
        if (navegador) {
            await navegador.close();
        }
        
        // Distinguimos tipos de error para devolver mensajes específicos
        let mensajeError = 'Falla en la intercepción de datos. Objetivo inalcanzable.';
        
        if (error.message.includes('timeout')) {
            // El timeout de Puppeteer (waitUntil) se excedió
            mensajeError = '[TIMEOUT]: La página tardó demasiado en cargar (>30s). Servidor no responde.';
        } else if (error.message.includes('ERR_NAME_NOT_RESOLVED') || 
                   error.message.includes('getaddrinfo') ||
                   error.message.includes('ENOTFOUND')) {
            // Error de DNS / dominio no existe
            mensajeError = '[DNS]: Dominio inválido o no existe. Verifica la dirección.';
        } else if (error.message.includes('HTTP')) {
            // Error HTTP 4xx/5xx ya viene en el mensaje
            mensajeError = error.message;
        } else if (error.message.includes('ECONNREFUSED')) {
            // Conexión rechazada
            mensajeError = '[CONEXIÓN]: El servidor rechazó la conexión. Verifica que la URL es válida.';
        }
        
        // Disparamos la alerta de fallo hacia el servidor receptor deteniendo la ejecución
        throw new Error(mensajeError);
    }
}

// Exponemos la función de forma modular para que server.js pueda requerirla
module.exports = ejecutarExtraccion;
