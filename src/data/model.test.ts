import { describe, expect, it } from 'vitest'
import { DataError, emptyAppData, localDay, newProfile, validateAppData } from './model'

describe('localDay', () => {
  it('używa czasu lokalnego (23:50 to jeszcze ten sam dzień)', () => {
    expect(localDay(new Date(2026, 9, 27, 23, 50))).toBe('2026-10-27')
    expect(localDay(new Date(2026, 0, 5, 0, 1))).toBe('2026-01-05')
  })
})

describe('newProfile', () => {
  it('nadaje id i czasy, przycina imię', () => {
    const p = newProfile({ name: '  Kuba ', avatar: '🦊', color: '#ff8c1a', dailyGoalMinutes: 10 }, 123)
    expect(p.name).toBe('Kuba')
    expect(p.id).toMatch(/^[0-9a-f-]{36}$/)
    expect(p.createdAt).toBe(123)
    expect(p.updatedAt).toBe(123)
  })
})

describe('validateAppData', () => {
  it('przyjmuje poprawne dane', () => {
    const ok = { ...emptyAppData(), profiles: [newProfile({ name: 'A', avatar: '🐻', color: '#000', dailyGoalMinutes: 10 })] }
    expect(validateAppData(ok)).toBe(ok)
  })

  it.each([
    ['null', null],
    ['tekst', 'hello'],
    ['obcy JSON', { foo: 1 }],
    ['brak zdarzeń', { version: 1, profiles: [] }],
  ])('odrzuca %s komunikatem dla użytkownika', (_, raw) => {
    expect(() => validateAppData(raw)).toThrow(DataError)
    expect(() => validateAppData(raw)).toThrow('To nie jest plik kopii')
  })

  it('wykrywa uszkodzony profil lub zdarzenie', () => {
    expect(() => validateAppData({ version: 1, profiles: [{ id: 1 }], events: [] })).toThrow('uszkodzony')
    expect(() => validateAppData({ version: 1, profiles: [], events: [{ id: 'x' }] })).toThrow('uszkodzony')
  })
})
