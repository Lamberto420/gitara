// Gra w rytmie (korona 👑 3): metronom nie czeka – nuty mają padać w swoim czasie.
// Plan (kiedy tyk, kiedy nuta) i ocena zagranych szarpnięć. Czyste funkcje – czas i dźwięk
// podaje ekran (zegar audio, `audio/onsets.ts`). Sposób oceny sprawdzony prototypem (#3):
// bez kalibracji, liczy się RÓWNOŚĆ grania – odchylenie każdej nuty od stałego opóźnienia
// tej samej próby (opóźnienie sprzętu i „granie odrobinę po tyku” są różne na każdym urządzeniu).
import { barSixteenths, sixteenths, type Song, type SongNote } from '../music/song'
import type { SongResult } from '../progress/events'
import { PHRASE_XP, SONG_XP, type SongScope } from './songRun'

/** Tempo jako procent tempa piosenki – wolniej, żeby się nauczyć; korona tylko przy 100%. */
export const RHYTHM_TEMPOS = [50, 75, 100] as const
export type RhythmTempo = (typeof RHYTHM_TEMPOS)[number]

/** Nuta „w czasie”: tyle wolno się minąć z rytmem (dla 9-latka uczciwie, prototyp: ±26–32 ms rozrzutu). */
export const RHYTHM_TOLERANCE_S = 0.1
/** Korona 3: tyle procent nut we właściwej wysokości i w czasie. */
export const CROWN_3_PERCENT = 85
/** Nutki za podejście tylko, gdy zagrano (właściwą wysokością) co najmniej tyle procent nut – samo włączenie nie wystarczy. */
export const RHYTHM_XP_PERCENT = 50

/**
 * Możliwe stałe opóźnienie „mikrofon + głośnik + gracz”: prototyp mierzył 214–339 ms na laptopie;
 * Bluetooth dokłada ~200 ms. Lekko ujemne – ktoś może grać trochę przed tykiem.
 */
const MIN_OFFSET_S = -0.15
const MAX_OFFSET_S = 0.6
/**
 * Szukając opóźnienia, grupujemy nuty szerzej niż tolerancja oceny – inaczej przy rozrzucie na
 * granicy tolerancji (raz −60, raz +60 ms) opóźnienie „przykleiłoby się” do jednej połowy nut.
 */
const OFFSET_SEARCH_S = 0.2
/** Gdy nic nie pasuje (nikt nie grał) – typowe opóźnienie, żeby dopasowanie miało punkt odniesienia. */
const DEFAULT_OFFSET_S = 0.25
/** Najdalej tyle od swojego czasu szarpnięcie jeszcze należy do nuty (dalej – do sąsiedniej albo do nikogo). */
const MATCH_WINDOW_S = 0.3
/** Po ostatniej nucie czekamy na spóźnione szarpnięcie, opóźnienie i ocenę wykrywacza (150 ms). */
const TAIL_S = 0.9

export interface RhythmNote {
  note: SongNote
  /** Chwila nuty w sekundach od pierwszego tyku. */
  time: number
  /** Fraza w piosence i nuta w tej frazie – do podświetlania na pięciolinii. */
  phrase: number
  inPhrase: number
}

export interface Click {
  time: number
  /** Raz na takt – wyższy tyk. */
  accent: boolean
}

export interface RhythmPlan {
  songId: string
  scope: SongScope
  tempo: RhythmTempo
  /** Długość ćwierćnuty (s) w wybranym tempie. */
  beat: number
  notes: RhythmNote[]
  clicks: Click[]
  /** Od tej chwili (s od pierwszego tyku) można zakończyć i ocenić. */
  finishAt: number
}

/**
 * Plan gry: jeden takt wejścia (tyki), potem nuty w tempie. Przedtakt („Sto lat”, fraza zaczęta
 * w środku taktu) – pierwsza nuta pada w swoim miejscu taktu, a nie na „raz”. Tyki co ćwierćnutę,
 * do końca ostatniej nuty.
 */
