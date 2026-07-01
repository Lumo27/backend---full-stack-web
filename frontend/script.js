// script.js  --  ARCHIVO EMISOR 2.0 - FRONTEND
const inputObjetivo = document.getElementById('target-url');
const botonEscaneo = document.getElementById('btn-scan');
const botonAbortar = document.getElementById('btn-abortar');
const panelVista = document.querySelector('#panel-vista .contenido-panel');
const panelTech = document.querySelector('#panel-tech .contenido-panel');
const panelEnlaces = document.querySelector('#panel-enlaces .contenido-panel');
const panelMetricas = document.querySelector('#panel-metricas .contenido-panel');

let controladorPeticion;

botonEscaneo.addEventListener('click', iniciarOperacion);

botonAbortar.addEventListener('click', () => {
    if (controladorPeticion) {
        controladorPeticion.abort();
    }
});

async function iniciarOperacion() {
    // Si había una operación en curso, la abortamos antes de lanzar otra
    if (controladorPeticion) {
        controladorPeticion.abort();
    }

    let urlIngresada = inputObjetivo.value.trim();

    // Normalización: si no trae protocolo, le anteponemos https://
    if (!urlIngresada.startsWith('http://') && !urlIngresada.startsWith('https://')) {
        urlIngresada = 'https://' + urlIngresada;
    }

    // Validación de formato con el constructor nativo URL
    try {
        new URL(urlIngresada);
    } catch (error) {
        panelVista.innerHTML = `<article role="alert" style="background: var(--color-alerta); color: #000000; padding: 15px; text-align: center; cursor: pointer;"><header><strong>[ERROR: FORMATO DE URL INVÁLIDO]</strong></header><p style="margin: 8px 0 0 0; font-weight: bold;">(Hacé clic en este cartel para limpiar y reintentar)</p></article>`;
        panelTech.innerHTML = '';
        panelEnlaces.innerHTML = '';
        panelMetricas.innerHTML = '';
        panelVista.querySelector('article').addEventListener('click', () => {
            panelVista.innerHTML = '';
            inputObjetivo.value = '';
            inputObjetivo.focus();
        });
        return;
    }

    // Feedback visual de carga
    panelVista.innerHTML = `<span style="color: var(--color-terminal)">[CONECTANDO SONDAS...]</span>`;
    panelTech.innerHTML = '';
    panelEnlaces.innerHTML = '';
    panelMetricas.innerHTML = '';

    controladorPeticion = new AbortController();

    try {
        const respuesta = await fetch('http://localhost:3000/api/escanear', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: urlIngresada }),
            signal: controladorPeticion.signal
        });

        const datos = await respuesta.json();

        // Si el servidor devolvió un error (status != 2xx)
        if (!respuesta.ok) {
            panelVista.innerHTML = `<span style="color: var(--color-alerta)">[ERROR: ${datos.error}]</span>`;
            panelTech.innerHTML = '';
            panelMetricas.innerHTML = '';
            return;
        }

        // Mensaje de éxito + pequeña pausa para el efecto secuencial
        panelVista.innerHTML = `<span style="color: var(--color-terminal)">[${datos.mensaje}]</span>`;
        await new Promise(resolve => setTimeout(resolve, 600));

        // PANEL 1 (VISTA): captura enmarcada + QR del host + identidad (híbrido)
        const tituloRecortado = datos.identidad.titulo.length > 60 ? datos.identidad.titulo.substring(0, 57) + '...' : datos.identidad.titulo;
        const descripcionRecortada = datos.identidad.descripcion.length > 90 ? datos.identidad.descripcion.substring(0, 87) + '...' : datos.identidad.descripcion;
        const urlCaptura = datos.identidad.captura ? `http://localhost:3000${datos.identidad.captura}` : '';
        const capturaHtml = urlCaptura ? `<div class="marco-captura"><a href="${urlCaptura}" target="_blank"><img src="${urlCaptura}" alt="Captura del sitio"></a></div>` : '';
        // QR de la URL escaneada (API pública, tematizado en verde) — se abre el sitio desde el celu
        const apiQR = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(urlIngresada)}&color=00ff41&bgcolor=0d0d0d`;
        panelVista.innerHTML = `${capturaHtml}<div class="fila-identidad"><div class="qr-host"><img src="${apiQR}" alt="QR del host" title="Escaneá para abrir el sitio en el celular"></div><ul class="datos-identidad"><li>TÍTULO: <span style="color: var(--color-terminal)">${tituloRecortado}</span></li><li style="margin-top: 5px;">DESCRIPCIÓN: <span style="color: var(--color-terminal)">${descripcionRecortada}</span></li></ul></div>`;
        await new Promise(resolve => setTimeout(resolve, 300));

        // PANEL 2 (TECH): tecnologías detectadas + extras (T12)
        const extras = (datos.tecnologias.extras && datos.tecnologias.extras.length) ? datos.tecnologias.extras.join(', ') : 'Ninguna';
        panelTech.innerHTML = `<ul style="list-style: none; padding: 0; margin: 0;"><li>SERVIDOR: <span style="color: var(--color-terminal)">${datos.tecnologias.servidor}</span></li><li>LENGUAJE: <span style="color: var(--color-terminal)">${datos.tecnologias.lenguaje}</span></li><li>FRONTEND: <span style="color: var(--color-terminal)">${datos.tecnologias.frameworkFront}</span></li><li>EXTRAS: <span style="color: var(--color-terminal)">${extras}</span></li></ul>`;
        await new Promise(resolve => setTimeout(resolve, 300));

        // PANEL 3 (ENLACES): lista clickeable, verde = interno / ámbar = externo (T8)
        const enlaces = datos.enlaces;
        if (enlaces && enlaces.total > 0) {
            const itemsHtml = enlaces.lista.map(e => {
                const color = e.tipo === 'interno' ? 'var(--color-terminal)' : 'var(--color-alerta)';
                const etiqueta = e.tipo === 'interno' ? 'INT' : 'EXT';
                const texto = e.texto.length > 32 ? e.texto.substring(0, 29) + '...' : e.texto;
                return `<li style="margin-bottom: 4px;"><a href="${e.url}" target="_blank" title="${e.url}" style="color: ${color}; text-decoration: none;">[${etiqueta}] ${texto}</a></li>`;
            }).join('');
            panelEnlaces.innerHTML = `<div>TOTAL: <span style="color: var(--color-terminal)">${enlaces.total}</span> (INT: ${enlaces.internos} / EXT: ${enlaces.externos})</div><ul style="list-style: none; padding: 0; margin: 8px 0 0 0;">${itemsHtml}</ul>`;
        } else {
            panelEnlaces.innerHTML = `<span style="color: var(--color-terminal)">Sin enlaces detectados.</span>`;
        }
        await new Promise(resolve => setTimeout(resolve, 300));

        // PANEL 4 (MÉTRICAS): latencia, peso, SSL + métricas extra (T13)
        const estadoSsl = datos.metricas.certSslVigente ? "Seguro (Activo)" : "Vulnerable (Caído)";
        const c = datos.metricas.conteos || { imagenes: 0, scripts: 0, enlaces: 0 };
        panelMetricas.innerHTML = `<ul style="list-style: none; padding: 0; margin: 0;"><li>LATENCIA: <span style="color: var(--color-terminal)">${datos.metricas.tiempoRespuestaMs}ms</span></li><li>PESO TOTAL: <span style="color: var(--color-terminal)">${datos.metricas.pesoDocumentoKb} KB</span></li><li>ESTADO SSL: <span style="color: var(--color-terminal)">${estadoSsl}</span></li><li>HTTP / TLS: <span style="color: var(--color-terminal)">${datos.metricas.statusHttp} / ${datos.metricas.protocoloTls || 'N/A'}</span></li><li>ELEMENTOS: <span style="color: var(--color-terminal)">${c.imagenes} img · ${c.scripts} scripts · ${c.enlaces} links</span></li></ul>`;

    } catch (error) {
        if (error.name === 'AbortError') {
            panelVista.innerHTML = `<span style="color: var(--color-alerta)">[OPERACIÓN CANCELADA POR EL OPERADOR]</span>`;
        } else {
            panelVista.innerHTML = `<span style="color: var(--color-alerta)">[FALLO DE CONEXIÓN CON BÚNKER CENTRAL]</span>`;
            console.error(error);
        }
        panelTech.innerHTML = '';
        panelEnlaces.innerHTML = '';
        panelMetricas.innerHTML = '';
    }
}
