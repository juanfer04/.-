// Orquestador principal de acceso, evaluaciones, cálculo y persistencia en IndexedDB (Fase 5)
import { openDatabase, isIndexedDBSupported } from "./db.js";
import {
  ingresarConDocumento,
  recuperarSesionActiva,
  cerrarSesion
} from "./auth.js";
import { crearControladorEvaluaciones } from "./evaluaciones.js";
import { calcularDefinitivaEvaluaciones } from "./calculadora.js";
import {
  guardarCalculoEnHistorial,
  obtenerHistorialPorDocumento,
  renderizarHistorial
} from "./historial.js";

document.addEventListener("DOMContentLoaded", async () => {
  const vistaAcceso = document.getElementById("vista-acceso");
  const vistaPanel = document.getElementById("vista-panel");
  const formAcceso = document.getElementById("form-acceso");
  const inputDocumento = document.getElementById("input-documento");
  const alertaAcceso = document.getElementById("alerta-acceso");
  const documentoActivoEl = document.getElementById("documento-activo");
  const btnCerrarSesion = document.getElementById("btn-cerrar-sesion");

  const formEvaluaciones = document.getElementById("form-evaluaciones");
  const alertaPanel = document.getElementById("alerta-panel");
  const seccionResultado = document.getElementById("seccion-resultado");
  const valorDefinitivaEl = document.getElementById("valor-definitiva");
  const estadoAcademicoEl = document.getElementById("estado-academico");
  const mensajeGuardadoEl = document.getElementById("mensaje-guardado");
  const contenedorHistorial = document.getElementById("contenedor-historial");
  const btnActualizarHistorial = document.getElementById("btn-actualizar-historial");

  let documentoActual = null;

  const controladorEvaluaciones = crearControladorEvaluaciones({
    inputCantidad: document.getElementById("input-cantidad-notas"),
    btnGenerar: document.getElementById("btn-generar"),
    contenedorFilas: document.getElementById("contenedor-evaluaciones"),
    porcentajeAcumuladoEl: document.getElementById("porcentaje-acumulado"),
    alertaPanel,
    btnCalcular: document.getElementById("btn-calcular")
  });

  function ocultarResultado() {
    seccionResultado.classList.add("oculto");
    valorDefinitivaEl.textContent = "0.00";
    estadoAcademicoEl.textContent = "-";
    estadoAcademicoEl.className = "";
    mensajeGuardadoEl.textContent = "";
  }

  async function cargarHistorialActual() {
    if (!documentoActual) {
      return;
    }

    try {
      const registros = await obtenerHistorialPorDocumento(documentoActual);
      renderizarHistorial(contenedorHistorial, registros);
    } catch (error) {
      contenedorHistorial.innerHTML = "";
      const errorEl = document.createElement("p");
      errorEl.className = "alerta";
      errorEl.textContent = "No fue posible cargar el historial.";
      contenedorHistorial.appendChild(errorEl);
    }
  }

  async function mostrarPanel(documento) {
    documentoActual = documento;
    documentoActivoEl.textContent = documento;
    vistaAcceso.classList.add("oculto");
    vistaPanel.classList.remove("oculto");
    alertaAcceso.textContent = "";
    ocultarResultado();
    await cargarHistorialActual();
  }

  function mostrarAcceso(mensaje = "") {
    documentoActual = null;
    controladorEvaluaciones.reiniciarPanel();
    ocultarResultado();
    contenedorHistorial.innerHTML = "";
    vistaPanel.classList.add("oculto");
    vistaAcceso.classList.remove("oculto");
    documentoActivoEl.textContent = "-";
    alertaAcceso.textContent = mensaje;
  }

  if (!isIndexedDBSupported()) {
    mostrarAcceso(
      "Este navegador no permite usar IndexedDB. Necesitas un navegador compatible para ingresar."
    );
    return;
  }

  try {
    await openDatabase();
    const docActivo = await recuperarSesionActiva();
    if (docActivo) {
      await mostrarPanel(docActivo);
    } else {
      mostrarAcceso();
    }
  } catch (error) {
    mostrarAcceso(
      "No fue posible iniciar la sesión. Verifica el navegador o intenta nuevamente."
    );
  }

  formAcceso.addEventListener("submit", async (event) => {
    event.preventDefault();
    const resultado = await ingresarConDocumento(inputDocumento.value);

    if (!resultado.ok) {
      alertaAcceso.textContent = resultado.message;
      return;
    }

    inputDocumento.value = "";
    await mostrarPanel(resultado.documento);
  });

  formEvaluaciones.addEventListener("submit", async (event) => {
    event.preventDefault();
    alertaPanel.textContent = "";

    const filasActuales = controladorEvaluaciones.obtenerEvaluaciones();
    const evaluacionCalculo = calcularDefinitivaEvaluaciones(filasActuales);

    if (!evaluacionCalculo.ok) {
      alertaPanel.textContent = evaluacionCalculo.message;
      return;
    }

    const { notas, porcentajes, definitivaExacta, definitivaMostrada, estado } =
      evaluacionCalculo.data;

    valorDefinitivaEl.textContent = definitivaMostrada;
    estadoAcademicoEl.textContent = estado;
    estadoAcademicoEl.className =
      estado === "Aprobado" ? "estado-aprobado" : "estado-reprobado";
    seccionResultado.classList.remove("oculto");
    mensajeGuardadoEl.textContent = "";

    if (!documentoActual) {
      mensajeGuardadoEl.textContent =
        "No fue posible guardar el resultado en el historial: no hay sesión activa.";
      return;
    }

    try {
      await guardarCalculoEnHistorial({
        documento: documentoActual,
        notas,
        porcentajes,
        definitiva: definitivaExacta,
        estado
      });
      mensajeGuardadoEl.textContent = "Resultado guardado en el historial.";
      await cargarHistorialActual();
    } catch (error) {
      mensajeGuardadoEl.textContent = "No fue posible guardar el resultado en el historial.";
    }
  });

  btnActualizarHistorial.addEventListener("click", async () => {
    await cargarHistorialActual();
  });

  btnCerrarSesion.addEventListener("click", async () => {
    await cerrarSesion();
    mostrarAcceso();
  });
});