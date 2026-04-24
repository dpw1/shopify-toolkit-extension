import { useEffect, useState } from 'react'
import type { ExtMessage, StoreInfo } from '../../types'
import { onStorageChange } from '../../lib/storage'
import { syncPopupStoreData } from '../windowStoreData'

export function useStoreInfo() {
  const [storeInfo, setStoreInfo] = useState<StoreInfo | null>(null)

  useEffect(() => {
    syncPopupStoreData(storeInfo)
  }, [storeInfo])

  useEffect(() => {
    try {
      chrome.runtime.sendMessage(
        { type: 'GET_STORE_INFO', from: 'popup' } satisfies ExtMessage,
        (res: ExtMessage | undefined) => {
          if (chrome.runtime.lastError) return
          if (res?.type === 'STORE_INFO_RESPONSE') {
            setStoreInfo(res.payload)
          }
        },
      )
      chrome.runtime.sendMessage({ type: 'SYNC_CATALOG_ON_POPUP', from: 'popup' } satisfies ExtMessage)
    } catch {
      /* not running as extension */
    }

    return onStorageChange('storeInfo', (nv) => {
      setStoreInfo(nv ?? null)
    })
  }, [])

  return storeInfo
}
