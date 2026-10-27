import { describe, expect, it } from 'vitest'
import { migrate, type Migration } from './migrations'
import { DATA_VERSION, DataError, emptyAppData } from './model'

describe('migrate', () => {
  it('dane w bieżącej wersji przechodzą bez zmian', () => {
    const data = emptyAppData()
    expect(migrate(data)).toEqual(data)
  })

  it('wykonuje kolejne migracje aż do docelowej wersji', () => {
    const migrations: Record<number, Migration> = {
      1: (d) => ({ ...d, profiles: [], events: [], migratedFrom1: true }),
      2: (d) => ({ ...d, migratedFrom2: true }),
    }
    const result = migrate({ version: 1, profiles: [], events: [] }, migrations, 3) as unknown as Record<string, unknown>
    expect(result).toMatchObject({ version: 3, migratedFrom1: true, migratedFrom2: true })
  })

  it('odrzuca dane z nowszej wersji aplikacji (zamiast je popsuć)', () => {
    expect(() => migrate({ version: DATA_VERSION + 1, profiles: [], events: [] })).toThrow(DataError)
    expect(() => migrate({ version: DATA_VERSION + 1, profiles: [], events: [] })).toThrow('nowszej wersji')
  })

  it('brakująca migracja to błąd, a nie ciche zgubienie danych', () => {
    expect(() => migrate({ version: 1, profiles: [], events: [] }, {}, 2)).toThrow('Brak migracji')
  })

  it('śmieci dają czytelny błąd', () => {
    expect(() => migrate('abc')).toThrow('To nie jest plik kopii')
  })
})