export function rhythmPlan(song: Song, scope: SongScope, tempo: RhythmTempo): RhythmPlan {
  const first = scope === 'song' ? 0 : scope
  const phrases = scope === 'song' ? song.phrases.map((_, i) => i) : [scope]
  if (song.phrases[first] === undefined) throw new Error(`Piosenka „${song.id}” nie ma frazy ${scope}`)
  const beat = 60 / ((song.bpm * tempo) / 100)
  const sixteenth = beat / 4
  const bar = barSixteenths(song.meter)

  // Ile szesnastek przed pierwszą kreską taktową – jeśli mniej niż takt, to przedtakt.
  let before = 0
  for (const item of song.phrases[first].items) {
    if (item.kind === 'bar') break
    before += sixteenths(item.value, item.dotted)
  }
  const pickup = before > 0 && before < bar ? bar - before : 0

  const notes: RhythmNote[] = []
  let pos = bar + pickup // w szesnastkach od pierwszego tyku: takt wejścia + miejsce w takcie
  let last = { start: pos, length: 0 }
  for (const p of phrases) {
    let inPhrase = 0
    for (const item of song.phrases[p].items) {
      if (item.kind === 'bar') continue
      const length = sixteenths(item.value, item.dotted)
      if (item.kind === 'note') {
        notes.push({ note: item, time: pos * sixteenth, phrase: p, inPhrase: inPhrase++ })
        last = { start: pos, length }
      }
      pos += length
    }
  }
  const end = last.start + last.length
  const clicks: Click[] = []
  for (let s = 0; s < end; s += 4) clicks.push({ time: s * sixteenth, accent: s % bar === 0 })
  return {
    songId: song.id,
    scope,
    tempo,
    beat,
    notes,
    clicks,
    finishAt: Math.max(end * sixteenth, last.start * sixteenth + TAIL_S),
  }
}

/** Usłyszane szarpnięcie: chwila (s od pierwszego tyku, ten sam zegar) i wysokość brzmienia (MIDI) albo null. */
export interface Heard {
  time: number
  midi: number | null
}

export type Verdict = 'ok' | 'early' | 'late' | 'wrong' | 'missed'

export interface GradedNote {
  verdict: Verdict
  /** Odchylenie od rytmu (s) po odjęciu stałego opóźnienia; null = nie zagrana. */
  deviation: number | null
}

export interface RhythmGrade {
  /** Stałe opóźnienie tej próby (s). */
  offset: number
  notes: GradedNote[]
}

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b)
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2
}

/**
 * Stałe opóźnienie: to, przy którym najwięcej nut ma szarpnięcie właściwej wysokości w pobliżu
 * (remis – mniejsze odchylenia), dopracowane medianą tych nut. Szukanie „pierwszego
 * szarpnięcia po nucie” myliłoby się przy szybkich nutach – pierwszym bywa poprzednia nuta.
 */
function findOffset(plan: RhythmPlan, heard: readonly Heard[]): number {
  const fits = (n: RhythmNote, h: Heard) => h.midi === n.note.note.midi
  const candidates: number[] = []
  for (const n of plan.notes) {
    for (const h of heard) {
      const d = h.time - n.time
      if (fits(n, h) && d >= MIN_OFFSET_S && d <= MAX_OFFSET_S) candidates.push(d)
    }
  }
  if (!candidates.length) return DEFAULT_OFFSET_S
  let best = { count: -1, spread: Infinity, deviations: [] as number[] }
  for (const c of candidates) {
    const deviations: number[] = []
    let spread = 0
    for (const n of plan.notes) {
      let closest: number | null = null
      for (const h of heard) {
        const d = h.time - n.time
        if (fits(n, h) && Math.abs(d - c) <= OFFSET_SEARCH_S && (closest === null || Math.abs(d - c) < Math.abs(closest - c))) {
          closest = d
        }
      }
      if (closest !== null) {
        deviations.push(closest)
        spread += Math.abs(closest - c)
      }
    }
    if (deviations.length > best.count || (deviations.length === best.count && spread < best.spread)) {
      best = { count: deviations.length, spread, deviations }
    }
  }
  return median(best.deviations)
}

