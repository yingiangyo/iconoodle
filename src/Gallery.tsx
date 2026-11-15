import { compileIcon } from "./compile.ts"
import type { IconSet } from "./document.ts"

export function Gallery({ set, onClose }: { set: IconSet; onClose: () => void }) {
  const drawn = set.icons.filter((icon) => icon.strokes.length > 0).length
  return (
    <div className="gallery">
      <header className="gallery-head">
        <div>
          <p>iconoodle</p>
          <h1>A hand-drawn set</h1>
          <span>
            {drawn} of {set.icons.length} drawn
          </span>
        </div>
        <button type="button" onClick={onClose}>
          Draw your own
        </button>
      </header>
      <ul className="gallery-grid">
        {set.icons.map((icon) => {
          const mark = compileIcon(set, icon.id, null)
          return (
            <li key={icon.id}>
              <svg viewBox={mark.viewBox} fill="none" stroke="currentColor" aria-hidden="true">
                {mark.d ? (
                  <path
                    d={mark.d}
                    strokeWidth={mark.strokeWidth}
                    strokeLinecap={mark.lineCap}
                    strokeLinejoin={mark.lineJoin}
                  />
                ) : (
                  <rect x="4" y="4" width="16" height="16" strokeWidth="0.6" strokeOpacity="0.28" />
                )}
              </svg>
              <span title={icon.name}>{icon.name}</span>
            </li>
          )
        })}
      </ul>
      <p className="gallery-note">
        {drawn === 0
          ? "Nothing is drawn yet. The names are here so you can see the set."
          : "Read-only. The drawings live in this link."}
      </p>
    </div>
  )
}
