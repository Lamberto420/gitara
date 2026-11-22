// Wspólne znaki pięciolinii: klucz wiolinowy „z ósemką” i krzyżyk – własne ścieżki SVG,
// bo znaki z czcionki (𝄞, ♯) bywają na telefonach pustymi kwadracikami.

/** Pół odstępu między liniami – jedna „pozycja” nuty. */
export const HALF = 5
/** Y dolnej linii pięciolinii. */
export const BOTTOM = 100
export const y = (position: number) => BOTTOM - position * HALF
/** Linia G (druga od dołu) – wokół niej zawija się klucz wiolinowy. */
const G = y(2)

/**
 * Klucz wiolinowy jako własna ścieżka – znak 𝄞 z czcionki bywa na telefonach pustym kwadracikiem.
 * Spirala wokół linii G, pętla nad pięciolinią, laska z haczykiem i kropką na dole.
 */
const CLEF_PATH = [
  `M 23 ${G + 1}`,
  `C 17 ${G + 2} 15 ${G - 6} 21 ${G - 8}`,
  `C 28 ${G - 10} 32 ${G - 1} 28 ${G + 6}`,
  `C 24 ${G + 12} 12 ${G + 11} 10 ${G + 3}`,
  `C 8 ${G - 7} 19 ${G - 14} 25 ${G - 22}`,
  `C 30 ${G - 29} 31 ${G - 40} 26 ${G - 42}`,
  `C 21 ${G - 44} 18 ${G - 36} 19 ${G - 28}`,
  `L 24 ${G + 20}`,
  `C 25 ${G + 26} 18 ${G + 28} 15 ${G + 24}`,
].join(' ')

/** Krzyżyk przed główką: dwie pionowe kreski i dwie grubsze, skośne poprzeczki. */
export function Sharp({ x, cy, color }: { x: number; cy: number; color: string }) {
  return (
    <g stroke={color} strokeLinecap="butt">
      <line x1={x - 2.5} x2={x - 2.5} y1={cy - 11} y2={cy + 13} strokeWidth="1.3" />
      <line x1={x + 2.5} x2={x + 2.5} y1={cy - 13} y2={cy + 11} strokeWidth="1.3" />
      <line x1={x - 6} x2={x + 6} y1={cy - 2} y2={cy - 6} strokeWidth="3" />
      <line x1={x - 6} x2={x + 6} y1={cy + 6} y2={cy + 2} strokeWidth="3" />
    </g>
  )
}

/** Klucz wiolinowy z „8” pod spodem (gitara brzmi oktawę niżej, niż ją zapisujemy). */
export function TrebleClef8({ dx = 0 }: { dx?: number }) {
  return (
    <g transform={`translate(${dx} 0)`}>
      <path d={CLEF_PATH} fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="16" cy={G + 22} r="2.6" fill="currentColor" />
      <text x="19" y={G + 40} fontSize="11" fontWeight="700" textAnchor="middle" fill="currentColor">
        8
      </text>
    </g>
  )
}
