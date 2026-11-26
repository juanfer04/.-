// Lógica de registro, inicio de sesión y recuperación de sesión con documento (HU-1)
import { openDatabase, STORES } from "./db.js";

const SESSION_ID = "activa";

/**
 * Valida que el número de documento sea obligatorio y contenga únicamente dígitos.
 * Conserva el valor como string para no perder ceros a la izquierda.
 * @param {string} rawDoc
 * @returns {{ valid: boolean, documento: string, message: string }}
 */
export function validateDocumento(rawDoc) {
  const documento = String(rawDoc ?? "").trim();

  if (!documento) {
    return {
      valid: false,
      documento: "",
      message: "Ingresa un número de documento válido para continuar."
    };
  }

  // Solo números (0-9)
  if (!/^\d+$/.test(documento)) {
    return {
      valid: false,
      documento: "",
      message: "El documento solo debe contener números. Corrige el dato e intenta de nuevo."
    };
  }

  return {
    valid: true,
    documento,
    message: ""
  };
}

/**
 * Busca un usuario en el ObjectStore "usuarios" por su llave "documento".
 * @param {IDBDatabase} db
 * @param {string} documento
 * @returns {Promise<Object|undefined>}
 */
function getUsuario(db, documento) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.USUARIOS, "readonly");
    const store = tx.objectStore(STORES.USUARIOS);
    const req = store.get(documento);

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(new Error("Error al consultar el usuario en IndexedDB."));
  });
}

/**
 * Registra un nuevo usuario sin duplicar si ya existe.
 * @param {IDBDatabase} db
 * @param {string} documento
 * @returns {Promise<void>}
 */
function createUsuarioIfNotExists(db, documento) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.USUARIOS, "readwrite");
    const store = tx.objectStore(STORES.USUARIOS);
    const getReq = store.get(documento);

    getReq.onsuccess = () => {
      if (getReq.result) {
        resolve();
        return;
      }

      const addReq = store.add({ documento });
      addReq.onsuccess = () => resolve();
      addReq.onerror = () => reject(new Error("Error al registrar el documento."));
    };

    getReq.onerror = () => reject(new Error("Error al verificar existencia del documento."));
  });
}

/**
 * Guarda o actualiza el registro de sesión identificado como "activa".
 * @param {IDBDatabase} db
 * @param {string} documento
 * @returns {Promise<void>}
 */
function setSesionActiva(db, documento) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.SESIONES, "readwrite");
    const store = tx.objectStore(STORES.SESIONES);
    const req = store.put({ id: SESSION_ID, documento });

    req.onsuccess = () => resolve();
    req.onerror = () => reject(new Error("Error al guardar la sesión activa."));
  });
}

/**
 * Elimina el registro de sesión activa al cerrar sesión.
 * @param {IDBDatabase} db
 * @returns {Promise<void>}
 */
export async function cerrarSesion() {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.SESIONES, "readwrite");
    const store = tx.objectStore(STORES.SESIONES);
    const req = store.delete(SESSION_ID);

    req.onsuccess = () => resolve();
    req.onerror = () => reject(new Error("Error al cerrar la sesión."));
  });
}

/**
 * Registra (si no existe) o inicia sesión con el número de documento ingresado.
 * @param {string} rawDoc
 * @returns {Promise<{ ok: boolean, documento?: string, message?: string }>}
 */
export async function ingresarConDocumento(rawDoc) {
  const validation = validateDocumento(rawDoc);
  if (!validation.valid) {
    return { ok: false, message: validation.message };
  }

  try {
    const db = await openDatabase();
    const existente = await getUsuario(db, validation.documento);

    if (!existente) {
      await createUsuarioIfNotExists(db, validation.documento);
    }

    await setSesionActiva(db, validation.documento);

    return {
      ok: true,
      documento: validation.documento
    };
  } catch (error) {
    return {
      ok: false,
      message: "No fue posible iniciar la sesión. Verifica el navegador o intenta nuevamente."
    };
  }
}

/**
 * Recupera la sesión activa almacenada en IndexedDB, verificando que el usuario exista.
 * @returns {Promise<string|null>}
 */
export async function recuperarSesionActiva() {
  try {
    const db = await openDatabase();
    const sesion = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.SESIONES, "readonly");
      const store = tx.objectStore(STORES.SESIONES);
      const req = store.get(SESSION_ID);

      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(new Error("Error al consultar la sesión activa."));
    });

    if (!sesion || !sesion.documento) {
      return null;
    }

    const usuario = await getUsuario(db, sesion.documento);
    return usuario ? sesion.documento : null;
  } catch (error) {
    return null;
  }
}