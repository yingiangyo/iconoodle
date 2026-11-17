import JSZip from "jszip"
import { checkSet, type Drift } from "./check.ts"
import { compileIcon, livePath } from "./compile.ts"
import {
  STORAGE_KEY,
  WEIGHTS,
  createSet,
  edit,
  isIconName,
  loadSet,
  openSession,
  saveSet,
  setFromJSON,
  setToJSON,
  type Sample,
  type Stroke,
} from "./document.ts"
import { exportSet, iconSvg } from "./export.ts"
import { setFromHash, shareHash } from "./share.ts"
import { guideConcept, themeSlots } from "./glyphs.ts"
import { cycleChoice } from "./libraries.ts"
import { SMOOTH_KEY, readSmooth } from "./smooth.ts"
import { swipeStep } from "./swipe.ts"
import { createTouches, touchDown, touchMove, touchUp, type Contact } from "./touches.ts"
import { guideKey } from "./guides.ts"
import { THEMES } from "./themes.ts"

const failures: string[] = []

function check(condition: boolean, message: string) {
  if (!condition) failures.push(message)
}

const memory = {
  values: new Map<string, string>(),
  getItem(key: string) {
    return this.values.get(key) ?? null
  },
  setItem(key: string, value: string) {
    this.values.set(key, value)
  },
}

const starter = openSession(null)
check(starter.document.icons.length === 24, "starter has 24 icons")
check(starter.document.icons[0].name === "home", "first starter name is home")
check(starter.document.icons[23].name === "pause", "last starter name is pause")
check(starter.document.weight === 2, "starter weight is 2")
check(starter.document.library === "lucide", "starter traces Lucide")
check(starter.document.icons[0].concept === "home", "starter keeps the home concept")
check(starter.past.length === 0, "starter has no history")

const home = starter.document.selectedId
const line = stroke([
  [2.2, 12.4],
  [8, 12.1],
  [16.2, 11.8],
  [21.4, 12.3],
])
const drawn = edit(starter, { kind: "commit", id: home, stroke: line })
check(drawn.rejection === null, "a line commits")
check(drawn.session.document.icons[0].strokes.length === 1, "home keeps the line")
check(drawn.session.past.length === 1, "commit pushes history")

const browsed = edit(drawn.session, { kind: "select", id: drawn.session.document.icons[1].id })
check(browsed.session.past.length === 1, "select does not push history")
check(browsed.session.document.selectedId === drawn.session.document.icons[1].id, "select moves the current icon")

const undone = edit(drawn.session, { kind: "undo" })
check(undone.session.document.icons[0].strokes.length === 0, "undo removes the stroke")
const redone = edit(undone.session, { kind: "redo" })
check(redone.session.document.icons[0].strokes.length === 1, "redo restores the stroke")

const dot = edit(starter, { kind: "commit", id: home, stroke: stroke([[12, 12]]) })
check(dot.rejection === null, "a single sample is a dot")
const empty = edit(starter, { kind: "commit", id: home, stroke: { samples: [] } })
check(empty.rejection === "short-stroke", "an empty stroke is rejected")
check(empty.session === starter, "a rejected edit returns the same session")

let shrinking = starter
while (shrinking.document.icons.length > 1) {
  shrinking = edit(shrinking, { kind: "delete", id: shrinking.document.icons[0].id }).session
}
const last = edit(shrinking, { kind: "delete", id: shrinking.document.selectedId })
check(last.rejection === "last-icon", "the last icon stays")

const badName = edit(starter, { kind: "rename", id: home, name: "Home" })
check(badName.rejection === "invalid-name", "uppercase names are rejected")
const duplicate = edit(starter, { kind: "rename", id: home, name: "search" })
check(duplicate.rejection === "duplicate-name", "duplicate names are rejected")

