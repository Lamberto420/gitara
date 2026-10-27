// Nie pozwalamy telefonowi wygasić ekranu, gdy gra metronom (Screen Wake Lock API).
// Przeglądarka zwalnia blokadę, gdy karta schowa się w tle – po powrocie bierzemy ją ponownie.
// Starsze przeglądarki tego nie mają – wtedy po cichu nic nie robimy.
export function keepScreenOn(): { release(): void } {
  let sentinel: WakeLockSentinel | null = null
  let released = false

  const request = async () => {
    try {
      sentinel = (await navigator.wakeLock?.request('screen')) ?? null
    } catch {
      sentinel = null // np. oszczędzanie baterii – metronom gra dalej, tylko ekran może zgasnąć
    }
  }
  const onVisibility = () => {
    if (!released && document.visibilityState === 'visible') request()
  }

  request()
  document.addEventListener('visibilitychange', onVisibility)
  return {
    release() {
      released = true
      document.removeEventListener('visibilitychange', onVisibility)
      sentinel?.release().catch(() => {})
    },
  }
}
