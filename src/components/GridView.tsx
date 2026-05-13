import { useRef, useState, useCallback, useMemo } from "react"
import { useMeasure } from "react-use"
import { useVirtualizer } from "@tanstack/react-virtual"
import { useSelectionStore } from "../stores/selectionStore"
import { type RatingInfo } from "../stores/ratingStore"
import ThumbCard from "./ThumbCard"
import ContextMenu from "./ContextMenu"
import type { ImageGroup } from "../types"

const MIN_CARD_WIDTH = 250
const GAP = 12
const ASPECT = 3 / 2
const LABEL_H = 28
const CARD_PAD_V = 8

interface GridViewProps {
  images: ImageGroup[]
  onOpenViewer?: (index: number) => void
  copiedTags: RatingInfo | null
  onCopyTags: (tags: RatingInfo) => void
}

interface ContextMenuState {
  x: number
  y: number
  targetKey: string
}

export default function GridView({ images, onOpenViewer, copiedTags, onCopyTags }: GridViewProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const [measureRef, { width: containerWidth }] = useMeasure<HTMLDivElement>()
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)

  const mergedScrollRef = useCallback(
    (el: HTMLDivElement | null) => {
      if (el) {
        measureRef(el)
      }
      scrollRef.current = el
    },
    [measureRef]
  )

  const selectedKeys = useSelectionStore((s) => s.selectedKeys)
  const toggleSelect = useSelectionStore((s) => s.toggleSelect)
  const rangeSelect = useSelectionStore((s) => s.rangeSelect)

  const orderedKeys = useMemo(() => images.map((g) => g.base_name), [images])
  const keyToIndex = useMemo(() => {
    const m = new Map<string, number>()
    images.forEach((g, i) => m.set(g.base_name, i))
    return m
  }, [images])

  const columns = containerWidth > 0 ? Math.max(1, Math.floor(containerWidth / MIN_CARD_WIDTH)) : 1
  const totalGapW = (columns - 1) * GAP
  const cardW = containerWidth > 0 ? (containerWidth - totalGapW) / columns : MIN_CARD_WIDTH
  const imgH = cardW / ASPECT
  const rowH = imgH + LABEL_H + CARD_PAD_V + GAP
  const rows = Math.ceil(images.length / columns)

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
      const idx = keyToIndex.get(key)
      if (idx !== undefined && onOpenViewer) {
        onOpenViewer(idx)
      }
    },
    [keyToIndex, onOpenViewer]
  )

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, key: string) => {
      e.preventDefault()
      const isSelected = selectedKeys.has(key)
      if (!isSelected) {
        useSelectionStore.setState({ selectedKeys: new Set([key]), lastClickedKey: key })
      }
      setContextMenu({ x: e.clientX, y: e.clientY, targetKey: key })
    },
    [selectedKeys]
  )

  const closeContextMenu = useCallback(() => setContextMenu(null), [])

  if (!images.length) return null

  return (
    <div className="flex-1 w-full relative">
      <div ref={mergedScrollRef} className="absolute inset-0 overflow-y-auto overflow-x-hidden">
        <div style={{ height: virtualizer.getTotalSize(), position: "relative", width: "100%" }}>
          {virtualizer.getVirtualItems().map((vr) => {
            const start = vr.index * columns
            const rowItems = images.slice(start, start + columns)

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
                {rowItems.map((g) => {
                  const key = g.base_name
                  return (
                    <div key={key} style={{ width: cardW, flexShrink: 0, height: vr.size - GAP }}>
                      <ThumbCard
                        group={g}
                        isSelected={selectedKeys.has(key)}
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