/**
 * Ocena: każdej nucie najbliższe nieużyte szarpnięcie (właściwa wysokość ma pierwszeństwo)
 * w oknie, które nie sięga do sąsiednich nut. Dodatkowe szarpnięcia nie szkodzą – liczy się,
 * czy każda nuta zabrzmiała w swoim czasie.
 */
export function gradeRhythm(plan: RhythmPlan, heard: readonly Heard[]): RhythmGrade {
  const offset = findOffset(plan, heard)
  const used = new Set<number>()
  const notes = plan.notes.map((n, i): GradedNote => {
    const prev = plan.notes[i - 1]?.time ?? -Infinity
    const next = plan.notes[i + 1]?.time ?? Infinity
    const window = Math.min(MATCH_WINDOW_S, (n.time - prev) / 2, (next - n.time) / 2)
    let pick = -1
    let pickFits = false
    for (let j = 0; j < heard.length; j++) {
      if (used.has(j)) continue
      const dev = heard[j].time - n.time - offset
      if (Math.abs(dev) > window) continue
      const fits = heard[j].midi === n.note.note.midi
      const closer = pick < 0 || Math.abs(dev) < Math.abs(heard[pick].time - n.time - offset)
      if (pick < 0 || (fits && !pickFits) || (fits === pickFits && closer)) {
        pick = j
        pickFits = fits
      }
    }
    if (pick < 0) return { verdict: 'missed', deviation: null }
    used.add(pick)
    const deviation = heard[pick].time - n.time - offset
    if (!pickFits) return { verdict: 'wrong', deviation }
    if (Math.abs(deviation) <= RHYTHM_TOLERANCE_S) return { verdict: 'ok', deviation }
    return { verdict: deviation < 0 ? 'early' : 'late', deviation }
  })
  return { offset, notes }
}

export const countVerdicts = (g: RhythmGrade, ...verdicts: Verdict[]) => g.notes.filter((n) => verdicts.includes(n.verdict)).length

/** Korona 3: cała piosenka w tempie piosenki, ≥ 85% nut dobrze i w czasie. Inaczej – żadnej (niższe dają inne tryby). */
export function rhythmCrown(plan: RhythmPlan, grade: RhythmGrade): 0 | 3 {
  if (plan.scope !== 'song' || plan.tempo !== 100) return 0
  // Procenty w liczbach całkowitych – bez błędów zaokrągleń.
  return countVerdicts(grade, 'ok') * 100 >= plan.notes.length * CROWN_3_PERCENT ? 3 : 0
}

/** Nutki jak za zwykłe podejście – o ile naprawdę grano (połowa nut właściwą wysokością, w czasie czy nie). */
export function rhythmXp(plan: RhythmPlan, grade: RhythmGrade): number {
  const played = countVerdicts(grade, 'ok', 'early', 'late')
  if (played * 100 < plan.notes.length * RHYTHM_XP_PERCENT) return 0
  return plan.scope === 'song' ? SONG_XP : PHRASE_XP
}

/** Wynik do zapisania w zdarzeniu: „za pierwszym razem” = nuty dobrze i w czasie. */
export function rhythmResult(plan: RhythmPlan, grade: RhythmGrade): SongResult {
  return {
    songId: plan.songId,
    scope: plan.scope,
    mode: 'rhythm',
    tempo: plan.tempo,
    notes: plan.notes.length,
    firstTry: countVerdicts(grade, 'ok'),
    crown: rhythmCrown(plan, grade),
    xp: rhythmXp(plan, grade),
  }
}

/** Która nuta teraz (s od pierwszego tyku) – ostatnia, której czas już nadszedł; null w takcie wejścia. */
export function rhythmPosition(plan: RhythmPlan, now: number): number | null {
  let i = -1
  while (i + 1 < plan.notes.length && plan.notes[i + 1].time <= now) i++
  return i < 0 ? null : i
}
