// Działania na dniach w formacie „RRRR-MM-DD”. Liczymy w UTC na samych datach (bez godzin),
// żeby zmiana czasu letni/zimowy nie dawała dni 23- lub 25-godzinnych.

const DAY_MS = 86_400_000

function toUtc(day: string): number {
  const [y, m, d] = day.split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}

function fromUtc(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10)
}

export function addDays(day: string, n: number): string {
  return fromUtc(toUtc(day) + n * DAY_MS)
}

/** Kolejne dni od `from` do `to` włącznie. */
export function* daysBetween(from: string, to: string): Generator<string> {
  for (let t = toUtc(from); t <= toUtc(to); t += DAY_MS) yield fromUtc(t)
}
