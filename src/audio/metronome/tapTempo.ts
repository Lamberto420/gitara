import { clampBpm } from './scheduler'

const MAX_INTERVALS = 4
const RESET_AFTER_MS = 2000

/** „Stuknij w rytm”: tempo z ostatnich kilku stuknięć. Przerwa > 2 s zaczyna liczenie od nowa. */
export function createTapTempo() {
  let taps: number[] = []

  return {
    /** Zwraca tempo w BPM albo null, gdy to dopiero pierwsze stuknięcie. */
    tap(timeMs: number): number | null {
      const last = taps.at(-1)
      if (last !== undefined && timeMs - last > RESET_AFTER_MS) taps = []
      taps.push(timeMs)
      taps = taps.slice(-(MAX_INTERVALS + 1))
      if (taps.length < 2) return null

      const averageMs = (taps.at(-1)! - taps[0]) / (taps.length - 1)
      return clampBpm(60000 / averageMs)
    },
  }
}
