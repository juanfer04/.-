// Configuración y conexión a la base de datos local IndexedDB
export const DB_NAME = "NotasDefinitivasDB";
export const DB_VERSION = 1;

export const STORES = {
  USUARIOS: "usuarios",
  SESIONES: "sesiones",
  CALCULOS: "calculos"
};

/**
 * Verifica si IndexedDB está disponible en el navegador actual.
 * @returns {boolean}
 */
export function isIndexedDBSupported() {
  return typeof window !== "undefined" && typeof window.indexedDB !== "undefined";
}

/**
 * Abre NotasDefinitivasDB y crea los ObjectStores requeridos si no existen.
 * @returns {Promise<IDBDatabase>}
 */
export function openDatabase() {
  return new Promise((resolve, reject) => {
    if (!isIndexedDBSupported()) {
      reject(new Error("IndexedDB no está disponible en este navegador."));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    // Se ejecuta cuando la base de datos se crea por primera vez o sube de versión
    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Almacén de estudiantes: llave principal "documento" (texto para conservar ceros iniciales)
      if (!db.objectStoreNames.contains(STORES.USUARIOS)) {
        db.createObjectStore(STORES.USUARIOS, { keyPath: "documento" });
      }

      // Almacén de sesión: llave principal "id" (registro identificado como "activa")
      if (!db.objectStoreNames.contains(STORES.SESIONES)) {
        db.createObjectStore(STORES.SESIONES, { keyPath: "id" });
      }

      // Almacén de historial: llave principal "id" autoincremental
      if (!db.objectStoreNames.contains(STORES.CALCULOS)) {
        db.createObjectStore(STORES.CALCULOS, {
          keyPath: "id",
          autoIncrement: true
        });
      }
    };

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onerror = () => {
      reject(new Error("No fue posible abrir la base de datos local."));
    };

    request.onblocked = () => {
      reject(new Error("La apertura de la base de datos está bloqueada por otra pestaña."));
    };
  });
}