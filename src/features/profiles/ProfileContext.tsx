import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  clearLegacyMetronome,
  loadActiveProfileId,
  loadAppData,
  loadLegacyMetronome,
  requestPersistentStorage,
  saveActiveProfileId,
  saveAppData,
} from '../../data/appData'
import { mergeAppData, mergeSummary, type MergeSummary } from '../../data/merge'
import {
  activeProfiles,
  newProfile,
  type ActivityEvent,
  type AppData,
  type Profile,
  type ProfileInput,
} from '../../data/model'

interface ProfilesApi {
  data: AppData
  profiles: Profile[]
  activeProfile: Profile | null
  /** Zapis do pamięci urządzenia się nie udał – pokazujemy ostrzeżenie. */
  saveFailed: boolean
  selectProfile(id: string | null): void
  createProfile(input: ProfileInput): Profile
  updateProfile(id: string, changes: Partial<ProfileInput>): void
  deleteProfile(id: string): void
  importData(incoming: AppData): MergeSummary
  /** Dopisuje zdarzenia postępu (zdarzenia o istniejącym id są pomijane). */
  addEvents(events: ActivityEvent[]): void
  /** Rośnie przy każdym imporcie kopii – nagrody „z importu” nie są świętowane. */
  importCount: number
}

const ProfileContext = createContext<ProfilesApi | null>(null)

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState(loadAppData)
  const [activeId, setActiveId] = useState(loadActiveProfileId)
  const [saveFailed, setSaveFailed] = useState(false)
  const [importCount, setImportCount] = useState(0)

  // Każda zmiana danych od razu trafia do pamięci urządzenia.
  useEffect(() => setSaveFailed(!saveAppData(data)), [data])
  useEffect(() => saveActiveProfileId(activeId), [activeId])

  const profiles = useMemo(() => activeProfiles(data), [data])
  const activeProfile = profiles.find((p) => p.id === activeId) ?? null

  const createProfile = useCallback(
    (input: ProfileInput) => {
      // Pierwszy profil przejmuje ustawienia metronomu sprzed wprowadzenia profili.
      const legacy = data.profiles.length === 0 ? loadLegacyMetronome() : undefined
      const profile = newProfile({ metronome: legacy, ...input })
      setData((d) => ({ ...d, profiles: [...d.profiles, profile] }))
      if (legacy) clearLegacyMetronome()
      requestPersistentStorage() // dobry moment: od teraz są dane, których szkoda
      return profile
    },
    [data.profiles.length],
  )

  const updateProfile = useCallback((id: string, changes: Partial<ProfileInput>) => {
    setData((d) => ({
      ...d,
      profiles: d.profiles.map((p) => (p.id === id ? touch({ ...p, ...changes }) : p)),
    }))
  }, [])

  const deleteProfile = useCallback((id: string) => {
    setData((d) => ({
      ...d,
      profiles: d.profiles.map((p) => (p.id === id ? touch({ ...p, deleted: true }) : p)),
    }))
    setActiveId((current) => (current === id ? null : current))
  }, [])

  const addEvents = useCallback((events: ActivityEvent[]) => {
    setData((d) => mergeAppData(d, { ...d, profiles: [], events }))
  }, [])

  const importData = useCallback(
    (incoming: AppData) => {
      const merged = mergeAppData(data, incoming)
      setData(merged)
      setImportCount((n) => n + 1)
      return mergeSummary(data, merged)
    },
    [data],
  )

  const api: ProfilesApi = {
    data,
    profiles,
    activeProfile,
    saveFailed,
    selectProfile: setActiveId,
    createProfile,
    updateProfile,
    deleteProfile,
    importData,
    addEvents,
    importCount,
  }
  return <ProfileContext.Provider value={api}>{children}</ProfileContext.Provider>
}

/** Nowy updatedAt – zawsze większy od poprzedniego, nawet gdy zegar urządzenia się cofnął. */
function touch(profile: Profile): Profile {
  return { ...profile, updatedAt: Math.max(Date.now(), profile.updatedAt + 1) }
}

export function useProfiles(): ProfilesApi {
  const api = useContext(ProfileContext)
  if (!api) throw new Error('useProfiles() musi być użyte wewnątrz <ProfileProvider>')
  return api
}
