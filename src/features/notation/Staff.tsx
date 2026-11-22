import { guitarStaffPosition, hasSharp, ledgerLines, stemUp } from '../../music/staff'
import { Sharp, TrebleClef8, y } from './staffGlyphs'

const NOTE_X = 120
const STEM = 35

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
    <svg className="staff" viewBox="-6 24 212 127" role="img" aria-label={label ?? 'Pięciolinia'}>
      {/* Białe tło (z marginesem) w samym rysunku, nie w CSS – przeglądarka z narzuconym ciemnym
          motywem przyciemnia tło z CSS, a wypełnienia w SVG zostawia jak na kartce papieru. */}
      <rect x="-6" y="24" width="212" height="127" rx="14" fill="white" />
      <g stroke="currentColor" strokeWidth="1.2">
        {[0, 2, 4, 6, 8].map((p) => (
          <line key={p} x1="4" x2="196" y1={y(p)} y2={y(p)} />
        ))}
      </g>
      <TrebleClef8 />

      {position !== null && (
        <g>
          {ledgerLines(position).map((p) => (
            <line key={p} x1={NOTE_X - 13} x2={NOTE_X + 13} y1={y(p)} y2={y(p)} stroke="currentColor" strokeWidth="1.2" />
          ))}
          {hasSharp(midi!) && <Sharp x={NOTE_X - 22} cy={y(position)} color={color} />}
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
