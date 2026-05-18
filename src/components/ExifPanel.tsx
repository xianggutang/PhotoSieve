import type { ExifData } from "../types"

interface ExifPanelProps {
  exif: ExifData | null | undefined
}

const FIELDS: { key: keyof ExifData; label: string }[] = [
  { key: "date_time", label: "拍摄时间" },
  { key: "camera_model", label: "相机型号" },
  { key: "aperture", label: "光圈" },
  { key: "shutter_speed", label: "快门" },
  { key: "iso", label: "ISO速度" },
  { key: "focal_length", label: "焦距" },
]

export default function ExifPanel({ exif }: ExifPanelProps) {
  if (exif === undefined) {
    return (
      <div className="w-full h-full bg-neutral-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-neutral-500">
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-xs">读取 EXIF...</span>
        </div>
      </div>
    )
  }

  if (exif === null || !Object.values(exif).some(Boolean)) {
    return (
      <div className="w-full h-full bg-neutral-950 flex items-center justify-center text-neutral-600 text-xs">
        无 EXIF 数据
      </div>
    )
  }

  return (
    <div className="w-full h-full bg-neutral-950 overflow-y-auto">
      <div className="p-3 space-y-3">
        {FIELDS.map(({ key, label }) => {
          const value = exif[key]
          return (
            <div key={key} className="space-y-0.5">
              <div className="text-[10px] text-neutral-500 uppercase tracking-wide">{label}</div>
              <div className="text-xs text-neutral-200 leading-tight">
                {value || <span className="text-neutral-700">—</span>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