const plain = compileIcon(drawn.session.document, home)
const snapped = compileIcon({ ...drawn.session.document, snap: true }, home)
const heavier = compileIcon({ ...drawn.session.document, weight: 2.5 }, home)
check(plain.d.length > 0, "the line has a path")
check(plain.stroke === "currentColor", "paint uses currentColor")
check(plain.fill === "none", "the mark is a centerline")
check(plain.viewBox === "0 0 24 24", "view box is 24")
check(plain.strokeWidth === 2, "weight is the stroke width")
check(snapped.d !== plain.d, "snap changes the path")
check(heavier.d === plain.d, "weight does not rewrite the path")
check(heavier.strokeWidth === 2.5, "weight changes the stroke width")
check(/^M[\d.]+ [\d.]+(C[\d. -]+)+$/.test(plain.d), "a freehand stroke is one smooth curve")
check(/^M[\d.]+ [\d.]+(L[\d.]+ [\d.]+)+$/.test(snapped.d), "a snapped stroke keeps straight segments")
check(livePath(line, false) === plain.d, "the live pen draws what the commit will draw")

const dotMark = compileIcon(dot.session.document, home)
check(dotMark.d.startsWith("M") && dotMark.d.includes("L"), "a dot is a zero-length segment")

saveSet(memory, drawn.session.document)
check(memory.values.has(STORAGE_KEY), "save uses the iconoodle key")
const loaded = loadSet(memory)
check(loaded !== null && loaded.icons[0].strokes.length === 1, "load restores the stroke")
check(loaded !== null && loaded.weight === drawn.session.document.weight, "load restores the weight")
memory.setItem(STORAGE_KEY, "{")
check(loadSet(memory) === null, "broken json is refused")
memory.setItem(STORAGE_KEY, JSON.stringify({ version: 2 }))
check(loadSet(memory) === null, "a future version is refused")

const files = await exportSet(drawn.session.document, "svg-zip")
check(files.filename === "iconoodle-svg.zip", "svg zip name")
const svgZip = await JSZip.loadAsync(await files.blob.arrayBuffer())
const homeSvg = await svgZip.file("home.svg")?.async("string")
check(typeof homeSvg === "string", "home.svg is in the zip")
check(homeSvg?.includes('viewBox="0 0 24 24"') === true, "svg view box")
check(homeSvg?.includes('stroke="currentColor"') === true, "svg currentColor")
check(homeSvg?.includes(`stroke-width="${plain.strokeWidth}"`) === true, "svg stroke width")
check(homeSvg?.includes(`d="${plain.d}"`) === true, "svg path matches compileIcon")

const sprite = await exportSet(drawn.session.document, "sprite")
const spriteText = await sprite.blob.text()
check(sprite.filename === "iconoodle.svg", "sprite filename")
check(spriteText.includes("<symbol") && spriteText.includes("<use "), "sprite has symbol and use")
check(spriteText.includes('id="home"') && spriteText.includes('href="#home"'), "sprite ids match names")

const reactZip = await exportSet(drawn.session.document, "react-zip")
const reactFiles = await JSZip.loadAsync(await reactZip.blob.arrayBuffer())
const homeTsx = await reactFiles.file("Home.tsx")?.async("string")
const arrow = await reactFiles.file("ArrowLeft.tsx")?.async("string")
const index = await reactFiles.file("index.ts")?.async("string")
check(typeof homeTsx === "string", "Home.tsx exists")
check(homeTsx?.includes("size = 24") === true, "size prop defaults to 24")
check(homeTsx?.includes('color = "currentColor"') === true, "color prop defaults to currentColor")
check(homeTsx?.includes(`strokeWidth={${plain.strokeWidth}}`) === true, "react bakes the weight")
check(typeof arrow === "string", "arrow-left becomes ArrowLeft.tsx")
check(index?.includes('export { Home } from "./Home"') === true, "index re-exports Home")
check(index?.includes('export { ArrowLeft } from "./ArrowLeft"') === true, "index re-exports ArrowLeft")

const names = starter.document.icons.map((icon) => icon.name)
check(names.every((name) => isIconName(name)), "starter names are slugs")
check(WEIGHTS.length === 3, "three weights")

for (const theme of THEMES) {
  const unique = new Set(theme.names)
  check(theme.names.length >= 12, `${theme.id} has a full set of names`)
  check(unique.size === theme.names.length, `${theme.id} names are unique`)
  check(theme.names.every((name) => isIconName(name)), `${theme.id} names are slugs`)
  check(theme.names.every((name) => guideKey(name) !== null), `${theme.id} names have a Lucide guide`)
  const themed = createSet(theme.names)
  check(themed.icons.every((icon, index) => icon.name === theme.names[index]), `${theme.id} keeps name order`)
  check(themed.icons.every((icon) => icon.strokes.length === 0), `${theme.id} starts blank`)
  check(themed.icons.every((icon) => compileIcon(themed, icon.id).d === ""), `${theme.id} compiles to no path`)
}

