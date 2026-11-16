import JSZip from "jszip"
import { checkSet, type Drift } from "./check.ts"
import { compileIcon } from "./compile.ts"
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
import { SMOOTH_KEY, readSmooth, smoothTolerance } from "./smooth.ts"
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

const plain = compileIcon(drawn.session.document, home, null)
const snapped = compileIcon({ ...drawn.session.document, snap: true }, home, null)
const heavier = compileIcon({ ...drawn.session.document, weight: 2.5 }, home, null)
check(plain.d.length > 0, "the line has a path")
check(plain.stroke === "currentColor", "paint uses currentColor")
check(plain.fill === "none", "the mark is a centerline")
check(plain.viewBox === "0 0 24 24", "view box is 24")
check(plain.strokeWidth === 2, "weight is the stroke width")
check(snapped.d !== plain.d, "snap changes the path")
check(heavier.d === plain.d, "weight does not rewrite the path")
check(heavier.strokeWidth === 2.5, "weight changes the stroke width")
check(plain.d.includes("M") && plain.d.includes("L"), "the path is a polyline")

const dotMark = compileIcon(dot.session.document, home, null)
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
  check(themed.icons.every((icon) => compileIcon(themed, icon.id, null).d === ""), `${theme.id} compiles to no path`)
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
  null,
)
check(/^M[\d.]+ [\d.]+L[\d.]+ [\d.]+$/.test(straightened.d), "a near-straight stroke becomes one line")

let roundish = starter
roundish = edit(roundish, { kind: "commit", id: home, stroke: circleStroke(12, 12, 6, 18, 0.2) }).session
const circled = compileIcon(
  { ...roundish.document, cleanup: { straight: false, circle: true, close: false } },
  home,
  null,
)
check(circled.d.includes("A") && circled.d.endsWith("Z"), "a near-circle becomes a circle")

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
  null,
)
const rawSession = edit(starter, {
  kind: "commit",
  id: home,
  stroke: { ...wobble.document.icons[0].strokes[0], smooth: 0 },
}).session
const rawLine = compileIcon(rawSession.document, home, null)
const rawStraight = compileIcon(
  { ...rawSession.document, cleanup: { straight: true, circle: false, close: false } },
  home,
  null,
)
check(rawStraight.d === straightened.d || /^M[\d.]+ [\d.]+L[\d.]+ [\d.]+$/.test(rawStraight.d), "straight still snaps when smoothing is off")
check(rawLine.d.includes("L"), "smoothing off keeps the stroke")
const rawCircle = compileIcon(
  {
    ...edit(starter, { kind: "commit", id: home, stroke: { ...circleStroke(12, 12, 6, 18, 0.2), smooth: 0 } }).session.document,
    cleanup: { straight: false, circle: true, close: false },
  },
  home,
  null,
)
check(rawCircle.d.includes("A") && rawCircle.d.endsWith("Z"), "circle still snaps when smoothing is off")

const scribble = stroke(scribblePoints())
const off = compileIcon(edit(starter, { kind: "commit", id: home, stroke: { ...scribble, smooth: 0 } }).session.document, home, null)
const med = compileIcon(edit(starter, { kind: "commit", id: home, stroke: { samples: scribble.samples } }).session.document, home, null)
const medStamped = compileIcon(edit(starter, { kind: "commit", id: home, stroke: { ...scribble, smooth: 2 } }).session.document, home, null)
const high = compileIcon(edit(starter, { kind: "commit", id: home, stroke: { ...scribble, smooth: 3 } }).session.document, home, null)
check(med.d === medStamped.d, "an old stroke matches medium smoothing")
check(off.d.length > high.d.length, "off keeps more of a scribble than high")
check(smoothTolerance(2) === 0.35, "medium is the previous simplify tolerance")
check(smoothTolerance(0) === 0, "off does not simplify")

const stamped = edit(starter, { kind: "commit", id: home, stroke: { ...scribble, smooth: 0 } })
check(stamped.session.document.icons[0].strokes[0]?.smooth === 0, "a new stroke records its smoothness")
const stampedRaw = setToJSON(stamped.session.document)
check(stampedRaw.includes('"smooth":0'), "the stroke keeps its smoothness in the save")
check(!stampedRaw.includes(SMOOTH_KEY), "the preference is not stored in the set")
const stampedLoaded = setFromJSON(stampedRaw)
check(stampedLoaded?.icons[0].strokes[0]?.smooth === 0, "a reload keeps the stroke smoothness")
check(readSmooth(memory) === 2, "a missing preference is medium")
memory.setItem(SMOOTH_KEY, "0")
check(readSmooth(memory) === 0, "the preference reads back")

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
