import { describe, expect, it } from 'vitest'
import { tempoName } from './tempo'

describe('tempoName', () => {
  it.each([
    [40, 'Largo'],
    [60, 'Adagio'],
    [76, 'Andante'],
    [107, 'Andante'],
    [108, 'Moderato'],
    [120, 'Allegro'],
    [168, 'Presto'],
    [208, 'Presto'],
  ])('%i BPM to %s', (bpm, name) => {
    expect(tempoName(bpm).name).toBe(name)
  })
})
