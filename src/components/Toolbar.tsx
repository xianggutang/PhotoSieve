import { useState, useEffect, useRef } from "react"
import { useSelectionStore } from "../stores/selectionStore"
import { useRatingStore, COLOR_LABELS } from "../stores/ratingStore"
import { useFilterStore } from "../stores/filterStore"

interface ToolbarProps {
  viewMode: "grid" | "filmstrip"
  onViewModeChange: (mode: "grid" | "filmstrip") => void
  orderedKeys: string[]
  isComparing?: boolean
  onDelete?: () => void
  onExport?: () => void
}

export default function Toolbar({ viewMode, onViewModeChange, orderedKeys, isComparing = false, onDelete, onExport }: ToolbarProps) {
  const selectAll = useSelectionStore((s) => s.selectAll)
  const clearSelection = useSelectionStore((s) => s.clearSelection)
  const selectedKeys = useSelectionStore((s) => s.selectedKeys)
  const selectedCount = selectedKeys.size
  const batchClearAllMarks = useRatingStore((s) => s.batchClearAllMarks)

  const allSelected = orderedKeys.length > 0 && selectedCount === orderedKeys.length

  const [openPanel, setOpenPanel] = useState<"stars" | "colors" | null>(null)

  return (
    <div className="flex items-center justify-between h-10 px-3 bg-neutral-950 border-b border-neutral-700/50 shrink-0 gap-2">
      <div className="flex items-center gap-1">
        <ViewToggle active={viewMode === "grid"} onClick={() => onViewModeChange("grid")} label="网格视图">
          <path d="M3 3h7v7H3V3zm11 0h7v7h-7V3zM3 14h7v7H3v-7zm11 0h7v7h-7v-7z" />
        </ViewToggle>
        <ViewToggle active={viewMode === "filmstrip"} onClick={() => onViewModeChange("filmstrip")} label="胶片视图">
          <path d="M2 5h20v3H2V5zm0 5h20v1.5H2V10zm0 3.5h20V15H2v-1.5zM2 16h20v3H2v-3z" />
        </ViewToggle>
      </div>

      <div className="flex items-center gap-1">
        {isComparing && (
          <ToolbarBtn label="切换分割方向" disabled>
            <path d="M5 7h14M5 12h14M5 17h14" />
          </ToolbarBtn>
        )}

        <StarFilterBtn open={openPanel === "stars"} onToggle={() => setOpenPanel(openPanel === "stars" ? null : "stars")} />
        <ColorFilterBtn open={openPanel === "colors"} onToggle={() => setOpenPanel(openPanel === "colors" ? null : "colors")} />
        <RejectedFilterBtn />

        <div className="w-px h-5 bg-neutral-700 mx-1" />

        <ToolbarBtn
          label="清除选中标记"
          disabled={selectedCount === 0}
          onClick={() => batchClearAllMarks([...selectedKeys])}
        >
          <path d="M6.7 6.7L12 12l5.3-5.3M17.3 6.7L12 12l-5.3 5.3" />
        </ToolbarBtn>

        <ToolbarBtn label={allSelected ? "取消全选" : "全选"} onClick={() => allSelected ? clearSelection() : selectAll(orderedKeys)}>
          <path d="M4 6h16M4 10h16M4 14h10" />
        </ToolbarBtn>

        <ToolbarBtn label="导出" disabled={!onExport} onClick={onExport}>
          <path d="M4 12v6a2 2 0 002 2h12a2 2 0 002-2v-6M12 2v12M8 9l4-5 4 5" />
        </ToolbarBtn>

        <ToolbarBtn label="删除（移入回收站）" disabled={!onDelete} onClick={onDelete}>
          <path d="M4 7h16v14a2 2 0 01-2 2H6a2 2 0 01-2-2V7zm3-3V2a1 1 0 011-1h8a1 1 0 011 1v2M10 11v6M14 11v6" />
        </ToolbarBtn>
      </div>
    </div>
  )
}

function StarFilterBtn({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const stars = useFilterStore((s) => s.stars)
  const setStars = useFilterStore((s) => s.setStars)

  return (
    <div className="relative">
      <ToolbarBtn label="星级筛选" active={open} onClick={onToggle}>
        <path d="M12 2l2.4 7.4h7.6l-6 4.6 2.2 7.4-6.2-4.6-6.2 4.6 2.2-7.4-6-4.6h7.6L12 2z" />
      </ToolbarBtn>
      {open && (
        <DropdownPanel onClose={onToggle}>
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} className="flex items-center gap-2 px-3 py-1.5 hover:bg-neutral-700 cursor-pointer text-sm text-neutral-300">
              <input
                type="checkbox"
                checked={stars.includes(n)}
                onChange={() => setStars(stars.includes(n) ? stars.filter((s) => s !== n) : [...stars, n])}
                className="accent-blue-500"
              />
              <span className="text-yellow-400">{Array(n).fill("⭐").join("")}</span>
            </label>
          ))}
        </DropdownPanel>
      )}
    </div>
  )
}

function ColorFilterBtn({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const colors = useFilterStore((s) => s.colors)
  const setColors = useFilterStore((s) => s.setColors)

  return (
    <div className="relative">
      <ToolbarBtn label="颜色筛选" active={open} onClick={onToggle}>
        <circle cx="12" cy="12" r="10" />
      </ToolbarBtn>
      {open && (
        <DropdownPanel onClose={onToggle}>
          {Object.entries(COLOR_LABELS).map(([num, { label, hex }]) => {
            const n = Number(num)
            return (
              <label key={num} className="flex items-center gap-2 px-3 py-1.5 hover:bg-neutral-700 cursor-pointer text-sm text-neutral-300">
                <input
                  type="checkbox"
                  checked={colors.includes(n)}
                  onChange={() => setColors(colors.includes(n) ? colors.filter((c) => c !== n) : [...colors, n])}
                  className="accent-blue-500"
                />
                <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: hex }} />
                {label}
              </label>
            )
          })}
        </DropdownPanel>
      )}
    </div>
  )
}

function RejectedFilterBtn() {
  const rejectedOnly = useFilterStore((s) => s.rejectedOnly)
  const toggle = () => useFilterStore.getState().setRejectedOnly(!rejectedOnly)

  return (
    <ToolbarBtn label="待删筛选" active={rejectedOnly} onClick={toggle}>
      <path d="M3 6h18M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2M5 6l1 14a1 1 0 001 1h10a1 1 0 001-1l1-14" />
    </ToolbarBtn>
  )
}

function DropdownPanel({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [onClose])

  return (
    <div ref={ref} className="absolute top-full right-0 mt-1 bg-neutral-800 border border-neutral-700 rounded-lg shadow-xl py-1 z-50 min-w-[140px]">
      {children}
    </div>
  )
}

function ViewToggle({ active, onClick, label, children }: { active: boolean; onClick: () => void; label: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`relative flex items-center justify-center w-8 h-8 rounded transition-colors ${
        active
          ? "bg-neutral-600 text-white"
          : "text-neutral-400 hover:text-white hover:bg-neutral-700"
      }`}
    >
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        {children}
      </svg>
    </button>
  )
}

function ToolbarBtn({ label, disabled = false, active = false, onClick, children }: {
  label: string
  disabled?: boolean
  active?: boolean
  onClick?: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      className={`flex items-center justify-center w-8 h-8 rounded transition-colors ${
        active
          ? "text-blue-400 bg-neutral-700"
          : disabled
            ? "text-neutral-600 cursor-not-allowed"
            : "text-neutral-400 hover:text-white hover:bg-neutral-700"
      }`}
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        {children}
      </svg>
    </button>
  )
}
