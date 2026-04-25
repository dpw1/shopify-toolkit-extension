/**
 * IndexedDB wrapper.
 *
 * Schema v3 (breaking from v2):
 *  - products   keyPath:'id'  index: by_domain on 'domain'
 *  - collections keyPath:'id' index: by_domain on 'domain'
 *  - images      keyPath:'url' index: productId (unchanged)
 *
 * Products and collections now carry `domain` + `cachedAt` so they can be
 * queried and expired per store, keeping chrome.storage.local lean.
 */

const DB_NAME = 'spykit-db'
const DB_VERSION = 3

export const STORE_PRODUCTS = 'products'
export const STORE_COLLECTIONS = 'collections'
export const STORE_IMAGES = 'images'

let _db: IDBDatabase | null = null

function openDB(): Promise<IDBDatabase> {
  if (_db) return Promise.resolve(_db)

  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)

    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result
      const oldVersion = e.oldVersion

      // ── Recreate products store with by_domain index ──────────────────────
      // Delete first so we can recreate with the new index (v2→v3 migration).
      if (oldVersion < 3) {
        if (db.objectStoreNames.contains(STORE_PRODUCTS)) {
          db.deleteObjectStore(STORE_PRODUCTS)
        }
        if (db.objectStoreNames.contains(STORE_COLLECTIONS)) {
          db.deleteObjectStore(STORE_COLLECTIONS)
        }
      }

      if (!db.objectStoreNames.contains(STORE_PRODUCTS)) {
        const ps = db.createObjectStore(STORE_PRODUCTS, { keyPath: 'id' })
        ps.createIndex('by_domain', 'domain', { unique: false })
      }

      if (!db.objectStoreNames.contains(STORE_COLLECTIONS)) {
        const cs = db.createObjectStore(STORE_COLLECTIONS, { keyPath: 'id' })
        cs.createIndex('by_domain', 'domain', { unique: false })
      }

      if (!db.objectStoreNames.contains(STORE_IMAGES)) {
        const imgStore = db.createObjectStore(STORE_IMAGES, { keyPath: 'url' })
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

/** Insert or replace a single record */
export async function dbPut<T extends object>(storeName: string, record: T): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    tx.objectStore(storeName).put(record)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

/** Bulk insert / replace */
export async function dbPutMany<T extends object>(storeName: string, records: T[]): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    const store = tx.objectStore(storeName)
    for (const rec of records) store.put(rec)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

/**
 * Bulk insert with `domain` + `cachedAt` stamped onto every record.
 * Clears existing records for this domain first so there are no stale rows.
 */
export async function dbPutManyTagged<T extends object>(
  storeName: string,
  records: T[],
  domain: string,
  cachedAt: number,
): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    const store = tx.objectStore(storeName)

    // Delete all existing rows for this domain first
    const index = store.index('by_domain')
    const keysReq = index.getAllKeys(domain)
    keysReq.onsuccess = () => {
      for (const key of keysReq.result as IDBValidKey[]) store.delete(key)
      for (const rec of records) store.put({ ...rec, domain, cachedAt })
    }

    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

/** Get a single record by primary key */
export async function dbGet<T>(storeName: string, key: IDBValidKey): Promise<T | undefined> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const req = db.transaction(storeName, 'readonly').objectStore(storeName).get(key)
    req.onsuccess = () => resolve(req.result as T | undefined)
    req.onerror = () => reject(req.error)
  })
}

/** Get all records in a store (no domain filter) */
export async function dbGetAll<T>(storeName: string): Promise<T[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const req = db.transaction(storeName, 'readonly').objectStore(storeName).getAll()
    req.onsuccess = () => resolve(req.result as T[])
    req.onerror = () => reject(req.error)
  })
}

/** Get all records for a specific domain via the `by_domain` index */
export async function dbGetByDomain<T>(storeName: string, domain: string): Promise<T[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const index = db
      .transaction(storeName, 'readonly')
      .objectStore(storeName)
      .index('by_domain')
    const req = index.getAll(domain)
    req.onsuccess = () => resolve(req.result as T[])
    req.onerror = () => reject(req.error)
  })
}

/** Delete all records for a specific domain via the `by_domain` index */
export async function dbDeleteByDomain(storeName: string, domain: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    const index = tx.objectStore(storeName).index('by_domain')
    const keysReq = index.getAllKeys(domain)
    keysReq.onsuccess = () => {
      for (const key of keysReq.result as IDBValidKey[]) {
        tx.objectStore(storeName).delete(key)
      }
    }
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
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
    const req = db.transaction(storeName, 'readonly').objectStore(storeName).count()
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}
