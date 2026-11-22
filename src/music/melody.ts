// Plan odegrania frazy („Posłuchaj”): kiedy zaczyna się każda nuta i jak długo brzmi.
// Jak na gitarze: struna wybrzmiewa, dopóki na TEJ SAMEJ strunie nie zagra następna nuta
// (palec albo nowe szarpnięcie ją tłumi) – nuta na innej strunie nie przerywa poprzedniej.
// Czysta logika – dźwięk robi audio/referenceTone.
import { sixteenths, type SongItem } from './song'

export interface ScheduledNote {
  /** Wysokość brzmienia (MIDI) – gitara brzmi oktawę niżej niż zapis. */
  midi: number
  string: number
  /** Początek i czas brzmienia w sekundach od startu melodii. */
  start: number
  duration: number
  /** Numer nuty we fragmencie (bez pauz) – do podświetlania. */
  index: number
}

/** Tyle wybrzmiewa nuta, której nic nie tłumi (ostatnia, przed pauzą…). */
export const RING_S = 2.5
/** Struna milknie chwilę przed nowym szarpnięciem – powtórzone dźwięki („A A A A”) słychać osobno. */
const RESTRIKE_GAP_S = 0.03

/** `bpm` – ćwierćnuty na minutę (jak w piosence). Pauzy tylko przesuwają czas. */
export function melodySchedule(items: readonly SongItem[], bpm: number): ScheduledNote[] {
  const sixteenth = 60 / bpm / 4
  const out: ScheduledNote[] = []
  let t = 0
  for (const item of items) {
    if (item.kind === 'bar') continue
    if (item.kind === 'note') {
      out.push({ midi: item.note.midi, string: item.note.string, start: t, duration: RING_S, index: out.length })
    }
    t += sixteenths(item.value, item.dotted) * sixteenth
  }
  // Następna nuta na tej samej strunie tłumi poprzednią.
  for (let i = 0; i < out.length; i++) {
    const next = out.slice(i + 1).find((n) => n.string === out[i].string)
    if (next) out[i].duration = Math.min(RING_S, next.start - out[i].start - RESTRIKE_GAP_S)
  }
  return out
}
