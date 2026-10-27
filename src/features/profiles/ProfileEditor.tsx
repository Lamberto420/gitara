import { useState } from 'react'
import { AVATARS, COLORS, DAILY_GOALS, type Profile, type ProfileInput } from '../../data/model'

interface Props {
  /** Edytowany profil; brak = tworzenie nowego. */
  profile?: Profile
  onSave(input: ProfileInput): void
  onDelete?(): void
  onCancel(): void
}

export default function ProfileEditor({ profile, onSave, onDelete, onCancel }: Props) {
  const [name, setName] = useState(profile?.name ?? '')
  const [avatar, setAvatar] = useState(profile?.avatar ?? AVATARS[0])
  const [color, setColor] = useState(profile?.color ?? COLORS[0])
  const [dailyGoalMinutes, setGoal] = useState(profile?.dailyGoalMinutes ?? DAILY_GOALS[0])
  const [confirmDelete, setConfirmDelete] = useState(false)
  const valid = name.trim().length > 0

  if (confirmDelete) {
    return (
      <section className="profile-editor">
        <h1>Usunąć profil {profile!.name}?</h1>
        <p className="hint">Znikną też postępy i odznaki tej osoby na tym urządzeniu.</p>
        <button className="big-button stop" onClick={onDelete}>
          Tak, usuń
        </button>
        <button className="small-button" onClick={() => setConfirmDelete(false)}>
          Nie, zostaw
        </button>
      </section>
    )
  }

  return (
    <form
      className="profile-editor"
      onSubmit={(e) => {
        e.preventDefault()
        if (valid) onSave({ name, avatar, color, dailyGoalMinutes })
      }}
    >
      <div className="avatar big" style={{ background: color }}>
        {avatar}
      </div>

      <label className="field">
        <span>Imię</span>
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={20} autoFocus={!profile} />
      </label>

      <fieldset className="field">
        <legend>Awatar</legend>
        <div className="choice-grid">
          {AVATARS.map((a) => (
            <button
              type="button"
              key={a}
              className={a === avatar ? 'choice selected' : 'choice'}
              onClick={() => setAvatar(a)}
              aria-label={`Awatar ${a}`}
            >
              {a}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="field">
        <legend>Kolor</legend>
        <div className="choice-grid">
          {COLORS.map((c) => (
            <button
              type="button"
              key={c}
              className={c === color ? 'choice color selected' : 'choice color'}
              style={{ background: c }}
              onClick={() => setColor(c)}
              aria-label={`Kolor ${c}`}
            />
          ))}
        </div>
      </fieldset>

      <fieldset className="field">
        <legend>Cel dzienny – minuty grania</legend>
        <div className="segmented">
          {DAILY_GOALS.map((g) => (
            <button
              type="button"
              key={g}
              className={g === dailyGoalMinutes ? 'metre-button selected' : 'metre-button'}
              onClick={() => setGoal(g)}
            >
              {g} min
            </button>
          ))}
        </div>
      </fieldset>

      <button type="submit" className="big-button" disabled={!valid}>
        {profile ? 'Zapisz' : 'Gotowe!'}
      </button>
      <button type="button" className="small-button" onClick={onCancel}>
        Anuluj
      </button>
      {profile && onDelete && (
        <button type="button" className="link-button danger" onClick={() => setConfirmDelete(true)}>
          Usuń profil
        </button>
      )}
    </form>
  )
}
