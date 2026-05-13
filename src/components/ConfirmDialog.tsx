interface ConfirmDialogProps {
  message: string
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({ message, onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60" onClick={onCancel}>
      <div
        className="bg-neutral-800 border border-neutral-700 rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 mb-5">
          <svg className="w-6 h-6 text-red-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          <p className="text-sm text-neutral-200 leading-relaxed">{message}</p>
        </div>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-1.5 text-sm text-neutral-400 hover:text-white bg-neutral-700 hover:bg-neutral-600 rounded transition-colors"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-1.5 text-sm text-white bg-red-600 hover:bg-red-500 rounded transition-colors"
          >
            确认删除
          </button>
        </div>
      </div>
    </div>
  )
}
