import { CLOSE_CENTS, IN_TUNE_CENTS, type TuneStatus } from '../../audio/pitch/notes'

const RANGE = 50 // skala wskazówki: ±50 centów (pół półtonu)
const CX = 100
const CY = 110
const R = 90

/** Centy → kąt wskazówki: -50 = całkiem w lewo (-90°), +50 = całkiem w prawo (+90°). */
function angle(cents: number): number {
  return (Math.max(-RANGE, Math.min(RANGE, cents)) / RANGE) * 90
}

function point(deg: number, r = R) {
  const rad = (deg * Math.PI) / 180
  return `${CX + r * Math.sin(rad)} ${CY - r * Math.cos(rad)}`
}

function arc(fromCents: number, toCents: number) {
  return `M ${point(angle(fromCents))} A ${R} ${R} 0 0 1 ${point(angle(toCents))}`
}

interface Props {
  cents: number | null
  status: TuneStatus | null
}

export default function Needle({ cents, status }: Props) {
  return (
    <svg className="needle" viewBox="0 0 200 125" role="img" aria-label="Wskazówka stroika">
      <path d={arc(-RANGE, -CLOSE_CENTS)} className="zone far" />
      <path d={arc(-CLOSE_CENTS, -IN_TUNE_CENTS)} className="zone close" />
      <path d={arc(-IN_TUNE_CENTS, IN_TUNE_CENTS)} className="zone in-tune" />
      <path d={arc(IN_TUNE_CENTS, CLOSE_CENTS)} className="zone close" />
      <path d={arc(CLOSE_CENTS, RANGE)} className="zone far" />
      <line
        x1={CX}
        y1={CY}
        x2={CX}
        y2={CY - R + 8}
        className={`hand ${status ?? 'off'}`}
        style={{ transform: `rotate(${angle(cents ?? 0)}deg)` }}
      />
      <circle cx={CX} cy={CY} r={7} className={`hub ${status ?? 'off'}`} />
    </svg>
  )
}
