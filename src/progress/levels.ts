// Poziomy: kolejne progi nutek rosną, żeby awans był częsty na początku i nadal osiągalny później.
// Próg poziomu n = 25·n·(n−1): 0, 50, 150, 300, 500, 750… Przy ~30 ⭐ dziennie
// poziom 2 to drugi dzień, poziom 5 ~3 tygodnie, poziom 10 ~2,5 miesiąca.

const LEVEL_NAMES = [
  'Początkujący',
  'Uczeń strun',
  'Grajek',
  'Strunowy odkrywca',
  'Gitarzysta',
  'Mistrz akordu',
  'Rytmiczny bohater',
  'Wirtuoz',
  'Legenda gryfu',
  'Gitarowy czarodziej',
]

export function levelThreshold(level: number): number {
  return 25 * level * (level - 1)
}

export interface LevelInfo {
  level: number
  name: string
  /** Nutki zdobyte w obecnym poziomie. */
  xpInLevel: number
  /** Ile nutek ma cały obecny poziom (do paska postępu). */
  xpForLevel: number
}

export function levelFor(xp: number): LevelInfo {
  let level = 1
  while (xp >= levelThreshold(level + 1)) level++
  return {
    level,
    name: LEVEL_NAMES[Math.min(level, LEVEL_NAMES.length) - 1],
    xpInLevel: xp - levelThreshold(level),
    xpForLevel: levelThreshold(level + 1) - levelThreshold(level),
  }
}
