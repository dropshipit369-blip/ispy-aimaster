import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { getMarketEnvironment, searchEbay } from '@/services/ebay'
import { ApiError } from '@/services/functions'
import { saveScan } from '@/services/scans'
import { allowanceFromDetails, getScanAllowance, type ScanAllowance } from '@/services/usage'
import type { ConditionFilter, ScanResponse } from '@/types/ebay'

export interface ScanError {
  message: string
  limitReached: boolean
}

/** Market-scan state shared by the standard and pre-owned scan screens. */
export function useMarketScan(condition: ConditionFilter) {
  const { user } = useAuth()
  const [allowance, setAllowance] = useState<ScanAllowance | null>(null)
  const [environment, setEnvironment] = useState<'production' | 'sandbox' | 'unknown'>('unknown')
  const [result, setResult] = useState<ScanResponse | null>(null)
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState<ScanError | null>(null)
  const [historyWarning, setHistoryWarning] = useState(false)

  useEffect(() => {
    if (!user) return
    let active = true
    getScanAllowance().then((a) => active && setAllowance(a)).catch(() => undefined)
    getMarketEnvironment().then((env) => active && setEnvironment(env))
    return () => {
      active = false
    }
  }, [user])

  const outOfScans = allowance !== null && allowance.scans_remaining === 0

  const runScan = useCallback(
    async (query: string): Promise<ScanResponse | null> => {
      const q = query.trim()
      if (!q || !user) return null
      setSearching(true)
      setError(null)
      setResult(null)
      setHistoryWarning(false)
      try {
        const data = await searchEbay(q, { limit: 12, condition })
        setResult(data)
        if (data.allowance) setAllowance(data.allowance)
        saveScan(user.id, data).catch(() => setHistoryWarning(true))
        return data
      } catch (err) {
        if (err instanceof ApiError && err.code === 'scan_limit_reached') {
          const latest = allowanceFromDetails(err.details)
          if (latest) setAllowance(latest)
          setError({ message: err.message, limitReached: true })
        } else {
          setError({ message: err instanceof Error ? err.message : 'The scan failed. Please retry.', limitReached: false })
        }
        return null
      } finally {
        setSearching(false)
      }
    },
    [condition, user],
  )

  return { allowance, environment, result, searching, error, setError, historyWarning, outOfScans, runScan, setResult }
}
