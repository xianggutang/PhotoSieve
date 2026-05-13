import { useRef, useState, useEffect, useCallback, useMemo } from "react"
import { useMeasure } from "react-use"
import { useVirtualizer } from "@tanstack/react-virtual"
import { Panel, Group, Separator } from "react-resizable-panels"
import { convertFileSrc } from "@tauri-apps/api/core"
import { useSelectionStore } from "../stores/selectionStore"
import { type RatingInfo } from "../stores/ratingStore"
import ContextMenu from "./ContextMenu"
import type { ImageGroup } from "../types"

const GAP = 8
const ASPECT = 3 / 2

interface FilmstripViewProps {
  images: ImageGroup[]
  copiedTags: RatingInfo | null
  onCopyTags: (tags: RatingInfo) => void
}

interface ContextMenuState {
  x: number
  y: number
  targetKey: string
}

function getContainedBox(cw: number, ch: number, iw: number, ih: number) {
  if (cw <= 0 || ch <= 0 || iw <= 0 || ih <= 0) return { width: 0, height: 0, x: 0, y: 0 }
  const ca = cw / ch
  const ia = iw / ih
  if (ia > ca) {
    const w = cw
    const h = cw / ia
    return { width: w, height: h, x: 0, y: (ch - h) / 2 }
  }
  const h = ch
  const w = ch * ia
  return { width: w, height: h, x: (cw - w) / 2, y: 0 }
}

function zoomTo(
  prev: { scale: number; x: number; y: number },
  newScale: number,
  cx: number,
  cy: number,
  offsetX: number,
  offsetY: number,
) {
  const ns = Math.max(0.1, Math.min(10, newScale))
  const xInImage = (cx - offsetX - prev.x) / prev.scale
  const yInImage = (cy - offsetY - prev.y) / prev.scale
  return { scale: ns, x: cx - offsetX - xInImage * ns, y: cy - offsetY - yInImage * ns }
}

