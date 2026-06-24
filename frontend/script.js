// script.js  --  ARCHIVO EMISOR 2.0 - FRONTEND
const inputObjetivo = document.getElementById('target-url');
const botonEscaneo = document.getElementById('btn-scan');
const botonAbortar = document.getElementById('btn-abortar');
const panelVista = document.querySelector('#panel-vista .contenido-panel');
const panelTech = document.querySelector('#panel-tech .contenido-panel');
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

        // PANEL 1 (VISTA): identidad estructural, con recorte para no desbordar
        const tituloRecortado = datos.identidad.titulo.length > 50 ? datos.identidad.titulo.substring(0, 47) + '...' : datos.identidad.titulo;
        const descripcionRecortada = datos.identidad.descripcion.length > 80 ? datos.identidad.descripcion.substring(0, 77) + '...' : datos.identidad.descripcion;
        panelVista.innerHTML = `<ul style="list-style: none; padding: 0; margin: 0;"><li>TÍTULO: <span style="color: var(--color-terminal)">${tituloRecortado}</span></li><li style="margin-top: 5px;">DESCRIPCIÓN: <span style="color: var(--color-terminal)">${descripcionRecortada}</span></li></ul>`;
        await new Promise(resolve => setTimeout(resolve, 300));

        // PANEL 2 (TECH): tecnologías detectadas
        panelTech.innerHTML = `<ul style="list-style: none; padding: 0; margin: 0;"><li>SERVIDOR: <span style="color: var(--color-terminal)">${datos.tecnologias.servidor}</span></li><li>LENGUAJE: <span style="color: var(--color-terminal)">${datos.tecnologias.lenguaje}</span></li><li>FRONTEND: <span style="color: var(--color-terminal)">${datos.tecnologias.frameworkFront}</span></li></ul>`;
        await new Promise(resolve => setTimeout(resolve, 300));

        // PANEL 4 (MÉTRICAS): latencia, peso y estado SSL
        const estadoSsl = datos.metricas.certSslVigente ? "Seguro (Activo)" : "Vulnerable (Caído)";
        panelMetricas.innerHTML = `<ul style="list-style: none; padding: 0; margin: 0;"><li>LATENCIA: <span style="color: var(--color-terminal)">${datos.metricas.tiempoRespuestaMs}ms</span></li><li>PESO TOTAL: <span style="color: var(--color-terminal)">${datos.metricas.pesoDocumentoKb} KB</span></li><li>ESTADO SSL: <span style="color: var(--color-terminal)">${estadoSsl}</span></li></ul>`;

    } catch (error) {
        if (error.name === 'AbortError') {
            panelVista.innerHTML = `<span style="color: var(--color-alerta)">[OPERACIÓN CANCELADA POR EL OPERADOR]</span>`;
        } else {
            panelVista.innerHTML = `<span style="color: var(--color-alerta)">[FALLO DE CONEXIÓN CON BÚNKER CENTRAL]</span>`;
            console.error(error);
        }
        panelTech.innerHTML = '';
        panelMetricas.innerHTML = '';
    }
}
