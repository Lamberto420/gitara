import { useCallback, useEffect, useRef, useState } from 'react'
import type { Badge } from '../../progress/badges'
import { newCelebrations, snapshot, type Celebration, type ProgressSnapshot } from '../../progress/celebrations'
import type { ProfileProgress } from '../../progress/progress'
import { useProfiles } from '../profiles/ProfileContext'
import { useToday } from '../progress/useProgress'

/**
 * Kolejka nagród do pokazania. Porównuje postęp z poprzednim stanem – świętujemy tylko to,
 * co przybyło w trakcie korzystania z aplikacji (nie przy starcie, zmianie osoby ani imporcie kopii).
 */
export function useCelebrations(progress: ProfileProgress | null, badges: Badge[]) {
  const { activeProfile, importCount } = useProfiles()
  const today = useToday()
  const [queue, setQueue] = useState<Celebration[]>([])
  const prevRef = useRef<ProgressSnapshot | null>(null)
  const importRef = useRef(importCount)

  useEffect(() => {
    if (!activeProfile || !progress) {
      prevRef.current = null
      return
    }
    const next = snapshot(activeProfile.id, today, progress, badges)
    const imported = importRef.current !== importCount
    importRef.current = importCount
    const fresh = imported ? [] : newCelebrations(prevRef.current, next, progress, badges)
    prevRef.current = next
    if (fresh.length) setQueue((q) => [...q, ...fresh])
  }, [activeProfile, progress, badges, today, importCount])

  // Zmiana osoby: nagrody poprzedniej osoby już nieaktualne.
  useEffect(() => setQueue([]), [activeProfile?.id])

  const dismiss = useCallback(() => setQueue((q) => q.slice(1)), [])
  return { current: queue[0] ?? null, dismiss }
}
