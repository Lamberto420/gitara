import { describe, expect, it } from 'vitest'
import { mergeAppData, mergeSummary } from './merge'
import { DATA_VERSION, newProfile, type ActivityEvent, type AppData, type Profile } from './model'

const kuba = newProfile({ name: 'Kuba', avatar: '🦊', color: '#ff8c1a', dailyGoalMinutes: 10 }, 1000, 'kuba')
const tata = newProfile({ name: 'Tata', avatar: '🐻', color: '#3b82f6', dailyGoalMinutes: 15 }, 2000, 'tata')

const event = (id: string, at: number, profileId = 'kuba'): ActivityEvent => ({
  id,
  profileId,
  at,
  day: '2026-10-27',
  type: 'practice',
  seconds: 60,
})

const data = (profiles: Profile[], events: ActivityEvent[] = []): AppData => ({
  version: DATA_VERSION,
  profiles,
  events,
})

describe('mergeAppData', () => {
  it('łączy zdarzenia z dwóch urządzeń bez duplikatów, posortowane w czasie', () => {
    const tablet = data([kuba], [event('a', 10), event('b', 30)])
    const komputer = data([kuba], [event('b', 30), event('c', 20)])
    const merged = mergeAppData(tablet, komputer)
    expect(merged.events.map((e) => e.id)).toEqual(['a', 'c', 'b'])
    expect(merged.profiles).toHaveLength(1)
  })

  it('dodaje profile, których nie było', () => {
    const merged = mergeAppData(data([kuba]), data([tata]))
    expect(merged.profiles.map((p) => p.name)).toEqual(['Kuba', 'Tata'])
  })

  it('z dwóch wersji profilu wygrywa nowsza – niezależnie od kolejności', () => {
    const renamed = { ...kuba, name: 'Kubuś', updatedAt: 5000 }
    expect(mergeAppData(data([kuba]), data([renamed])).profiles[0].name).toBe('Kubuś')
    expect(mergeAppData(data([renamed]), data([kuba])).profiles[0].name).toBe('Kubuś')
  })

  it('usunięty profil nie wraca po wczytaniu starej kopii', () => {
    const deleted = { ...tata, deleted: true, updatedAt: 9000 }
    const oldBackup = data([kuba, tata])
    const merged = mergeAppData(data([kuba, deleted]), oldBackup)
    expect(merged.profiles.find((p) => p.id === 'tata')?.deleted).toBe(true)
  })

  it('przy remisie czasu usunięcie wygrywa w obu kolejnościach', () => {
    const deleted = { ...tata, deleted: true }
    expect(mergeAppData(data([tata]), data([deleted])).profiles[0].deleted).toBe(true)
    expect(mergeAppData(data([deleted]), data([tata])).profiles[0].deleted).toBe(true)
  })

  it('ponowny import tego samego pliku nic nie zmienia', () => {
    const current = data([kuba, tata], [event('a', 10), event('b', 20, 'tata')])
    const backup = data([kuba], [event('a', 10)])
    const once = mergeAppData(current, backup)
    expect(mergeAppData(once, backup)).toEqual(once)
    expect(mergeAppData(once, once)).toEqual(once)
  })

  it('nie zmienia danych wejściowych', () => {
    const a = data([kuba], [event('a', 10)])
    const snapshot = structuredClone(a)
    mergeAppData(a, data([tata], [event('b', 5)]))
    expect(a).toEqual(snapshot)
  })
})

describe('mergeSummary', () => {
  it('liczy nowe profile, zmienione profile i nowe aktywności', () => {
    const before = data([kuba], [event('a', 10)])
    const after = mergeAppData(
      before,
      data([{ ...kuba, avatar: '🐼', updatedAt: 3000 }, tata], [event('b', 20), event('c', 30)]),
    )
    expect(mergeSummary(before, after)).toEqual({ newProfiles: 1, updatedProfiles: 1, newEvents: 2 })
  })
})
