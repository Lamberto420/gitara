import { STANDARD_TUNING } from '../../audio/pitch/notes'
import type { FretNote } from '../../music/firstPosition'
import { STRING_COLORS } from './stringColors'

const FRETS = 4
const NUT_X = 44
const FRET_W = 62
const TOP = 20
const STRING_GAP = 24
const BOARD_END = NUT_X + FRETS * FRET_W

/** Struna 1 na górze – tak jak w tabulaturze i na diagramach w podręcznikach. */
const stringY = (n: number) => TOP + (n - 1) * STRING_GAP
const fretCenterX = (fret: number) => NUT_X + (fret - 0.5) * FRET_W
/** Pusta struna: kółko przed siodełkiem. */
const OPEN_X = 28

interface Props {
  note: FretNote | null
}

/**
 * Fragment gryfu (siodełko + 4 progi) z miejscem przyciśnięcia: kolorowe kółko z numerem palca.
 * Pusta struna = kółko „0” przed siodełkiem.
 */
export default function Fretboard({ note }: Props) {
  const label = note
    ? note.fret === 0
      ? `Pusta struna ${note.string}`
      : `Struna ${note.string}, próg ${note.fret}, palec ${note.finger}`
    : 'Gryf gitary'

  return (
    <svg className="fretboard" viewBox="0 0 300 176" role="img" aria-label={label}>
      <rect x={NUT_X} y={TOP - 12} width={BOARD_END - NUT_X} height={5 * STRING_GAP + 24} rx="4" fill="#e9c48f" />
      {Array.from({ length: FRETS }, (_, i) => (
        <line key={i} x1={NUT_X + (i + 1) * FRET_W} x2={NUT_X + (i + 1) * FRET_W} y1={TOP - 12} y2={stringY(6) + 12} stroke="#a7a7a7" strokeWidth="3" />
      ))}
      <rect x={NUT_X - 3} y={TOP - 12} width="6" height={5 * STRING_GAP + 24} fill="#fdf6e3" stroke="#bfae8f" />

      {STANDARD_TUNING.map((s) => {
        const active = note?.string === s.number
        return (
          <g key={s.number}>
            <text x="10" y={stringY(s.number) + 5} fontSize="14" fontWeight="800" textAnchor="middle" fill={active ? STRING_COLORS[s.number] : '#7a6a58'}>
              {s.name}
            </text>
            <line
              x1={OPEN_X + 10}
              x2={BOARD_END}
              y1={stringY(s.number)}
              y2={stringY(s.number)}
              stroke={active ? STRING_COLORS[s.number] : '#6b5440'}
              strokeWidth={active ? 1.6 + (s.number - 1) * 0.45 + 1 : 1 + (s.number - 1) * 0.45}
            />
          </g>
        )
      })}

      {Array.from({ length: FRETS }, (_, i) => (
        <text key={i} x={fretCenterX(i + 1)} y="172" fontSize="12" fontWeight="700" textAnchor="middle" fill="#7a6a58">
          {i + 1}
        </text>
      ))}

      {note && (
        <g>
          <circle
            cx={note.fret === 0 ? OPEN_X : fretCenterX(note.fret)}
            cy={stringY(note.string)}
            r="11"
            fill={note.fret === 0 ? 'white' : STRING_COLORS[note.string]}
            stroke={STRING_COLORS[note.string]}
            strokeWidth="3"
          />
          <text
            x={note.fret === 0 ? OPEN_X : fretCenterX(note.fret)}
            y={stringY(note.string) + 5}
            fontSize="14"
            fontWeight="900"
            textAnchor="middle"
            fill={note.fret === 0 ? STRING_COLORS[note.string] : 'white'}
          >
            {note.finger}
          </text>
        </g>
      )}
    </svg>
  )
}
