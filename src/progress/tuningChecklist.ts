// Które struny już nastrojone – do bonusu „Cała gitara nastrojona” (+3 ⭐ raz dziennie).

/**
 * Tak długo struna musi brzmieć czysto bez przerwy, żeby się zaliczyła. Wskazówka potrafi
 * na chwilę „przelecieć” przez środek, gdy struna jest jeszcze rozstrojona.
 */
export const TUNED_HOLD_MS = 700

export const ALL_STRINGS = 6

export interface TuningChecklist {
  /** Kolejny odczyt stroika: która struna (null = cisza) i czy brzmi czysto. Zwraca nastrojone struny. */
  update(stringNumber: number | null, inTune: boolean, at: number): ReadonlySet<number>
  isComplete(): boolean
}

export function createTuningChecklist(): TuningChecklist {
  const tuned = new Set<number>()
  let candidate: number | null = null
  let since = 0

  return {
    update(stringNumber, inTune, at) {
      if (stringNumber === null || !inTune) {
        candidate = null
      } else if (candidate !== stringNumber) {
        candidate = stringNumber
        since = at
      } else if (at - since >= TUNED_HOLD_MS) {
        tuned.add(stringNumber)
      }
      return tuned
    },
    isComplete: () => tuned.size === ALL_STRINGS,
  }
}
