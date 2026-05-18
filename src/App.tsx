import { useState, useCallback, useMemo, useEffect } from "react"
import { invoke } from "@tauri-apps/api/core"
import { useSelectionStore } from "./stores/selectionStore"
import { useRatingStore, type RatingInfo, type RatingRow } from "./stores/ratingStore"
import { useUndoStore } from "./stores/undoStore"
import { useFilterStore } from "./stores/filterStore"
import { useActiveKeyStore } from "./stores/activeKeyStore"
import { groupBurstPhotos, flattenBurstKeys } from "./utils/groupBurstPhotos"
import { filterImages } from "./utils/filterImages"
import DragOverlay from "./components/DragOverlay"
import GridView from "./components/GridView"
import FilmstripView from "./components/FilmstripView"
import Toolbar from "./components/Toolbar"
import Viewer from "./components/Viewer"
import ConfirmDialog from "./components/ConfirmDialog"
import ExportModal from "./components/ExportModal"
import Toast from "./components/Toast"
import useFileDrop from "./hooks/useFileDrop"
import type { ImageGroup } from "./types"

export default function App() {
  const [inputPath, setInputPath] = useState("")
  const [loadedPath, setLoadedPath] = useState<string | null>(null)
  const [images, setImages] = useState<ImageGroup[]>([])
  const [loading, setLoading] = useState(false)
  const [viewerIndex, setViewerIndex] = useState<number | null>(null)
  const [viewMode, setViewMode] = useState<"grid" | "filmstrip">("grid")
  const [copiedTags, setCopiedTags] = useState<RatingInfo | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<{ paths: string[]; count: number } | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [showExport, setShowExport] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const rawGroups = useMemo(() => groupBurstPhotos(images), [images])
  const ratings = useRatingStore((s) => s.ratings)
  const filters = useFilterStore()
  const burstGroups = useMemo(
    () => filterImages(rawGroups, filters, ratings),
    [rawGroups, filters, ratings]
  )
  const selectedCount = useSelectionStore((s) => s.selectedKeys.size)
  const allKeys = useMemo(() => flattenBurstKeys(burstGroups), [burstGroups])

  async function doScan(targetPath: string) {
    setLoading(true)
    try {
      if (loadedPath && loadedPath !== targetPath) {
        await useRatingStore.getState().flushPending()
        useSelectionStore.getState().clearSelection()
        useRatingStore.getState().resetForNewFolder()
        setImages([])
      }
      await invoke("init_database", { folderPath: targetPath })
      const [result, rows] = await Promise.all([
        invoke<ImageGroup[]>("scan_directory", { path: targetPath }),
        invoke<RatingRow[]>("load_all_ratings", { folderPath: targetPath }),
      ])
      useRatingStore.getState().loadFromDb(targetPath, rows)
      setImages(result)
      setLoadedPath(targetPath)
      setInputPath(targetPath)
    } catch (e) {
      setToast(`扫描失败: ${e}`)
    } finally {
      setLoading(false)
    }
  }

  async function handleScan() {
    if (inputPath) doScan(inputPath)
  }

  const handleDrop = useCallback(async (paths: string[]) => {
    const targetDir = await invoke<string>("resolve_scan_target", { paths })
    doScan(targetDir)
  }, [loadedPath])

  const { isDragging } = useFileDrop(handleDrop)

  async function executeDelete(paths: string[]) {
    setDeleting(true)
    setDeleteConfirm(null)
    try {
      const deleted = await invoke<string[]>("move_multiple_to_trash", { paths })
      const stems = new Set(
        deleted.map((p) => {
          const name = p.replace(/\\/g, "/").split("/").pop() ?? ""
          return name.replace(/\.[^.]+$/, "")
        })
      )
      for (const key of stems) {
        useRatingStore.getState().batchClearAllMarks([key])
      }
      setImages((prev) => prev.filter((g) => !stems.has(g.base_name)))
      useSelectionStore.getState().clearSelection()
      setToast(`已将 ${deleted.length} 个文件移入回收站`)
    } catch (e) {
      setToast(`删除失败: ${e}`)
    } finally {
      setDeleting(false)
    }
  }

  const handleExport = useCallback(async (destDir: string, exportJpg: boolean, exportRaw: boolean, isMove: boolean) => {
    const selected = [...useSelectionStore.getState().selectedKeys]
    try {
      const result = await invoke<[number, string[]]>("export_images", {
        baseNames: selected,
        sourceDir: loadedPath ?? inputPath,
        destDir,
        exportJpg,
        exportRaw,
        isMove,
      })
      const [count, errors] = result
      if (errors.length > 0) {
        setToast(`导出完成: ${count} 张成功, 错误: ${errors.join("; ")}`)
      } else {
        setToast(`成功导出 ${count} 个文件到目标文件夹`)
      }
      if (isMove) {
        const movedKeys = new Set(selected)
        for (const key of movedKeys) useRatingStore.getState().batchClearAllMarks([key])
        setImages((prev) => prev.filter((g) => !movedKeys.has(g.base_name)))
        useSelectionStore.getState().clearSelection()
      }
    } catch (e) {
      setToast(`导出失败: ${e}`)
    }
    setShowExport(false)
  }, [loadedPath, inputPath])

  const triggerDelete = useCallback(() => {
    const selected = [...useSelectionStore.getState().selectedKeys]
    if (selected.length === 0) return
    const paths: string[] = []
    for (const key of selected) {
      const img = images.find((g) => g.base_name === key)
      if (!img) continue
      if (img.jpg_path) paths.push(img.jpg_path)
      if (img.raw_path) paths.push(img.raw_path)
      const xmp = img.jpg_path?.replace(/\.[^.]+$/, ".xmp") ?? img.raw_path?.replace(/\.[^.]+$/, ".xmp")
      if (xmp) paths.push(xmp)
    }
    if (paths.length === 0) return
    if (selected.length > 5) {
      setDeleteConfirm({ paths, count: selected.length })
    } else {
      executeDelete(paths)
    }
  }, [images])

  const isFilmstrip = viewMode === "filmstrip"

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (viewerIndex != null) return
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === "INPUT" || tag === "TEXTAREA") return

          if (e.key === "Tab") {
        e.preventDefault()
        setViewMode((prev) => (prev === "grid" ? "filmstrip" : "grid"))
        return
      }

      const ctrl = e.ctrlKey || e.metaKey

      if (ctrl && e.key === "z" && !e.shiftKey) {
        e.preventDefault()
        useUndoStore.getState().applyUndo()
        return
      }
      if (ctrl && e.key === "Z" && e.shiftKey || ctrl && e.key === "z" && e.shiftKey) {
        e.preventDefault()
        useUndoStore.getState().applyRedo()
        return
      }

      if (ctrl && e.key === "a") {
        e.preventDefault()
        useSelectionStore.getState().selectAll(allKeys)
        return
      }
      if (ctrl && e.shiftKey && e.key === "I") {
        e.preventDefault()
        useSelectionStore.getState().invertSelection(allKeys)
        return
      }

      if (e.key === "Delete") {
        e.preventDefault()
        triggerDelete()
        return
      }

      const isRatingKey =
        (e.key >= "0" && e.key <= "9") ||
        e.key === "x" || e.key === "X" ||
        e.key === "u" || e.key === "U"

      if (!isRatingKey) return

      const targetKeys = isFilmstrip
        ? (() => { const ak = useActiveKeyStore.getState().key; return ak ? [ak] : [] })()
        : [...useSelectionStore.getState().selectedKeys]

      if (targetKeys.length === 0) return

      e.preventDefault()
      const rs = useRatingStore.getState()

      if (e.key === "0") {
        rs.batchSetStars(targetKeys, 0)
      } else if (e.key >= "1" && e.key <= "5") {
        rs.batchSetStars(targetKeys, Number(e.key))
      } else if (e.key >= "6" && e.key <= "9") {
        rs.batchSetColor(targetKeys, Number(e.key))
      } else if (e.key === "x" || e.key === "X") {
        rs.batchToggleRejected(targetKeys)
      } else if (e.key === "u" || e.key === "U") {
        rs.batchClearAllMarks(targetKeys)
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [viewerIndex, allKeys, isFilmstrip, triggerDelete])

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
          value={inputPath}
          onChange={(e) => setInputPath(e.target.value)}
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
        orderedKeys={allKeys}
        onDelete={deleting ? undefined : triggerDelete}
        onExport={selectedCount > 0 ? () => setShowExport(true) : undefined}
      />

      {loading && (
        <div className="flex items-center gap-3 my-6 text-neutral-400 shrink-0">
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-sm">正在扫描 {inputPath}...</span>
        </div>
      )}

      <div className="flex-1 flex flex-col min-h-0 mt-3">
        {viewMode === "grid" ? (
          <GridView
            groups={burstGroups}
            onOpenViewer={openViewer}
            copiedTags={copiedTags}
            onCopyTags={setCopiedTags}
          />
        ) : (
          <FilmstripView groups={burstGroups} copiedTags={copiedTags} onCopyTags={setCopiedTags} />
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

      {deleteConfirm && (
        <ConfirmDialog
          message={`将删除 ${deleteConfirm.count} 张照片及其关联文件（JPG/RAW/XMP），此操作使用系统回收站，可恢复。`}
          onConfirm={() => executeDelete(deleteConfirm.paths)}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}

      {showExport && (
        <ExportModal
          count={selectedCount}
          onExport={handleExport}
          onCancel={() => setShowExport(false)}
        />
      )}

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  )
}
