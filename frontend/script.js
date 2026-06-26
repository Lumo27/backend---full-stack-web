// script.js  --  ARCHIVO EMISOR 2.0 - FRONTEND
const inputObjetivo = document.getElementById('target-url');
const botonEscaneo = document.getElementById('btn-scan');
const botonAbortar = document.getElementById('btn-abortar');
const panelVista = document.querySelector('#panel-vista .contenido-panel');
const panelTech = document.querySelector('#panel-tech .contenido-panel');
const panelEnlaces = document.querySelector('#panel-enlaces .contenido-panel'); // T8
const panelMetricas = document.querySelector('#panel-metricas .contenido-panel');

// Origen del backend: las capturas se piden a este server (T6).
const ORIGEN_BACKEND = 'http://localhost:3000';

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
            panelEnlaces.innerHTML = '';
            panelMetricas.innerHTML = '';
            return;
        }

        // Mensaje de éxito + pequeña pausa para el efecto secuencial
        panelVista.innerHTML = `<span style="color: var(--color-terminal)">[${datos.mensaje}]</span>`;
        await new Promise(resolve => setTimeout(resolve, 600));

        // PANEL 1 (VISTA): identidad estructural, con recorte para no desbordar
        const tituloRecortado = datos.identidad.titulo.length > 50 ? datos.identidad.titulo.substring(0, 47) + '...' : datos.identidad.titulo;
        const descripcionRecortada = datos.identidad.descripcion.length > 80 ? datos.identidad.descripcion.substring(0, 77) + '...' : datos.identidad.descripcion;
        // T6: si el robot devolvió una captura, la mostramos como evidencia visual.
        const bloqueCaptura = datos.identidad.captura
            ? `<img src="${ORIGEN_BACKEND}${datos.identidad.captura}" alt="Captura del objetivo" style="width: 100%; margin-top: 10px; border: 1px solid var(--color-terminal);">`
            : '';
        panelVista.innerHTML = `<ul style="list-style: none; padding: 0; margin: 0;"><li>TÍTULO: <span style="color: var(--color-terminal)">${tituloRecortado}</span></li><li style="margin-top: 5px;">DESCRIPCIÓN: <span style="color: var(--color-terminal)">${descripcionRecortada}</span></li></ul>${bloqueCaptura}`;
        await new Promise(resolve => setTimeout(resolve, 300));

        // PANEL 2 (TECH): tecnologías detectadas
        panelTech.innerHTML = `<ul style="list-style: none; padding: 0; margin: 0;"><li>SERVIDOR: <span style="color: var(--color-terminal)">${datos.tecnologias.servidor}</span></li><li>LENGUAJE: <span style="color: var(--color-terminal)">${datos.tecnologias.lenguaje}</span></li><li>FRONTEND: <span style="color: var(--color-terminal)">${datos.tecnologias.frameworkFront}</span></li></ul>`;
        await new Promise(resolve => setTimeout(resolve, 300));

        // PANEL 4 (MÉTRICAS): latencia, peso y estado SSL
        const estadoSsl = datos.metricas.certSslVigente ? "Seguro (Activo)" : "Vulnerable (Caído)";
        panelMetricas.innerHTML = `<ul style="list-style: none; padding: 0; margin: 0;"><li>LATENCIA: <span style="color: var(--color-terminal)">${datos.metricas.tiempoRespuestaMs}ms</span></li><li>PESO TOTAL: <span style="color: var(--color-terminal)">${datos.metricas.pesoDocumentoKb} KB</span></li><li>ESTADO SSL: <span style="color: var(--color-terminal)">${estadoSsl}</span></li><li>STATUS HTTP: <span style="color: var(--color-terminal)">${datos.metricas.statusHttp}</span></li><li>TLS: <span style="color: var(--color-terminal)">${datos.metricas.protocoloTls}</span></li><li>RECURSOS: <span style="color: var(--color-terminal)">${datos.metricas.conteos.imagenes} img / ${datos.metricas.conteos.scripts} scripts</span></li></ul>`;
        await new Promise(resolve => setTimeout(resolve, 300));

        // PANEL 3 (ENLACES): T8 · renderizamos la lista que trajo el robot.
        renderizarEnlaces(datos.enlaces);

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

// T8 · Pinta los enlaces en el Panel 3. Internos en verde, externos en ámbar.
// Cada link es clickeable y abre en una pestaña nueva.
function renderizarEnlaces(enlaces) {
    // Si no llegaron enlaces (o el robot no los trajo), avisamos y salimos.
    if (!enlaces || !enlaces.lista || enlaces.lista.length === 0) {
        panelEnlaces.innerHTML = '<span style="color: var(--color-alerta)">[SIN ENLACES DETECTADOS]</span>';
        return;
    }

    // Mostramos solo los primeros 5 para no saturar el panel (los totales siguen reales).
    const MAX_VISIBLES = 5;
    const visibles = enlaces.lista.slice(0, MAX_VISIBLES);

    // Resumen arriba: totales de internos y externos + cuántos estamos mostrando.
    const resumen = `<p style="margin-bottom: 8px;">TOTAL: ${enlaces.total} · INTERNOS: ${enlaces.internos} · EXTERNOS: ${enlaces.externos}<br><span style="color: var(--color-alerta)">(mostrando ${visibles.length} de ${enlaces.total})</span></p>`;

    // Un <li> por enlace. El color depende del tipo.
    const items = visibles.map((enlace) => {
        const color = enlace.tipo === 'interno' ? 'var(--color-terminal)' : 'var(--color-alerta)';
        const etiqueta = enlace.tipo === 'interno' ? 'INT' : 'EXT';
        return `<li style="margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
            <a href="${enlace.url}" target="_blank" rel="noopener" title="${enlace.url}" style="color: ${color}; text-decoration: none;">[${etiqueta}] ${enlace.texto}</a>
        </li>`;
    }).join('');

    panelEnlaces.innerHTML = resumen + `<ul style="list-style: none; padding: 0; margin: 0;">${items}</ul>`;
}
