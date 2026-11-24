import { useState } from 'react'
import {
  countVerdicts,
  CROWN_3_PERCENT,
  RHYTHM_TEMPOS,
  type RhythmGrade,
  type RhythmPlan,
  type RhythmTempo,
  type Verdict,
} from '../../game/rhythmRun'
import { CROWN_2_PERCENT, runNote, runPosition, type SongMode, type SongRun, type SongScope } from '../../game/songRun'
import { noteName } from '../../music/firstPosition'
import type { Song } from '../../music/song'
import Fretboard from '../notation/Fretboard'
import SongStaff, { type NoteMark } from '../notation/SongStaff'
import { STRING_COLORS } from '../notation/stringColors'
import Crowns from './Crowns'
import { useMelody } from './useMelody'
import { useRhythmPlay } from './useRhythmPlay'
import { useSongPlay } from './useSongPlay'

interface Props {
  song: Song
  /** Najwyższa zdobyta korona tej osoby. */
  crown: number
  onBack(): void
}

/** Tryb na ekranie piosenki: dwa „czekające na nutę” i gra w rytmie (osobny przebieg). */
type Mode = SongMode | 'rhythm'

const MODES: { id: Mode; label: string; text: string; needs: number }[] = [
  { id: 'fretboard', label: '🎸 Z gryfem', text: 'gryf pokazuje palce · 👑1', needs: 0 },
  { id: 'staff', label: '🔥 Bez gryfu', text: `same nuty, ${CROWN_2_PERCENT}% od razu · 👑2`, needs: 0 },
  // Rytm dopiero po koronie 2: najpierw nuty, potem rytm (jak w logice zdarzeń – songResultEvents).
  { id: 'rhythm', label: '🥁 W rytmie', text: `z metronomem, ${CROWN_3_PERCENT}% w czasie · 👑3`, needs: 2 },
]

const TEMPO_LABELS: Record<RhythmTempo, string> = { 50: '🐢 50%', 75: '🚶 75%', 100: '🏃 100%' }

/** Werdykt nuty → kolor na pięciolinii. */
const MARK: Record<Verdict, NoteMark> = { ok: 'good', early: 'off', late: 'off', wrong: 'bad', missed: 'bad' }

/** Kolory ocenionych nut jednej frazy (pierwsze `judged` nut planu). */
function phraseMarks(plan: RhythmPlan, grade: RhythmGrade, phrase: number, judged = plan.notes.length) {
  const marks: (NoteMark | undefined)[] = []
  plan.notes.forEach((n, i) => {
    if (n.phrase === phrase && i < judged) marks[n.inPhrase] = MARK[grade.notes[i].verdict]
  })
  return marks
}

