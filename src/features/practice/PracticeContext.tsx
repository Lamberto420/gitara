import { createContext, useContext, type ReactNode } from 'react'
import { usePractice } from './usePractice'

type PracticeApi = ReturnType<typeof usePractice>

const PracticeContext = createContext<PracticeApi | null>(null)

/**
 * Sesja „Ćwiczę 🎸” dostępna w całej aplikacji – np. gra włącza ją sama, żeby czas gry liczył się
 * do celu. Provider dostaje `key` = id osoby, więc zmiana osoby kończy sesję (i zapisuje resztę).
 */
export function PracticeProvider({ profileId, children }: { profileId: string; children: ReactNode }) {
  const practice = usePractice(profileId)
  return <PracticeContext.Provider value={practice}>{children}</PracticeContext.Provider>
}

export function usePracticeSession(): PracticeApi {
  const api = useContext(PracticeContext)
  if (!api) throw new Error('usePracticeSession wymaga <PracticeProvider>')
  return api
}
