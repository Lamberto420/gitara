import { useCallback, useState } from 'react'
import TunerScreen from './features/tuner/TunerScreen'
import MetronomeScreen from './features/metronome/MetronomeScreen'
import { ProfileProvider, useProfiles } from './features/profiles/ProfileContext'
import ProfileChip from './features/profiles/ProfileChip'
import ProfilePicker from './features/profiles/ProfilePicker'
import BadgeCase from './features/badges/BadgeCase'
import PracticeArea from './features/practice/PracticeArea'
import { useGoalWatcher, useProgress } from './features/progress/useProgress'

type Tab = 'tuner' | 'metronome'

export default function App() {
  return (
    <ProfileProvider>
      <Shell />
    </ProfileProvider>
  )
}

function Shell() {
  const { activeProfile, selectProfile, saveFailed } = useProfiles()
  const { progress, badges } = useProgress()
  const [tab, setTab] = useState<Tab>('tuner')
  const [badgeCaseOpen, setBadgeCaseOpen] = useState(false)
  const closeBadgeCase = useCallback(() => setBadgeCaseOpen(false), [])
  useGoalWatcher()

  return (
    <div className="app">
      {saveFailed && (
        <p className="error">⚠️ Nie udało się zapisać postępów na tym urządzeniu. Sprawdź, czy przeglądarka nie blokuje danych strony.</p>
      )}
      {!activeProfile ? (
        <ProfilePicker />
      ) : (
        <>
          <header className="header">
            <ProfileChip profile={activeProfile} onClick={() => selectProfile(null)} />
          </header>
          {/* key: zmiana osoby kończy sesję ćwiczenia (i zapisuje jej resztę) */}
          {progress && (
            <PracticeArea
              key={activeProfile.id}
              profileId={activeProfile.id}
              progress={progress}
              badges={{ earned: badges.filter((b) => b.earnedOn).length, total: badges.length }}
              onOpenBadges={() => setBadgeCaseOpen(true)}
            />
          )}
          <nav className="tabs">
            <button className={tab === 'tuner' ? 'tab active' : 'tab'} onClick={() => setTab('tuner')}>
              🎸 Stroik
            </button>
            <button className={tab === 'metronome' ? 'tab active' : 'tab'} onClick={() => setTab('metronome')}>
              🥁 Metronom
            </button>
          </nav>
          {/* key: po zmianie osoby ekrany startują od nowa, z jej ustawieniami */}
          <main className="screen" key={activeProfile.id}>
            {tab === 'tuner' ? <TunerScreen /> : <MetronomeScreen />}
          </main>
          {badgeCaseOpen && progress && <BadgeCase badges={badges} progress={progress} onClose={closeBadgeCase} />}
        </>
      )}
    </div>
  )
}
