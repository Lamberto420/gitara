import { describe, expect, it } from 'vitest'
import { backupFileName, parseBackup } from './backup'
import { DATA_VERSION, DataError, emptyAppData, newProfile } from './model'

describe('backup', () => {
  it('nazwa pliku z dzisiejszą datą', () => {
    expect(backupFileName(new Date(2026, 9, 27, 21, 0))).toBe('gitara-kopia-2026-10-27.json')
  })

  it('kopia zapisana i wczytana daje te same dane', () => {
    const data = {
      ...emptyAppData(),
      profiles: [newProfile({ name: 'Kuba', avatar: '🦊', color: '#f80', dailyGoalMinutes: 10 })],
      events: [{ id: 'e1', profileId: 'x', at: 1, day: '2026-10-27', type: 'practice', seconds: 600 }],
    }
    expect(parseBackup(JSON.stringify(data))).toEqual(data)
  })

  it.each([
    ['zdjęcie / binarny plik', '\u0089PNG\r\n'],
    ['pusty plik', ''],
    ['inny JSON', '{"name":"package"}'],
  ])('odrzuca %s czytelnym komunikatem', (_, text) => {
    expect(() => parseBackup(text)).toThrow(DataError)
    expect(() => parseBackup(text)).toThrow('To nie jest plik kopii')
  })

  it('kopia z nowszej wersji aplikacji jest odrzucana', () => {
    const newer = JSON.stringify({ ...emptyAppData(), version: DATA_VERSION + 1 })
    expect(() => parseBackup(newer)).toThrow('nowszej wersji')
  })
})
