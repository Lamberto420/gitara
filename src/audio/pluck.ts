// Szarpnięta struna metodą Karplusa-Stronga: krótki szum (szarpnięcie) krąży w pętli o długości
// jednego okresu dźwięku i za każdym obiegiem jest lekko wygładzany. Wysokie składowe gasną
// szybciej niż podstawa – jak w prawdziwej strunie – więc brzmi jak gitara, a nie jak organy
// (stały zestaw sinusów). Czysta funkcja: liczy próbki, odtwarza je referenceTone.ts.

export interface PluckOptions {
  /** Ile energii zostaje po każdym obiegu pętli (bliżej 1 = dłuższe wybrzmiewanie). */
  sustain?: number
  /**
   * Miejsce szarpnięcia jako ułamek długości struny: blisko podstawka (mało) = jaśniej,
   * dalej = cieplej. Gitarzyści klasyczni grają zwykle nad otworem rezonansowym.
   */
  pluckPosition?: number
  /** Ziarno szumu – ten sam dźwięk przy każdym odtworzeniu (i w testach). */
  seed?: number
}

/** Prosty generator liczb losowych z ziarnem (mulberry32). */
function seeded(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Próbki szarpniętej struny o częstotliwości `freq`, znormalizowane do szczytu 1. */
export function pluckSamples(freq: number, sampleRate: number, seconds: number, options: PluckOptions = {}): Float32Array<ArrayBuffer> {
  const { sustain = 0.996, pluckPosition = 0.2, seed = 1 } = options
  // Okres w próbkach. Wygładzanie (średnia dwóch próbek) opóźnia o pół próbki, a resztę ułamka
  // daje filtr wszechprzepustowy – bez niego wysokość byłaby zaokrąglona nawet o kilka centów.
  const period = sampleRate / freq
  const length = Math.floor(period - 0.5 - 0.1)
  const fraction = period - 0.5 - length // między 0,1 a 1,1 – tu filtr jest stabilny i dokładny
  const allpass = (1 - fraction) / (1 + fraction)

  // Szarpnięcie: szum, złagodzony (paznokieć/opuszek na nylonie, nie kostka na stali)…
  const random = seeded(seed)
  const excitation = new Float32Array(length)
  let smooth = 0
  for (let i = 0; i < length; i++) {
    smooth += 0.5 * (random() * 2 - 1 - smooth)
    excitation[i] = smooth
  }
  // …i „miejsce szarpnięcia”: znosi składowe, które mają tam węzeł (filtr grzebieniowy).
  const offset = Math.max(1, Math.round(pluckPosition * length))
  const line = new Float32Array(length)
  let mean = 0
  for (let i = 0; i < length; i++) {
    line[i] = excitation[i] - (i >= offset ? excitation[i - offset] : 0)
    mean += line[i] / length
  }
  for (let i = 0; i < length; i++) line[i] -= mean // bez składowej stałej (trzasku)

  const out = new Float32Array(Math.ceil(seconds * sampleRate))
  let index = 0
  let previous = 0
  let apIn = 0
  let apOut = 0
  let peak = 0
  for (let n = 0; n < out.length; n++) {
    const x = line[index]
    out[n] = x
    peak = Math.max(peak, Math.abs(x))
    const averaged = 0.5 * (x + previous)
    previous = x
    const delayed = allpass * averaged + apIn - allpass * apOut
    apIn = averaged
    apOut = delayed
    line[index] = sustain * delayed
    index = index + 1 === length ? 0 : index + 1
  }
  if (peak > 0) for (let n = 0; n < out.length; n++) out[n] /= peak
  return out
}
