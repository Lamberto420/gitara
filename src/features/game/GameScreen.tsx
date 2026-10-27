import { resumeAudio } from '../../audio/audioContext'
import { midiToFreq } from '../../audio/pitch/notes'
import { playReferenceTone } from '../../audio/referenceTone'
import { noteName, type FretNote } from '../../music/firstPosition'
import { LEVELS, ROUND_LENGTH, currentNote, type LevelId, type Round } from '../../game/round'
import Fretboard from '../notation/Fretboard'
import Staff from '../notation/Staff'
import { STRING_COLORS } from '../notation/stringColors'
import { useNoteGame } from './useNoteGame'

const LEVEL_INFO: Record<LevelId, { emoji: string; text: string }> = {
  easy: { emoji: '🌱', text: 'Nuty bez krzyżyków, gryf podpowiada' },
  hard: { emoji: '🔥', text: 'Wszystkie nuty, czytasz z pięciolinii' },
}

/** Gra „Zagraj nutę”: nuta na pięciolinii, a mikrofon sprawdza, czy zabrzmiała. */
export default function GameScreen() {
  const { phase, start, quit } = useNoteGame()

  if (phase.name === 'menu' || phase.name === 'error' || phase.name === 'starting') {
    return (
      <section className="game">
        <h2 className="game-title">🎯 Zagraj nutę</h2>
        <p className="game-intro">Zobaczysz nutę – zagraj ją na gitarze. Runda to {ROUND_LENGTH} nut.</p>
        {(['easy', 'hard'] as const).map((id) => (
          <button key={id} className="big-button game-level" onClick={() => start(id)} disabled={phase.name === 'starting'}>
            <span className="game-level-name">
              {LEVEL_INFO[id].emoji} {LEVELS[id].name}
            </span>
            <span className="game-level-text">{LEVEL_INFO[id].text}</span>
          </button>
        ))}
        {phase.name === 'error' && <p className="error">{phase.message}</p>}
      </section>
    )
  }

  if (phase.name === 'done') {
    const { round, xp } = phase
    const perfect = round.firstTry === round.notes.length
    return (
      <section className="game">
        <div className="game-done-emoji">{perfect ? '🏆' : '🎉'}</div>
        <h2 className="game-title">{perfect ? 'Bezbłędnie!' : 'Brawo, runda ukończona!'}</h2>
        <p className="game-score">
          Za pierwszym razem: <strong>{round.firstTry}</strong> z {round.notes.length}
        </p>
        <p className="game-xp">+{xp} ⭐</p>
        <button className="big-button" onClick={() => start(round.level)}>
          🔁 Jeszcze raz
        </button>
        <button className="notes-button game-back" onClick={quit}>
          Zmień poziom
        </button>
      </section>
    )
  }

  const { round, revealed, wrong } = phase
  // Po trafieniu runda jest już przy następnej nucie, a na ekranie zostaje trafiona – na chwilę.
  const note = revealed ? round.notes[round.index - 1] : currentNote(round)!
  const level = LEVELS[round.level]
  const showName = level.showFretboard || revealed
  const color = STRING_COLORS[note.string]
  const listen = async () => playReferenceTone(await resumeAudio(), midiToFreq(note.midi))

  return (
    <section className={revealed ? 'game game-hit' : 'game'}>
      <RoundDots round={round} revealed={revealed} />
      <div className="note-name" style={{ color: showName ? color : undefined }}>
        {revealed ? `✅ ${note.name}` : showName ? note.name : '?'}
      </div>
      <p className="game-hint" aria-live="polite">
        {revealed ? 'Brawo!' : wrong !== null ? `Słyszę ${noteName(wrong).name} – spróbuj jeszcze raz` : '🎤 Zagraj tę nutę'}
      </p>
      <Staff midi={note.midi} color={showName ? color : 'currentColor'} label="Nuta do zagrania" />
      {(level.showFretboard || revealed) && <Fretboard note={note} />}
      {!level.showFretboard && !revealed && <p className="game-where">Gdzie jest ta nuta na gryfie?</p>}
      <div className="notes-controls">
        <button className="notes-button" onClick={listen}>
          🔊 Posłuchaj
        </button>
        <button className="notes-button" onClick={quit}>
          ⏹ Zakończ
        </button>
      </div>
      {revealed && <WhereText note={note} />}
    </section>
  )
}

function WhereText({ note }: { note: FretNote }) {
  return (
    <p className="note-where">
      {note.fret === 0 ? `pusta struna ${note.string}` : `struna ${note.string} · próg ${note.fret} · palec ${note.finger}`}
    </p>
  )
}

/** 10 kropek: zielona = trafiona za pierwszym razem, żółta = po pomyłce, obwódka = bieżąca. */
function RoundDots({ round, revealed }: { round: Round; revealed: boolean }) {
  return (
    <ol className="game-dots" aria-label={`Nuta ${Math.min(round.index + 1, round.notes.length)} z ${round.notes.length}`}>
      {round.notes.map((_, i) => {
        const result = round.results[i]
        const current = !revealed && i === round.index
        const cls = result === true ? ' first' : result === false ? ' later' : current ? ' current' : ''
        return <li key={i} className={`game-dot${cls}`} />
      })}
    </ol>
  )
}
