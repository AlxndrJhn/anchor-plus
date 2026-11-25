import { chordLabels } from "../keys";

/** A chord as keycaps, a gap between its strokes. */
export function Keys({ chord, mac }: { chord: string; mac: boolean }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      {chordLabels(chord, mac).map((stroke, i) => (
        <span key={i} className="inline-flex items-center gap-0.5">
          {stroke.map((label, j) => (
            <kbd key={j} className="font-sans">
              {label}
            </kbd>
          ))}
        </span>
      ))}
    </span>
  );
}
