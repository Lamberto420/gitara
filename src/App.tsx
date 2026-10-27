import { useCallback, useState } from 'react'
import TunerScreen from './features/tuner/TunerScreen'
import MetronomeScreen from './features/metronome/MetronomeScreen'
import NotesScreen from './features/notation/NotesScreen'
import GameScreen from './features/game/GameScreen'
import { ProfileProvider, useProfiles } from './features/profiles/ProfileContext'
import ProfileChip from './features/profiles/ProfileChip'
import ProfilePicker from './features/profiles/ProfilePicker'
import BadgeCase from './features/badges/BadgeCase'
import CelebrationDialog from './features/celebrations/CelebrationDialog'
import { useCelebrations } from './features/celebrations/useCelebrations'
import PracticeArea from './features/practice/PracticeArea'
import { PracticeProvider } from './features/practice/PracticeContext'
import { useGoalWatcher, useProgress } from './features/progress/useProgress'

type Tab = 'tuner' | 'metronome' | 'notes' | 'game'

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
  const celebrations = useCelebrations(progress, badges)

  return (
    <div className="app">
      {saveFailed && (
        <p className="error">⚠️ Nie udało się zapisać postępów na tym urządzeniu. Sprawdź, czy przeglądarka nie blokuje danych strony.</p>
      )}
      {!activeProfile ? (
        <ProfilePicker />
      ) : (
        // key: zmiana osoby kończy sesję ćwiczenia (i zapisuje jej resztę), a ekrany startują od nowa
        <PracticeProvider key={activeProfile.id} profileId={activeProfile.id}>
          <header className="header">
            <ProfileChip profile={activeProfile} onClick={() => selectProfile(null)} />
          </header>
          {progress && (
            <PracticeArea
              progress={progress}
              badges={{ earned: badges.filter((b) => b.earnedOn).length, total: badges.length }}
              onOpenBadges={() => setBadgeCaseOpen(true)}
            />
          )}
          <nav className="tabs">
            <button className={tab === 'tuner' ? 'tab active' : 'tab'} onClick={() => setTab('tuner')}>
              <span className="tab-icon">🎸</span>
              Stroik
            </button>
            <button className={tab === 'metronome' ? 'tab active' : 'tab'} onClick={() => setTab('metronome')}>
              <span className="tab-icon">🥁</span>
              Metronom
            </button>
            <button className={tab === 'notes' ? 'tab active' : 'tab'} onClick={() => setTab('notes')}>
              <span className="tab-icon">🎼</span>
              Nuty
            </button>
            <button className={tab === 'game' ? 'tab active' : 'tab'} onClick={() => setTab('game')}>
              <span className="tab-icon">🎯</span>
              Gra
            </button>
          </nav>
          <main className="screen">
            {tab === 'tuner' ? (
              <TunerScreen />
            ) : tab === 'metronome' ? (
              <MetronomeScreen />
            ) : tab === 'notes' ? (
              <NotesScreen />
            ) : (
              <GameScreen />
            )}
          </main>
          {badgeCaseOpen && progress && <BadgeCase badges={badges} progress={progress} onClose={closeBadgeCase} />}
          {celebrations.current && (
            <CelebrationDialog celebration={celebrations.current} onDone={celebrations.dismiss} />
          )}
        </PracticeProvider>
      )}
    </div>
  )
}