const general = THEMES.find((theme) => theme.id === "general")
check(general?.names.join() === names.join(), "general is the starter")
if (general) {
  const hero = themeSlots(general.names, "heroicons")
  const search = hero.find((slot) => slot.concept === "search")
  check(search?.name === "magnifying-glass", "heroicons names search magnifying-glass")
  const heroSet = createSet(hero, "heroicons")
  check(heroSet.library === "heroicons", "a new set keeps the chosen library")
  const switched = edit(openSession(heroSet), { kind: "library", library: "phosphor" }).session.document
  check(switched.library === "phosphor" && switched.icons[0].name === hero[0].name, "switching library keeps the names")
  check(guideConcept("phosphor", "home", "house") === "home", "a phosphor guide still resolves home")
  check(cycleChoice("material", 1) === "off", "cycling libraries wraps to off")
  check(cycleChoice("off", 1) === "lucide", "cycling off returns to lucide")
  check(cycleChoice("lucide", -1) === "off", "cycling backward from lucide lands on off")
}

const blank = await exportSet(createSet(["wallet"]), "svg-zip")
const blankZip = await JSZip.loadAsync(await blank.blob.arrayBuffer())
const wallet = await blankZip.file("wallet.svg")?.async("string")
check(typeof wallet === "string" && !wallet.includes("<path"), "a blank icon exports no guide path")

saveSet(memory, drawn.session.document)
const savedRaw = memory.getItem(STORAGE_KEY)
if (savedRaw) {
  const parsed = JSON.parse(savedRaw) as { cleanup?: unknown }
  delete parsed.cleanup
  memory.setItem(STORAGE_KEY, JSON.stringify(parsed))
}
const legacy = loadSet(memory)
check(legacy?.cleanup.straight === false && legacy.cleanup.circle === false && legacy.cleanup.close === false, "old saves default cleanup off")
check(legacy?.library === "lucide", "old saves default to Lucide")
const legacyRaw = memory.getItem(STORAGE_KEY)
memory.values.delete(STORAGE_KEY)
if (legacyRaw) memory.setItem("iconhand", legacyRaw)
check(loadSet(memory)?.icons[0]?.strokes.length === 1, "an iconhand save still loads")
if (legacyRaw) memory.setItem(STORAGE_KEY, legacyRaw)

const wobble = edit(starter, {
  kind: "commit",
  id: home,
  stroke: stroke([
    [3, 12],
    [6, 12.45],
    [9, 11.6],
    [12, 12.35],
    [15, 11.7],
    [18, 12.4],
    [21, 12.05],
  ]),
}).session
const straightened = compileIcon(
  { ...wobble.document, cleanup: { straight: true, circle: false, close: false } },
  home,
)
check(/^M[\d.]+ [\d.]+L[\d.]+ [\d.]+$/.test(straightened.d), "a near-straight stroke becomes one line")

let roundish = starter
roundish = edit(roundish, { kind: "commit", id: home, stroke: circleStroke(12, 12, 6, 18, 0.2) }).session
const circled = compileIcon(
  { ...roundish.document, cleanup: { straight: false, circle: true, close: false } },
  home,
)
check(circled.d.includes("A") && circled.d.endsWith("Z"), "a near-circle becomes a circle")

const jittery = edit(starter, { kind: "commit", id: home, stroke: jitter(circleStroke(12, 12, 7, 120, 0.12), 0.1) }).session
const hand = compileIcon(jittery.document, home)
const handCurves = hand.d.match(/C/g)?.length ?? 0
check(handCurves >= 6 && !hand.d.includes("L"), "a jittery circle compiles to curves with no facets")
check(handCurves <= 24, "a jittery circle stays a compact path")
check(jittery.document.icons[0].strokes[0].samples.length === 121, "smoothing leaves the stored samples alone")
const looped = compileIcon({ ...jittery.document, cleanup: { straight: false, circle: false, close: true } }, home)
check(looped.d.includes("C") && looped.d.endsWith("Z"), "a closed hand loop wraps its curve")

