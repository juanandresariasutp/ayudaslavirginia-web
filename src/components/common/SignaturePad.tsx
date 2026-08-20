import React, { useRef } from 'react'

interface SignaturePadProps {
  value: string
  onChange: (value: string) => void
}

type SignaturePoint = { x: number; y: number }

export function SignaturePad({ value: _value, onChange }: SignaturePadProps) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const strokes = useRef<SignaturePoint[][]>([])
  const activeStroke = useRef<SignaturePoint[] | null>(null)

  function coordinates(event: React.PointerEvent<HTMLCanvasElement>): SignaturePoint {
    const rect = event.currentTarget.getBoundingClientRect()
    return {
      x: Math.round(((event.clientX - rect.left) * 560) / rect.width),
      y: Math.round(((event.clientY - rect.top) * 180) / rect.height)
    }
  }

  function context() {
    const drawingContext = canvas.current?.getContext('2d')
    if (drawingContext) {
      drawingContext.strokeStyle = '#17352b'
      drawingContext.fillStyle = '#17352b'
      drawingContext.lineWidth = 3
      drawingContext.lineCap = 'round'
      drawingContext.lineJoin = 'round'
    }
    return drawingContext
  }

  function compactSvg() {
    const lines = strokes.current
      .filter(stroke => stroke.length)
      .map(stroke => {
        const points =
          stroke.length === 1
            ? `${stroke[0].x},${stroke[0].y} ${stroke[0].x + 1},${stroke[0].y}`
            : stroke.map(point => `${point.x},${point.y}`).join(' ')
        return `<polyline points="${points}"/>`
      })
      .join('')
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 180"><g fill="none" stroke="#17352b" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">${lines}</g></svg>`
  }

  function start(event: React.PointerEvent<HTMLCanvasElement>) {
    event.preventDefault()
    const point = coordinates(event)
    const stroke = [point]
    strokes.current.push(stroke)
    activeStroke.current = stroke
    const drawingContext = context()
    drawingContext?.beginPath()
    drawingContext?.arc(point.x, point.y, 1.5, 0, Math.PI * 2)
    drawingContext?.fill()
    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {
      /* Safari fallback */
    }
    onChange(compactSvg())
  }

  function move(event: React.PointerEvent<HTMLCanvasElement>) {
    const stroke = activeStroke.current
    if (!stroke) return
    event.preventDefault()
    const next = coordinates(event)
    const previous = stroke[stroke.length - 1]
    if (Math.hypot(next.x - previous.x, next.y - previous.y) < 3) return
    stroke.push(next)
    const drawingContext = context()
    if (drawingContext) {
      drawingContext.beginPath()
      drawingContext.moveTo(previous.x, previous.y)
      drawingContext.lineTo(next.x, next.y)
      drawingContext.stroke()
    }
    onChange(compactSvg())
  }

  function end(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!activeStroke.current) return
    event.preventDefault()
    activeStroke.current = null
    onChange(compactSvg())
  }

  function clear() {
    strokes.current = []
    activeStroke.current = null
    context()?.clearRect(0, 0, 560, 180)
    onChange('')
  }

  return (
    <div className="signature">
      <canvas
        ref={canvas}
        width="560"
        height="180"
        aria-label="Área para firma digital"
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
      />
      <div className="signature-help">
        <button type="button" className="text-button" onClick={clear}>
          Limpiar firma
        </button>
      </div>
    </div>
  )
}