/** Piosenka: frazy na pięciolinii do ćwiczenia osobno, granie całości po koronę i wynik. */
export default function SongScreen({ song, crown, onBack }: Props) {
  // Proponujemy tryb następnej korony: z gryfem → bez gryfu → w rytmie.
  const [mode, setMode] = useState<Mode>(crown >= 2 ? 'rhythm' : crown >= 1 ? 'staff' : 'fretboard')
  const [tempo, setTempo] = useState<RhythmTempo>(100)
  const [lyrics, setLyrics] = useState(true)
  const { phase, start, quit, showHint } = useSongPlay()
  const rhythm = useRhythmPlay()
  const melody = useMelody()
  const hasLyrics = song.phrases.some((p) => p.items.some((i) => i.kind === 'note' && i.syllable))
  const allPhrases = song.phrases.map((_, i) => i)
  const starting = phase.name === 'starting' || rhythm.phase.name === 'starting'
  const error = phase.name === 'error' ? phase.message : rhythm.phase.name === 'error' ? rhythm.phase.message : null

  const play = (scope: SongScope) => {
    melody.stop()
    if (mode === 'rhythm') void rhythm.start(song, scope, tempo)
    else void start(song, mode, scope)
  }

  if (rhythm.phase.name === 'playing') {
    return <RhythmPlaying song={song} {...rhythm.phase} lyrics={lyrics} onQuit={rhythm.quit} />
  }

  if (rhythm.phase.name === 'done') {
    const { plan, grade, xp, newCrown } = rhythm.phase
    return (
      <RhythmDone
        song={song}
        plan={plan}
        grade={grade}
        xp={xp}
        newCrown={newCrown}
        best={Math.max(crown, newCrown)}
        lyrics={lyrics}
        onAgain={() => void rhythm.start(song, plan.scope, plan.tempo)}
        onBack={rhythm.quit}
      />
    )
  }

  if (phase.name === 'playing') {
    return (
      <Playing
        song={song}
        run={phase.run}
        wrong={phase.wrong}
        hinted={phase.hinted}
        lyrics={lyrics}
        onHint={showHint}
        onListen={(p) => melody.play(song, [p])}
        onQuit={() => {
          melody.stop()
          quit()
        }}
      />
    )
  }

  if (phase.name === 'done') {
    const { run, xp, newCrown } = phase
    const best = Math.max(crown, newCrown)
    return (
      <section className="game">
        <div className="game-done-emoji">{newCrown ? '👑' : '🎉'}</div>
        <h2 className="game-title">
          {newCrown ? `Nowa korona ${newCrown}!` : run.scope === 'song' ? 'Cała piosenka zagrana!' : 'Fraza zagrana!'}
        </h2>
        <p className="game-score">
          Za pierwszym razem: <strong>{run.results.filter(Boolean).length}</strong> z {run.notes.length}
        </p>
        <p className="game-xp">+{xp} ⭐</p>
        {run.scope === 'song' && best === 1 && (
          <p className="song-tip">Następna korona: zagraj „🔥 Bez gryfu”, {CROWN_2_PERCENT}% nut od razu.</p>
        )}
        {run.scope !== 'song' && best === 0 && <p className="song-tip">Koronę daje zagranie całej piosenki.</p>}
        <button className="big-button" onClick={() => play(run.scope)}>
          🔁 Jeszcze raz
        </button>
        <button className="notes-button game-back" onClick={quit}>
          ← Wróć do piosenki
        </button>
      </section>
    )
  }

  return (
    <section className="game song">
      <button className="notes-button song-back" onClick={onBack}>
        ← Wszystkie piosenki
      </button>
      <h2 className="game-title">{song.title}</h2>
      <Crowns crown={crown} />
      <p className="song-origin">{song.origin}</p>

      <fieldset className="song-modes">
        <legend className="visually-hidden">Jak grasz</legend>
        {MODES.map((m) => {
          const locked = crown < m.needs
          return (
            <label key={m.id} className={`song-mode${mode === m.id ? ' active' : ''}${locked ? ' locked' : ''}`}>
              <input
                type="radio"
                name="song-mode"
                checked={mode === m.id}
                disabled={locked}
                onChange={() => setMode(m.id)}
              />
              <span className="song-mode-label">{m.label}</span>
              <span className="song-mode-text">{locked ? `🔒 najpierw 👑${m.needs}` : m.text}</span>
            </label>
          )
        })}
      </fieldset>

      {mode === 'rhythm' && (
        <fieldset className="song-tempos">
          <legend className="song-tempos-legend">Tempo {tempo < 100 && '– wolniej: nutki bez korony'}</legend>
          {RHYTHM_TEMPOS.map((t) => (
            <label key={t} className={tempo === t ? 'song-tempo active' : 'song-tempo'}>
              <input type="radio" name="song-tempo" checked={tempo === t} onChange={() => setTempo(t)} />
              {TEMPO_LABELS[t]}
            </label>
          ))}
        </fieldset>
      )}

      <button className="big-button" onClick={() => play('song')} disabled={starting}>
        ▶ Cała piosenka
      </button>
      {error && <p className="error">{error}</p>}

      <div className="notes-controls">
        <button className="notes-button" onClick={() => (melody.position ? melody.stop() : melody.play(song, allPhrases))}>
          {melody.position ? '⏹ Zatrzymaj' : '🔊 Posłuchaj całej'}
        </button>
        {hasLyrics && (
          <label className="notes-button song-lyrics-toggle">
            <input type="checkbox" checked={lyrics} onChange={(e) => setLyrics(e.target.checked)} /> Tekst
          </label>
        )}
      </div>

      <ol className="song-phrases">
        {song.phrases.map((_, p) => (
          <li key={p} className="song-phrase">
            <h3 className="song-phrase-title">Fraza {p + 1}</h3>
            <SongStaff
              song={song}
              phrase={p}
              current={melody.position?.phrase === p ? melody.position.note : null}
              colorful={mode === 'fretboard'}
              lyrics={lyrics}
            />
            <div className="notes-controls">
              <button className="notes-button" onClick={() => play(p)} disabled={starting}>
                ▶ Ćwicz
              </button>
              <button className="notes-button" onClick={() => melody.play(song, [p])}>
                🔊 Posłuchaj
              </button>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}

function Playing({
  song,
  run,
  wrong,
  hinted,
  lyrics,
  onHint,
  onListen,
  onQuit,
}: {
  song: Song
  run: SongRun
  wrong: number | null
  hinted: boolean
  lyrics: boolean
  onHint(): void
  onListen(phrase: number): void
  onQuit(): void
}) {
  const note = runNote(run)!.note
  const { phrase, note: inPhrase } = runPosition(run)
  const showFretboard = run.mode === 'fretboard' || hinted
  const done = run.index

  return (
    <section className="game">
      <p className="song-playing-title">
        {song.title} · fraza {phrase + 1}
        {run.scope === 'song' && ` z ${song.phrases.length}`}
      </p>
      <div
        className="song-progress"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={run.notes.length}
        aria-valuenow={done}
        aria-label="Zagrane nuty"
      >
        <div className="song-progress-bar" style={{ width: `${(done / run.notes.length) * 100}%` }} />
      </div>
      <p className="game-hint" aria-live="polite">
        {wrong !== null
          ? `Słyszę ${noteName(wrong).name} – spróbuj jeszcze raz`
          : hinted
            ? '💡 Tu jest ta nuta – zagraj ją'
            : '🎤 Graj po kolei'}
      </p>
      <SongStaff song={song} phrase={phrase} current={inPhrase} dimPlayed colorful={showFretboard} lyrics={lyrics} />
      {showFretboard ? (
        <>
          <div className="note-name" style={{ color: STRING_COLORS[note.string] }}>
            {note.name}
          </div>
          <Fretboard note={note} />
        </>
      ) : (
        <button className="notes-button game-hint-button" onClick={onHint}>
          💡 Podpowiedź <span className="game-hint-cost">(ta nuta nie liczy się „od razu”)</span>
        </button>
      )}
      <div className="notes-controls">
        <button className="notes-button" onClick={() => onListen(phrase)}>
          🔊 Posłuchaj
        </button>
        <button className="notes-button" onClick={onQuit}>
          ⏹ Zakończ
        </button>
      </div>
    </section>
  )
}

function RhythmPlaying({
  song,
  plan,
  countIn,
  position,
  grade,
  judged,
  lyrics,
  onQuit,
}: {
  song: Song
  plan: RhythmPlan
  countIn: number | null
  position: number | null
  grade: RhythmGrade
  judged: number
  lyrics: boolean
  onQuit(): void
}) {
  const note = plan.notes[position ?? 0]
  const done = position === null ? 0 : position + 1
  return (
    <section className="game">
      <p className="song-playing-title">
        {song.title} · 🥁 {plan.tempo}%{plan.scope !== 'song' && ` · fraza ${note.phrase + 1}`}
      </p>
      <div
        className="song-progress"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={plan.notes.length}
        aria-valuenow={done}
        aria-label="Zagrane nuty"
      >
        <div className="song-progress-bar" style={{ width: `${(done / plan.notes.length) * 100}%` }} />
      </div>
      {countIn !== null ? (
        <p className="rhythm-count" aria-live="assertive">
          {countIn}
        </p>
      ) : (
        <p className="game-hint">{position === null ? 'Uwaga…' : '🎸 Graj równo z tykami'}</p>
      )}
      <SongStaff
        song={song}
        phrase={note.phrase}
        current={position === null ? null : note.inPhrase}
        colorful={false}
        lyrics={lyrics}
        marks={phraseMarks(plan, grade, note.phrase, judged)}
      />
      <div className="notes-controls">
        <button className="notes-button" onClick={onQuit}>
          ⏹ Zakończ
        </button>
      </div>
    </section>
  )
}

function RhythmDone({
  song,
  plan,
  grade,
  xp,
  newCrown,
  best,
  lyrics,
  onAgain,
  onBack,
}: {
  song: Song
  plan: RhythmPlan
  grade: RhythmGrade
  xp: number
  newCrown: number
  best: number
  lyrics: boolean
  onAgain(): void
  onBack(): void
}) {
  const ok = countVerdicts(grade, 'ok')
  const percent = Math.floor((ok * 100) / plan.notes.length)
  const details = [
    [countVerdicts(grade, 'early'), '⏪ za wcześnie'],
    [countVerdicts(grade, 'late'), '⏩ za późno'],
    [countVerdicts(grade, 'wrong'), '❌ inna nuta'],
    [countVerdicts(grade, 'missed'), '🔇 brak'],
  ] as const
  const phrases = [...new Set(plan.notes.map((n) => n.phrase))]
  return (
    <section className="game">
      <div className="game-done-emoji">{newCrown ? '👑' : '🥁'}</div>
      <h2 className="game-title">{newCrown ? `Nowa korona ${newCrown}!` : 'Zagrane w rytmie!'}</h2>
      <p className="game-score">
        W czasie: <strong>{ok}</strong> z {plan.notes.length}
      </p>
      {details.some(([n]) => n > 0) && (
        <p className="rhythm-details">
          {details
            .filter(([n]) => n > 0)
            .map(([n, label]) => `${label}: ${n}`)
            .join(' · ')}
        </p>
      )}
      {xp > 0 ? <p className="game-xp">+{xp} ⭐</p> : <p className="song-tip">Nutki są od połowy zagranych nut – spróbuj jeszcze raz!</p>}
      {plan.scope === 'song' && best < 3 && plan.tempo < 100 && <p className="song-tip">👑 3 daje tylko pełne tempo (🏃 100%).</p>}
      {plan.scope === 'song' && best < 3 && plan.tempo === 100 && (
        <p className="song-tip">
          Do 👑 3: {CROWN_3_PERCENT}% nut w czasie – teraz {percent}%.
        </p>
      )}
      {plan.scope !== 'song' && best < 3 && <p className="song-tip">Koronę daje zagranie całej piosenki.</p>}
      <button className="big-button" onClick={onAgain}>
        🔁 Jeszcze raz
      </button>
      <button className="notes-button game-back" onClick={onBack}>
        ← Wróć do piosenki
      </button>
      <div className="rhythm-review">
        <p className="rhythm-legend">
          <span className="rhythm-legend-good">●</span> w czasie <span className="rhythm-legend-off">●</span> nierówno{' '}
          <span className="rhythm-legend-bad">●</span> inna nuta / brak
        </p>
        {phrases.map((p) => (
          <SongStaff key={p} song={song} phrase={p} colorful={false} lyrics={lyrics} marks={phraseMarks(plan, grade, p)} />
        ))}
      </div>
    </section>
  )
}
