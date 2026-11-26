// Gestión en memoria de evaluaciones, generación dinámica de filas y porcentaje acumulado (HU-2)

const MAX_NOTAS = 20;

/**
 * Valida y normaliza la cantidad de notas ingresada.
 * Acepta enteros entre 1 y 20 (incluyendo valores como "1.0" -> 1).
 * Rechaza vacíos, 0, negativos, decimales no enteros, texto o valores mayores a 20.
 * @param {string|number} rawCantidad
 * @returns {{ valid: boolean, cantidad?: number, message?: string }}
 */
export function validarCantidadNotas(rawCantidad) {
  const texto = String(rawCantidad ?? "").trim();

  if (!texto) {
    return {
      valid: false,
      message: "Ingresa un número entero entre 1 y 20 para generar las filas."
    };
  }

  // Solo permite formato numérico estándar (entero o decimal exacto como 1.0)
  if (!/^[+-]?(\d+(\.\d+)?|\.\d+)$/.test(texto)) {
    return {
      valid: false,
      message: "Ingresa un número entero entre 1 y 20 para generar las filas."
    };
  }

  const numero = Number(texto);

  if (!Number.isFinite(numero) || !Number.isInteger(numero) || numero < 1 || numero > MAX_NOTAS) {
    return {
      valid: false,
      message: "Ingresa un número entero entre 1 y 20 para generar las filas."
    };
  }

  return {
    valid: true,
    cantidad: numero
  };
}

/**
 * Crea la estructura inicial en memoria para N evaluaciones.
 * @param {number} cantidad
 * @returns {Array<{ indice: number, nota: string, porcentaje: string }>}
 */
export function crearEstadoEvaluaciones(cantidad) {
  return Array.from({ length: cantidad }, (_, index) => ({
    indice: index + 1,
    nota: "",
    porcentaje: ""
  }));
}

/**
 * Calcula la suma acumulada de porcentajes a partir del estado en memoria.
 * No bloquea valores ni exige 100% en esta etapa (corresponde a HU-3.1).
 * @param {Array<{ porcentaje: string|number }>} evaluaciones
 * @returns {number}
 */
export function calcularPorcentajeAcumulado(evaluaciones) {
  return evaluaciones.reduce((acumulado, item) => {
    const valor = parseFloat(item.porcentaje);
    return Number.isFinite(valor) ? acumulado + valor : acumulado;
  }, 0);
}

/**
 * Formatea un número de porcentaje para mostrarlo en pantalla sin ruido decimal innecesario.
 * @param {number} suma
 * @returns {string}
 */
export function formatearPorcentaje(suma) {
  const limpio = Math.round(suma * 100) / 100;
  return `${Number.isInteger(limpio) ? limpio : limpio.toFixed(2)}%`;
}

/**
 * Controlador de interfaz para el panel de evaluaciones (HU-2).
 */
export function crearControladorEvaluaciones({
  inputCantidad,
  btnGenerar,
  contenedorFilas,
  porcentajeAcumuladoEl,
  alertaPanel,
  btnCalcular
}) {
  let evaluaciones = [];

  function limpiarAlerta() {
    alertaPanel.textContent = "";
  }

  function mostrarAlerta(mensaje) {
    alertaPanel.textContent = mensaje;
  }

  function actualizarIndicadorPorcentaje() {
    const suma = calcularPorcentajeAcumulado(evaluaciones);
    porcentajeAcumuladoEl.textContent = formatearPorcentaje(suma);
  }

  function renderizarFilas() {
    contenedorFilas.innerHTML = "";

    if (evaluaciones.length === 0) {
      btnCalcular.classList.add("oculto");
      actualizarIndicadorPorcentaje();
      return;
    }

    const fragment = document.createDocumentFragment();

    evaluaciones.forEach((item, idx) => {
      const fila = document.createElement("div");
      fila.className = "fila-evaluacion";
      fila.dataset.indice = String(item.indice);

      const etiqueta = document.createElement("span");
      etiqueta.className = "etiqueta-evaluacion";
      etiqueta.textContent = `Evaluación ${item.indice}`;

      const inputNota = document.createElement("input");
      inputNota.type = "number";
      inputNota.step = "0.1";
      inputNota.min = "0.0";
      inputNota.max = "5.0";
      inputNota.placeholder = "Nota (0.0 - 5.0)";
      inputNota.setAttribute("aria-label", `Nota evaluación ${item.indice}`);
      inputNota.value = item.nota;

      inputNota.addEventListener("input", (event) => {
        evaluaciones[idx].nota = event.target.value;
      });

      const inputPorcentaje = document.createElement("input");
      inputPorcentaje.type = "number";
      inputPorcentaje.step = "any";
      inputPorcentaje.min = "0";
      inputPorcentaje.max = "100";
      inputPorcentaje.placeholder = "Porcentaje (0 - 100)";
      inputPorcentaje.setAttribute("aria-label", `Porcentaje evaluación ${item.indice}`);
      inputPorcentaje.value = item.porcentaje;

      // Actualiza el acumulado en tiempo real al modificar cualquier porcentaje
      inputPorcentaje.addEventListener("input", (event) => {
        evaluaciones[idx].porcentaje = event.target.value;
        actualizarIndicadorPorcentaje();
      });

      fila.append(etiqueta, inputNota, inputPorcentaje);
      fragment.appendChild(fila);
    });

    contenedorFilas.appendChild(fragment);
    btnCalcular.classList.remove("oculto");
    actualizarIndicadorPorcentaje();
  }

  function manejarGenerar() {
    const validacion = validarCantidadNotas(inputCantidad.value);

    if (!validacion.valid) {
      // No modifica las filas existentes ni el acumulado actual
      mostrarAlerta(validacion.message);
      return;
    }

    const nuevaCantidad = validacion.cantidad;

    // Si se pulsa Generar con la misma cantidad actual, se conservan las filas y sus valores
    if (evaluaciones.length === nuevaCantidad && nuevaCantidad > 0) {
      return;
    }

    // Al cambiar la cantidad: se limpia el contenedor, se borran alertas y vuelve a 0%
    evaluaciones = crearEstadoEvaluaciones(nuevaCantidad);
    limpiarAlerta();
    renderizarFilas();
  }

  function reiniciarPanel() {
    evaluaciones = [];
    inputCantidad.value = "";
    contenedorFilas.innerHTML = "";
    btnCalcular.classList.add("oculto");
    limpiarAlerta();
    porcentajeAcumuladoEl.textContent = "0%";
  }

  btnGenerar.addEventListener("click", manejarGenerar);

  // Estado inicial limpio al cargar la página (no persiste filas entre recargas)
  reiniciarPanel();

  return {
    obtenerEvaluaciones: () => evaluaciones.map((item) => ({ ...item })),
    reiniciarPanel
  };
}