// Validaciones de evaluación, cálculo ponderado y estado académico (HU-3.1, RN-02..RN-04, FA-01..FA-03)

const NOTA_MIN = 0.0;
const NOTA_MAX = 5.0;
const PORCENTAJE_MIN = 0;
const PORCENTAJE_MAX = 100;
const PORCENTAJE_OBJETIVO = 100;
const TOLERANCIA_SUMA = 1e-6;
const NOTA_APROBACION = 3.0;

/**
 * Convierte un valor de entrada a número finito si es válido y no está vacío.
 * @param {string|number} rawValue
 * @returns {number|null}
 */
function parsearNumeroEstricto(rawValue) {
  const texto = String(rawValue ?? "").trim();
  if (!texto) {
    return null;
  }

  if (!/^[+-]?(\d+(\.\d+)?|\.\d+)$/.test(texto)) {
    return null;
  }

  const numero = Number(texto);
  return Number.isFinite(numero) ? numero : null;
}

/**
 * Valida las filas de evaluación y calcula la definitiva ponderada.
 * @param {Array<{ indice: number, nota: string|number, porcentaje: string|number }>} evaluaciones
 * @returns {{
 *   ok: boolean,
 *   message?: string,
 *   data?: {
 *     notas: number[],
 *     porcentajes: number[],
 *     definitivaExacta: number,
 *     definitivaMostrada: string,
 *     estado: "Aprobado" | "Reprobado"
 *   }
 * }}
 */
export function calcularDefinitivaEvaluaciones(evaluaciones) {
  if (!Array.isArray(evaluaciones) || evaluaciones.length === 0) {
    return {
      ok: false,
      message: "Genera al menos una evaluación antes de calcular la definitiva."
    };
  }

  const notas = [];
  const porcentajes = [];

  for (const item of evaluaciones) {
    const idx = item.indice ?? "?";
    const nota = parsearNumeroEstricto(item.nota);
    const porcentaje = parsearNumeroEstricto(item.porcentaje);

    // FA-03: Campos vacíos o no numéricos
    if (nota === null || porcentaje === null) {
      return {
        ok: false,
        message: `Evaluación ${idx}: completa todos los campos de nota y porcentaje con valores numéricos válidos.`
      };
    }

    // FA-02 / RN-02: Nota fuera del rango 0.0 a 5.0
    if (nota < NOTA_MIN || nota > NOTA_MAX) {
      return {
        ok: false,
        message: `Evaluación ${idx}: la nota debe estar entre 0.0 y 5.0. Corrige ese valor.`
      };
    }

    // Rango de porcentaje 0 a 100
    if (porcentaje < PORCENTAJE_MIN || porcentaje > PORCENTAJE_MAX) {
      return {
        ok: false,
        message: `Evaluación ${idx}: el porcentaje debe estar entre 0 y 100. Corrige ese valor.`
      };
    }

    notas.push(nota);
    porcentajes.push(porcentaje);
  }

  // FA-01 / RN-03: La suma de porcentajes debe ser exactamente 100%
  const sumaPorcentajes = porcentajes.reduce((acc, p) => acc + p, 0);
  const diferenciaCien = sumaPorcentajes - PORCENTAJE_OBJETIVO;

  if (Math.abs(diferenciaCien) > TOLERANCIA_SUMA) {
    const redondeada = Math.round(diferenciaCien * 100) / 100;
    if (redondeada < 0) {
      const faltante = Math.abs(redondeada);
      return {
        ok: false,
        message: `Los porcentajes suman ${Math.round(sumaPorcentajes * 100) / 100}%. Falta ${faltante}% para completar el 100%.`
      };
    }

    return {
      ok: false,
      message: `Los porcentajes suman ${Math.round(sumaPorcentajes * 100) / 100}%. Sobra ${redondeada}% sobre el 100%.`
    };
  }

  // Fórmula: definitiva = suma de (nota * porcentaje / 100)
  const definitivaExacta = evaluaciones.reduce((suma, item) => {
    const nota = Number(item.nota);
    const porcentaje = Number(item.porcentaje);
    return suma + (nota * porcentaje) / 100;
  }, 0);

  // RN-04 y CA-05: Estado evaluado con el valor exacto antes de redondear para mostrar
  const estado = definitivaExacta >= NOTA_APROBACION ? "Aprobado" : "Reprobado";
  const definitivaMostrada = definitivaExacta.toFixed(2);

  return {
    ok: true,
    data: {
      notas,
      porcentajes,
      definitivaExacta,
      definitivaMostrada,
      estado
    }
  };
}