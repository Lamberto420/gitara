import { guitarStaffPosition, ledgerLines, stemUp } from '../../music/staff'

/** Pół odstępu między liniami – jedna „pozycja” nuty. */
const HALF = 5
/** Y dolnej linii pięciolinii. */
const BOTTOM = 100
const y = (position: number) => BOTTOM - position * HALF
/** Linia G (druga od dołu) – wokół niej zawija się klucz wiolinowy. */
const G = y(2)
const NOTE_X = 120
const STEM = 35

/**
 * Klucz wiolinowy jako własna ścieżka – znak 𝄞 z czcionki bywa na telefonach pustym kwadracikiem.
 * Spirala wokół linii G, pętla nad pięciolinią, laska z haczykiem i kropką na dole.
 */
const CLEF = [
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

interface Props {
  /** Wysokość BRZMIENIA (midi) – komponent sam przesuwa zapis o oktawę w górę. */
  midi: number | null
  color?: string
  label?: string
}

/** Pięciolinia z kluczem wiolinowym „z ósemką” (zapis gitarowy) i jedną nutą (ćwierćnutą). */
export default function Staff({ midi, color = 'currentColor', label }: Props) {
  const position = midi === null ? null : guitarStaffPosition(midi)
  const up = position !== null && stemUp(position)

  return (
    <svg className="staff" viewBox="0 30 200 115" role="img" aria-label={label ?? 'Pięciolinia'}>
      <g stroke="currentColor" strokeWidth="1.2">
        {[0, 2, 4, 6, 8].map((p) => (
          <line key={p} x1="4" x2="196" y1={y(p)} y2={y(p)} />
        ))}
      </g>
      <path d={CLEF} fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="16" cy={G + 22} r="2.6" fill="currentColor" />
      <text x="19" y={G + 40} fontSize="11" fontWeight="700" textAnchor="middle" fill="currentColor">
        8
      </text>

      {position !== null && (
        <g>
          {ledgerLines(position).map((p) => (
            <line key={p} x1={NOTE_X - 13} x2={NOTE_X + 13} y1={y(p)} y2={y(p)} stroke="currentColor" strokeWidth="1.2" />
          ))}
          <ellipse
            cx={NOTE_X}
            cy={y(position)}
            rx="6.6"
            ry="4.7"
            transform={`rotate(-20 ${NOTE_X} ${y(position)})`}
            fill={color}
          />
          {up ? (
            <line x1={NOTE_X + 6} x2={NOTE_X + 6} y1={y(position) - 1} y2={y(position) - STEM} stroke={color} strokeWidth="1.6" />
          ) : (
            <line x1={NOTE_X - 6} x2={NOTE_X - 6} y1={y(position) + 1} y2={y(position) + STEM} stroke={color} strokeWidth="1.6" />
          )}
        </g>
      )}
    </svg>
  )
}
