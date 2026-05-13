import { useEffect, useState, useCallback } from "react"
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow"
import type { UnlistenFn } from "@tauri-apps/api/event"

interface UseFileDropResult {
  isDragging: boolean
}

export default function useFileDrop(onDrop: (paths: string[]) => void): UseFileDropResult {
  const [isDragging, setIsDragging] = useState(false)

  const handleDrop = useCallback(
    (paths: string[]) => {
      setIsDragging(false)
      onDrop(paths)
    },
    [onDrop]
  )

  useEffect(() => {
    let unlisten: UnlistenFn | undefined

    async function setup() {
      unlisten = await getCurrentWebviewWindow().onDragDropEvent((event) => {
        switch (event.payload.type) {
          case "enter":
            setIsDragging(true)
            break
          case "leave":
            setIsDragging(false)
            break
          case "drop":
            handleDrop(event.payload.paths)
            break
          case "over":
            break
        }
      })
    }

    setup()

    return () => {
      if (unlisten) unlisten()
    }
  }, [handleDrop])

  return { isDragging }
}
