import { useEffect } from 'react'
import { playFanfare } from '../../audio/fanfare'
import type { Celebration } from '../../progress/celebrations'
import { CROWN_3_PERCENT } from '../../game/rhythmRun'
import { CROWN_2_PERCENT } from '../../game/songRun'
import { SONGS } from '../../music/songs'
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
    case 'crown': {
      const title = SONGS.find((s) => s.id === c.songId)?.title ?? 'Piosenka'
      const how =
        c.crown >= 3
          ? `w rytmie z metronomem, ${CROWN_3_PERCENT}% nut w czasie`
          : c.crown === 2
            ? `bez gryfu, ${CROWN_2_PERCENT}% nut od razu`
            : 'cała piosenka zagrana'
      return { emoji: '👑', title: `Korona ${c.crown}!`, text: `„${title}” – ${how}` }
    }
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
