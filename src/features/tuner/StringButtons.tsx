import { STANDARD_TUNING, type GuitarString } from '../../audio/pitch/notes'

interface Props {
  locked: GuitarString | null
  /** Struna rozpoznana w trybie auto – podświetlamy ją delikatnie. */
  detected: GuitarString | null
  /** Numery strun już nastrojonych w tej sesji – dostają ✅. */
  tuned?: ReadonlySet<number>
  onSelect(string: GuitarString | null): void
}

export default function StringButtons({ locked, detected, tuned, onSelect }: Props) {
  return (
    <div className="strings">
      <button
        className={locked === null ? 'string-button auto selected' : 'string-button auto'}
        onClick={() => onSelect(null)}
      >
        <span className="string-name">Auto</span>
        <span className="string-number">sam zgadnie</span>
      </button>
      {STANDARD_TUNING.map((s) => {
        const classes = ['string-button']
        if (locked === s) classes.push('selected')
        else if (locked === null && detected === s) classes.push('detected')
        return (
          <button key={s.number} className={classes.join(' ')} onClick={() => onSelect(s)}>
            <span className="string-name">{s.name}</span>
            <span className="string-number">{s.number}</span>
            {tuned?.has(s.number) && <span className="string-tuned" aria-label="nastrojona">✅</span>}
          </button>
        )
      })}
    </div>
  )
}
