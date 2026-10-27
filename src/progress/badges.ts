// Odznaki – wyliczane ze zdarzeń, jak nutki i seria (nic osobno nie zapisujemy).
// Dzięki temu po połączeniu danych z kilku urządzeń odznaki „same się zgadzają”,
// a zdobytej odznaki nie da się stracić (liczymy z całej historii, np. najdłuższą serię).
import { addDays } from './days'
import type { ActivityEvent, Profile } from '../data/model'
import { isGoal, isPractice } from './events'
import { familyDays } from './progress'
import { computeStreak } from './streak'

export interface BadgeDef {
  id: string
  emoji: string
  name: string
  /** Za co jest odznaka – pokazujemy przy zdobytej. */
  description: string
  /** Podpowiedź-zagadka przy niezdobytej. */
  hint: string
}

export interface Badge extends BadgeDef {
  /** Dzień zdobycia („RRRR-MM-DD”) albo null, gdy jeszcze niezdobyta. */
  earnedOn: string | null
}

/** Granie przed tą godziną (czasu lokalnego) daje odznakę „Ranny ptaszek”. */
export const EARLY_BIRD_HOUR = 8
export const FAMILY_BADGE_DAYS = 3

/** Wszystko, czego potrzebują odznaki – liczone raz dla osoby. */
interface Stats {
  /** Zdarzenia tej osoby od najstarszego. */
  mine: ActivityEvent[]
  streakReachedOn: string[]
  family: Set<string> | null
}

interface BadgeRule extends BadgeDef {
  /** Dzień zdobycia albo null. */
  earned(stats: Stats): string | null
}

/** Dzień zdarzenia, przy którym suma `value` pierwszy raz doszła do `threshold`. */
function firstDayReaching(events: ActivityEvent[], value: (e: ActivityEvent) => number, threshold: number): string | null {
  let sum = 0
  for (const e of events) {
    sum += value(e)
    if (sum >= threshold) return e.day
  }
  return null
}

const practiceSeconds = (e: ActivityEvent) => (isPractice(e) ? e.seconds : 0)
const metronomeSeconds = (e: ActivityEvent) => (isPractice(e) && e.metronome === true ? e.seconds : 0)
const count = (type: string) => (e: ActivityEvent) => (e.type === type ? 1 : 0)

function minutesBadge(id: string, emoji: string, name: string, minutes: number, label: string): BadgeRule {
  return {
    id,
    emoji,
    name,
    description: `${label} grania`,
    hint: `Zagraj łącznie ${label}`,
    earned: (s) => firstDayReaching(s.mine, practiceSeconds, minutes * 60),
  }
}

function streakBadge(id: string, emoji: string, name: string, days: number): BadgeRule {
  return {
    id,
    emoji,
    name,
    description: `Cel spełniony ${days} dni z rzędu`,
    hint: `Spełnij cel ${days} dni z rzędu`,
    earned: (s) => s.streakReachedOn[days - 1] ?? null,
  }
}

function goalsBadge(id: string, emoji: string, name: string, goals: number): BadgeRule {
  return {
    id,
    emoji,
    name,
    description: goals === 1 ? 'Pierwszy spełniony cel dzienny' : `${goals} spełnionych celów dziennych`,
    hint: goals === 1 ? 'Spełnij cel dzienny' : `Spełnij cel dzienny ${goals} razy`,
    earned: (s) => firstDayReaching(s.mine, (e) => (isGoal(e) ? 1 : 0), goals),
  }
}

