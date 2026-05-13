import LocalImage from "./LocalImage"
import type { ImageGroup } from "../types"

interface ThumbCardProps {
  group: ImageGroup
  isSelected: boolean
  onClick?: (e: React.MouseEvent) => void
  onDoubleClick?: () => void
  onContextMenu?: (e: React.MouseEvent) => void
}

export default function ThumbCard({ group, isSelected, onClick, onDoubleClick, onContextMenu }: ThumbCardProps) {
  return (
    <div
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
      className={`bg-neutral-800 rounded-lg overflow-hidden flex flex-col h-full cursor-pointer transition-shadow ${
        isSelected
          ? "ring-2 ring-blue-500"
          : "hover:ring-2 hover:ring-neutral-600"
      }`}
    >
      <div className="flex-1 bg-neutral-900 flex items-center justify-center min-h-0 relative">
        {group.jpg_path ? (
          <>
            <LocalImage
              absolutePath={group.jpg_path}
              alt={group.base_name}
              className="w-full h-full object-contain"
            />
            {isSelected && (
              <div className="absolute inset-0 bg-blue-500/15 flex items-center justify-center">
                <svg className="w-10 h-10 text-white drop-shadow-lg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center gap-1 text-neutral-600">
            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
            </svg>
            <span className="text-xs">RAW</span>
            {isSelected && (
              <div className="absolute inset-0 bg-blue-500/15 flex items-center justify-center">
                <svg className="w-10 h-10 text-white drop-shadow-lg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            )}
          </div>
        )}
      </div>
      <div className="px-2 py-1 shrink-0 flex items-center justify-between bg-neutral-800" style={{ height: 28 }}>
        <span className="text-xs text-neutral-300 truncate flex-1">{group.base_name}</span>
        {group.raw_path && (
          <span className="text-[10px] text-amber-500/70 ml-1 shrink-0">RAW</span>
        )}
      </div>
    </div>
  )
}