export default function FilmstripView({ images, copiedTags, onCopyTags }: FilmstripViewProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [imgNatural, setImgNatural] = useState<{ w: number; h: number } | null>(null)
  const [viewport, setViewport] = useState({ scale: 1, x: 0, y: 0 })
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const [panning, setPanning] = useState(false)
  const [navMeasureRef, { width: navW, height: navH }] = useMeasure<HTMLDivElement>()
  const [imgMeasureRef, { width: imgW, height: imgH }] = useMeasure<HTMLDivElement>()
  const imageContainerRef = useRef<HTMLDivElement | null>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [stripMeasureRef, { height: stripH }] = useMeasure<HTMLDivElement>()
  

  const selectedKeys = useSelectionStore((s) => s.selectedKeys)
  const toggleSelect = useSelectionStore((s) => s.toggleSelect)
  const rangeSelect = useSelectionStore((s) => s.rangeSelect)

  const orderedKeys = useMemo(() => images.map((g) => g.base_name), [images])

  const currentGroup = images[currentIndex]
  const largeSrc = currentGroup?.jpg_path ? convertFileSrc(currentGroup.jpg_path) : null

  const resetViewport = useCallback(() => setViewport({ scale: 1, x: 0, y: 0 }), [])

  const setScaleAnchored = useCallback(
    (s: number) => {
      const box = getContainedBox(imgW, imgH, imgNatural?.w ?? 0, imgNatural?.h ?? 0)
      setViewport((prev) => zoomTo(prev, s, imgW / 2, imgH / 2, box.x, box.y))
    },
    [imgW, imgH, imgNatural]
  )

  useEffect(() => {
    if (currentIndex >= images.length && images.length > 0) {
      setCurrentIndex(images.length - 1)
    }
  }, [images.length, currentIndex])

  useEffect(() => {
    setImgNatural(null)
    setViewport({ scale: 1, x: 0, y: 0 })
  }, [currentIndex])

  const handleImgLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget
    setImgNatural({ w: img.naturalWidth, h: img.naturalHeight })
  }, [])

  const handleImageWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault()
      const el = imageContainerRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top
      const iw = el.clientWidth
      const ih = el.clientHeight
      const nw = imgRef.current?.naturalWidth ?? imgNatural?.w ?? 0
      const nh = imgRef.current?.naturalHeight ?? imgNatural?.h ?? 0
      const box = getContainedBox(iw, ih, nw, nh)
      const delta = e.deltaY < 0 ? 1.1 : 0.9
      const newScale = Math.max(0.1, Math.min(10, viewport.scale * delta))
      setViewport((prev) => zoomTo(prev, newScale, mouseX, mouseY, box.x, box.y))
    },
    [viewport.scale, imgNatural]
  )

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return
      e.preventDefault()
      setPanning(true)
    },
    []
  )

  useEffect(() => {
    if (!panning) return
    const handleMouseMove = (e: MouseEvent) => {
      setViewport((v) => ({ ...v, x: v.x + e.movementX, y: v.y + e.movementY }))
    }
    const handleMouseUp = () => setPanning(false)
    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)
    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }
  }, [panning])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === "INPUT" || tag === "TEXTAREA") return
      if (e.key === "ArrowLeft") {
        e.preventDefault()
        setCurrentIndex((prev) => (prev > 0 ? prev - 1 : prev))
      }
      if (e.key === "ArrowRight") {
        e.preventDefault()
        setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : prev))
      }
      if (e.key === "0") {
        e.preventDefault()
        resetViewport()
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [images.length, resetViewport])

  const mainBox = getContainedBox(imgW, imgH, imgNatural?.w ?? 0, imgNatural?.h ?? 0)
  const navBox = getContainedBox(navW, navH, imgNatural?.w ?? 0, imgNatural?.h ?? 0)

  const screenLeft = mainBox.x + viewport.x
  const screenTop = mainBox.y + viewport.y
  const visibleLeft = Math.max(0, -screenLeft / viewport.scale)
  const visibleTop = Math.max(0, -screenTop / viewport.scale)
  const visibleRight = Math.min(mainBox.width, (imgW - screenLeft) / viewport.scale)
  const visibleBottom = Math.min(mainBox.height, (imgH - screenTop) / viewport.scale)

  const navScaleX = mainBox.width > 0 ? navBox.width / mainBox.width : 0
  const navScaleY = mainBox.height > 0 ? navBox.height / mainBox.height : 0

  const vpLeft = navBox.x + visibleLeft * navScaleX
  const vpTop = navBox.y + visibleTop * navScaleY
  const vpW = (visibleRight - visibleLeft) * navScaleX
  const vpH = (visibleBottom - visibleTop) * navScaleY

  const thumbH = Math.max(48, stripH * 0.9)
  const thumbW = thumbH * ASPECT
  const itemW = thumbW + GAP

  const virtualizer = useVirtualizer({
    horizontal: true,
    count: images.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => itemW,
    measureElement: (el) => el.getBoundingClientRect().width,
    overscan: 5,
  })

  useEffect(() => {
    virtualizer.scrollToIndex(currentIndex, { align: "center" })
  }, [currentIndex, virtualizer])

  const handleStripWheel = useCallback((e: React.WheelEvent) => {
    const el = scrollRef.current
    if (!el) return
    el.scrollLeft += e.deltaY
  }, [])

  const handleCardClick = useCallback(
    (e: React.MouseEvent, key: string, idx: number) => {
      const ctrl = e.ctrlKey || e.metaKey
      const shift = e.shiftKey
      if (shift) {
        rangeSelect(key, orderedKeys)
      } else if (ctrl) {
        toggleSelect(key)
      } else {
        useSelectionStore.setState({ selectedKeys: new Set([key]), lastClickedKey: key })
        setCurrentIndex(idx)
      }
    },
    [orderedKeys, rangeSelect, toggleSelect]
  )

  const handleCardContextMenu = useCallback(
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

  if (!images.length) return null

  return (
    <div className="flex-1 w-full bg-black text-white min-h-0 relative">
      <div className="absolute inset-0">
        <Group orientation="vertical">
        <Panel defaultSize={85} minSize={70}>
          <Group orientation="horizontal">
            <Panel defaultSize={25} minSize={30}>
              <div className="w-full h-full bg-neutral-950 flex flex-col gap-1 p-2 overflow-hidden min-w-0">
                <div className="flex items-center gap-1 shrink-0 flex-wrap">
                  <NavBtn label="FIT" onClick={resetViewport} />
                  <NavBtn label="200%" onClick={() => setScaleAnchored(2)} />
                  <NavBtn label="50%" onClick={() => setScaleAnchored(0.5)} />
                </div>
              <div ref={navMeasureRef} className="flex-1 relative min-h-0 min-w-0">
                {imgNatural && navBox.width > 0 && (
                  <>
                    <img
                      src={largeSrc ?? ""}
                        alt=""
                        className="absolute inset-0 w-full h-full object-contain opacity-60 select-none"
                        draggable={false}
                      />
                      <div
                        className="absolute border border-white/80 shadow-[0_0_0_1px_rgba(0,0,0,0.4)]"
                        style={{
                          left: vpLeft,
                          top: vpTop,
                          width: vpW,
                          height: vpH,
                        }}
                      />
                    </>
                  )}
                </div>
              </div>
            </Panel>
            
            <Separator className="w-1 bg-neutral-800 hover:bg-blue-500 transition-colors cursor-col-resize" />
            
            <Panel defaultSize={75} >
              <div
                ref={(el) => {
                  imageContainerRef.current = el
                  if (el) imgMeasureRef(el)
                }}
                className={`w-full h-full flex items-center justify-center overflow-hidden relative ${panning ? "cursor-grabbing" : "cursor-grab"}`}
                onWheel={handleImageWheel}
                onMouseDown={handleMouseDown}
              >
                {largeSrc ? (
                  <img
                    ref={imgRef}
                    src={largeSrc}
                    alt={currentGroup.base_name}
                    className="max-w-full max-h-full object-contain select-none"
                    draggable={false}
                    style={{
                      transformOrigin: "top left",
                      transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.scale})`,
                    }}
                    onLoad={handleImgLoad}
                  />
                ) : (
                  <div className="flex flex-col items-center gap-3 text-neutral-500">
                    <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={0.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                    </svg>
                    <span>无预览（仅 RAW 文件）</span>
                  </div>
                )}
                {viewport.scale !== 1 && (
                  <div className="absolute top-3 right-3 bg-black/60 text-white/80 text-xs px-2 py-1 rounded pointer-events-none">
                    {Math.round(viewport.scale * 100)}%
                  </div>
                )}
              </div>
            </Panel>
          </Group>
        </Panel>
        <Separator className="h-1 bg-neutral-800 hover:bg-blue-500 transition-colors cursor-row-resize" />
        <Panel defaultSize={15} minSize={10} >
          <div ref={stripMeasureRef} className="w-full h-full bg-neutral-950 border-t border-neutral-800 relative min-h-0">
            <div
              ref={scrollRef}
              className="absolute inset-0 overflow-x-auto overflow-y-hidden pb-4"
              onWheel={handleStripWheel}
            >
              <div style={{ height: stripH, width: virtualizer.getTotalSize(), position: "relative" }}>
                {virtualizer.getVirtualItems().map((vi) => {
                  const g = images[vi.index]
                  if (!g) return null
                  const key = g.base_name
                  const isCurrent = vi.index === currentIndex
                  const isSelected = selectedKeys.has(key)
                  return (
                    <div
                      key={vi.key}
                      ref={virtualizer.measureElement}
                      data-index={vi.index}
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        height: stripH,
                        width: itemW,
                        transform: `translateX(${vi.start}px)`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <div
                        onClick={(e) => handleCardClick(e, key, vi.index)}
                        onContextMenu={(e) => handleCardContextMenu(e, key)}
                        className={`rounded overflow-hidden cursor-pointer transition-shadow ${
                          isCurrent ? "ring-2 ring-white" : isSelected ? "ring-2 ring-blue-500" : "hover:ring-2 hover:ring-neutral-600"
                        }`}
                        style={{ width: thumbW, flexShrink: 0 }}
                      >
                        <div className="bg-neutral-900 flex items-center justify-center relative" style={{ width: thumbW, height: thumbH }}>
                          {g.jpg_path ? (
                            <img src={convertFileSrc(g.jpg_path)} alt={key} className="w-full h-full object-contain" loading="lazy" />
                          ) : (
                            <span className="text-neutral-600 text-[10px]">RAW</span>
                          )}
                          {isSelected && (
                            <div className="absolute inset-0 bg-blue-500/15 flex items-center justify-center">
                              <svg className="w-5 h-5 text-white drop-shadow" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </Panel>
      </Group>
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

function NavBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="px-2 py-0.5 text-[10px] text-neutral-400 hover:text-white bg-neutral-800 hover:bg-neutral-700 rounded transition-colors"
    >
      {label}
    </button>
  )
}
