import type { BurstGroup } from "../types"
import type { RatingInfo } from "../stores/ratingStore"
import type { FilterValues } from "../stores/filterStore"

const ZERO_RATING: RatingInfo = { stars: 0, color: 0, isRejected: false }

export function filterImages(
  groups: BurstGroup[],
  filters: FilterValues,
  ratings: Record<string, RatingInfo>,
): BurstGroup[] {
  const noFilter = filters.stars.length === 0 && filters.colors.length === 0 && !filters.rejectedOnly
  if (noFilter) return groups

  const hasStarFilter = filters.stars.length > 0
  const hasColorFilter = filters.colors.length > 0
  const hasRejectedFilter = filters.rejectedOnly

  return groups
    .map((g) => {
      const filtered = g.items.filter((item) => {
        const rating = ratings[item.base_name] ?? ZERO_RATING

        const passStar = !hasStarFilter || (rating.stars != null && filters.stars.includes(rating.stars))
        const passColor = !hasColorFilter || (rating.color != null && filters.colors.includes(rating.color))
        const passRejected = hasRejectedFilter ? rating.isRejected : true

        return passStar && passColor && passRejected
      })
      if (filtered.length === 0) return null
      return { ...g, items: filtered }
    })
    .filter((g): g is BurstGroup => g !== null)
}
