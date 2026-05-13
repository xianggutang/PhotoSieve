import { useEffect, useRef } from "react"
import { convertFileSrc } from "@tauri-apps/api/core"
import type { ImageGroup } from "../types"

function toSrc(g: ImageGroup): string | null {
  if (g.jpg_path) return convertFileSrc(g.jpg_path)
  return null
}

export default function usePreload(currentIndex: number, groups: ImageGroup[]) {
  const preloaded = useRef<Set<string>>(new Set())

  useEffect(() => {
    const targets = [currentIndex - 1, currentIndex + 1, currentIndex + 2]
    for (const i of targets) {
      if (i < 0 || i >= groups.length) continue
      const src = toSrc(groups[i])
      if (!src || preloaded.current.has(src)) continue
      preloaded.current.add(src)
      const img = new Image()
      img.src = src
    }
  }, [currentIndex, groups])
}
