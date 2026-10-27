import type { ProfileProgress } from '../../progress/progress'
import ProgressHeader from '../progress/ProgressHeader'
import { usePracticeSession } from './PracticeContext'

/** „4:07” – czas sesji w minutach i sekundach. */
function clock(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

/**
 * Pasek postępu razem z przyciskiem „Ćwiczę 🎸”. Są w jednym komponencie, bo pasek celu
 * dolicza na żywo sekundy, których licznik jeszcze nie zapisał (zapis idzie co pełną minutę).
 */
interface Props {
  progress: ProfileProgress
  badges: { earned: number; total: number }
  onOpenBadges(): void
}

export default function PracticeArea({ progress, badges, onOpenBadges }: Props) {
  const { status, error, playing, sessionSeconds, unsavedSeconds, start, stop } = usePracticeSession()
  const live = { ...progress, todaySeconds: progress.todaySeconds + unsavedSeconds }

  return (
    <>
      <ProgressHeader progress={live} badges={badges} onOpenBadges={onOpenBadges} />
      {status === 'listening' ? (
        <div className={playing ? 'practice active' : 'practice'}>
          <div className="practice-status" aria-live="polite">
            <span className="practice-clock">{clock(sessionSeconds)}</span>
            <span>{playing ? '🎶 Słyszę grę!' : '🤫 Cisza – zagraj coś'}</span>
          </div>
          <button className="practice-stop" onClick={stop}>
            ⏹ Koniec
          </button>
        </div>
      ) : (
        <button className="big-button practice-start" onClick={start} disabled={status === 'starting'}>
          🎸 Ćwiczę
        </button>
      )}
      {status === 'error' && <p className="error">{error}</p>}
    </>
  )
}
