export type Contact = {
  readonly pointerId: number
  readonly pointerType: string
  readonly clientX: number
  readonly clientY: number
  readonly width: number
  readonly height: number
}

type Held = { readonly x: number; readonly y: number; readonly pen: boolean; moved: boolean }

export type Touches = {
  readonly held: Map<number, Held>
  lifts: number[]
  multi: boolean
  penSeen: boolean
}

export type Landing = "stroke" | "cancel" | "ignore"

const PALM_SIZE = 40
const MOVE_SLOP = 14
const TAP_WINDOW = 320

export function createTouches(): Touches {
  return { held: new Map(), lifts: [], multi: false, penSeen: false }
}

export function touchDown(touches: Touches, contact: Contact): Landing {
  const pen = contact.pointerType === "pen"
  if (pen) {
    touches.penSeen = true
    touches.held.clear()
    touches.multi = false
  } else if (contact.pointerType === "touch" && isRejected(touches, contact)) {
    return "ignore"
  }
  touches.held.set(contact.pointerId, { x: contact.clientX, y: contact.clientY, pen, moved: false })
  if (touches.held.size === 1) return "stroke"
  touches.multi = true
  return "cancel"
}

export function touchMove(touches: Touches, contact: Contact): void {
  const held = touches.held.get(contact.pointerId)
  if (held && Math.hypot(contact.clientX - held.x, contact.clientY - held.y) > MOVE_SLOP) held.moved = true
}

export function touchUp(touches: Touches, pointerId: number, now: number): "tap" | "lift" {
  const held = touches.held.get(pointerId)
  if (!held) return "lift"
  touches.held.delete(pointerId)
  if (!touches.multi) return "lift"
  const lifts = touches.lifts.filter((time) => now - time < TAP_WINDOW)
  if (!held.moved) lifts.push(now)
  const tapped = lifts.length >= 2
  touches.lifts = tapped || touches.held.size === 0 ? [] : lifts
  if (touches.held.size === 0) touches.multi = false
  return tapped ? "tap" : "lift"
}

// Width marks a palm only once a pen has drawn here. A fingertip alone can report this wide,
// and where there is no pen it is the only thing that draws.
function isRejected(touches: Touches, contact: Contact): boolean {
  if (touches.penSeen && (contact.width > PALM_SIZE || contact.height > PALM_SIZE)) return true
  for (const held of touches.held.values()) {
    if (held.pen || (held.moved && !touches.multi)) return true
  }
  return false
}
