"use client";

/**
 * Durable storage on the exam device (IndexedDB), for offline exams: the downloaded paper, the
 * running exam's answers, and answer sheets waiting to upload. Survives reloads, crashes and
 * reboots, unlike in-memory state, and holds far more than localStorage.
 */

const DB_NAME = "astra-exam-device";
const STORE = "kv";

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function run<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const req = fn(tx.objectStore(STORE));
      tx.oncomplete = () => resolve(req.result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

export const deviceGet = <T>(key: string) => run<T | undefined>("readonly", (s) => s.get(key) as IDBRequest<T | undefined>);
export const deviceSet = (key: string, value: unknown) => run("readwrite", (s) => s.put(value, key));
export const deviceDel = (key: string) => run("readwrite", (s) => s.delete(key));

/** A random ID for this computer/browser, shown to invigilators next to each student. */
export function deviceId(): string {
  try {
    let id = localStorage.getItem("astra-device-id");
    if (!id) {
      id = `DEV-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
      localStorage.setItem("astra-device-id", id);
    }
    return id;
  } catch {
    return "DEV-UNKNOWN";
  }
}
