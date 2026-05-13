import { useState, useEffect, useRef, useCallback } from "react"
import { useRatingStore, COLOR_LABELS, type RatingInfo } from "../stores/ratingStore"

interface ContextMenuProps {
  x: number
  y: number
  targetKey: string
  selectedKeys: string[]
  copiedTags: RatingInfo | null
  onCopyTags: (tags: RatingInfo) => void
  onClose: () => void
}

const STAR_LABELS = ["", "⭐ 1 星", "⭐⭐ 2 星", "⭐⭐⭐ 3 星", "⭐⭐⭐⭐ 4 星", "⭐⭐⭐⭐⭐ 5 星"]

export default function ContextMenu({ x, y, targetKey, selectedKeys, copiedTags, onCopyTags, onClose }: ContextMenuProps) {
  const [submenu, setSubmenu] = useState<"stars" | "colors" | null>(null)
  const showColors = submenu === "colors"
  const menuRef = useRef<HTMLDivElement>(null)
  const subCloseRef = useRef<number | null>(null)
  const ratingStore = useRatingStore

  const scheduleSubClose = () => {
    subCloseRef.current = window.setTimeout(() => setSubmenu(null), 120)
  }
  const cancelSubClose = () => {
    if (subCloseRef.current != null) {
      clearTimeout(subCloseRef.current)
      subCloseRef.current = null
    }
  }

  const effectiveKeys = selectedKeys.includes(targetKey) ? selectedKeys : [targetKey]

  const closeOnOutside = useCallback((e: MouseEvent) => {
    if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
      onClose()
    }
  }, [onClose])

  useEffect(() => {
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", closeOnOutside)
    }, 0)
    return () => {
      clearTimeout(timer)
      document.removeEventListener("mousedown", closeOnOutside)
    }
  }, [closeOnOutside])

  useEffect(() => {
    return () => {
      if (subCloseRef.current != null) clearTimeout(subCloseRef.current)
    }
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [onClose])

  const rating = ratingStore.getState().getRating(targetKey)
  const hasCopied = copiedTags !== null

  const handleCopy = () => {
    onCopyTags(rating)
    onClose()
  }

  const handlePaste = () => {
    if (!copiedTags) return
    const { batchSetStars, batchSetColor } = ratingStore.getState()
    if ((copiedTags.stars ?? 0) > 0) batchSetStars(effectiveKeys, copiedTags.stars!)
    if ((copiedTags.color ?? 0) > 0) batchSetColor(effectiveKeys, copiedTags.color!)
    if (copiedTags.isRejected) {
      for (const k of effectiveKeys) {
        const cur = ratingStore.getState().getRating(k)
        if (!cur.isRejected) ratingStore.getState().toggleRejected(k)
      }
    }
    onClose()
  }

  const handleStar = (stars: number) => {
    if (effectiveKeys.length > 1) {
      ratingStore.getState().batchSetStars(effectiveKeys, stars)
    } else {
      ratingStore.getState().setStars(targetKey, stars)
    }
    onClose()
  }

  const handleColor = (color: number) => {
    if (effectiveKeys.length > 1) {
      ratingStore.getState().batchSetColor(effectiveKeys, color)
    } else {
      ratingStore.getState().setColor(targetKey, color)
    }
    onClose()
  }

  const handleDeleteMark = () => {
    if (effectiveKeys.length > 1) {
      ratingStore.getState().batchToggleRejected(effectiveKeys)
    } else {
      ratingStore.getState().toggleRejected(targetKey)
    }
    onClose()
  }

  const handleClearAll = () => {
    if (effectiveKeys.length > 1) {
      ratingStore.getState().batchClearAllMarks(effectiveKeys)
    } else {
      ratingStore.getState().clearAllMarks(targetKey)
    }
    onClose()
  }

  const menuX = x + 200 > window.innerWidth ? x - 200 : x
  const menuY = y + 400 > window.innerHeight ? y - 400 : y

  return (
    <div
      ref={menuRef}
      className="fixed z-[100] w-48 bg-neutral-800 border border-neutral-700 rounded-lg shadow-xl py-1 text-sm"
      style={{ left: menuX, top: menuY }}
    >
      <MenuItem onClick={handleCopy}>复制标签</MenuItem>
      <MenuItem onClick={handlePaste} disabled={!hasCopied}>
        粘贴标签
      </MenuItem>

      <div className="h-px bg-neutral-700 my-1" />

      <div
        className="relative"
        onMouseEnter={() => { cancelSubClose(); setSubmenu("stars") }}
        onMouseLeave={scheduleSubClose}
      >
        <MenuItem arrow>打标签</MenuItem>
        {submenu != null && (
          <div
            className="absolute left-full top-0 w-40 bg-neutral-800 border border-neutral-700 rounded-lg shadow-xl py-1"
            onMouseEnter={cancelSubClose}
            onMouseLeave={scheduleSubClose}
          >
            {[1, 2, 3, 4, 5].map((n) => (
              <MenuItem key={n} onClick={() => handleStar(n)}>
                {STAR_LABELS[n]}
              </MenuItem>
            ))}
            <div className="h-px bg-neutral-700 my-1" />
            <div
              className="relative"
              onMouseEnter={() => { cancelSubClose(); setSubmenu("colors") }}
              onMouseLeave={() => setSubmenu("stars")}
            >
              <MenuItem arrow>颜色标签</MenuItem>
              {showColors && (
                <div
                  className="absolute left-full top-0 w-32 bg-neutral-800 border border-neutral-700 rounded-lg shadow-xl py-1"
                  onMouseEnter={cancelSubClose}
                >
                  {Object.entries(COLOR_LABELS).map(([num, { label, hex }]) => (
                    <MenuItem key={num} onClick={() => handleColor(Number(num))}>
                      <span className="inline-block w-3 h-3 rounded-full mr-2" style={{ backgroundColor: hex }} />
                      {label}
                    </MenuItem>
                  ))}
                </div>
              )}
            </div>
            <div className="h-px bg-neutral-700 my-1" />
            <MenuItem onClick={handleDeleteMark} danger>⨉ 待删标记</MenuItem>
            <MenuItem onClick={handleClearAll}>清除所有标记</MenuItem>
          </div>
        )}
      </div>
    </div>
  )
}

function MenuItem({ onClick, disabled, arrow, danger, children }: {
  onClick?: () => void
  disabled?: boolean
  arrow?: boolean
  danger?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      className={`w-full text-left px-3 py-1.5 flex items-center justify-between transition-colors ${
        disabled
          ? "text-neutral-600 cursor-not-allowed"
          : danger
            ? "text-red-400 hover:bg-red-500/20 hover:text-red-300"
            : "text-neutral-300 hover:bg-neutral-700 hover:text-white"
      }`}
    >
      <span>{children}</span>
      {arrow && (
        <svg className="w-3 h-3 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      )}
    </button>
  )
}
