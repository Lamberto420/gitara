import { useMemo, useState } from 'react'
import { SONGS } from '../../music/songs'
import { songUnlockEvent } from '../../progress/events'
import { songPath, type PathStep } from '../../progress/songPath'
import { useProfiles } from '../profiles/ProfileContext'
import Crowns from './Crowns'
import SongScreen from './SongScreen'

const SONG_IDS = SONGS.map((s) => s.id)

/** Zakładka „Piosenki”: ścieżka od najłatwiejszej, korony 👑 i kłódki 🔒; po wyborze – ekran piosenki. */
export default function SongsScreen() {
  const { activeProfile, data, addEvents } = useProfiles()
  const [openId, setOpenId] = useState<string | null>(null)
  const profileId = activeProfile?.id ?? ''
  const path = useMemo(() => songPath(SONG_IDS, data.events, profileId), [data.events, profileId])

  const open = openId ? SONGS.find((s) => s.id === openId) : undefined
  if (open) {
    const step = path.find((p) => p.songId === open.id)!
    return <SongScreen song={open} crown={step.crown} onBack={() => setOpenId(null)} />
  }

  const unlock = (step: PathStep, title: string) => {
    // Odblokowanie bez korony w poprzedniej – np. gdy nauczyciel każe ją przećwiczyć. Pytamy, bo nie da się cofnąć.
    if (window.confirm(`Odblokować „${title}” bez korony w poprzedniej piosence?`)) {
      addEvents([songUnlockEvent(profileId, step.songId)])
    }
  }

  return (
    <section className="songs">
      <h2 className="game-title">🎵 Piosenki</h2>
      <p className="game-intro">Zagraj całą piosenkę, a dostaniesz koronę 👑 – i otworzy się następna.</p>
      <ol className="song-path">
        {SONGS.map((song, i) => {
          const step = path[i]
          return (
            <li key={song.id} className={step.unlocked ? 'song-step' : 'song-step locked'}>
              {step.unlocked ? (
                <button className="song-step-button" onClick={() => setOpenId(song.id)}>
                  <span className="song-step-number">{i + 1}</span>
                  <span className="song-step-title">{song.title}</span>
                  <Crowns crown={step.crown} />
                </button>
              ) : (
                <div className="song-step-button">
                  <span className="song-step-number">🔒</span>
                  <span className="song-step-title">{song.title}</span>
                  <button className="notes-button song-unlock" onClick={() => unlock(step, song.title)}>
                    Odblokuj
                  </button>
                </div>
              )}
            </li>
          )
        })}
      </ol>
    </section>
  )
}
