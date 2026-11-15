import JSZip from "jszip"
import { compileIcon, type Mark } from "./compile.ts"
import { ARTBOARD, type IconSet } from "./document.ts"

export const EXPORT_KINDS = ["svg-zip", "sprite", "react-zip"] as const

export type ExportKind = (typeof EXPORT_KINDS)[number]

export type Download = {
  readonly filename: string
  readonly blob: Blob
}

export async function exportSet(set: IconSet, kind: ExportKind): Promise<Download> {
  const marks = set.icons.map((icon) => ({
    name: icon.name,
    mark: compileIcon(set, icon.id, null),
  }))
  switch (kind) {
    case "svg-zip":
      return zipFiles("iconhand-svg.zip", marks.map((item) => ({
        name: `${item.name}.svg`,
        body: svgDocument(item.mark),
      })))
    case "sprite":
      return textFile("iconhand.svg", spriteDocument(marks), "image/svg+xml")
    case "react-zip":
      return zipFiles("iconhand-react.zip", reactFiles(marks))
    default: {
      const never: never = kind
      throw new Error(`Unknown export ${JSON.stringify(never)}`)
    }
  }
}

function svgDocument(mark: Mark): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${mark.units}" height="${mark.units}" viewBox="${mark.viewBox}" fill="${mark.fill}" stroke="${mark.stroke}" stroke-width="${mark.strokeWidth}" stroke-linecap="${mark.lineCap}" stroke-linejoin="${mark.lineJoin}">${pathElement(mark)}</svg>`
}

function pathElement(mark: Mark): string {
  if (!mark.d) return ""
  return `<path d="${mark.d}"/>`
}

function spriteDocument(marks: readonly { name: string; mark: Mark }[]): string {
  const width = Math.max(marks.length, 1) * ARTBOARD
  const symbols = marks
    .map((item) => {
      const mark = item.mark
      return `<symbol id="${item.name}" viewBox="${mark.viewBox}">${paintedPath(mark)}</symbol>`
    })
    .join("")
  const uses = marks
    .map((item, index) => `<use href="#${item.name}" x="${index * ARTBOARD}" y="0" width="${ARTBOARD}" height="${ARTBOARD}"/>`)
    .join("")
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${ARTBOARD}" viewBox="0 0 ${width} ${ARTBOARD}" fill="none" stroke="currentColor">${symbols}${uses}</svg>`
}

function paintedPath(mark: Mark): string {
  if (!mark.d) return ""
  return `<path d="${mark.d}" fill="${mark.fill}" stroke="${mark.stroke}" stroke-width="${mark.strokeWidth}" stroke-linecap="${mark.lineCap}" stroke-linejoin="${mark.lineJoin}"/>`
}

function reactFiles(marks: readonly { name: string; mark: Mark }[]): { name: string; body: string }[] {
  const files = marks.map((item) => {
    const component = componentName(item.name)
    return { name: `${component}.tsx`, body: componentSource(component, item.mark) }
  })
  const lines = marks.map((item) => {
    const component = componentName(item.name)
    return `export { ${component} } from "./${component}";`
  })
  return [...files, { name: "index.ts", body: `${lines.join("\n")}\n` }]
}

function componentSource(component: string, mark: Mark): string {
  const path = mark.d ? `\n      <path d="${mark.d}" />\n    ` : ""
  return `import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & {
  size?: number | string;
  color?: string;
};

export function ${component}({ size = ${mark.units}, color = "${mark.stroke}", ...props }: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="${mark.viewBox}" fill="${mark.fill}" stroke={color} strokeWidth={${mark.strokeWidth}} strokeLinecap="${mark.lineCap}" strokeLinejoin="${mark.lineJoin}" {...props}>${path}</svg>
  );
}
`
}

function componentName(name: string): string {
  return name
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("")
}

async function zipFiles(filename: string, files: readonly { name: string; body: string }[]): Promise<Download> {
  const zip = new JSZip()
  for (const file of files) zip.file(file.name, file.body)
  const bytes = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" })
  const copy = new Uint8Array(bytes.byteLength)
  copy.set(bytes)
  return {
    filename,
    blob: new Blob([copy], { type: "application/zip" }),
  }
}

function textFile(filename: string, body: string, type: string): Download {
  return { filename, blob: new Blob([body], { type }) }
}
