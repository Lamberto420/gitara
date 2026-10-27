// Zapis ustawień w localStorage. Wszystko w try/catch: w trybie prywatnym albo przy
// zablokowanych danych strony localStorage potrafi rzucić błąd – aplikacja ma wtedy po prostu
// działać z ustawieniami domyślnymi.
const PREFIX = 'gitara:'

export function load<T extends object>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    return raw === null ? fallback : { ...fallback, ...JSON.parse(raw) }
  } catch {
    return fallback
  }
}

export function save(key: string, value: unknown): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch {
    // brak miejsca / zablokowane – trudno, ustawienia nie zostaną zapamiętane
  }
}
