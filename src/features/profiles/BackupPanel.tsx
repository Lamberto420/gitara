import { useState, type ChangeEvent } from 'react'
import { exportBackup, parseBackup } from '../../data/backup'
import { DataError } from '../../data/model'
import { useProfiles } from './ProfileContext'

type Message = { kind: 'ok' | 'error'; text: string } | null

export default function BackupPanel() {
  const { data, importData } = useProfiles()
  const [message, setMessage] = useState<Message>(null)

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // pozwala wczytać ten sam plik jeszcze raz
    if (!file) return
    try {
      const summary = importData(parseBackup(await file.text()))
      setMessage({
        kind: 'ok',
        text: `Wczytano! ✅ Nowe osoby: ${summary.newProfiles}, zaktualizowane: ${summary.updatedProfiles}, nowe aktywności: ${summary.newEvents}.`,
      })
    } catch (error) {
      setMessage({
        kind: 'error',
        text: error instanceof DataError ? error.message : 'Nie udało się wczytać pliku.',
      })
    }
  }

  return (
    <section className="backup">
      <h2>Kopia zapasowa</h2>
      <p className="hint small">
        Ćwiczysz na kilku urządzeniach? Zapisz kopię tutaj i wczytaj ją na drugim – postępy się połączą, nic nie zniknie.
      </p>
      <div className="backup-buttons">
        <button className="small-button" onClick={() => exportBackup(data)}>
          💾 Zapisz kopię
        </button>
        <label className="small-button">
          📂 Wczytaj kopię
          <input type="file" accept=".json,application/json" onChange={onFile} hidden />
        </label>
      </div>
      {message && <p className={message.kind === 'ok' ? 'success' : 'error'}>{message.text}</p>}
    </section>
  )
}
