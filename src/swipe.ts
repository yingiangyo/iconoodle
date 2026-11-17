import { useRef, type PointerEvent as ReactPointerEvent, type SyntheticEvent } from "react"

const SWIPE_DISTANCE = 48
const SWIPE_SPEED = 0.45

export function swipeStep(dx: number, dy: number, milliseconds: number): -1 | 0 | 1 {
  const far = Math.abs(dx) >= SWIPE_DISTANCE
  const flicked = Math.abs(dx) > Math.abs(dy) && Math.abs(dx) / Math.max(milliseconds, 1) > SWIPE_SPEED
  if (!far && !flicked) return 0
  return dx < 0 ? 1 : -1
}

export function useSwipe(onStep: (delta: -1 | 1) => void) {
  const cardRef = useRef<HTMLDivElement>(null)
  const startRef = useRef<{ id: number; x: number; y: number; time: number } | null>(null)
  const swallowRef = useRef(false)

  function follow(dx: number, settle: boolean) {
    const card = cardRef.current
    if (!card || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    card.style.transition = settle ? "transform 180ms var(--ease-out)" : "none"
    card.style.transform = dx === 0 ? "" : `translate3d(${dx}px, 0, 0)`
  }

  function onPointerDown(event: ReactPointerEvent<HTMLElement>) {
    swallowRef.current = false
    if (!isSwipeZone(event.target)) return
    if (event.pointerType === "mouse" && event.button !== 0) return
    startRef.current = { id: event.pointerId, x: event.clientX, y: event.clientY, time: event.timeStamp }
  }

  function onPointerMove(event: ReactPointerEvent<HTMLElement>) {
    const start = startRef.current
    if (!start || start.id !== event.pointerId) return
    const dx = event.clientX - start.x
    if (Math.abs(dx) > Math.abs(event.clientY - start.y)) follow(dx, false)
  }

  function onPointerUp(event: ReactPointerEvent<HTMLElement>) {
    const start = startRef.current
    if (!start || start.id !== event.pointerId) return
    startRef.current = null
    const delta = swipeStep(event.clientX - start.x, event.clientY - start.y, event.timeStamp - start.time)
    follow(0, delta === 0)
    if (delta === 0) return
    swallowRef.current = true
    onStep(delta)
  }

  function onPointerCancel(event: ReactPointerEvent<HTMLElement>) {
    if (startRef.current?.id !== event.pointerId) return
    startRef.current = null
    follow(0, true)
  }

  function onClickCapture(event: SyntheticEvent) {
    if (!swallowRef.current) return
    swallowRef.current = false
    event.preventDefault()
    event.stopPropagation()
  }

  return { cardRef, handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onClickCapture } }
}

function isSwipeZone(target: EventTarget | null): boolean {
  return target instanceof Element && !target.closest(".canvas-frame, input, textarea, a")
}
