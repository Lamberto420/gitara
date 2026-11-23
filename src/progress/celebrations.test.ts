import { describe, expect, it } from 'vitest'
import { newProfile, type ActivityEvent } from '../data/model'
import { computeBadges } from './badges'
import { crownEvent, goalEvent, practiceEvent } from './events'
import { newCelebrations, snapshot } from './celebrations'
import { computeProgress } from './progress'

const TODAY = '2026-10-27'
const NOW = new Date(2026, 9, 27, 18, 0)
const kuba = newProfile({ name: 'Kuba', avatar: '🦊', color: '#f80', dailyGoalMinutes: 10 }, 1, 'kuba')
const tata = newProfile({ name: 'Tata', avatar: '🐻', color: '#38f', dailyGoalMinutes: 10 }, 2, 'tata')

function state(events: ActivityEvent[], profile = kuba, day = TODAY) {
  const progress = computeProgress(events, profile, day)
  const badges = computeBadges(events, profile, [profile], day)
  return { progress, badges, snap: snapshot(profile.id, day, progress, badges, events) }
}

const kinds = (events: ActivityEvent[], before: ActivityEvent[]) => {
  const next = state(events)
  return newCelebrations(state(before).snap, next.snap, next.progress, next.badges).map((c) =>
    c.kind === 'badge'
      ? `badge:${c.badge.id}`
      : c.kind === 'level'
        ? `level:${c.level}`
        : c.kind === 'crown'
          ? `crown:${c.songId}:${c.crown}`
          : c.kind,
  )
}

describe('newCelebrations', () => {
  it('pierwsza minuta: odznaka „Pierwsze dźwięki”', () => {
    expect(kinds([practiceEvent('kuba', 60, NOW)], [])).toEqual(['badge:play-1m'])
  })

  it('cel dzienny: cel, awans i odznaki w tej kolejności', () => {
    const before = [practiceEvent('kuba', 600, NOW)] // 20 ⭐
    const after = [...before, goalEvent('kuba', TODAY, NOW), practiceEvent('kuba', 60, NOW)] // 32 ⭐… bez awansu
    expect(kinds(after, before)).toEqual(['goal', 'badge:goals-1'])
    const more = [...after, practiceEvent('kuba', 600, NOW)] // 52 ⭐ – poziom 2
    expect(kinds(more, after)).toEqual(['level:2'])
  })

  it('bez zmian – nic', () => {
    const events = [practiceEvent('kuba', 120, NOW)]
    expect(kinds(events, events)).toEqual([])
  })

  it('start aplikacji, zmiana osoby i nowy dzień – nic do świętowania', () => {
    const events = [practiceEvent('kuba', 600, NOW), practiceEvent('tata', 600, NOW)]
    const k = state(events)
    expect(newCelebrations(null, k.snap, k.progress, k.badges)).toEqual([])
    const t = state(events, tata)
    expect(newCelebrations(state([]).snap, t.snap, t.progress, t.badges)).toEqual([])
    const tomorrow = state(events, kuba, '2026-10-28')
    expect(newCelebrations(state([]).snap, tomorrow.snap, tomorrow.progress, tomorrow.badges)).toEqual([])
  })

  it('korona: najpierw korona, potem odznaki; przy koronie 2 od razu – tylko najwyższa', () => {
    const before = [practiceEvent('kuba', 60, NOW)]
    const first = [...before, crownEvent('kuba', 'mary-lamb', 1, NOW)]
    expect(kinds(first, before)).toEqual(['crown:mary-lamb:1', 'badge:song-1'])
    const both = [...first, crownEvent('kuba', 'twinkle', 1, NOW), crownEvent('kuba', 'twinkle', 2, NOW)]
    expect(kinds(both, first)).toEqual(['crown:twinkle:2', 'badge:crowns-3'])
    // Kolejność zdarzeń po połączeniu urządzeń bywa dowolna.
    const reversed = [...first, crownEvent('kuba', 'twinkle', 2, NOW), crownEvent('kuba', 'twinkle', 1, NOW)]
    expect(kinds(reversed, first)).toEqual(['crown:twinkle:2', 'badge:crowns-3'])
  })

  it('korona innej osoby (np. z importu na jej urządzeniu) – nic', () => {
    const before = [practiceEvent('kuba', 60, NOW)]
    expect(kinds([...before, crownEvent('tata', 'mary-lamb', 1, NOW)], before)).toEqual([])
  })
})
