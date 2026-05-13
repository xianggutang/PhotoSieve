import { useState, useCallback, useMemo, useEffect } from "react"
import { invoke } from "@tauri-apps/api/core"
import { useSelectionStore } from "./stores/selectionStore"
import { type RatingInfo } from "./stores/ratingStore"
import DragOverlay from "./components/DragOverlay"
import GridView from "./components/GridView"
import FilmstripView from "./components/FilmstripView"
import Toolbar from "./components/Toolbar"
import Viewer from "./components/Viewer"
import useFileDrop from "./hooks/useFileDrop"
import type { ImageGroup } from "./types"

export default function App() {
  const [path, setPath] = useState("")
  const [images, setImages] = useState<ImageGroup[]>([])
  const [loading, setLoading] = useState(false)
  const [viewerIndex, setViewerIndex] = useState<number | null>(null)
  const [viewMode, setViewMode] = useState<"grid" | "filmstrip">("grid")
  const [copiedTags, setCopiedTags] = useState<RatingInfo | null>(null)

  const orderedKeys = useMemo(() => images.map((g) => g.base_name), [images])

  async function doScan(targetPath: string) {
    setLoading(true)
    setPath(targetPath)
    try {
      const result = await invoke<ImageGroup[]>("scan_directory", { path: targetPath })
      setImages(result)
    } finally {
      setLoading(false)
    }
  }

  async function handleScan() {
    if (path) doScan(path)
  }

  const handleDrop = useCallback(async (paths: string[]) => {
    const targetDir = await invoke<string>("resolve_scan_target", { paths })
    doScan(targetDir)
  }, [])

  const { isDragging } = useFileDrop(handleDrop)

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (viewerIndex != null) return
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === "INPUT" || tag === "TEXTAREA") return

      const ctrl = e.ctrlKey || e.metaKey
      if (ctrl && e.key === "a") {
        e.preventDefault()
        useSelectionStore.getState().selectAll(orderedKeys)
      }
      if (ctrl && e.shiftKey && e.key === "I") {
        e.preventDefault()
        useSelectionStore.getState().invertSelection(orderedKeys)
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [viewerIndex, orderedKeys])

  const openViewer = (index: number) => setViewerIndex(index)
  const closeViewer = () => setViewerIndex(null)
  const prevImage = () => {
    setViewerIndex((prev) => (prev != null && prev > 0 ? prev - 1 : prev))
  }
  const nextImage = () => {
    setViewerIndex((prev) => (prev != null && prev < images.length - 1 ? prev + 1 : prev))
  }

  return (
    <div className="flex flex-col h-screen bg-neutral-900 text-white p-6">
      <DragOverlay visible={isDragging} />

      <h1 className="text-3xl font-bold mb-4 shrink-0">PhotoSieve</h1>

      <div className="flex gap-2 mb-3 shrink-0">
        <input
          type="text"
          value={path}
          onChange={(e) => setPath(e.target.value)}
          placeholder="输入目录路径，或拖入图片/文件夹..."
          className="flex-1 max-w-md px-3 py-2 rounded bg-neutral-800 border border-neutral-700 text-sm"
          onKeyDown={(e) => { if (e.key === "Enter") handleScan() }}
        />
        <button
          onClick={handleScan}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded text-sm font-medium"
        >
          扫描
        </button>
      </div>

      <Toolbar
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        orderedKeys={orderedKeys}
      />

      {loading && (
        <div className="flex items-center gap-3 my-6 text-neutral-400 shrink-0">
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-sm">正在扫描 {path}...</span>
        </div>
      )}

      <div className="flex-1 flex flex-col min-h-0 mt-3">
        {viewMode === "grid" ? (
          <GridView
            images={images}
            onOpenViewer={openViewer}
            copiedTags={copiedTags}
            onCopyTags={setCopiedTags}
          />
        ) : (
          <FilmstripView images={images} copiedTags={copiedTags} onCopyTags={setCopiedTags} />
        )}
      </div>

      {!loading && images.length === 0 && (
        <p className="text-neutral-500 text-sm shrink-0">拖入图片或文件夹开始筛选，或输入路径后点击扫描</p>
      )}

      {viewerIndex != null && (
        <Viewer
          groups={images}
          index={viewerIndex}
          onClose={closeViewer}
          onPrev={prevImage}
          onNext={nextImage}
        />
      )}
    </div>
  )
}
