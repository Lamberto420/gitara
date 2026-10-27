// Licznik czasu gry: dostaje kolejne odczyty z mikrofonu („słychać gitarę?”) i sumuje,
// ile czasu ktoś naprawdę grał. Czysta logika – czas podaje wywołujący (łatwe testy).

/**
 * Tyle ciszy jeszcze liczymy jako granie: przerwa między nutami, zerknięcie w nuty,
 * zmiana chwytu. Dłuższa cisza = przerwa w ćwiczeniu, licznik staje.
 */
export const HEARD_GRACE_MS = 3000

/**
 * Najdłuższy odstęp między odczytami, jaki doliczamy. Gdy ekran zgaśnie albo karta zejdzie
 * w tło, przeglądarka wstrzymuje analizę – po powrocie ta przerwa nie może się doliczyć jako gra.
 */
export const MAX_STEP_MS = 500

export interface PracticeTracker {
  /** Kolejny odczyt: chwila (ms) i czy mikrofon słyszy teraz gitarę. */
  update(at: number, heard: boolean): void
  /** Czy w tej chwili liczymy granie (słychać gitarę albo trwa krótka przerwa). */
  isPlaying(at: number): boolean
  /** Ile sekund gry jest policzone, a jeszcze niezapisane. */
  pendingSeconds(): number
  /** Zabiera pełne minuty do zapisania (reszta czeka). Zwraca ich liczbę. */
  takeFullMinutes(): number
  /** Zabiera całą resztę (pełne sekundy) – przy zakończeniu ćwiczenia. */
  takeRest(): number
}

export function createPracticeTracker(): PracticeTracker {
  let lastAt: number | null = null
  let lastHeard = -Infinity
  let pendingMs = 0

  const playingAt = (at: number) => at - lastHeard <= HEARD_GRACE_MS

  return {
    update(at, heard) {
      // Odcinek od poprzedniego odczytu liczy się, jeśli wtedy trwało granie albo właśnie słychać grę.
      if (lastAt !== null && at > lastAt && (heard || playingAt(lastAt))) {
        pendingMs += Math.min(at - lastAt, MAX_STEP_MS)
      }
      lastAt = at
      if (heard) lastHeard = at
    },
    isPlaying: playingAt,
    pendingSeconds: () => Math.floor(pendingMs / 1000),
    takeFullMinutes() {
      const minutes = Math.floor(pendingMs / 60_000)
      pendingMs -= minutes * 60_000
      return minutes
    },
    takeRest() {
      const seconds = Math.floor(pendingMs / 1000)
      pendingMs = 0
      return seconds
    },
  }
}
