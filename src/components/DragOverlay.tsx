interface DragOverlayProps {
  visible: boolean
}

export default function DragOverlay({ visible }: DragOverlayProps) {
  if (!visible) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-blue-600/30 backdrop-blur-sm pointer-events-none">
      <div className="bg-neutral-900 border-2 border-blue-400 border-dashed rounded-2xl px-12 py-10 text-center shadow-2xl">
        <svg className="w-16 h-16 mx-auto mb-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
        </svg>
        <p className="text-blue-400 text-xl font-semibold">松开以导入</p>
        <p className="text-neutral-400 text-sm mt-1">支持图片文件或文件夹</p>
      </div>
    </div>
  )
}
