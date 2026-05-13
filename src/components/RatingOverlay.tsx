import { useRatingStore, COLOR_LABELS } from "../stores/ratingStore"

interface RatingOverlayProps {
  baseName: string
}

export default function RatingOverlay({ baseName }: RatingOverlayProps) {
  const rating = useRatingStore((s) => s.ratings[baseName])
  if (!rating || (!rating.stars && !rating.color && !rating.isRejected)) return null
  const hasStar = (rating.stars ?? 0) > 0
  const hasColor = (rating.color ?? 0) > 0

  return (
    <div className="absolute top-1.5 left-1.5 flex flex-col gap-0.5 pointer-events-none z-10">
      {hasStar && rating.stars != null && (
        <span className="flex items-center gap-0.5 text-yellow-400 text-[11px] leading-none drop-shadow">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 2l2.4 7.4h7.6l-6 4.6 2.2 7.4-6.2-4.6-6.2 4.6 2.2-7.4-6-4.6h7.6L12 2z" />
          </svg>
          <span>{rating.stars}</span>
        </span>
      )}
      {hasColor && rating.color != null && (
        <ColorDot color={rating.color} />
      )}
      {rating.isRejected && (
        <span className="text-red-500 text-xs leading-none drop-shadow">✕</span>
      )}
    </div>
  )
}

function ColorDot({ color }: { color: number }) {
  const info = COLOR_LABELS[color]
  if (!info) return null
  return (
    <span
      className="inline-block w-3 h-3 rounded-full border border-white/30"
      style={{ backgroundColor: info.hex }}
    />
  )
}
