import { useSelectionStore } from "../stores/selectionStore"

interface ToolbarProps {
  viewMode: "grid" | "filmstrip"
  onViewModeChange: (mode: "grid" | "filmstrip") => void
  orderedKeys: string[]
  isComparing?: boolean
}

export default function Toolbar({ viewMode, onViewModeChange, orderedKeys, isComparing = false }: ToolbarProps) {
  const selectAll = useSelectionStore((s) => s.selectAll)
  const clearSelection = useSelectionStore((s) => s.clearSelection)
  const selectedCount = useSelectionStore((s) => s.selectedKeys.size)

  const allSelected = orderedKeys.length > 0 && selectedCount === orderedKeys.length

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

        <ToolbarBtn label="星级筛选" disabled>
          <path d="M12 2l2.4 7.4h7.6l-6 4.6 2.2 7.4-6.2-4.6-6.2 4.6 2.2-7.4-6-4.6h7.6L12 2z" />
        </ToolbarBtn>
        <ToolbarBtn label="颜色筛选" disabled>
          <circle cx="12" cy="12" r="10" />
        </ToolbarBtn>
        <ToolbarBtn label="待删筛选" disabled>
          <path d="M3 6h18M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2M5 6l1 14a1 1 0 001 1h10a1 1 0 001-1l1-14" />
        </ToolbarBtn>

        <div className="w-px h-5 bg-neutral-700 mx-1" />

        <ToolbarBtn
          label="清除选中标记"
          disabled={selectedCount === 0}
        >
          <path d="M6.7 6.7L12 12l5.3-5.3M17.3 6.7L12 12l-5.3 5.3" />
        </ToolbarBtn>

        <ToolbarBtn label={allSelected ? "取消全选" : "全选"} onClick={() => allSelected ? clearSelection() : selectAll(orderedKeys)}>
          <path d="M4 6h16M4 10h16M4 14h10" />
        </ToolbarBtn>

        <ToolbarBtn label="删除（移入回收站）" disabled>
          <path d="M4 7h16v14a2 2 0 01-2 2H6a2 2 0 01-2-2V7zm3-3V2a1 1 0 011-1h8a1 1 0 011 1v2M10 11v6M14 11v6" />
        </ToolbarBtn>
      </div>
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

function ToolbarBtn({ label, disabled = false, onClick, children }: { label: string; disabled?: boolean; onClick?: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      className={`flex items-center justify-center w-8 h-8 rounded transition-colors ${
        disabled
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
