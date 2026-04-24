/**
 * Thin typed wrappers around chrome.storage.local.
 * All reads/writes are Promise-based and fully typed against StorageSchema.
 */

import type { StorageSchema } from '../types'

type StorageKey = keyof StorageSchema

/** Read one or more keys from chrome.storage.local */
export async function storageGet<K extends StorageKey>(
  keys: K | K[],
): Promise<Pick<StorageSchema, K>> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(keys as string | string[], (result) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message))
      } else {
        resolve(result as Pick<StorageSchema, K>)
      }
    })
  })
}

/** Write one or more keys to chrome.storage.local */
export async function storageSet(
  items: Partial<StorageSchema>,
): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set(items, () => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message))
      } else {
        resolve()
      }
    })
  })
}

/** Remove one or more keys from chrome.storage.local */
export async function storageRemove(keys: StorageKey | StorageKey[]): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.remove(keys as string | string[], () => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message))
      } else {
        resolve()
      }
    })
  })
}

/** Subscribe to storage changes for a specific key */
export function onStorageChange<K extends StorageKey>(
  key: K,
  cb: (newValue: StorageSchema[K], oldValue: StorageSchema[K]) => void,
): () => void {
  const listener = (
    changes: Record<string, chrome.storage.StorageChange>,
    area: string,
  ) => {
    if (area === 'local' && key in changes) {
      cb(
        changes[key]!.newValue as StorageSchema[K],
        changes[key]!.oldValue as StorageSchema[K],
      )
    }
  }
  chrome.storage.onChanged.addListener(listener)
  return () => chrome.storage.onChanged.removeListener(listener)
}
