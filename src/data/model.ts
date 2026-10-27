// Model danych aplikacji. Najważniejsza zasada: postęp to LOG ZDARZEŃ, a nie gotowe liczby.
// Punkty, serie i odznaki są wyliczane ze zdarzeń – dzięki temu dane z kilku urządzeń
// łączą się bez konfliktów (patrz merge.ts).

export const DATA_VERSION = 1

export const AVATARS = ['🦊', '🐻', '🐼', '🦁', '🐸', '🐯', '🐨', '🦄', '🐙', '🦖', '🚀', '🎸'] as const
export const COLORS = ['#ff8c1a', '#2fbf55', '#3b82f6', '#a855f7', '#ef4136', '#14b8a6'] as const
export const DAILY_GOALS = [10, 15, 20] as const

export interface MetronomeSettings {
  bpm: number
  beatsPerBar: number
}

export interface Profile {
  id: string
  name: string
  avatar: string
  color: string
  dailyGoalMinutes: number
  metronome?: MetronomeSettings
  createdAt: number
  /** Przy łączeniu danych wygrywa wersja profilu z nowszym updatedAt. */
  updatedAt: number
  /** Usunięty profil zostaje jako „nagrobek” – inaczej import starej kopii by go wskrzesił. */
  deleted?: boolean
}

export interface ActivityEvent {
  id: string
  profileId: string
  /** Znacznik czasu (ms). */
  at: number
  /** Dzień w czasie lokalnym urządzenia, np. „2026-10-27” – liczy się do serii. */
  day: string
  type: string
  [key: string]: unknown
}

export interface AppData {
  version: number
  profiles: Profile[]
  events: ActivityEvent[]
}

export const emptyAppData = (): AppData => ({ version: DATA_VERSION, profiles: [], events: [] })

export function localDay(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export type ProfileInput = Pick<Profile, 'name' | 'avatar' | 'color' | 'dailyGoalMinutes'> &
  Partial<Pick<Profile, 'metronome'>>

export function newProfile(input: ProfileInput, now = Date.now(), id: string = crypto.randomUUID()): Profile {
  return { ...input, name: input.name.trim(), id, createdAt: now, updatedAt: now }
}

export function activeProfiles(data: AppData): Profile[] {
  return data.profiles.filter((p) => !p.deleted)
}

/** Błąd z komunikatem dla użytkownika (np. przy wczytywaniu uszkodzonej kopii). */
export class DataError extends Error {}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null

/** Sprawdza, czy obiekt (np. z pliku kopii) ma poprawny format. Rzuca DataError, gdy nie. */
export function validateAppData(raw: unknown): AppData {
  if (!isObject(raw) || typeof raw.version !== 'number' || !Array.isArray(raw.profiles) || !Array.isArray(raw.events)) {
    throw new DataError('To nie jest plik kopii z aplikacji Gitara.')
  }
  const profilesOk = raw.profiles.every(
    (p) =>
      isObject(p) &&
      typeof p.id === 'string' &&
      typeof p.name === 'string' &&
      typeof p.avatar === 'string' &&
      typeof p.updatedAt === 'number',
  )
  const eventsOk = raw.events.every(
    (e) =>
      isObject(e) &&
      typeof e.id === 'string' &&
      typeof e.profileId === 'string' &&
      typeof e.at === 'number' &&
      typeof e.day === 'string' &&
      typeof e.type === 'string',
  )
  if (!profilesOk || !eventsOk) throw new DataError('Plik kopii jest uszkodzony.')
  return raw as unknown as AppData
}
