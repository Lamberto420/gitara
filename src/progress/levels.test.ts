import { describe, expect, it } from 'vitest'
import { levelFor, levelThreshold } from './levels'

describe('levels', () => {
  it('progi rosną: 0, 50, 150, 300, 500', () => {
    expect([1, 2, 3, 4, 5].map(levelThreshold)).toEqual([0, 50, 150, 300, 500])
  })

  it.each([
    [0, 1, 0, 50],
    [49, 1, 49, 50],
    [50, 2, 0, 100],
    [149, 2, 99, 100],
    [150, 3, 0, 150],
  ])('%i ⭐ → poziom %i (%i/%i w poziomie)', (xp, level, xpInLevel, xpForLevel) => {
    expect(levelFor(xp)).toMatchObject({ level, xpInLevel, xpForLevel })
  })

  it('każdy poziom ma nazwę, także bardzo wysokie', () => {
    expect(levelFor(0).name).toBe('Początkujący')
    expect(levelFor(1_000_000).name).toBe('Gitarowy czarodziej')
  })
})
