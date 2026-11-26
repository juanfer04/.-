// Persistencia y consulta del historial de cálculos por documento en IndexedDB (HU-3.2 y HU-3.3)
import { openDatabase, STORES } from "./db.js";

/**
 * Guarda un cálculo válido en el ObjectStore "calculos" asociado al documento activo.
 * @param {{
 *   documento: string,
 *   notas: number[],
 *   porcentajes: number[],
 *   definitiva: number,
 *   estado: "Aprobado" | "Reprobado",
 *   fechaHora?: string
 * }} registro
 * @returns {Promise<Object>}
 */
export async function guardarCalculoEnHistorial(registro) {
  const db = await openDatabase();

  const payload = {
    documento: String(registro.documento),
    notas: [...registro.notas],
    porcentajes: [...registro.porcentajes],
    definitiva: registro.definitiva,
    estado: registro.estado,
    fechaHora: registro.fechaHora ?? new Date().toLocaleString("es-CO")
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.CALCULOS, "readwrite");
    const store = tx.objectStore(STORES.CALCULOS);
    const req = store.add(payload);

    req.onsuccess = (event) => {
      resolve({
        ...payload,
        id: event.target.result
      });
    };

    req.onerror = () => {
      reject(new Error("No fue posible guardar el resultado en el historial."));
    };
  });
}

/**
 * Obtiene los cálculos asociados a un documento, ordenados del más reciente al más antiguo.
 * @param {string} documento
 * @returns {Promise<Array<Object>>}
 */
export async function obtenerHistorialPorDocumento(documento) {
  const db = await openDatabase();
  const docBuscado = String(documento);

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.CALCULOS, "readonly");
    const store = tx.objectStore(STORES.CALCULOS);
    const req = store.getAll();

    req.onsuccess = () => {
      const todos = Array.isArray(req.result) ? req.result : [];
      const filtrados = todos
        .filter((item) => String(item.documento) === docBuscado)
        .sort((a, b) => Number(b.id ?? 0) - Number(a.id ?? 0));

      resolve(filtrados);
    };

    req.onerror = () => {
      reject(new Error("No fue posible cargar el historial."));
    };
  });
}

/**
 * Renderiza el historial del estudiante en el contenedor indicado (HU-3.3).
 * @param {HTMLElement} contenedor
 * @param {Array<Object>} registros
 */
export function renderizarHistorial(contenedor, registros) {
  contenedor.innerHTML = "";

  if (!registros || registros.length === 0) {
    const vacio = document.createElement("p");
    vacio.className = "historial-vacio";
    vacio.textContent = "Todavía no tienes resultados registrados.";
    contenedor.appendChild(vacio);
    return;
  }

  const lista = document.createElement("ul");
  lista.className = "lista-historial";

  registros.forEach((item) => {
    const li = document.createElement("li");
    li.className = "item-historial";

    const definitivaNum = Number(item.definitiva);
    const definitivaTexto = Number.isFinite(definitivaNum)
      ? definitivaNum.toFixed(2)
      : String(item.definitiva);

    const notasTexto = Array.isArray(item.notas) ? item.notas.join(", ") : "";
    const porcentajesTexto = Array.isArray(item.porcentajes)
      ? item.porcentajes.map((p) => `${p}%`).join(", ")
      : "";

    const fechaEl = document.createElement("div");
    fechaEl.className = "historial-fecha";
    fechaEl.textContent = `Fecha y hora: ${item.fechaHora ?? "-"}`;

    const detalleEl = document.createElement("div");
    detalleEl.className = "historial-detalle";
    detalleEl.textContent = `Notas: [${notasTexto}] | Porcentajes: [${porcentajesTexto}]`;

    const resumenEl = document.createElement("div");
    resumenEl.className = "historial-resumen";

    const defSpan = document.createElement("strong");
    defSpan.textContent = `Definitiva: ${definitivaTexto}`;

    const estadoSpan = document.createElement("span");
    estadoSpan.className =
      item.estado === "Aprobado" ? "estado-aprobado" : "estado-reprobado";
    estadoSpan.textContent = ` — ${item.estado}`;

    resumenEl.append(defSpan, estadoSpan);
    li.append(fechaEl, detalleEl, resumenEl);
    lista.appendChild(li);
  });

  contenedor.appendChild(lista);
}