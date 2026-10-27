import { useState } from 'react'
import type { Profile } from '../../data/model'
import { daysLabel, useProgress } from '../progress/useProgress'
import BackupPanel from './BackupPanel'
import { useProfiles } from './ProfileContext'
import ProfileEditor from './ProfileEditor'

type Mode = { kind: 'pick' } | { kind: 'create' } | { kind: 'edit'; profile: Profile }

export default function ProfilePicker() {
  const { profiles, selectProfile, createProfile, updateProfile, deleteProfile } = useProfiles()
  const { family } = useProgress()
  const [mode, setMode] = useState<Mode>(profiles.length ? { kind: 'pick' } : { kind: 'create' })

  if (mode.kind === 'create') {
    return (
      <>
        {profiles.length === 0 && <p className="welcome">Cześć! 👋 Kto będzie ćwiczyć na gitarze?</p>}
        <ProfileEditor
          onSave={(input) => selectProfile(createProfile(input).id)}
          onCancel={() => setMode({ kind: 'pick' })}
        />
      </>
    )
  }

  if (mode.kind === 'edit') {
    return (
      <ProfileEditor
        profile={mode.profile}
        onSave={(input) => {
          updateProfile(mode.profile.id, input)
          setMode({ kind: 'pick' })
        }}
        onDelete={() => {
          deleteProfile(mode.profile.id)
          setMode({ kind: 'pick' })
        }}
        onCancel={() => setMode({ kind: 'pick' })}
      />
    )
  }

  return (
    <section className="profile-picker">
      <h1>Kto ćwiczy? 🎸</h1>
      {family !== null && (
        <p className={family > 0 ? 'family-streak lit' : 'family-streak'}>
          🔥 Rodzinna seria: <strong>{daysLabel(family)}</strong>
          <small>{family > 0 ? 'Grajcie dalej razem!' : 'Zagrajcie dziś wszyscy, żeby ją zacząć!'}</small>
        </p>
      )}
      <div className="profile-grid">
        {profiles.map((p) => (
          <div key={p.id} className="profile-card">
            <button className="profile-select" onClick={() => selectProfile(p.id)}>
              <span className="avatar" style={{ background: p.color }}>
                {p.avatar}
              </span>
              <span className="profile-name">{p.name}</span>
            </button>
            <button className="edit-button" onClick={() => setMode({ kind: 'edit', profile: p })} aria-label={`Edytuj ${p.name}`}>
              ✏️
            </button>
          </div>
        ))}
        <button className="profile-card add" onClick={() => setMode({ kind: 'create' })}>
          <span className="avatar">➕</span>
          <span className="profile-name">Dodaj osobę</span>
        </button>
      </div>
      <BackupPanel />
    </section>
  )
}
