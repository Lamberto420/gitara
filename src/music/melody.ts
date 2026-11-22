// Plan odegrania frazy („Posłuchaj”): kiedy i jak długo brzmi każda nuta. Czysta logika –
// dźwięk robi audio/referenceTone.
import { sixteenths, type SongItem } from './song'

export interface ScheduledNote {
  /** Wysokość brzmienia (MIDI) – gitara brzmi oktawę niżej niż zapis. */
  midi: number
  /** Początek i długość w sekundach od startu melodii. */
  start: number
  duration: number
  /** Numer nuty we fragmencie (bez pauz) – do podświetlania. */
  index: number
}

/** Krótka przerwa przed następną nutą, żeby powtórzone dźwięki („A A A A”) było słychać osobno. */
const GAP = 0.9

/** `bpm` – ćwierćnuty na minutę (jak w piosence). Pauzy tylko przesuwają czas. */
export function melodySchedule(items: readonly SongItem[], bpm: number): ScheduledNote[] {
  const sixteenth = 60 / bpm / 4
  const out: ScheduledNote[] = []
  let t = 0
  for (const item of items) {
    if (item.kind === 'bar') continue
    const length = sixteenths(item.value, item.dotted) * sixteenth
    if (item.kind === 'note') out.push({ midi: item.note.midi, start: t, duration: length * GAP, index: out.length })
    t += length
  }
  return out
}
