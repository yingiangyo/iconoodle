import JSZip from "jszip"
import { compileIcon } from "./compile.ts"
import {
  STORAGE_KEY,
  WEIGHTS,
  edit,
  isIconName,
  loadSet,
  openSession,
  saveSet,
  type Sample,
  type Stroke,
} from "./document.ts"
import { exportSet } from "./export.ts"

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
check(memory.values.has(STORAGE_KEY), "save uses the iconhand key")
const loaded = loadSet(memory)
check(loaded !== null && loaded.icons[0].strokes.length === 1, "load restores the stroke")
check(loaded !== null && loaded.weight === drawn.session.document.weight, "load restores the weight")
memory.setItem(STORAGE_KEY, "{")
check(loadSet(memory) === null, "broken json is refused")
memory.setItem(STORAGE_KEY, JSON.stringify({ version: 2 }))
check(loadSet(memory) === null, "a future version is refused")

const files = await exportSet(drawn.session.document, "svg-zip")
check(files.filename === "iconhand-svg.zip", "svg zip name")
const svgZip = await JSZip.loadAsync(await files.blob.arrayBuffer())
const homeSvg = await svgZip.file("home.svg")?.async("string")
check(typeof homeSvg === "string", "home.svg is in the zip")
check(homeSvg?.includes('viewBox="0 0 24 24"') === true, "svg view box")
check(homeSvg?.includes('stroke="currentColor"') === true, "svg currentColor")
check(homeSvg?.includes(`stroke-width="${plain.strokeWidth}"`) === true, "svg stroke width")
check(homeSvg?.includes(`d="${plain.d}"`) === true, "svg path matches compileIcon")

const sprite = await exportSet(drawn.session.document, "sprite")
const spriteText = await sprite.blob.text()
check(sprite.filename === "iconhand.svg", "sprite filename")
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

if (failures.length > 0) {
  throw new Error(failures.join("\n"))
}
console.log("verify ok")

function stroke(points: readonly (readonly [number, number])[]): Stroke {
  const samples: Sample[] = points.map(([x, y]) => ({ x, y, pressure: 0.5 }))
  return { samples }
}
