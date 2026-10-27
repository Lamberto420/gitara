import { beforeEach, describe, expect, it, vi } from 'vitest'
import { loadAppData, loadLegacyMetronome, saveAppData } from './appData'
import { emptyAppData, newProfile } from './model'

/** Prosty localStorage w pamięci (testy działają w Node, bez przeglądarki). */
function fakeLocalStorage() {
  const items = new Map<string, string>()
  return {
    items,
    getItem: (k: string) => items.get(k) ?? null,
    setItem: (k: string, v: string) => void items.set(k, v),
    removeItem: (k: string) => void items.delete(k),
  }
}

let storage: ReturnType<typeof fakeLocalStorage>
beforeEach(() => {
  storage = fakeLocalStorage()
  vi.stubGlobal('localStorage', storage)
})

describe('appData', () => {
  it('pusty start, gdy nic nie zapisano', () => {
    expect(loadAppData()).toEqual(emptyAppData())
  })

  it('zapis i odczyt dają te same dane', () => {
    const data = { ...emptyAppData(), profiles: [newProfile({ name: 'Kuba', avatar: '🦊', color: '#f80', dailyGoalMinutes: 10 })] }
    expect(saveAppData(data)).toBe(true)
    expect(loadAppData()).toEqual(data)
  })

  it('uszkodzone dane są odkładane na bok, a nie kasowane', () => {
    storage.setItem('gitara:data', JSON.stringify({ zepsute: true }))
    expect(loadAppData()).toEqual(emptyAppData())
    const backupKey = [...storage.items.keys()].find((k) => k.startsWith('gitara:data-uszkodzone-'))
    expect(backupKey).toBeDefined()
    expect(JSON.parse(storage.items.get(backupKey!)!)).toEqual({ zepsute: true })
  })

  it('zgłasza nieudany zapis (np. brak miejsca)', () => {
    storage.setItem = () => {
      throw new DOMException('pełno', 'QuotaExceededError')
    }
    expect(saveAppData(emptyAppData())).toBe(false)
  })

  it('odczytuje stare ustawienia metronomu sprzed profili', () => {
    expect(loadLegacyMetronome()).toBeUndefined()
    storage.setItem('gitara:metronome', JSON.stringify({ bpm: 96, beatsPerBar: 3 }))
    expect(loadLegacyMetronome()).toEqual({ bpm: 96, beatsPerBar: 3 })
  })
})
