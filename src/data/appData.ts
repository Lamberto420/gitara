import { load, loadRaw, remove, save } from '../storage'
import { migrate } from './migrations'
import { emptyAppData, type AppData, type MetronomeSettings } from './model'

const DATA_KEY = 'data'
/** Aktywny profil to ustawienie tego urządzenia – nie trafia do kopii ani synchronizacji. */
const ACTIVE_PROFILE_KEY = 'active-profile'
/** Ustawienia metronomu sprzed wprowadzenia profili. */
const LEGACY_METRONOME_KEY = 'metronome'

export function loadAppData(): AppData {
  const raw = loadRaw(DATA_KEY)
  if (raw === null) return emptyAppData()
  try {
    return migrate(raw)
  } catch {
    // Nie kasujemy uszkodzonych danych – odkładamy je na bok, żeby dało się je odzyskać.
    save(`${DATA_KEY}-uszkodzone-${Date.now()}`, raw)
    return emptyAppData()
  }
}

export function saveAppData(data: AppData): boolean {
  return save(DATA_KEY, data)
}

/**
 * Prosi przeglądarkę, by nie czyściła danych aplikacji sama z siebie (np. przy braku miejsca).
 * Chrome zgadza się zwykle dla zainstalowanych PWA; Firefox może zapytać użytkownika.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (await navigator.storage?.persisted?.()) return true
    return (await navigator.storage?.persist?.()) ?? false
  } catch {
    return false
  }
}

export function loadActiveProfileId(): string | null {
  const raw = loadRaw(ACTIVE_PROFILE_KEY)
  return typeof raw === 'string' ? raw : null
}

export function saveActiveProfileId(id: string | null): void {
  if (id === null) remove(ACTIVE_PROFILE_KEY)
  else save(ACTIVE_PROFILE_KEY, id)
}

/** Stare ustawienia metronomu – trafią do pierwszego utworzonego profilu. */
export function loadLegacyMetronome(): MetronomeSettings | undefined {
  if (loadRaw(LEGACY_METRONOME_KEY) === null) return undefined
  return load(LEGACY_METRONOME_KEY, { bpm: 80, beatsPerBar: 4 })
}

export function clearLegacyMetronome(): void {
  remove(LEGACY_METRONOME_KEY)
}
