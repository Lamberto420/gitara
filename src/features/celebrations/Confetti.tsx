import { useEffect, useRef } from 'react'

const COLORS = ['#ff8c1a', '#2fbf55', '#3b82f6', '#a855f7', '#ef4136', '#f5c400']
const COUNT = 140
const DURATION_MS = 3000

interface Piece {
  x: number
  y: number
  vx: number
  vy: number
  angle: number
  spin: number
  size: number
  color: string
}

/**
 * Konfetti na canvasie – własne, bez zależności. Wystrzał z dołu ekranu, potem opada.
 * Przy systemowym „ogranicz animacje” nic nie rysujemy.
 */
export default function Confetti() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const g = canvas?.getContext('2d')
    if (!canvas || !g || matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const dpr = window.devicePixelRatio || 1
    const w = window.innerWidth
    const h = window.innerHeight
    canvas.width = w * dpr
    canvas.height = h * dpr
    g.scale(dpr, dpr)

    const pieces: Piece[] = Array.from({ length: COUNT }, () => ({
      x: w * (0.2 + Math.random() * 0.6),
      y: h + 10,
      vx: (Math.random() - 0.5) * 9,
      vy: -(h / 45) * (0.7 + Math.random() * 0.6), // wysokość lotu zależna od ekranu
      angle: Math.random() * Math.PI,
      spin: (Math.random() - 0.5) * 0.4,
      size: 6 + Math.random() * 6,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    }))

    const started = performance.now()
    let raf = 0
    const draw = (now: number) => {
      const t = now - started
      g.clearRect(0, 0, w, h)
      g.globalAlpha = Math.min(1, (DURATION_MS - t) / 600) // wygaszanie pod koniec
      for (const p of pieces) {
        p.vy += 0.35 // grawitacja
        p.vx *= 0.99 // opór powietrza
        p.vy = Math.min(p.vy, 4) // papierek opada powoli
        p.x += p.vx
        p.y += p.vy
        p.angle += p.spin
        g.save()
        g.translate(p.x, p.y)
        g.rotate(p.angle)
        g.fillStyle = p.color
        g.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2)
        g.restore()
      }
      if (t < DURATION_MS) raf = requestAnimationFrame(draw)
      else g.clearRect(0, 0, w, h)
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [])

  return <canvas ref={canvasRef} className="confetti" aria-hidden="true" />
}
