// robot.js
// Importamos la librería de parseo rápido para estructurar el HTML estático en memoria
const cheerio = require('cheerio');
// Importamos el motor de automatización para controlar el navegador en segundo plano

const  puppeteer = require('puppeteer'); 
// Importamos el modulo nativo para crear carpetas y administrar archivos

const fs = require('fs');
// Importamos la utilidad para construir rutas compatibles con cualquier sistema operativo
const path = require('path');

// Tiempo máximo (ms) que esperamos a que un sitio cargue antes de abortar (T11)
// T16 · Configurable desde .env (TIMEOUT_MS), con 30000 por defecto
const TIEMPO_MAXIMO_MS = Number(process.env.TIMEOUT_MS) || 30000;

// T10 · Traduce el error técnico de Puppeteer/red a un mensaje claro según su tipo
function traducirError(error) {
    const msg = (error && error.message) ? error.message : '';
    // Timeout de navegación (sitio caído o demasiado lento)
    if ((error && error.name === 'TimeoutError') || /timeout/i.test(msg)) {
        return 'El sitio tardó demasiado en responder (timeout). Puede estar caído o muy lento.';
    }
    // Dominio inexistente / fallo de DNS
    if (/ERR_NAME_NOT_RESOLVED|ENOTFOUND|getaddrinfo/i.test(msg)) {
        return 'No se pudo resolver el dominio. Verificá que la dirección exista.';
    }
    // Respuesta HTTP con código de error, marcada desde el flujo principal
    const httpMatch = msg.match(/^HTTP_STATUS_(\d{3})$/);
    if (httpMatch) {
        return `El sitio respondió con un código de error HTTP ${httpMatch[1]}.`;
    }
    // Conexión rechazada o caída
    if (/ERR_CONNECTION_REFUSED|ECONNREFUSED|ERR_CONNECTION|ERR_ABORTED|net::/i.test(msg)) {
        return 'No se pudo establecer conexión con el sitio (conexión rechazada o caída).';
    }
    // Cualquier otro caso no contemplado
    return 'No se pudo completar el análisis del objetivo.';
}

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
        // Navegamos esperando a que el tráfico de red se estabilice, con corte por timeout (T11)
        const respuestaRed = await pagina.goto(urlObjetivo, { waitUntil: 'networkidle2', timeout: TIEMPO_MAXIMO_MS });
        // T10 · Si el sitio respondió con un código de error (4xx/5xx), lo tratamos como fallo
        if (respuestaRed && respuestaRed.status() >= 400) {
            throw new Error(`HTTP_STATUS_${respuestaRed.status()}`);
        }
        // Definimos la ruta donde se almacenaran las capturas generadas por el robot
        const carpetaCapturas = path.join(__dirname, 'capturas');
        // Verificamos si el directorio de capturas existe, si no, lo creamos automaticamente
        if (!fs.existsSync(carpetaCapturas)) {
            fs.mkdirSync(carpetaCapturas);
        } 
        // Generamos un nombre único utilizando el dominio del sitio y la fecha actual
        const dominio = new URL(urlObjetivo).hostname.replace(/\./g, '_');
        const nombreCaptura = `${dominio}_${Date.now()}.png`;
        // Construimos la ruta completa donde se almacenara la captura
        const rutaCaptura = path.join(carpetaCapturas, nombreCaptura);
        // Capturamos una imagen completa del sitio para conservar una evidencia visual del análisis
        await pagina.screenshot({
            path: rutaCaptura,
            fullPage: true
        });            
        
        // Extraemos la fotografía estática del DOM ya renderizado por el motor V8
        const codigoHtml = await pagina.content();
        // Calculamos el tiempo total del proceso de carga en milisegundos
        const tiempoRespuestaMs = Date.now() - tiempoInicio;
        // Interceptamos los detalles de seguridad de la conexión una sola vez
        const detallesSeguridad = respuestaRed.securityDetails();
        // Verificamos si la conexión HTTPS es válida
        const certSslVigente = detallesSeguridad !== null;
        // T13 · Código HTTP con el que respondió el servidor (200, 301, etc.)
        const statusHttp = respuestaRed.status();
        // T13 · Versión del protocolo TLS (ej. "TLS 1.3"); null si el sitio no usa HTTPS
        const protocoloTls = detallesSeguridad ? detallesSeguridad.protocol() : null;
        // Medimos el peso del documento HTML capturado en kilobytes
        const pesoDocumentoKb = (Buffer.byteLength(codigoHtml, 'utf8') / 1024).toFixed(2);

        // Montamos el código HTML plano en la memoria del servidor (función de consulta de Cheerio)
        const $ = cheerio.load(codigoHtml);
        // T13 · Contamos elementos clave del documento con Cheerio
        const conteos = {
            imagenes: $('img').length,
            scripts: $('script').length,
            enlaces: $('a').length
        };
        // Rastreamos y limpiamos la etiqueta de título de la cabecera
        const tituloPagina = $('title').text().trim() || 'Sin título';
        // Aislamos el atributo content del metadato de descripción
        const descripcionPagina = $('meta[name="description"]').attr('content') || 'Sin descripción';


        // PANEL 3
        
        // Extraemos el dominio base de la URL para identificar el host principal
        const dominioBase = new URL(urlObjetivo).hostname;

        //Creamos un conjunto para almacenar los enlaces únicos procesados
        const enlacesProcesados = new Set();

        // Array final para devolver al frontend, que contendrá objetos con la información de cada enlace
        const enlaces = [];

        $('a[href]').each((index, elemento) => {
            try {
                // Leemos el href original
                const href = ($(elemento).attr('href') || '').trim();
                if (
                    !href || 
                    href.startsWith('#') ||
                    href.startsWith('mailto:') ||
                    href.startsWith('tel:') ||
                    href.startsWith('javascript:')
                ) {
                    return; // Ignoramos enlaces vacíos, anclas, correos, teléfonos y scripts
                }
                const urlAbsoluta = 
                    new URL(href, urlObjetivo).href;
                
                if (enlacesProcesados.has(urlAbsoluta)) {
                    return; // Ignoramos enlaces duplicados
                }
                enlacesProcesados.add(urlAbsoluta); // Marcamos el enlace como procesado
                const dominiolink =
                    new URL(urlAbsoluta).hostname;

                const tipo =
                    dominiolink === dominioBase ? 'interno' : 'externo';
                
                const textoVisible = $(elemento).text().replace(/\s+/g, ' ').trim() || 'Sin texto visible';
                
                enlaces.push({
                    url: urlAbsoluta,
                    tipo: tipo,
                    texto: textoVisible
                });
            } catch (error) {
                console.error(`Error al procesar el enlace: ${error.message}`);
            }
        });

        // 
        // MAPEO DE RUTAS INTERNAS (Épica F) 
        //
        const enlacesInternos = enlaces.filter(enlace => enlace.tipo === 'interno').slice(0, 5); // Limitamos a los primeros 5 enlaces internos

        const rutasInternas = [];

        for (const enlace of enlacesInternos) {
            const paginaInterna = await navegador.newPage();
            try {
                await paginaInterna.goto(enlace.url, { waitUntil: 'networkidle2', timeout: 15000 });
                const htmlInterno = await paginaInterna.content();
                const $$ = cheerio.load(htmlInterno);

                rutasInternas.push({
                    url: enlace.url,
                    titulo: $$('title').text().trim() || 'Sin título',
                    descripcion: $$('meta[name="description"]').attr('content') || 'Sin descripción'
                });
            } catch (error) {
                console.error(`Error al procesar la ruta interna ${enlace.url}: ${error.message}`);
            } finally {
                await paginaInterna.close();
            }
        }

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

        // T12 · Detección de tecnologías extra buscando sus firmas en el HTML
        const tecnologiasExtras = [];
        const detectar = (nombre, condicion) => { if (condicion) tecnologiasExtras.push(nombre); };
        detectar('jQuery', $('script[src*="jquery"]').length > 0);
        detectar('Bootstrap', $('link[href*="bootstrap"], script[src*="bootstrap"]').length > 0);
        detectar('Tailwind CSS', $('link[href*="tailwind"], script[src*="tailwind"]').length > 0);
        detectar('Font Awesome', $('link[href*="font-awesome"], link[href*="fontawesome"]').length > 0 || $('[class*="fa-"]').length > 0);
        detectar('Google Analytics', /google-analytics\.com|googletagmanager\.com|gtag\(/i.test(codigoHtml));
        detectar('Google Fonts', $('link[href*="fonts.googleapis.com"]').length > 0);

        // Ensamblamos y retornamos el objeto JSON con las tres capas de datos tácticos
        return {
            identidad: {
                titulo: tituloPagina,
                descripcion: descripcionPagina,
                // Incorporamos la ruta de la captura para que el frontend pueda visualizarla
                captura: `/capturas/${nombreCaptura}`
            },
            tecnologias: {
                servidor: servidor,
                lenguaje: lenguaje,
                frameworkFront: frameworkFront,
                // T12 · Lista de tecnologías extra detectadas (jQuery, Bootstrap, GA, etc.)
                extras: tecnologiasExtras
            },
            metricas: {
                tiempoRespuestaMs: tiempoRespuestaMs,
                pesoDocumentoKb: pesoDocumentoKb,
                certSslVigente: certSslVigente,
                // T13 · Métricas extra para el Panel 4
                statusHttp: statusHttp,
                protocoloTls: protocoloTls,
                conteos: conteos
            },
        // =====================================================
        // === ENLACES (T8) ====================================
        // Contrato N°1
        // =====================================================
            enlaces: {
                total: enlaces.length,
                internos: enlaces.filter(enlace => enlace.tipo === 'interno').length,
                externos: enlaces.filter(enlace => enlace.tipo === 'externo').length,
                lista: enlaces
            },
        // =====================================================
        // === MAPEO DE RUTAS INTERNAS (T14 · Épica F) =========
        // =====================================================
            rutasInternas: {
                total: rutasInternas.length,
                lista: rutasInternas
            }
        };
    } catch (error) {
        // T10 · Relanzamos con un mensaje específico según el tipo de fallo (lo logueará server.js · T4)
        throw new Error(traducirError(error));
    } finally {
        // T11 · Cerramos Chrome SIEMPRE (éxito o error) para no dejar procesos zombies
        if (navegador) {
            await navegador.close();
        }
    }
}

// Exponemos la función de forma modular para que server.js pueda requerirla
module.exports = ejecutarExtraccion;
