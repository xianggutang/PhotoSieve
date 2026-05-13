import { useState } from "react"
import { open } from "@tauri-apps/plugin-dialog"

interface ExportModalProps {
  count: number
  onExport: (destDir: string, exportJpg: boolean, exportRaw: boolean, isMove: boolean) => void
  onCancel: () => void
}

export default function ExportModal({ count, onExport, onCancel }: ExportModalProps) {
  const [exportJpg, setExportJpg] = useState(true)
  const [exportRaw, setExportRaw] = useState(true)
  const [isMove, setIsMove] = useState(false)
  const [destDir, setDestDir] = useState("")
  const [busy, setBusy] = useState(false)

  const atLeastOne = exportJpg || exportRaw

  const handleSelectDir = async () => {
    const result = await open({ directory: true, multiple: false, title: "选择导出目标文件夹" })
    if (result) setDestDir(result as string)
  }

  const handleStart = async () => {
    if (!atLeastOne || !destDir) return
    setBusy(true)
    await onExport(destDir, exportJpg, exportRaw, isMove)
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60" onClick={onCancel}>
      <div
        className="bg-neutral-800 border border-neutral-700 rounded-xl shadow-2xl p-6 max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-sm font-medium text-neutral-200 mb-4">导出照片</h3>
        <p className="text-xs text-neutral-400 mb-4">已选中 {count} 张照片</p>

        <div className="space-y-3 mb-5">
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-sm text-neutral-300 cursor-pointer">
              <input type="checkbox" checked={exportJpg} onChange={(e) => setExportJpg(e.target.checked)} className="accent-blue-500" />
              导出 JPG
            </label>
            <label className="flex items-center gap-2 text-sm text-neutral-300 cursor-pointer">
              <input type="checkbox" checked={exportRaw} onChange={(e) => setExportRaw(e.target.checked)} className="accent-blue-500" />
              导出 RAW
            </label>
          </div>

          <div className="flex items-center gap-6">
            <label className={`flex items-center gap-2 text-sm cursor-pointer ${isMove ? "text-red-400" : "text-neutral-300"}`}>
              <input type="radio" name="mode" checked={isMove} onChange={() => setIsMove(true)} className="accent-red-500" />
              移动（从原位置删除）
            </label>
            <label className={`flex items-center gap-2 text-sm cursor-pointer ${!isMove ? "text-blue-400" : "text-neutral-300"}`}>
              <input type="radio" name="mode" checked={!isMove} onChange={() => setIsMove(false)} className="accent-blue-500" />
              复制（保留原文件）
            </label>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSelectDir}
              className="px-3 py-1.5 text-xs text-neutral-300 bg-neutral-700 hover:bg-neutral-600 rounded transition-colors shrink-0"
            >
              选择文件夹
            </button>
            <span className={`text-xs truncate ${destDir ? "text-neutral-300" : "text-neutral-600"}`}>
              {destDir || "未选择目标文件夹"}
            </span>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-1.5 text-sm text-neutral-400 hover:text-white bg-neutral-700 hover:bg-neutral-600 rounded transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleStart}
            disabled={busy || !atLeastOne || !destDir}
            className="px-4 py-1.5 text-sm text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed rounded transition-colors flex items-center gap-2"
          >
            {busy && (
              <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            开始导出
          </button>
        </div>
      </div>
    </div>
  )
}
