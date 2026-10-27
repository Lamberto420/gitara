import type { AppData, Profile } from './model'

/**
 * Łączy dane z dwóch źródeł (np. tablet + kopia z komputera). Nic nie ginie:
 * - zdarzenia: suma zbiorów według id (bez duplikatów),
 * - profile: z dwóch wersji tego samego profilu wygrywa nowsza (updatedAt).
 * Kolejność argumentów nie ma znaczenia, a ponowne łączenie tych samych danych nic nie zmienia.
 */
export function mergeAppData(a: AppData, b: AppData): AppData {
  const profiles = new Map<string, Profile>()
  for (const p of [...a.profiles, ...b.profiles]) {
    const existing = profiles.get(p.id)
    if (!existing || isNewer(p, existing)) profiles.set(p.id, p)
  }

  const events = new Map(a.events.map((e) => [e.id, e]))
  for (const e of b.events) if (!events.has(e.id)) events.set(e.id, e)

  return {
    version: Math.max(a.version, b.version),
    profiles: [...profiles.values()].sort((x, y) => x.createdAt - y.createdAt),
    events: [...events.values()].sort((x, y) => x.at - y.at),
  }
}

function isNewer(candidate: Profile, existing: Profile): boolean {
  if (candidate.updatedAt !== existing.updatedAt) return candidate.updatedAt > existing.updatedAt
  // Remis (ten sam czas) – usunięcie wygrywa, żeby wynik nie zależał od kolejności argumentów.
  return !!candidate.deleted && !existing.deleted
}

export interface MergeSummary {
  newProfiles: number
  updatedProfiles: number
  newEvents: number
}

/** Co zmieniło się po imporcie – do komunikatu „Dodano 2 profile, 37 aktywności”. */
export function mergeSummary(before: AppData, after: AppData): MergeSummary {
  const old = new Map(before.profiles.map((p) => [p.id, p]))
  return {
    newProfiles: after.profiles.filter((p) => !old.has(p.id) && !p.deleted).length,
    updatedProfiles: after.profiles.filter((p) => old.has(p.id) && old.get(p.id)!.updatedAt !== p.updatedAt).length,
    newEvents: after.events.length - before.events.length,
  }
}
