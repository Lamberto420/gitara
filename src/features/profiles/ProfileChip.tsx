import type { Profile } from '../../data/model'

interface Props {
  profile: Profile
  onClick(): void
}

/** Awatar aktywnej osoby w nagłówku – dotknięcie wraca do „Kto ćwiczy?”. */
export default function ProfileChip({ profile, onClick }: Props) {
  return (
    <button className="profile-chip" onClick={onClick} aria-label="Zmień osobę">
      <span className="avatar small" style={{ background: profile.color }}>
        {profile.avatar}
      </span>
      <span className="profile-name">{profile.name}</span>
      <span className="chip-switch">⇄</span>
    </button>
  )
}
