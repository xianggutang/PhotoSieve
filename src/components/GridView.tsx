import { useRef, useState, useCallback, useMemo, useEffect } from "react"
import { useMeasure } from "react-use"
import { useVirtualizer } from "@tanstack/react-virtual"
import { useSelectionStore } from "../stores/selectionStore"
import { type RatingInfo } from "../stores/ratingStore"
import ThumbCard from "./ThumbCard"
import ContextMenu from "./ContextMenu"
import type { ImageGroup, BurstGroup } from "../types"

const MIN_CARD_WIDTH = 250
const GAP = 12
const ASPECT = 3 / 2
const LABEL_H = 28
const CARD_PAD_V = 8

interface FlatImage {
  group: ImageGroup
  isBurst: boolean
  burstIndex: number
  burstTotal: number
}

interface GridViewProps {
  groups: BurstGroup[]
  onOpenViewer?: (index: number) => void
  copiedTags: RatingInfo | null
  onCopyTags: (tags: RatingInfo) => void
}

interface ContextMenuState {
  x: number
  y: number
  targetKey: string
}

export default function GridView({ groups, onOpenViewer, copiedTags, onCopyTags }: GridViewProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const [measureRef, { width: containerWidth }] = useMeasure<HTMLDivElement>()
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)

  const mergedScrollRef = useCallback(
    (el: HTMLDivElement | null) => {
      if (el) measureRef(el)
      scrollRef.current = el
    },
    [measureRef]
  )

  const flatImages = useMemo<FlatImage[]>(() =>
    groups.flatMap((g) =>
      g.items.map((item, i) => ({
        group: item,
        isBurst: g.type === "burst",
        burstIndex: i + 1,
        burstTotal: g.items.length,
      }))
    ),
    [groups]
  )

  const orderedKeys = useMemo(() => flatImages.map((f) => f.group.base_name), [flatImages])
  const keyToFlatIdx = useMemo(() => {
    const m = new Map<string, number>()
    flatImages.forEach((f, i) => m.set(f.group.base_name, i))
    return m
  }, [flatImages])

  const selectedKeys = useSelectionStore((s) => s.selectedKeys)
  const toggleSelect = useSelectionStore((s) => s.toggleSelect)
  const rangeSelect = useSelectionStore((s) => s.rangeSelect)

  const columns = containerWidth > 0 ? Math.max(1, Math.floor(containerWidth / MIN_CARD_WIDTH)) : 1
  const totalGapW = (columns - 1) * GAP
  const cardW = containerWidth > 0 ? (containerWidth - totalGapW) / columns : MIN_CARD_WIDTH
  const imgH = cardW / ASPECT
  const rowH = imgH + LABEL_H + CARD_PAD_V + GAP
  const rows = Math.ceil(flatImages.length / columns)

  const getScrollElement = useCallback(() => scrollRef.current, [])

  const virtualizer = useVirtualizer({
    count: rows,
    getScrollElement,
    estimateSize: () => rowH,
    measureElement: (el) => el.getBoundingClientRect().height,
    overscan: 2,
  })

  const handleClick = useCallback(
    (e: React.MouseEvent, key: string) => {
      const ctrl = e.ctrlKey || e.metaKey
      const shift = e.shiftKey

      if (shift) {
        rangeSelect(key, orderedKeys)
      } else if (ctrl) {
        toggleSelect(key)
      } else {
        useSelectionStore.setState({ selectedKeys: new Set([key]), lastClickedKey: key })
      }
    },
    [orderedKeys, rangeSelect, toggleSelect]
  )

  const handleDoubleClick = useCallback(
    (key: string) => {
      const idx = keyToFlatIdx.get(key)
      if (idx !== undefined && onOpenViewer) onOpenViewer(idx)
    },
    [keyToFlatIdx, onOpenViewer]
  )

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, key: string) => {
      e.preventDefault()
      if (!selectedKeys.has(key)) {
        useSelectionStore.setState({ selectedKeys: new Set([key]), lastClickedKey: key })
      }
      setContextMenu({ x: e.clientX, y: e.clientY, targetKey: key })
    },
    [selectedKeys]
  )

  const closeContextMenu = useCallback(() => setContextMenu(null), [])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === "INPUT" || tag === "TEXTAREA") return

      if (e.key === "Enter" && onOpenViewer) {
        const lastKey = useSelectionStore.getState().lastClickedKey
        if (lastKey) {
          const idx = keyToFlatIdx.get(lastKey)
          if (idx !== undefined) {
            e.preventDefault()
            onOpenViewer(idx)
          }
        }
        return
      }

      if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) return

      const total = flatImages.length
      if (total === 0) return

      const sel = useSelectionStore.getState()
      const lastKey = sel.lastClickedKey
      let currentIdx = lastKey ? orderedKeys.indexOf(lastKey) : -1
      if (currentIdx === -1) currentIdx = 0

      let newIdx = currentIdx
      if (e.key === "ArrowLeft") newIdx = currentIdx - 1
      else if (e.key === "ArrowRight") newIdx = currentIdx + 1
      else if (e.key === "ArrowUp") newIdx = currentIdx - columns
      else if (e.key === "ArrowDown") newIdx = currentIdx + columns

      if (newIdx < 0 || newIdx >= total) return

      e.preventDefault()
      const key = orderedKeys[newIdx]
      useSelectionStore.setState({ selectedKeys: new Set([key]), lastClickedKey: key })
      virtualizer.scrollToIndex(Math.floor(newIdx / columns), { align: "auto" })
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [flatImages.length, orderedKeys, columns, virtualizer])

  if (!flatImages.length) return null

  return (
    <div className="flex-1 w-full relative">
      <div ref={mergedScrollRef} className="absolute inset-0 overflow-y-auto overflow-x-hidden p-4 box-border">
        <div style={{ height: virtualizer.getTotalSize(), position: "relative", width: "100%" }}>
          {virtualizer.getVirtualItems().map((vr) => {
            const start = vr.index * columns
            const rowImages = flatImages.slice(start, start + columns)

            return (
              <div
                key={vr.key}
                ref={virtualizer.measureElement}
                data-index={vr.index}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: vr.size,
                  transform: `translateY(${vr.start}px)`,
                  display: "flex",
                  gap: GAP,
                  paddingBottom: GAP,
                }}
              >
                {rowImages.map((f) => {
                  const key = f.group.base_name
                  const isSelected = selectedKeys.has(key)

                  return (
                    <div key={key} style={{ width: cardW, flexShrink: 0, height: vr.size - GAP }}>
                      <ThumbCard
                        group={f.group}
                        isSelected={isSelected}
                        isBurst={f.isBurst}
                        burstIndex={f.isBurst ? `${f.burstIndex}/${f.burstTotal}` : undefined}
                        onClick={(e) => handleClick(e, key)}
                        onDoubleClick={() => handleDoubleClick(key)}
                        onContextMenu={(e) => handleContextMenu(e, key)}
                      />
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          targetKey={contextMenu.targetKey}
          selectedKeys={[...selectedKeys]}
          copiedTags={copiedTags}
          onCopyTags={onCopyTags}
          onClose={closeContextMenu}
        />
      )}
    </div>
  )
}
