import { migrate } from './migrations'
import { DataError, localDay, type AppData } from './model'

export function backupFileName(date = new Date()): string {
  return `gitara-kopia-${localDay(date)}.json`
}

/** Tekst z pliku kopii → dane (po migracji do bieżącej wersji). Rzuca DataError z komunikatem dla użytkownika. */
export function parseBackup(text: string): AppData {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    throw new DataError('To nie jest plik kopii z aplikacji Gitara.')
  }
  return migrate(raw)
}

/**
 * Zapisuje kopię. Na telefonie/tablecie otwiera systemowe „Udostępnij” (Quick Share, mail, Dysk…),
 * na komputerze pobiera plik.
 */
export async function exportBackup(data: AppData): Promise<void> {
  const name = backupFileName()
  const file = new File([JSON.stringify(data)], name, { type: 'application/json' })

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Kopia aplikacji Gitara' })
      return
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return // użytkownik zamknął menu
      // inny błąd udostępniania – spróbujmy zwykłego pobrania
    }
  }

  const url = URL.createObjectURL(file)
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
