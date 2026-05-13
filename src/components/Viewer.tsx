import { useState, useEffect, useCallback } from "react"
import { convertFileSrc } from "@tauri-apps/api/core"
import usePreload from "../hooks/usePreload"
import type { ImageGroup } from "../types"

interface ViewerProps {
  groups: ImageGroup[]
  index: number
  onClose: () => void
  onPrev: () => void
  onNext: () => void
}

export default function Viewer({ groups, index, onClose, onPrev, onNext }: ViewerProps) {
  const [imgLoaded, setImgLoaded] = useState(false)

  usePreload(index, groups)

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
      if (e.key === "ArrowLeft") onPrev()
      if (e.key === "ArrowRight") onNext()
    },
    [onClose, onPrev, onNext]
  )

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [handleKeyDown])

  useEffect(() => {
    setImgLoaded(false)
  }, [index])

  const group = groups[index]
  if (!group) return null

  const src = group.jpg_path ? convertFileSrc(group.jpg_path) : null

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 text-white/70 shrink-0">
        <span className="text-sm font-medium truncate max-w-[60%]">
          {group.base_name}
          {group.raw_path && <span className="text-amber-400 ml-2">RAW</span>}
        </span>
        <span className="text-sm text-white/40">
          {index + 1} / {groups.length}
        </span>
        <button
          onClick={onClose}
          className="text-white/70 hover:text-white text-xl leading-none px-2"
        >
          ✕
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center relative min-h-0">
        <button
          onClick={onPrev}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white text-2xl"
        >
          ‹
        </button>

        {src ? (
          <>
            {!imgLoaded && (
              <div className="text-white/40 text-sm">加载中...</div>
            )}
            <img
              src={src}
              alt={group.base_name}
              className="max-w-full max-h-full object-contain"
              style={{ display: imgLoaded ? "block" : "none" }}
              onLoad={() => setImgLoaded(true)}
            />
          </>
        ) : (
          <div className="flex flex-col items-center gap-3 text-neutral-500">
            <svg className="w-20 h-20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={0.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
            </svg>
            <span>无预览（仅 RAW 文件）</span>
          </div>
        )}

        <button
          onClick={onNext}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white text-2xl"
        >
          ›
        </button>
      </div>
    </div>
  )
}
