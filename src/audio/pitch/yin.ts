// Algorytm YIN (de Cheveigné & Kawahara, 2002) do wykrywania częstotliwości podstawowej.
// Idea: szukamy przesunięcia (tau), przy którym sygnał najbardziej przypomina sam siebie.
// To przesunięcie to okres dźwięku, a częstotliwość = sampleRate / tau.

export interface YinOptions {
  /** Próg „pewności” – im niższy, tym ostrożniej (mniej fałszywych odczytów). */
  threshold?: number
  minFreq?: number
  maxFreq?: number
}

export function detectPitch(
  buffer: Float32Array,
  sampleRate: number,
  { threshold = 0.1, minFreq = 70, maxFreq = 400 }: YinOptions = {},
): number | null {
  const tauMin = Math.floor(sampleRate / maxFreq)
  const tauMax = Math.min(Math.ceil(sampleRate / minFreq), Math.floor(buffer.length / 2))
  const window = buffer.length - tauMax
  if (tauMax <= tauMin) return null

  // Krok 1+2: funkcja różnicowa d(tau) = Σ (x[j] - x[j+tau])²
  const diff = new Float32Array(tauMax + 1)
  for (let tau = 1; tau <= tauMax; tau++) {
    let sum = 0
    for (let j = 0; j < window; j++) {
      const delta = buffer[j] - buffer[j + tau]
      sum += delta * delta
    }
    diff[tau] = sum
  }

  // Krok 3: skumulowana normalizacja – d'(tau) bliskie 0 oznacza „prawie identyczny okres”.
  // Dzięki niej małe tau nie wygrywają tylko dlatego, że są małe.
  const cmnd = new Float32Array(tauMax + 1)
  cmnd[0] = 1
  let runningSum = 0
  for (let tau = 1; tau <= tauMax; tau++) {
    runningSum += diff[tau]
    cmnd[tau] = runningSum === 0 ? 1 : (diff[tau] * tau) / runningSum
  }

  // Krok 4: pierwsze tau poniżej progu, potem schodzimy do lokalnego minimum.
  // Branie pierwszego (a nie globalnego) minimum chroni przed błędem o oktawę w dół.
  let tau = tauMin
  while (tau <= tauMax && cmnd[tau] >= threshold) tau++
  if (tau > tauMax) return null
  while (tau + 1 <= tauMax && cmnd[tau + 1] < cmnd[tau]) tau++

  // Krok 5: interpolacja paraboliczna – okres między próbkami daje dokładność ułamka centa.
  return sampleRate / parabolicMinimum(cmnd, tau)
}

function parabolicMinimum(values: Float32Array, i: number): number {
  if (i <= 0 || i >= values.length - 1) return i
  const a = values[i - 1]
  const b = values[i]
  const c = values[i + 1]
  const denom = a - 2 * b + c
  return denom === 0 ? i : i + (a - c) / (2 * denom)
}

/** Głośność sygnału (średnia kwadratowa), do odrzucania ciszy i szumu tła. */
export function rms(buffer: Float32Array): number {
  let sum = 0
  for (let i = 0; i < buffer.length; i++) sum += buffer[i] * buffer[i]
  return Math.sqrt(sum / buffer.length)
}
