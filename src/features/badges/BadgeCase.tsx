import { useEffect } from 'react'
import type { Badge } from '../../progress/badges'
import { levelThreshold } from '../../progress/levels'
import type { ProfileProgress } from '../../progress/progress'

/** „2026-10-27” → „27.10.2026”. */
function formatDay(day: string): string {
  const [y, m, d] = day.split('-')
  return `${d}.${m}.${y}`
}

interface Props {
  badges: Badge[]
  progress: ProfileProgress
  onClose(): void
}

/**
 * Gablota odznak – nakładka na cały ekran (a nie osobna zakładka), żeby metronom i licznik
 * ćwiczenia grały dalej, gdy ktoś zagląda do odznak. Niezdobyte odznaki to zagadki z podpowiedzią.
 */
export default function BadgeCase({ badges, progress, onClose }: Props) {
  const { level, xp } = progress
  const earned = badges.filter((b) => b.earnedOn).length
  const toNext = levelThreshold(level.level + 1) - xp

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="badge-case-title">
      <div className="overlay-content">
        <div className="overlay-header">
          <h2 id="badge-case-title">🏅 Moje odznaki</h2>
          <button className="close-button" onClick={onClose} aria-label="Zamknij">
            ✕
          </button>
        </div>

        <div className="level-card">
          <div className="level-title">
            Poziom {level.level}: <strong>{level.name}</strong>
          </div>
          <div className="goal-bar">
            <div className="goal-fill" style={{ width: `${(level.xpInLevel / level.xpForLevel) * 100}%` }} />
          </div>
          <small>
            ⭐ {xp} · jeszcze {toNext} ⭐ do poziomu {level.level + 1}
          </small>
        </div>

        <p className="badge-count">
          Zdobyte: <strong>{earned}</strong> z {badges.length}
        </p>
        <ul className="badge-grid">
          {badges.map((b) =>
            b.earnedOn ? (
              <li key={b.id} className="badge earned">
                <span className="badge-emoji">{b.emoji}</span>
                <strong>{b.name}</strong>
                <small>{b.description}</small>
                <small className="badge-date">{formatDay(b.earnedOn)}</small>
              </li>
            ) : (
              <li key={b.id} className="badge locked">
                <span className="badge-emoji">❓</span>
                <strong>???</strong>
                <small>{b.hint}</small>
              </li>
            ),
          )}
        </ul>
      </div>
    </div>
  )
}
