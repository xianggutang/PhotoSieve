import { useRef, useEffect } from "react"
import type { HistoData } from "../hooks/useHistogram"

interface HistogramProps {
  data: HistoData | null
  width?: number
  height?: number
}

export default function Histogram({ data, width = 260, height = 100 }: HistogramProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    canvas.width = width
    canvas.height = height
    ctx.clearRect(0, 0, width, height)

    if (!data || data.max_count === 0) {
      ctx.strokeStyle = "rgba(255,255,255,0.08)"
      ctx.lineWidth = 0.5
      ctx.setLineDash([2, 4])
      ctx.strokeRect(4, 4, width - 8, height - 8)
      ctx.setLineDash([])
      return
    }

    const { r, g, b, luma, max_count } = data
    const barW = width / 256
    const scale = height / max_count

    const drawBars = (values: number[], color: string) => {
      ctx.fillStyle = color
      for (let i = 0; i < 256; i++) {
        const h = values[i] * scale
        if (h > 0) {
          ctx.fillRect(i * barW, height - h, Math.ceil(barW), h)
        }
      }
    }

    drawBars(r, "rgba(255, 68, 68, 0.3)")
    drawBars(g, "rgba(68, 255, 68, 0.3)")
    drawBars(b, "rgba(68, 68, 255, 0.3)")

    ctx.beginPath()
    ctx.strokeStyle = "rgba(255, 255, 255, 0.9)"
    ctx.lineWidth = 1.5
    for (let i = 0; i < 256; i++) {
      const x = i * barW + barW / 2
      const y = height - luma[i] * scale
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()
  }, [data, width, height])

  return (
    <canvas
      ref={canvasRef}
      className="block w-full"
      style={{ aspectRatio: `${width}/${height}` }}
    />
  )
}
