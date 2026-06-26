// robot.js  (Subproyecto 3 · El AGENTE DE CAMPO)
// Es el único que realmente "entra" al sitio web. server.js le delega la URL y el
// robot devuelve un objeto con todos los datos tácticos. NO usa Express ni red:
// es una función normal de JavaScript que server.js llama y espera (await).
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Carpeta donde el robot deja las capturas (T5). La creamos UNA vez al arrancar.
const CARPETA_CAPTURAS = path.join(__dirname, 'capturas');
if (!fs.existsSync(CARPETA_CAPTURAS)) {
    fs.mkdirSync(CARPETA_CAPTURAS, { recursive: true });
}

// Lee el timeout y la profundidad desde el entorno (.env), con valores por defecto (T16).
const TIMEOUT_MS = Number(process.env.TIMEOUT_NAVEGACION_MS) || 30000;
const PROFUNDIDAD_MAX = Number(process.env.PROFUNDIDAD_MAX) || 3;

// =====================================================================
// FUNCIÓN PRINCIPAL — la que server.js requiere y ejecuta.
// El segundo parámetro 'profundizar' evita recursión infinita en T14:
// la página principal profundiza; las internas NO vuelven a profundizar.
// =====================================================================
async function ejecutarExtraccion(urlObjetivo, profundizar = true) {
    let navegador;
    try {
        // Lanzamos Chrome headless (sin ventana) para máximo rendimiento.
        navegador = await puppeteer.launch({ headless: 'shell' });
        const pagina = await navegador.newPage();

        // --- NAVEGACIÓN + MÉTRICAS DE RED ---
        const tiempoInicio = Date.now();
        // T11: timeout configurable. Si el sitio no carga en TIMEOUT_MS, corta.
        const respuestaRed = await pagina.goto(urlObjetivo, {
            waitUntil: 'networkidle2',
            timeout: TIMEOUT_MS
        });
        const tiempoRespuestaMs = Date.now() - tiempoInicio;

        // Fotografía del DOM ya renderizado para parsear con Cheerio.
        const codigoHtml = await pagina.content();
        const pesoDocumentoKb = (Buffer.byteLength(codigoHtml, 'utf8') / 1024).toFixed(2);

        // Detalles de seguridad de la conexión (puede ser null en http://).
        const detallesSsl = respuestaRed.securityDetails();
        const certSslVigente = detallesSsl !== null;
        const protocoloTls = detallesSsl ? detallesSsl.protocol() : 'No disponible'; // T13
        const statusHttp = respuestaRed.status(); // T13

        // --- CAPTURA DE PANTALLA (T5) ---
        const nombreCaptura = generarNombreCaptura(urlObjetivo);
        await pagina.screenshot({ path: path.join(CARPETA_CAPTURAS, nombreCaptura), fullPage: true });
        // Guardamos la RUTA WEB (no la del disco): así el front la pide al server (T6).
        const rutaCaptura = `/capturas/${nombreCaptura}`;

        // --- PARSEO DEL HTML CON CHEERIO ---
        const $ = cheerio.load(codigoHtml);
        const tituloPagina = $('title').text().trim() || 'Sin título';
        const descripcionPagina = $('meta[name="description"]').attr('content') || 'Sin descripción';

        // Detección de framework por nodos característicos.
        let frameworkFront = 'Desconocido';
        if ($('[data-reactroot], #root').length > 0) frameworkFront = 'React';
        else if ($('[data-v-app], #app').length > 0) frameworkFront = 'Vue';
        else if ($('[ng-version], ng-app').length > 0) frameworkFront = 'Angular';

        // Detección de CMS/lenguaje vía el metadato generator.
        let lenguaje = 'HTML Estático / Desconocido';
        if ($('meta[name="generator"]').attr('content')?.toLowerCase().includes('wordpress')) {
            lenguaje = 'PHP (WordPress)';
        }

        const servidor = respuestaRed.headers()['server'] || 'Oculto';
        const extras = detectarTecnologiasExtra($); // T12

        // --- ENLACES (T7) ---
        const enlaces = extraerEnlaces($, urlObjetivo);

        // --- CONTEOS EXTRA PARA EL PANEL 4 (T13) ---
        const conteos = {
            imagenes: $('img').length,
            scripts: $('script').length,
            enlaces: enlaces.total
        };

        // --- MAPEO DE RUTAS INTERNAS (T14) ---
        // Solo en la página principal. Visita algunos enlaces internos y trae datos básicos.
        let rutasInternas = [];
        if (profundizar) {
            rutasInternas = await analizarRutasInternas(navegador, enlaces.lista, urlObjetivo);
        }

        // Ensamblamos el objeto de datos (Contrato N°1).
        return {
            identidad: {
                titulo: tituloPagina,
                descripcion: descripcionPagina,
                captura: rutaCaptura // NUEVO (T6)
            },
            tecnologias: {
                servidor: servidor,
                lenguaje: lenguaje,
                frameworkFront: frameworkFront,
                extras: extras // NUEVO (T12)
            },
            enlaces: enlaces, // NUEVO (T8)
            metricas: {
                tiempoRespuestaMs: tiempoRespuestaMs,
                pesoDocumentoKb: pesoDocumentoKb,
                certSslVigente: certSslVigente,
                statusHttp: statusHttp,       // NUEVO (T13)
                conteos: conteos,             // NUEVO (T13)
                protocoloTls: protocoloTls    // NUEVO (T13)
            },
            rutasInternas: rutasInternas // NUEVO (T14)
        };
    } catch (error) {
        // T10: traducimos el error técnico a un mensaje claro antes de relanzarlo.
        throw traducirError(error);
    } finally {
        // T11: cierre GARANTIZADO. Pase lo que pase (éxito o error), cerramos Chrome
        // para no dejar procesos huérfanos comiendo RAM.
        if (navegador) {
            await navegador.close();
        }
    }
}