const zigzag = edit(starter, {
  kind: "commit",
  id: home,
  stroke: stroke([
    [4, 4],
    [20, 8],
    [4, 12],
    [20, 16],
  ]),
}).session
check(compileIcon(zigzag.document, home).d === "M4 4L20 8L4 12L20 16", "sharp turns stay corners")

let square = starter
square = edit(square, {
  kind: "commit",
  id: home,
  stroke: stroke([
    [4, 4],
    [12, 4.3],
    [20, 4.1],
    [20.2, 12],
    [20, 20],
    [12, 19.7],
    [4.1, 20],
    [3.9, 12],
    [4, 5.05],
  ]),
}).session
const closed = compileIcon(
  { ...square.document, cleanup: { straight: true, circle: false, close: true } },
  home,
)
const rawWobble: Stroke = { ...wobble.document.icons[0].strokes[0], smooth: 0 }
const rawStraight = compileIcon(
  { ...commitOne(rawWobble), cleanup: { straight: true, circle: false, close: false } },
  home,
)
check(rawStraight.d === straightened.d, "straight still snaps when smoothing is off")
const rawCircle = compileIcon(
  {
    ...commitOne({ ...circleStroke(12, 12, 6, 18, 0.2), smooth: 0 }),
    cleanup: { straight: false, circle: true, close: false },
  },
  home,
)
check(rawCircle.d === circled.d, "circle still snaps when smoothing is off")

const scribble = stroke(scribblePoints())
const off = compileIcon(commitOne({ ...scribble, smooth: 0 }), home)
check(
  off.d === `M${scribble.samples.map((sample) => `${round2(sample.x)} ${round2(sample.y)}`).join("L")}`,
  "smoothing off draws a line through every sample",
)
const unstamped = compileIcon(commitOne(scribble), home)
check(
  unstamped.d ===
    "M2 12C2.13 12.3 2.18 12.66 2.4 12.9C2.58 13.1 2.88 13.13 3.11 13.25L4.71 10.66L6.48 13.34L8.31 10.66L10.08 13.35L11.91 10.66L13.67 13.34L15.51 10.66L17.26 13.34L19.1 10.67C19.54 11.45 19.95 12.25 20.42 13.01C20.51 13.16 20.67 13.27 20.8 13.39L21.2 13.14",
  "a stroke with no level compiles as it did before levels existed",
)
check(compileIcon(commitOne({ ...scribble, smooth: 2 }), home).d === unstamped.d, "a stroke with no level is medium")

const shaky = jitter(circleStroke(12, 12, 7, 120, 0.12), 0.1)
const segments = ([0, 1, 2, 3] as const).map(
  (smooth) => compileIcon(commitOne({ ...shaky, smooth }), home).d.match(/[CL]/g)?.length ?? 0,
)
check(segments[0] > segments[1], "low smoothing keeps fewer segments than off")
check(segments[2] < segments[1] && segments[3] < segments[1], "medium and high keep fewer segments than low")
check(compileIcon(commitOne({ ...shaky, smooth: 1 }), home).d.includes("C"), "low smoothing still draws curves")
check(
  compileIcon({ ...commitOne({ ...shaky, smooth: 0 }), snap: true }, home).d ===
    compileIcon({ ...commitOne({ ...shaky, smooth: 3 }), snap: true }, home).d,
  "snap draws the same path at every level",
)
check(livePath({ ...scribble, smooth: 0 }, false) === off.d, "the live pen follows its level")

const stampedSet = commitOne({ ...scribble, smooth: 0 })
check(stampedSet.icons[0].strokes[0]?.smooth === 0, "a new stroke records its smoothness")
const stampedRaw = setToJSON(stampedSet)
check(stampedRaw.includes('"smooth":0'), "the stroke keeps its smoothness in the save")
check(!stampedRaw.includes(SMOOTH_KEY), "the preference is not stored in the set")
check(setFromJSON(stampedRaw)?.icons[0].strokes[0]?.smooth === 0, "a reload keeps the stroke smoothness")
check(setFromHash(`#${shareHash(stampedSet)}`)?.icons[0].strokes[0]?.smooth === 0, "a share link keeps the stroke smoothness")
check(!("smooth" in (setFromJSON(setToJSON(commitOne(scribble)))?.icons[0].strokes[0] ?? {})), "a stroke with no level is saved without one")
check(readSmooth(memory) === 2, "a missing preference is medium")
memory.setItem(SMOOTH_KEY, "0")
check(readSmooth(memory) === 0, "the preference reads back")
memory.setItem(SMOOTH_KEY, "7")
check(readSmooth(memory) === 2, "an unknown preference is medium")