const RULES: readonly BadgeRule[] = [
  minutesBadge('play-1m', '🎵', 'Pierwsze dźwięki', 1, '1 minuta'),
  minutesBadge('play-30m', '⏱️', 'Pół godziny', 30, '30 minut'),
  minutesBadge('play-1h', '🕐', 'Godzina z gitarą', 60, '1 godzina'),
  minutesBadge('play-5h', '🎼', 'Pięć godzin', 5 * 60, '5 godzin'),
  minutesBadge('play-10h', '🏆', 'Dziesięć godzin', 10 * 60, '10 godzin'),
  streakBadge('streak-3', '🔥', 'Trzy dni z rzędu', 3),
  streakBadge('streak-7', '📅', 'Tydzień z gitarą', 7),
  streakBadge('streak-14', '💪', 'Dwa tygodnie', 14),
  streakBadge('streak-30', '👑', 'Cały miesiąc', 30),
  goalsBadge('goals-1', '✅', 'Pierwszy cel', 1),
  goalsBadge('goals-10', '🎯', 'Dziesięć celów', 10),
  goalsBadge('goals-50', '🌟', 'Pięćdziesiąt celów', 50),
  {
    id: 'tuned-1',
    emoji: '🔧',
    name: 'Pierwsze strojenie',
    description: 'Wszystkie 6 strun nastrojone',
    hint: 'Nastrój wszystkie 6 strun',
    earned: (s) => firstDayReaching(s.mine, count('tuned'), 1),
  },
  {
    id: 'tuned-10',
    emoji: '🎚️',
    name: 'Stroiciel',
    description: 'Gitara nastrojona w 10 różnych dni',
    hint: 'Nastrój gitarę w 10 różnych dni',
    // Zdarzenie „tuned” jest najwyżej jedno dziennie, więc liczba zdarzeń = liczba dni.
    earned: (s) => firstDayReaching(s.mine, count('tuned'), 10),
  },
  {
    id: 'metronome-30m',
    emoji: '🥁',
    name: 'Równy rytm',
    description: '30 minut grania z metronomem',
    hint: 'Zagraj łącznie 30 minut z metronomem',
    earned: (s) => firstDayReaching(s.mine, metronomeSeconds, 30 * 60),
  },
  {
    id: 'early-bird',
    emoji: '🌅',
    name: 'Ranny ptaszek',
    description: `Granie przed ${EARLY_BIRD_HOUR}:00 rano`,
    hint: 'Zagraj coś wcześnie rano',
    earned: (s) => s.mine.find((e) => isPractice(e) && new Date(e.at).getHours() < EARLY_BIRD_HOUR)?.day ?? null,
  },
  {
    id: 'family-3',
    emoji: '🤝',
    name: 'Rodzinny zespół',
    description: `Wszyscy spełnili cel ${FAMILY_BADGE_DAYS} dni z rzędu`,
    hint: `Zagrajcie wszyscy ${FAMILY_BADGE_DAYS} dni z rzędu`,
    earned: (s) => (s.family ? firstRun(s.family, FAMILY_BADGE_DAYS) : null),
  },
]

/** Ostatni dzień pierwszego ciągu `length` kolejnych dni ze zbioru. */
function firstRun(days: ReadonlySet<string>, length: number): string | null {
  for (const day of [...days].sort()) {
    let ok = true
    for (let i = 1; i < length && ok; i++) ok = days.has(addDays(day, -i))
    if (ok) return day
  }
  return null
}

/**
 * Odznaki osoby w stałej kolejności. „Rodzinny zespół” tylko, gdy są co najmniej dwie osoby –
 * przy jednej byłby nie do zdobycia.
 */
export function computeBadges(
  events: readonly ActivityEvent[],
  profile: Profile,
  profiles: readonly Profile[],
  today: string,
): Badge[] {
  const mine = events.filter((e) => e.profileId === profile.id).sort((a, b) => a.at - b.at)
  const goalDays = new Set(mine.filter(isGoal).map((e) => e.day))
  const stats: Stats = {
    mine,
    streakReachedOn: computeStreak(goalDays, today).reachedOn,
    family: profiles.length >= 2 ? familyDays(events, profiles, today) : null,
  }
  return RULES.filter((r) => r.id !== 'family-3' || stats.family).map(({ earned, ...def }) => ({
    ...def,
    earnedOn: earned(stats),
  }))
}
