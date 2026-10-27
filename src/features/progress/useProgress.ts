import { useEffect, useMemo, useState } from 'react'
import { localDay } from '../../data/model'
import { computeProgress, familyStreak } from '../../progress/progress'
import { useProfiles } from '../profiles/ProfileContext'

/** Dzisiejsza data, która sama zmienia się o północy (gdy aplikacja jest otwarta przez noc). */
export function useToday(): string {
  const [today, setToday] = useState(() => localDay(new Date()))
  useEffect(() => {
    const now = new Date()
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
    const timer = setTimeout(() => setToday(localDay(new Date())), midnight.getTime() - now.getTime() + 1000)
    return () => clearTimeout(timer)
  }, [today])
  return today
}

export function useProgress() {
  const { data, profiles, activeProfile } = useProfiles()
  const today = useToday()
  return useMemo(
    () => ({
      progress: activeProfile ? computeProgress(data.events, activeProfile, today) : null,
      family: familyStreak(data.events, profiles, today),
    }),
    [data.events, profiles, activeProfile, today],
  )
}

/** „1 dzień”, „2 dni”, „5 dni” – po polsku tylko 1 ma inną formę. */
export function daysLabel(n: number): string {
  return `${n} ${n === 1 ? 'dzień' : 'dni'}`
}
