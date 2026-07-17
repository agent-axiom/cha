import { useEffect, useRef } from 'react'
import { useReducedMotion } from '../hooks/useReducedMotion'

interface MistParticle {
  x: number
  y: number
  radius: number
  speed: number
  drift: number
  opacity: number
}

export function FogCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || reducedMotion) return undefined

    const context = canvas.getContext('2d')
    if (!context) return undefined

    let width = 0
    let height = 0
    let frame = 0
    let pointerX = 0.52
    let pointerY = 0.5
    let particles: MistParticle[] = []

    const makeParticle = (index: number): MistParticle => ({
      x: ((index * 97) % 101) / 100,
      y: 0.18 + (((index * 47) % 71) / 100),
      radius: 130 + ((index * 41) % 210),
      speed: 0.000035 + (index % 5) * 0.000012,
      drift: ((index % 2 === 0 ? 1 : -1) * (10 + (index % 6) * 7)),
      opacity: 0.016 + (index % 4) * 0.008,
    })

    const resize = () => {
      const bounds = canvas.getBoundingClientRect()
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5)
      width = bounds.width
      height = bounds.height
      canvas.width = Math.max(1, Math.floor(width * ratio))
      canvas.height = Math.max(1, Math.floor(height * ratio))
      context.setTransform(ratio, 0, 0, ratio, 0, 0)
      particles = Array.from({ length: width < 720 ? 10 : 18 }, (_, index) => makeParticle(index))
    }

    const movePointer = (event: PointerEvent) => {
      pointerX = event.clientX / Math.max(window.innerWidth, 1)
      pointerY = event.clientY / Math.max(window.innerHeight, 1)
    }

    const draw = (time: number) => {
      context.clearRect(0, 0, width, height)
      context.globalCompositeOperation = 'screen'

      particles.forEach((particle, index) => {
        const cycle = (particle.x + time * particle.speed) % 1.32
        const x = (cycle - 0.16) * width + (pointerX - 0.5) * particle.drift
        const y = particle.y * height + Math.sin(time * 0.00012 + index) * 22 + (pointerY - 0.5) * 14
        const gradient = context.createRadialGradient(x, y, 0, x, y, particle.radius)
        gradient.addColorStop(0, `rgba(220, 232, 214, ${particle.opacity})`)
        gradient.addColorStop(0.45, `rgba(190, 205, 191, ${particle.opacity * 0.72})`)
        gradient.addColorStop(1, 'rgba(140, 159, 149, 0)')
        context.fillStyle = gradient
        context.beginPath()
        context.arc(x, y, particle.radius, 0, Math.PI * 2)
        context.fill()
      })

      frame = requestAnimationFrame(draw)
    }

    resize()
    window.addEventListener('resize', resize)
    window.addEventListener('pointermove', movePointer, { passive: true })
    frame = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', movePointer)
    }
  }, [reducedMotion])

  return <canvas ref={canvasRef} className="fog-canvas" aria-hidden="true" />
}
