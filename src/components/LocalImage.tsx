import { convertFileSrc } from "@tauri-apps/api/core"

interface LocalImageProps {
  absolutePath: string | null
  alt?: string
  className?: string
}

export default function LocalImage({ absolutePath, alt = "", className }: LocalImageProps) {
  if (!absolutePath) {
    return null
  }
  const src = convertFileSrc(absolutePath)
  return <img src={src} alt={alt} className={className} />
}
