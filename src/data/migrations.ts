import { DATA_VERSION, DataError, validateAppData, type AppData } from './model'

/**
 * Migracje formatu danych: MIGRATIONS[n] zamienia dane z wersji n na n+1.
 * Gdy kiedyś zmienimy format (np. nowe pole w profilu), dopisujemy tu funkcję i podbijamy
 * DATA_VERSION – stare postępy na urządzeniach i w kopiach przeniosą się automatycznie.
 */
export type Migration = (data: Record<string, unknown>) => Record<string, unknown>

export const MIGRATIONS: Record<number, Migration> = {}

export function migrate(raw: unknown, migrations = MIGRATIONS, target = DATA_VERSION): AppData {
  if (typeof raw !== 'object' || raw === null || typeof (raw as { version?: unknown }).version !== 'number') {
    return validateAppData(raw) // rzuci czytelny DataError
  }
  let data = raw as Record<string, unknown>
  let version = data.version as number
  if (version > target) {
    throw new DataError('Te dane pochodzą z nowszej wersji aplikacji. Uruchom aplikację z internetem, żeby się zaktualizowała.')
  }
  while (version < target) {
    const step = migrations[version]
    if (!step) throw new DataError(`Brak migracji danych z wersji ${version}.`)
    data = { ...step(data), version: version + 1 }
    version++
  }
  return validateAppData(data)
}
