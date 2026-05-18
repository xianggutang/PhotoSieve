import { useRef, useState, useEffect, useCallback } from "react"
import { invoke } from "@tauri-apps/api/core"

export interface HistoData {
  r: number[]
  g: number[]
  b: number[]
  luma: number[]
  max_count: number
}

export function useHistogram(currentPath: string | null) {
  const cacheRef = useRef<Map<string, HistoData>>(new Map())
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const latestRef = useRef<string | null>(null)
  const [data, setData] = useState<HistoData | null>(null)

  useEffect(() => {
    latestRef.current = currentPath

    if (!currentPath) {
      setData(null)
      return
    }

    const cached = cacheRef.current.get(currentPath)
    if (cached !== undefined) {
      setData(cached)
      return
    }

    setData(null)
    if (timerRef.current) clearTimeout(timerRef.current)

    timerRef.current = setTimeout(async () => {
      const latest = latestRef.current
      if (!latest || latest !== currentPath) return
      try {
        const result = await invoke<HistoData>("get_histogram", { filePath: latest })
        const cache = cacheRef.current
        if (cache.size >= 50) {
          const firstKey = cache.keys().next().value
          if (firstKey !== undefined) cache.delete(firstKey)
        }
        cache.set(latest, result)
        if (latestRef.current === latest) {
          setData(result)
        }
      } catch {
        // silently fail
      }
    }, 150)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [currentPath])

  const clearCache = useCallback(() => {
    cacheRef.current.clear()
    setData(null)
  }, [])

  return { data, clearCache }
}