check(swipeStep(-60, 5, 300) === 1, "a long swipe left goes to the next icon")
check(swipeStep(60, 0, 300) === -1, "a long swipe right goes back")
check(swipeStep(-20, 0, 300) === 0, "a short slow drag does not step")
check(swipeStep(-30, 2, 40) === 1, "a short flick steps")
check(swipeStep(-30, 40, 40) === 0, "a vertical flick does not step")

const finger = (pointerId: number, clientX = 100, width = 1): Contact => ({
  pointerId,
  pointerType: "touch",
  clientX,
  clientY: 100,
  width,
  height: width,
})
const stylus: Contact = { ...finger(9), pointerType: "pen" }

const pair = createTouches()
check(touchDown(pair, finger(1)) === "stroke", "the first finger starts a stroke")
check(touchDown(pair, finger(2, 160)) === "cancel", "a second finger cancels the stroke")
check(touchUp(pair, 1, 1000) === "lift", "one finger lifting is not yet a tap")
check(touchUp(pair, 2, 1100) === "tap", "two fingers lifting together are a tap")

const slow = createTouches()
touchDown(slow, finger(1))
touchDown(slow, finger(2, 160))
touchUp(slow, 1, 1000)
check(touchUp(slow, 2, 1400) === "lift", "fingers lifting far apart are not a tap")

const dots = createTouches()
touchDown(dots, finger(1))
touchUp(dots, 1, 1000)
touchDown(dots, finger(2))
check(touchUp(dots, 2, 1100) === "lift", "two quick taps of one finger are not a two-finger tap")

const busy = createTouches()
touchDown(busy, finger(1))
touchMove(busy, finger(1, 140))
check(touchDown(busy, finger(2, 200)) === "ignore", "a finger landing during a stroke is ignored")
check(touchUp(busy, 2, 1000) === "lift" && busy.held.size === 1, "the ignored finger leaves the stroke alone")

const wide = createTouches()
check(touchDown(wide, finger(1, 100, 60)) === "stroke", "a wide finger draws where no pen has been used")
touchUp(wide, 1, 1000)
touchDown(wide, stylus)
check(touchDown(wide, finger(2)) === "ignore", "a touch is ignored while the pen is down")
touchUp(wide, stylus.pointerId, 2000)
check(touchDown(wide, finger(3, 100, 60)) === "ignore", "a wide touch is a palm once a pen has drawn")
check(touchDown(wide, finger(4)) === "stroke", "a fingertip still draws after the pen")
check(touchDown(wide, stylus) === "stroke" && wide.held.size === 1, "the pen takes over from a resting touch")

check(closed.d.endsWith("Z"), "a near-closed shape closes")
check((closed.d.match(/L/g)?.length ?? 0) >= 3, "the closed shape keeps its corners")

const compared = buildCompared()
const drifts = checkSet(compared)
  const byName = new Map<string, readonly Drift[]>(
    compared.icons.map((icon) => [icon.name, drifts.get(icon.id) ?? []]),
  )
check(byName.get("steady")?.length === 0, "a matching icon is not flagged")
check(byName.get("tiny")?.some((drift) => drift.kind === "size" && !drift.larger) === true, "a tiny icon is flagged for size")
check(byName.get("edge")?.some((drift) => drift.kind === "padding" && drift.tight) === true, "an edge icon is flagged for padding")
check(byName.get("dense")?.some((drift) => drift.kind === "weight" && drift.heavy) === true, "a dense icon is flagged for weight")

