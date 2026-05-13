import type { ImageGroup, BurstGroup } from "../types"

export function groupBurstPhotos(images: ImageGroup[]): BurstGroup[] {
  const sorted = [...images].sort((a, b) => a.timestamp - b.timestamp)
  const groups: BurstGroup[] = []
  let i = 0
  while (i < sorted.length) {
    const burst: ImageGroup[] = [sorted[i]]
    let j = i + 1
    while (j < sorted.length && sorted[j].timestamp - sorted[j - 1].timestamp <= 1) {
      burst.push(sorted[j])
      j++
    }
    groups.push({
      key: burst[0].base_name,
      type: burst.length > 1 ? "burst" : "single",
      items: burst,
    })
    i = j
  }
  return groups
}

export function flattenBurstKeys(groups: BurstGroup[]): string[] {
  return groups.flatMap((g) => g.items.map((item) => item.base_name))
}
