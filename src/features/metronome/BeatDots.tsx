interface Props {
  beatsPerBar: number
  currentBeat: number | null
}

export default function BeatDots({ beatsPerBar, currentBeat }: Props) {
  return (
    <div className="beat-dots" aria-hidden="true">
      {Array.from({ length: beatsPerBar }, (_, i) => {
        const classes = ['beat-dot']
        if (i === 0) classes.push('first')
        if (i === currentBeat) classes.push('lit')
        return (
          // key z currentBeat – każde uderzenie od nowa odpala animację „pulsu”
          <span key={i === currentBeat ? `${i}-lit` : i} className={classes.join(' ')}>
            {i + 1}
          </span>
        )
      })}
    </div>
  )
}