const variants = await exportSet(drawn.session.document, "variants")
check(variants.filename === "iconoodle-variants.zip", "variants zip name")
const variantZip = await JSZip.loadAsync(await variants.blob.arrayBuffer())
const squareSvg = await variantZip.file("square/2.5/home.svg")?.async("string")
const buttSvg = await variantZip.file("butt/1.5/home.svg")?.async("string")
const roundSvg = await variantZip.file("round/2/home.svg")?.async("string")
check(squareSvg?.includes('stroke-linecap="square"') === true, "square cap is exported")
check(squareSvg?.includes('stroke-linejoin="miter"') === true, "square style uses a miter join")
check(squareSvg?.includes('stroke-width="2.5"') === true, "variant keeps the 2.5 weight")
check(buttSvg?.includes('stroke-linecap="butt"') === true && buttSvg.includes('stroke-linejoin="bevel"'), "butt cap and bevel join are exported")
check(buttSvg?.includes('stroke-width="1.5"') === true, "variant keeps the 1.5 weight")
check(roundSvg?.includes('stroke-linecap="round"') === true, "round cap is exported")

const sheet = await exportSet(drawn.session.document, "sheet")
const sheetText = await sheet.blob.text()
check(sheet.filename === "iconoodle-sheet.svg", "sheet filename")
check(sheetText.includes('<g id="home"') && sheetText.includes('<g id="search"'), "sheet groups are named")
check(sheetText.includes("translate("), "sheet places each icon")
check(iconSvg(drawn.session.document, home).includes('viewBox="0 0 24 24"'), "clipboard svg is a 24 icon")

const hash = shareHash(drawn.session.document)
const shared = setFromHash(`#${hash}`)
check(shared?.icons[0].name === "home", "share link restores the first name")
check(shared?.icons[0].strokes.length === 1, "share link restores the strokes")
check(shared?.weight === drawn.session.document.weight, "share link restores the weight")

if (failures.length > 0) {
  throw new Error(failures.join("\n"))
}
console.log("verify ok")

function scribblePoints(): (readonly [number, number])[] {
  const points: (readonly [number, number])[] = []
  for (let index = 0; index <= 48; index += 1) {
    points.push([2 + index * 0.4, 12 + Math.sin(index * 0.7) * 1.4])
  }
  return points
}

function commitOne(mark: Stroke) {
  return edit(starter, { kind: "commit", id: home, stroke: mark }).session.document
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

function stroke(points: readonly (readonly [number, number])[]): Stroke {
  const samples: Sample[] = points.map(([x, y]) => ({ x, y, pressure: 0.5 }))
  return { samples }
}

function circleStroke(cx: number, cy: number, radius: number, count: number, gap: number): Stroke {
  const samples: Sample[] = []
  const sweep = Math.PI * 2 - gap
  for (let index = 0; index <= count; index += 1) {
    const angle = -Math.PI / 2 + (sweep * index) / count
    samples.push({ x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle), pressure: 0.5 })
  }
  return { samples }
}

function jitter(source: Stroke, amount: number): Stroke {
  let seed = 7
  const next = () => {
    seed = (seed * 16807) % 2147483647
    return (seed / 2147483647 - 0.5) * 2 * amount
  }
  return { samples: source.samples.map((sample) => ({ ...sample, x: sample.x + next(), y: sample.y + next() })) }
}

function buildCompared() {
  let session = openSession(createSet(["steady", "steady-b", "steady-c", "tiny", "edge", "dense"]))
  const commit = (name: string, strokes: Stroke[]) => {
    const icon = session.document.icons.find((item) => item.name === name)
    if (!icon) throw new Error(name)
    for (const item of strokes) session = edit(session, { kind: "commit", id: icon.id, stroke: item }).session
  }
  const steady = stroke([
    [4, 6],
    [20, 6],
    [20, 18],
    [4, 18],
    [4, 6],
  ])
  commit("steady", [steady])
  commit("steady-b", [steady])
  commit("steady-c", [steady])
  commit("tiny", [stroke([[11, 11], [12, 12]])])
  commit("edge", [stroke([[0.2, 12], [23.6, 12]])])
  commit("dense", [
    stroke([[4, 4], [20, 8], [4, 12], [20, 16], [4, 20]]),
    stroke([[4, 8], [20, 4], [4, 16], [20, 12], [4, 18], [20, 20]]),
  ])
  return session.document
}
