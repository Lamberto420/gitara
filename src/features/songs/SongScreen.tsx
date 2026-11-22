import { useState } from 'react'
import { noteName } from '../../music/firstPosition'
import { CROWN_2_PERCENT, runNote, runPosition, type SongMode, type SongRun, type SongScope } from '../../game/songRun'
import type { Song } from '../../music/song'
import Fretboard from '../notation/Fretboard'
import SongStaff from '../notation/SongStaff'
import { STRING_COLORS } from '../notation/stringColors'
import Crowns from './Crowns'
import { useMelody } from './useMelody'
import { useSongPlay } from './useSongPlay'

interface Props {
  song: Song
  /** Najwyższa zdobyta korona tej osoby. */
  crown: number
  onBack(): void
}

const MODES: { id: SongMode; label: string; text: string }[] = [
  { id: 'fretboard', label: '🎸 Z gryfem', text: 'gryf pokazuje palce · 👑1' },
  { id: 'staff', label: '🔥 Bez gryfu', text: `same nuty, ${CROWN_2_PERCENT}% od razu · 👑2` },
]

/** Piosenka: frazy na pięciolinii do ćwiczenia osobno, granie całości po koronę i wynik. */
export default function SongScreen({ song, crown, onBack }: Props) {
  // Z gryfem na start – dopiero po pierwszej koronie proponujemy „bez gryfu”.
  const [mode, setMode] = useState<SongMode>(crown >= 1 ? 'staff' : 'fretboard')
  const [lyrics, setLyrics] = useState(true)
  const { phase, start, quit, showHint } = useSongPlay()
  const melody = useMelody()
  const hasLyrics = song.phrases.some((p) => p.items.some((i) => i.kind === 'note' && i.syllable))
  const allPhrases = song.phrases.map((_, i) => i)

  const play = (scope: SongScope) => {
    melody.stop()
    void start(song, mode, scope)
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
        {MODES.map((m) => (
          <label key={m.id} className={mode === m.id ? 'song-mode active' : 'song-mode'}>
            <input type="radio" name="song-mode" checked={mode === m.id} onChange={() => setMode(m.id)} />
            <span className="song-mode-label">{m.label}</span>
            <span className="song-mode-text">{m.text}</span>
          </label>
        ))}
      </fieldset>

      <button className="big-button" onClick={() => play('song')} disabled={phase.name === 'starting'}>
        ▶ Cała piosenka
      </button>
      {phase.name === 'error' && <p className="error">{phase.message}</p>}

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
              <button className="notes-button" onClick={() => play(p)} disabled={phase.name === 'starting'}>
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
