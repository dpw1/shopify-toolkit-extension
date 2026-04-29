import { useEffect, useMemo } from 'react'
import { getSupabaseThemeMatches } from '../lib/supabaseThemeStores'
import { getResolvedThemeForUI } from '../lib/themeFromStoreInfo'
import { useSpykitStore } from '../store/useSpykitStore'

/**
 * Keeps `themePeerMatchCount` / `themePeerTotalLibrary` in Zustand in sync with the
 * stores library for the resolved live theme (single fetch shared by Store / Theme / Compare).
 */
export function useThemePeerLibrarySync(): void {
  const storeInfo = useSpykitStore((s) => s.storeInfo)
  const eligibility = useSpykitStore((s) => s.storefrontEligibility)
  const setThemePeerLibrary = useSpykitStore((s) => s.setThemePeerLibrary)

  const connected = Boolean(storeInfo?.detectedAt && storeInfo?.domain)
  const uiTheme = useMemo(() => getResolvedThemeForUI(storeInfo), [storeInfo])
  const resolvedThemeName = useMemo(() => {
    const n = uiTheme?.name?.trim()
    if (!n || n === '—' || n.toLowerCase() === 'unknown') return null
    return n
  }, [uiTheme?.name])
  const resolvedThemeVersion = (uiTheme?.version ?? '').trim()

  useEffect(() => {
    if (eligibility !== 'eligible' || !connected || !resolvedThemeName) {
      setThemePeerLibrary({
        themePeerMatchCount: null,
        themePeerTotalLibrary: null,
        themePeersLoading: false,
      })
      return
    }

    let cancelled = false
    setThemePeerLibrary({
      themePeersLoading: true,
      themePeerMatchCount: null,
      themePeerTotalLibrary: null,
    })

    void getSupabaseThemeMatches(resolvedThemeName, resolvedThemeVersion).then((res) => {
      if (cancelled) return
      if (!res.ok) {
        setThemePeerLibrary({
          themePeersLoading: false,
          themePeerMatchCount: null,
          themePeerTotalLibrary: null,
        })
        return
      }
      setThemePeerLibrary({
        themePeersLoading: false,
        themePeerMatchCount: res.matches.length,
        themePeerTotalLibrary: res.totalFetched,
      })
    })

    return () => {
      cancelled = true
    }
  }, [eligibility, connected, resolvedThemeName, resolvedThemeVersion, setThemePeerLibrary])
}
