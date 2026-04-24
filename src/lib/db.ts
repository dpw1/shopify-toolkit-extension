/**
 * Thin IndexedDB wrapper for large/binary staging data (e.g. scraped products,
 * downloaded image blobs before packaging into a zip).
 *
 * Use chrome.storage for small config; use this for bulk records or Blobs.
 */

const DB_NAME = 'spykit-db'
const DB_VERSION = 2

export const STORE_PRODUCTS = 'products'
/** Full `collections.json` rows (same shape as Shopify storefront API). */
export const STORE_COLLECTIONS = 'collections'
export const STORE_IMAGES = 'images'

let _db: IDBDatabase | null = null

function openDB(): Promise<IDBDatabase> {
  if (_db) return Promise.resolve(_db)

  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)

    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_PRODUCTS)) {
        db.createObjectStore(STORE_PRODUCTS, { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains(STORE_COLLECTIONS)) {
        db.createObjectStore(STORE_COLLECTIONS, { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains(STORE_IMAGES)) {
        const imgStore = db.createObjectStore(STORE_IMAGES, {
          keyPath: 'url',
        })
        imgStore.createIndex('productId', 'productId', { unique: false })
      }
    }

    req.onsuccess = (e) => {
      _db = (e.target as IDBOpenDBRequest).result
      resolve(_db)
    }

    req.onerror = () => reject(req.error)
  })
}

/** Insert or replace a record */
export async function dbPut<T extends object>(
  storeName: string,
  record: T,
): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    tx.objectStore(storeName).put(record)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

/** Bulk insert / replace */
export async function dbPutMany<T extends object>(
  storeName: string,
  records: T[],
): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    const store = tx.objectStore(storeName)
    for (const rec of records) store.put(rec)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

/** Get a single record by key */
export async function dbGet<T>(storeName: string, key: IDBValidKey): Promise<T | undefined> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const req = db
      .transaction(storeName, 'readonly')
      .objectStore(storeName)
      .get(key)
    req.onsuccess = () => resolve(req.result as T | undefined)
    req.onerror = () => reject(req.error)
  })
}

/** Get all records in a store */
export async function dbGetAll<T>(storeName: string): Promise<T[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const req = db
      .transaction(storeName, 'readonly')
      .objectStore(storeName)
      .getAll()
    req.onsuccess = () => resolve(req.result as T[])
    req.onerror = () => reject(req.error)
  })
}

/** Clear all records from a store */
export async function dbClear(storeName: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    tx.objectStore(storeName).clear()
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

/** Count records in a store */
export async function dbCount(storeName: string): Promise<number> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const req = db
      .transaction(storeName, 'readonly')
      .objectStore(storeName)
      .count()
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}
