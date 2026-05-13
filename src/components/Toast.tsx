import { useEffect } from "react"

interface ToastProps {
  message: string
  onDone: () => void
}

export default function Toast({ message, onDone }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onDone, 2500)
    return () => clearTimeout(t)
  }, [onDone])

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] bg-neutral-800 border border-neutral-700 text-neutral-200 text-sm px-5 py-2.5 rounded-lg shadow-xl animate-[fadeIn_0.2s_ease-out]">
      {message}
    </div>
  )
}
