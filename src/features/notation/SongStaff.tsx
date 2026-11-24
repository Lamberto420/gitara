import type { Song } from '../../music/song'
import { layoutPhrase, type Beam, type LaidNote, type LaidRest, type StaffLine } from '../../music/songLayout'
import { STRING_COLORS } from './stringColors'
import { HALF, Sharp, TrebleClef8, y } from './staffGlyphs'

/** Szerokość linii w jednostkach rysunku – przy wąskim ekranie fraza zawija się na kreskach taktowych. */
export const LINE_WIDTH = 360
const STEM = 33
const TOP = 36
/** Dół rysunku co najmniej pod „8” klucza wiolinowego. */
const MIN_BOTTOM = 138

/** Ocena nuty w grze w rytmie: dobrze i w czasie / dobra nuta, ale nierówno / zła albo brak. */
export type NoteMark = 'good' | 'off' | 'bad'
const MARK_COLORS: Record<NoteMark, string> = { good: '#1f9d48', off: '#f08a00', bad: '#d93025' }

interface Props {
  song: Song
  phrase: number
  /** Numer bieżącej nuty we frazie (podświetlenie); null = bez podświetlenia. */
  current?: number | null
  /** Nuty przed bieżącą są już zagrane – rysujemy je bledziej. */
  dimPlayed?: boolean
  /** Kolor nuty = kolor struny; bez kolorów, gdy gramy „bez podpowiedzi”. */
  colorful?: boolean
  lyrics?: boolean
  /** Ocena nut frazy (indeks = nuta we frazie) – kolor nuty zamiast koloru struny; brak = bez oceny. */
  marks?: readonly (NoteMark | undefined)[]
}

/** Fraza piosenki na pięciolinii z rytmem: laski, belki, kropki, pauzy, kreski taktowe i tekst. */
export default function SongStaff({ song, phrase, current = null, dimPlayed = false, colorful = true, lyrics = true, marks }: Props) {
  const lines = layoutPhrase(song, phrase, LINE_WIDTH)
  const withLyrics = lyrics && lines.some((l) => l.items.some((i) => i.kind === 'note' && i.syllable))
  return (
    <div className="song-staff">
      {lines.map((line, i) => (
        <Line
          key={i}
          line={line}
          meter={song.meter}
          current={current}
          dimPlayed={dimPlayed}
          colorful={colorful}
          lyrics={withLyrics}
          marks={marks}
        />
      ))}
    </div>
  )
}