// =====================================================================
// AYUDANTES (cada uno hace UNA cosa, para que se lea fácil)
// =====================================================================

// T7 · Extrae los <a href>, resuelve relativas a absolutas, descarta duplicados
// y no-navegables, y clasifica interno vs externo.
function extraerEnlaces($, urlObjetivo) {
    const base = new URL(urlObjetivo);
    const yaVistos = new Set(); // para descartar duplicados
    const lista = [];
    let internos = 0;
    let externos = 0;

    $('a[href]').each((_, elemento) => {
        const href = ($(elemento).attr('href') || '').trim();
        // Descartamos anclas, mails, teléfonos y javascript: (no son navegación real).
        if (!href || href.startsWith('#') || href.startsWith('mailto:') ||
            href.startsWith('tel:') || href.startsWith('javascript:')) {
            return;
        }

        // Resolvemos la URL relativa a absoluta usando el objetivo como base.
        let urlAbsoluta;
        try {
            urlAbsoluta = new URL(href, base).href;
        } catch {
            return; // href roto: lo ignoramos
        }

        if (yaVistos.has(urlAbsoluta)) return; // duplicado
        yaVistos.add(urlAbsoluta);

        // Mismo dominio = interno; otro dominio = externo.
        const tipo = new URL(urlAbsoluta).hostname === base.hostname ? 'interno' : 'externo';
        if (tipo === 'interno') internos++; else externos++;

        // Texto visible del link, limpio y recortado.
        const texto = ($(elemento).text().trim().replace(/\s+/g, ' ') || '(sin texto)').slice(0, 80);
        lista.push({ url: urlAbsoluta, texto: texto, tipo: tipo });
    });

    return { total: lista.length, internos, externos, lista };
}

// T12 · Busca firmas de herramientas comunes en el HTML y arma el array de extras.
function detectarTecnologiasExtra($) {
    const html = $.html().toLowerCase();
    const extras = [];
    if ($('script[src*="jquery"]').length > 0 || html.includes('jquery')) extras.push('jQuery');
    if (html.includes('bootstrap')) extras.push('Bootstrap');
    if (html.includes('googletagmanager') || html.includes('google-analytics') || html.includes('gtag(')) extras.push('Google Analytics');
    if (html.includes('wp-content') || html.includes('wp-includes')) extras.push('WordPress');
    if (html.includes('tailwind')) extras.push('Tailwind CSS');
    return extras;
}

// T5 · Arma un nombre de archivo único para la captura: dominio + fecha-hora.
function generarNombreCaptura(urlObjetivo) {
    let host;
    try {
        host = new URL(urlObjetivo).hostname;
    } catch {
        host = 'objetivo';
    }
    const sello = new Date().toISOString().replace(/[:.]/g, '-'); // sin caracteres inválidos
    return `${host}_${sello}.png`;
}

// T10 · Traduce el error técnico de Puppeteer a un mensaje entendible.
function traducirError(error) {
    const mensaje = error.message || '';
    if (error.name === 'TimeoutError' || mensaje.includes('timeout')) {
        return new Error('El objetivo tardó demasiado en responder (timeout agotado).');
    }
    if (mensaje.includes('ERR_NAME_NOT_RESOLVED') || mensaje.includes('getaddrinfo')) {
        return new Error('El dominio no existe o no se pudo resolver (DNS).');
    }
    if (mensaje.includes('ERR_CONNECTION_REFUSED')) {
        return new Error('El objetivo rechazó la conexión.');
    }
    return new Error('Falla en la intercepción de datos. Objetivo inalcanzable.');
}

// T14 · Visita los primeros enlaces internos y trae datos básicos de cada uno.
// Abre una pestaña por enlace y la cierra siempre (try/finally), aunque falle.
async function analizarRutasInternas(navegador, listaEnlaces, urlObjetivo) {
    const internos = listaEnlaces
        .filter((e) => e.tipo === 'interno' && e.url !== urlObjetivo)
        .slice(0, PROFUNDIDAD_MAX); // solo los primeros N, para no eternizarse

    const resultados = [];
    for (const enlace of internos) {
        let subPagina;
        try {
            subPagina = await navegador.newPage();
            const resp = await subPagina.goto(enlace.url, {
                waitUntil: 'domcontentloaded',
                timeout: TIMEOUT_MS
            });
            const $ = cheerio.load(await subPagina.content());
            resultados.push({
                url: enlace.url,
                titulo: $('title').text().trim() || 'Sin título',
                statusHttp: resp ? resp.status() : 0
            });
        } catch {
            resultados.push({ url: enlace.url, titulo: '(no se pudo cargar)', statusHttp: 0 });
        } finally {
            if (subPagina) await subPagina.close(); // cerramos la pestaña siempre
        }
    }
    return resultados;
}

// Exponemos solo la función principal (lo demás es interno del robot).
module.exports = ejecutarExtraccion;
