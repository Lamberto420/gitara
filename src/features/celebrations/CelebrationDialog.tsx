import { useEffect } from 'react'
import { playFanfare } from '../../audio/fanfare'
import type { Celebration } from '../../progress/celebrations'
import { XP_DAILY_GOAL } from '../../progress/events'
import Confetti from './Confetti'

function content(c: Celebration): { emoji: string; title: string; text: string } {
  switch (c.kind) {
    case 'goal':
      return { emoji: '✅', title: 'Cel na dziś zaliczony!', text: `+${XP_DAILY_GOAL} ⭐ i kolejny dzień serii 🔥` }
    case 'level':
      return { emoji: '🚀', title: `Poziom ${c.level}!`, text: `Nowy tytuł: ${c.name}` }
    case 'badge':
      return { emoji: c.badge.emoji, title: 'Nowa odznaka!', text: `${c.badge.name} – ${c.badge.description}` }
  }
}

/** Okienko z nagrodą: konfetti + fanfara przy każdej kolejnej nagrodzie. */
export default function CelebrationDialog({ celebration, onDone }: { celebration: Celebration; onDone(): void }) {
  const { emoji, title, text } = content(celebration)

  useEffect(() => playFanfare(), [celebration])

  return (
    <div className="celebration-backdrop" role="alertdialog" aria-modal="true" aria-labelledby="celebration-title">
      {/* key: nowe konfetti przy każdej nagrodzie z kolejki */}
      <Confetti key={title + text} />
      <div className="celebration">
        <div className="celebration-emoji">{emoji}</div>
        <h2 id="celebration-title">{title}</h2>
        <p>{text}</p>
        <button className="big-button" onClick={onDone} autoFocus>
          Super! 🎉
        </button>
      </div>
    </div>
  )
}
