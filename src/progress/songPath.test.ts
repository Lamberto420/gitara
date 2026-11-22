import { describe, expect, it } from 'vitest'
import type { ActivityEvent } from '../data/model'
import { mergeAppData } from '../data/merge'
import { XP_CROWN, crownEvent, eventXp, isSongPlay, songUnlockEvent, type SongResult } from './events'
import { crownsBySong, songPath, songResultEvents } from './songPath'

const NOW = new Date(2026, 10, 22, 18, 0)
const IDS = ['a', 'b', 'c', 'd']

const result = (songId: string, crown: number, scope: SongResult['scope'] = 'song'): SongResult => ({
  songId,
  scope,
  mode: crown === 2 ? 'staff' : 'fretboard',
  notes: 20,
  firstTry: 19,
  crown,
  xp: scope === 'song' ? 3 : 1,
})

describe('crownsBySong', () => {
  it('najwyższa korona w piosence, tylko tej osoby', () => {
    const events = [crownEvent('k', 'a', 1, NOW), crownEvent('k', 'a', 2, NOW), crownEvent('t', 'b', 1, NOW)]
    expect(crownsBySong(events, 'k')).toEqual(new Map([['a', 2]]))
  })
})

describe('songPath', () => {
  it('na początku otwarta tylko pierwsza piosenka', () => {
    expect(songPath(IDS, [], 'k').map((s) => s.unlocked)).toEqual([true, false, false, false])
  })

  it('korona w piosence otwiera następną', () => {
    const path = songPath(IDS, [crownEvent('k', 'a', 1, NOW)], 'k')
    expect(path.map((s) => [s.crown, s.unlocked])).toEqual([
      [1, true],
      [0, true],
      [0, false],
      [0, false],
    ])
  })

  it('cudza korona niczego nie otwiera', () => {
    expect(songPath(IDS, [crownEvent('t', 'a', 1, NOW)], 'k')[1].unlocked).toBe(false)
    expect(songPath(IDS, [songUnlockEvent('t', 'c', NOW)], 'k')[2].unlocked).toBe(false)
  })

  it('ręczne odblokowanie otwiera tylko tę piosenkę', () => {
    const path = songPath(IDS, [songUnlockEvent('k', 'c', NOW)], 'k')
    expect(path.map((s) => s.unlocked)).toEqual([true, false, true, false])
    expect(path[2].manual).toBe(true)
    // Po koronie w odblokowanej ręcznie otwiera się kolejna.
    const later = songPath(IDS, [songUnlockEvent('k', 'c', NOW), crownEvent('k', 'c', 1, NOW)], 'k')
    expect(later.map((s) => s.unlocked)).toEqual([true, false, true, true])
    expect(later[2].manual).toBe(false)
  })

  it('odblokowanie przez ścieżkę nie jest „ręczne”, nawet gdy jest też zdarzenie', () => {
    const path = songPath(IDS, [crownEvent('k', 'a', 1, NOW), songUnlockEvent('k', 'b', NOW)], 'k')
    expect(path[1]).toMatchObject({ unlocked: true, manual: false })
  })
})

describe('songResultEvents', () => {
  it('fraza: samo podejście, bez korony', () => {
    const out = songResultEvents('k', result('a', 0, 1), [], NOW)
    expect(out).toHaveLength(1)
    expect(out[0]).toMatchObject({ type: 'song', songId: 'a', scope: 1, xp: 1, day: '2026-11-22' })
    expect(isSongPlay(out[0])).toBe(true)
  })

  it('pierwsza korona: podejście +3 i korona +5', () => {
    const out = songResultEvents('k', result('a', 1), [], NOW)
    expect(out.map((e) => e.id.startsWith('crown:') ? e.id : e.type)).toEqual(['song', 'crown:k:a:1'])
    expect(out.reduce((s, e) => s + eventXp(e), 0)).toBe(3 + XP_CROWN)
  })

  it('od razu korona 2 = też korona 1', () => {
    const out = songResultEvents('k', result('a', 2), [], NOW)
    expect(out.slice(1).map((e) => e.crown)).toEqual([1, 2])
  })

  it('zdobyta korona nie daje nutek drugi raz', () => {
    const had = [crownEvent('k', 'a', 1, NOW)]
    expect(songResultEvents('k', result('a', 1), had, NOW)).toHaveLength(1)
    expect(songResultEvents('k', result('a', 2), had, NOW).slice(1).map((e) => e.crown)).toEqual([2])
    // Słabsze podejście po lepszym – też bez korony.
    expect(songResultEvents('k', result('a', 1), [crownEvent('k', 'a', 2, NOW)], NOW)).toHaveLength(1)
  })

  it('korona zdobyta na dwóch urządzeniach liczy się po połączeniu raz', () => {
    const phone = songResultEvents('k', result('a', 1), [], NOW)
    const tablet = songResultEvents('k', result('a', 1), [], new Date(2026, 10, 22, 19, 0))
    const data = (events: ActivityEvent[]) => ({ version: 1, profiles: [], events })
    const merged = mergeAppData(data(phone), data(tablet))
    expect(merged.events.filter((e) => e.type === 'crown')).toHaveLength(1)
    expect(merged.events.filter((e) => e.type === 'song')).toHaveLength(2)
  })
})
