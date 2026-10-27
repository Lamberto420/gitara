import { useState } from 'react'
import { resumeAudio } from '../../audio/audioContext'
import { midiToFreq } from '../../audio/pitch/notes'
import { playReferenceTone } from '../../audio/referenceTone'
import { FIRST_POSITION } from '../../music/firstPosition'
import Fretboard from './Fretboard'
import Staff from './Staff'
import { STRING_COLORS } from './stringColors'

/**
 * Ściąga z I pozycji: nuta na pięciolinii i to samo miejsce na gryfie. Bez nutek ⭐ – to podgląd;
 * punkty da gra „Zagraj nutę”, która użyje tych samych komponentów.
 */
export default function NotesScreen() {
  const [index, setIndex] = useState(0)
  const note = FIRST_POSITION[index]
  const color = STRING_COLORS[note.string]
  const where = note.fret === 0 ? `pusta struna ${note.string}` : `struna ${note.string} · próg ${note.fret} · palec ${note.finger}`

  const move = (delta: number) => setIndex((i) => (i + delta + FIRST_POSITION.length) % FIRST_POSITION.length)
  const random = () =>
    setIndex((i) => {
      // Zawsze inna nuta niż obecna – inaczej „losuj” czasem nic nie zmienia.
      const next = Math.floor(Math.random() * (FIRST_POSITION.length - 1))
      return next >= i ? next + 1 : next
    })
  const listen = async () => playReferenceTone(await resumeAudio(), midiToFreq(note.midi))

  return (
    <section className="notes">
      <div className="note-name" style={{ color }}>
        {note.name}
      </div>
      <p className="note-where">{where}</p>
      <Staff midi={note.midi} color={color} label={`Nuta ${note.name} na pięciolinii`} />
      <Fretboard note={note} />
      <div className="notes-controls">
        <button className="notes-button" onClick={() => move(-1)} aria-label="Niższa nuta">
          ◀
        </button>
        <button className="notes-button" onClick={listen}>
          🔊 Posłuchaj
        </button>
        <button className="notes-button" onClick={() => move(1)} aria-label="Wyższa nuta">
          ▶
        </button>
      </div>
      <button className="big-button notes-random" onClick={random}>
        🎲 Losuj nutę
      </button>
    </section>
  )
}
