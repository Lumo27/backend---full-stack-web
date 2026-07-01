// robot.js
// Importamos la librería de parseo rápido para estructurar el HTML estático en memoria
const cheerio = require('cheerio');
// Importamos el motor de automatización para controlar el navegador en segundo plano

const  puppeteer = require('puppeteer'); 
// Importamos el modulo nativo para crear carpetas y administrar archivos

const fs = require('fs');
// Importamos la utilidad para construir rutas compatibles con cualquier sistema operativo
const path = require('path');

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
        const respuestaRed = await pagina.goto(urlObjetivo, { waitUntil: 'networkidle2' });
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

        // Apagamos la instancia de Chrome para liberar la memoria RAM del equipo
        await navegador.close();

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
                frameworkFront: frameworkFront
            },
            metricas: {
                tiempoRespuestaMs: tiempoRespuestaMs,
                pesoDocumentoKb: pesoDocumentoKb,
                certSslVigente: certSslVigente
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
        };    } catch (error) {
        // Garantizamos que el proceso de Chrome no quede huérfano consumiendo RAM
        if (navegador) {
            await navegador.close();
        }
        // Disparamos la alerta de fallo hacia el servidor receptor deteniendo la ejecución
        throw new Error('Falla en la intercepción de datos. Objetivo inalcanzable.');
    }
}

// Exponemos la función de forma modular para que server.js pueda requerirla
module.exports = ejecutarExtraccion;
