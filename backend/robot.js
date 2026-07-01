// robot.js
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');

async function ejecutarExtraccion(urlObjetivo) {
    let navegador;
    try {
        navegador = await puppeteer.launch({ headless: 'shell' });
        const pagina = await navegador.newPage();
        const tiempoInicio = Date.now();
        const respuestaRed = await pagina.goto(urlObjetivo, { waitUntil: 'networkidle2' });
        const codigoHtml = await pagina.content();
        const tiempoRespuestaMs = Date.now() - tiempoInicio;
        
        const detallesSsl = respuestaRed.securityDetails();
        const certSslVigente = detallesSsl !== null;
        const statusHttp = respuestaRed.status();
        const protocoloTls = detallesSsl ? detallesSsl.protocol() : 'No disponible';

        const pesoDocumentoKb = (Buffer.byteLength(codigoHtml, 'utf8') / 1024).toFixed(2);
        const $ = cheerio.load(codigoHtml);
        const tituloPagina = $('title').text().trim() || 'Sin título';
        const descripcionPagina = $('meta[name="description"]').attr('content') || 'Sin descripción';

        let frameworkFront = 'Desconocido';
        if ($('[data-reactroot], #root').length > 0) frameworkFront = 'React';
        else if ($('[data-v-app], #app').length > 0) frameworkFront = 'Vue';
        else if ($('[ng-version], ng-app').length > 0) frameworkFront = 'Angular';

        let lenguaje = 'HTML Estático / Desconocido';
        if ($('meta[name="generator"]').attr('content')?.toLowerCase().includes('wordpress')) {
            lenguaje = 'PHP (WordPress)';
        }

        const servidor = respuestaRed.headers()['server'] || 'Oculto';

        // Lógica T12: Análisis de firmas mediante selectores indexados
        const extras = [];
        if ($('script[src*="jquery"]').length > 0) extras.push('jQuery');
        if ($('link[href*="bootstrap"]').length > 0) extras.push('Bootstrap');
        if ($('script[src*="gtm"], script[src*="google-analytics"]').length > 0) extras.push('Google Analytics');

        // Lógica T13: Recuento de activos
        const conteos = {
            imagenes: $('img').length,
            scripts: $('script').length
        };

        await navegador.close();

        return {
            identidad: {
                titulo: tituloPagina,
                descripcion: descripcionPagina
            },
            tecnologias: {
                servidor: servidor,
                lenguaje: lenguaje,
                frameworkFront: frameworkFront,
                extras: extras
            },
            metricas: {
                tiempoRespuestaMs: tiempoRespuestaMs,
                pesoDocumentoKb: pesoDocumentoKb,
                certSslVigente: certSslVigente,
                statusHttp: statusHttp,
                protocoloTls: protocoloTls,
                conteos: conteos
            }
        };
    } catch (error) {
        if (navegador) {
            await navegador.close();
        }
        throw new Error('Falla en la intercepción de datos. Objetivo inalcanzable.');
    }
}

module.exports = ejecutarExtraccion;
