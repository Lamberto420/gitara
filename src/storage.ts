// Zapis w localStorage. Wszystko w try/catch: w trybie prywatnym albo przy
// zablokowanych danych strony localStorage potrafi rzucić błąd – aplikacja ma wtedy po prostu
// działać z ustawieniami domyślnymi.
const PREFIX = 'gitara:'

export function load<T extends object>(key: string, fallback: T): T {
  const raw = loadRaw(key)
  return raw === null || typeof raw !== 'object' ? fallback : { ...fallback, ...raw }
}

/** Surowa wartość (do własnej walidacji) albo null, gdy brak lub nie da się odczytać. */
export function loadRaw(key: string): unknown {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    return raw === null ? null : JSON.parse(raw)
  } catch {
    return null
  }
}

/** Zwraca false, gdy zapis się nie udał (brak miejsca / zablokowane dane strony). */
export function save(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

export function remove(key: string): void {
  try {
    localStorage.removeItem(PREFIX + key)
  } catch {
    // nic nie szkodzi
  }
}
