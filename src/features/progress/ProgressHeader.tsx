import type { ProfileProgress } from '../../progress/progress'
import { daysLabel } from './useProgress'

/** Seria, nutki i cel dzienny – zawsze na widoku, żeby postęp „było widać”. */
export default function ProgressHeader({ progress }: { progress: ProfileProgress }) {
  const { streak, level, xp, todaySeconds, goalSeconds } = progress
  const todayMinutes = Math.floor(todaySeconds / 60)
  const goalMinutes = goalSeconds / 60
  const done = streak.goalMetToday
  const percent = Math.min(100, (todaySeconds / goalSeconds) * 100)

  return (
    <div className="progress-header">
      <div className="stats">
        <span
          className={done ? 'stat streak lit' : 'stat streak'}
          title={done ? 'Seria – dziś już zaliczone!' : 'Seria – zagraj dziś, żeby ją przedłużyć'}
          aria-label={`Seria: ${daysLabel(streak.streak)}`}
        >
          🔥 {streak.streak}
        </span>
        {streak.freezes > 0 && (
          <span className="stat" title="Ochrona serii – uratuje jeden opuszczony dzień" aria-label={`Ochrony serii: ${streak.freezes}`}>
            🧊 {streak.freezes}
          </span>
        )}
        <span className="stat" title={`Poziom ${level.level}: ${level.name}`} aria-label={`${xp} nutek, poziom ${level.level}`}>
          ⭐ {xp} <small>poz. {level.level}</small>
        </span>
      </div>
      <div className="goal" aria-label={`Cel dzienny: ${todayMinutes} z ${goalMinutes} minut`}>
        <div className="goal-bar">
          <div className={done ? 'goal-fill done' : 'goal-fill'} style={{ width: `${done ? 100 : percent}%` }} />
        </div>
        <span className="goal-label">{done ? 'Cel na dziś zaliczony! ✅' : `Dziś: ${todayMinutes} / ${goalMinutes} min`}</span>
      </div>
    </div>
  )
}
