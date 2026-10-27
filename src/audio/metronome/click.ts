/**
 * Ile po tyku jeszcze ignorujemy mikrofon: tyk trwa 50 ms, a analiza patrzy na ~85 ms
 * dźwięku wstecz – plus zapas na pogłos pokoju i opóźnienie głośnika.
 */
const CLICK_IGNORE_S = 0.2

/** Początki zaplanowanych tyków (zegar audio) – tylko z ostatnich kilku sekund. */
const clickTimes: number[] = []

/** Krótki „tyk” metronomu zaplanowany dokładnie na `time` (zegar audio). Akcent jest wyższy i głośniejszy. */
export function playClick(ctx: AudioContext, time: number, accent: boolean): OscillatorNode {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.frequency.value = accent ? 1500 : 1000
  gain.gain.setValueAtTime(0.0001, time)
  gain.gain.exponentialRampToValueAtTime(accent ? 0.9 : 0.5, time + 0.002)
  gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.05)
  osc.connect(gain).connect(ctx.destination)
  osc.start(time)
  osc.stop(time + 0.06)

  while (clickTimes.length && clickTimes[0] < ctx.currentTime - 5) clickTimes.shift()
  clickTimes.push(time)
  return osc
}

/**
 * Tyk ma wyraźną wysokość (1000 Hz) – licznik ćwiczeń wziąłby go za grę na gitarze.
 * Dlatego chwile tyków pomijamy, tak jak stroik pomija dźwięk wzorcowy.
 */
export function isClickSounding(ctx: AudioContext): boolean {
  const now = ctx.currentTime
  return clickTimes.some((t) => t <= now && now < t + CLICK_IGNORE_S)
}
