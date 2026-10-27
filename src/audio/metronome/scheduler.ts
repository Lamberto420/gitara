// Harmonogram metronomu „z wyprzedzeniem” (wg artykułu Chrisa Wilsona „A Tale of Two Clocks”).
// Timer JavaScriptu bywa niedokładny (spóźnia się o kilka–kilkadziesiąt ms), ale zegar audio
// jest precyzyjny. Dlatego co ~25 ms wywołujemy tick(), który z góry planuje dźwięki
// na najbliższe 100 ms, podając dokładny czas startu w zegarze audio.

export const MIN_BPM = 40
export const MAX_BPM = 208

export function clampBpm(bpm: number): number {
  return Math.round(Math.max(MIN_BPM, Math.min(MAX_BPM, bpm)))
}

export interface Beat {
  /** Czas w sekundach zegara audio. */
  time: number
  /** Numer uderzenia w takcie: 0 = „raz”. */
  index: number
  accent: boolean
}

export interface SchedulerOptions {
  /** Aktualny czas w sekundach (w aplikacji: audioContext.currentTime). */
  now(): number
  /** Zaplanuj dźwięk uderzenia na beat.time. */
  playBeat(beat: Beat): void
  bpm: number
  beatsPerBar: number
  /** Na ile sekund do przodu planujemy. */
  lookahead?: number
}

export function createScheduler({ now, playBeat, bpm, beatsPerBar, lookahead = 0.1 }: SchedulerOptions) {
  let nextTime = 0
  let index = 0

  return {
    /** Pierwsze uderzenie („raz”) po krótkim opóźnieniu, żeby zdążyć je zaplanować. */
    start(delay = 0.05) {
      nextTime = now() + delay
      index = 0
    },

    tick() {
      const current = now()
      // Karta była w tle i timer stał? Pomijamy zaległe uderzenia zamiast grać je naraz,
      // ale liczymy je, żeby akcent dalej wypadał na „raz”.
      while (nextTime < current) advance()
      while (nextTime < current + lookahead) {
        playBeat({ time: nextTime, index, accent: index === 0 })
        advance()
      }
    },

    /** Zmiana tempa działa od następnego uderzenia – bez przerwy w rytmie. */
    setBpm(value: number) {
      bpm = clampBpm(value)
    },

    setBeatsPerBar(value: number) {
      beatsPerBar = value
      index %= beatsPerBar
    },
  }

  function advance() {
    nextTime += 60 / bpm
    index = (index + 1) % beatsPerBar
  }
}
