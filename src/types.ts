export interface ImageGroup {
  base_name: string
  jpg_path: string | null
  raw_path: string | null
  size: number
  timestamp: number
}

export interface ExifData {
  date_time?: string
  camera_model?: string
  aperture?: string
  shutter_speed?: string
  iso?: string
  focal_length?: string
}

export interface BurstGroup {
  key: string
  type: "burst" | "single"
  items: ImageGroup[]
}