function Line({
  line,
  meter,
  current,
  dimPlayed,
  colorful,
  lyrics,
  marks,
}: {
  line: StaffLine
  meter: readonly [number, number]
  current: number | null
  dimPlayed: boolean
  colorful: boolean
  lyrics: boolean
  marks?: readonly (NoteMark | undefined)[]
}) {
  const notes = line.items.filter((i): i is LaidNote => i.kind === 'note')
  const byIndex = new Map(notes.map((n) => [n.index, n]))
  const color = (n: LaidNote) => {
    const mark = marks?.[n.index]
    if (mark) return MARK_COLORS[mark]
    return colorful ? STRING_COLORS[n.note.string] : 'currentColor'
  }
  const opacity = (n: LaidNote) => (dimPlayed && current !== null && n.index < current ? 0.4 : 1)
  const cur = current === null ? undefined : byIndex.get(current)

  /** Koniec laski: przy belce – wspólna wysokość belki, inaczej stała długość. */
  const beamOf = new Map<number, Beam>()
  for (const b of line.beams) for (const n of b.notes) beamOf.set(n, b)
  const beamY = (b: Beam) => {
    const ys = b.notes.map((n) => y(byIndex.get(n)!.position))
    return b.up ? Math.min(...ys) - STEM : Math.max(...ys) + STEM
  }
  const stemX = (n: LaidNote) => (n.stem === 'up' ? n.x + 6 : n.x - 6)
  const stemEnd = (n: LaidNote) => {
    const b = beamOf.get(n.index)
    if (b) return beamY(b)
    return n.stem === 'up' ? y(n.position) - STEM : y(n.position) + STEM
  }

  // Tekst tuż pod najniższym elementem linii (główka, laska w dół, belka) – bez pustej przerwy.
  const lowest = Math.max(110, ...notes.map((n) => Math.max(y(n.position) + 6, n.stem === 'down' ? stemEnd(n) : 0)))
  const lyricsY = lowest + 18
  const height = Math.max(MIN_BOTTOM, lyrics ? lyricsY + 8 : lowest + 10) - TOP

  return (
    <svg
      className="staff song-staff-line"
      viewBox={`0 ${TOP} ${line.width} ${height}`}
      // Ta sama skala we wszystkich liniach: krótsza linia jest węższa, a nie większa.
      style={{ width: `${(line.width / LINE_WIDTH) * 100}%` }}
      role="img"
      aria-label="Fraza na pięciolinii"
    >
      {/* Białe tło w samym rysunku – patrz Staff.tsx (narzucony ciemny motyw). */}
      <rect x="0" y={TOP} width={line.width} height={height} rx="12" fill="white" />
      {cur && <rect x={cur.x - 13} y={TOP + 6} width="26" height={height - 12} rx="8" fill="#ffe58a" />}
      <g stroke="currentColor" strokeWidth="1.2">
        {[0, 2, 4, 6, 8].map((p) => (
          <line key={p} x1="4" x2={line.width - 4} y1={y(p)} y2={y(p)} />
        ))}
      </g>
      <TrebleClef8 />
      {line.meter && (
        <g fontSize="21" fontWeight="800" textAnchor="middle" fill="currentColor">
          <text x="52" y={y(4) - 1}>
            {meter[0]}
          </text>
          <text x="52" y={y(0) - 1}>
            {meter[1]}
          </text>
        </g>
      )}

      {line.items.map((item, i) =>
        item.kind === 'bar' ? (
          <line key={i} x1={item.x} x2={item.x} y1={y(8)} y2={y(0)} stroke="currentColor" strokeWidth="1.2" />
        ) : item.kind === 'rest' ? (
          <Rest key={i} rest={item} />
        ) : (
          <g key={i} opacity={opacity(item)}>
            {item.ledgers.map((p) => (
              <line key={p} x1={item.x - 11} x2={item.x + 11} y1={y(p)} y2={y(p)} stroke="currentColor" strokeWidth="1.2" />
            ))}
            {item.sharp && <Sharp x={item.x - 17} cy={y(item.position)} color={color(item)} />}
            <ellipse
              cx={item.x}
              cy={y(item.position)}
              rx="6.6"
              ry="4.7"
              transform={`rotate(-20 ${item.x} ${y(item.position)})`}
              fill={item.filled ? color(item) : 'white'}
              stroke={color(item)}
              strokeWidth={item.filled ? 0 : 2}
            />
            {item.dotted && (
              // Kropka zawsze w polu – nuta na linii ma ją pole wyżej.
              <circle cx={item.x + 11} cy={y(item.position + (item.position % 2 === 0 ? 1 : 0))} r="1.9" fill={color(item)} />
            )}
            {item.stem && (
              <line
                x1={stemX(item)}
                x2={stemX(item)}
                y1={y(item.position) + (item.stem === 'up' ? -1 : 1)}
                y2={stemEnd(item)}
                stroke={color(item)}
                strokeWidth="1.6"
              />
            )}
            {Array.from({ length: item.flags }, (_, f) => (
              <Flag key={f} n={item} end={stemEnd(item)} offset={f * 7} color={color(item)} />
            ))}
            {lyrics && item.syllable && (
              <text x={item.x} y={lyricsY} fontSize="12" textAnchor="middle" fill="currentColor">
                {item.syllable}
              </text>
            )}
          </g>
        ),
      )}

      {line.beams.map((b, i) => {
        const first = byIndex.get(b.notes[0])!
        const last = byIndex.get(b.notes[b.notes.length - 1])!
        const by = beamY(b)
        const thick = 4.5
        const beamColor = colorful && new Set(b.notes.map((n) => byIndex.get(n)!.note.string)).size === 1 ? color(first) : 'currentColor'
        const rect = (x1: number, x2: number, level: number) => {
          const top = b.up ? by + level * 7 : by - thick - level * 7
          return <rect key={`${x1}-${level}`} x={x1} y={top} width={Math.max(x2 - x1, 0)} height={thick} fill={beamColor} />
        }
        return (
          <g key={`b${i}`} opacity={opacity(first)}>
            {rect(stemX(first) - 0.8, stemX(last) + 0.8, 0)}
            {b.secondary.map(([from, to]) => {
              const a = byIndex.get(from)!
              const z = byIndex.get(to)!
              if (from !== to) return rect(stemX(a) - 0.8, stemX(z) + 0.8, 1)
              // Pojedyncza szesnastka: krótki ogonek w stronę poprzedniej nuty (albo następnej na początku).
              const left = from !== b.notes[0]
              return left ? rect(stemX(a) - 8, stemX(a) + 0.8, 1) : rect(stemX(a) - 0.8, stemX(a) + 8, 1)
            })}
          </g>
        )
      })}
    </svg>
  )
}

/** Chorągiewka pojedynczej ósemki/szesnastki – w prawo od laski, w stronę główki. */
function Flag({ n, end, offset, color }: { n: LaidNote; end: number; offset: number; color: string }) {
  const x = n.stem === 'up' ? n.x + 6 : n.x - 6
  const dir = n.stem === 'up' ? 1 : -1
  const y0 = end + dir * offset
  return (
    <path
      d={`M ${x} ${y0} C ${x + 2} ${y0 + dir * 8} ${x + 11} ${y0 + dir * 10} ${x + 8} ${y0 + dir * 20}`}
      fill="none"
      stroke={color}
      strokeWidth="2.2"
      strokeLinecap="round"
    />
  )
}

/** Pauzy: cała wisi pod 4. linią, półnuta leży na 3., ćwierćnuta to zygzak, ósemka – kropka z kreską. */
function Rest({ rest }: { rest: LaidRest }) {
  const { x, value, dotted } = rest
  return (
    <g fill="currentColor" stroke="currentColor">
      {value === 1 && <rect x={x - 6} y={y(6)} width="12" height={HALF} stroke="none" />}
      {value === 2 && <rect x={x - 6} y={y(4) - HALF} width="12" height={HALF} stroke="none" />}
      {value === 4 && (
        <path
          d={`M ${x - 2} ${y(7)} L ${x + 4} ${y(5.5)} L ${x - 1} ${y(4)} L ${x + 4} ${y(2.5)} C ${x - 3} ${y(3)} ${x - 3} ${y(1.5)} ${x + 1} ${y(1)}`}
          fill="none"
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
      )}
      {value >= 8 && (
        <>
          <circle cx={x - 2} cy={y(5)} r="2.4" stroke="none" />
          <line x1={x + 4} y1={y(5.2)} x2={x - 1} y2={y(1.5)} strokeWidth="1.8" />
          {value === 16 && <circle cx={x - 4} cy={y(3.3)} r="2.4" stroke="none" />}
        </>
      )}
      {dotted && <circle cx={x + 10} cy={y(5)} r="1.9" stroke="none" />}
    </g>
  )
}
