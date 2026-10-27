export interface Microphone {
  analyser: AnalyserNode
  stop(): void
}

export async function openMicrophone(ctx: AudioContext): Promise<Microphone> {
  if (!navigator.mediaDevices?.getUserMedia) {
    // Brak API = strona nie jest otwarta przez HTTPS ani localhost.
    throw new DOMException('Brak bezpiecznego połączenia', 'SecurityError')
  }
  const stream = await navigator.mediaDevices.getUserMedia({
    // Filtry „do rozmów” zniekształcają dźwięk instrumentu – wyłączamy je.
    audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
  })
  const source = ctx.createMediaStreamSource(stream)
  const analyser = ctx.createAnalyser()
  analyser.fftSize = 4096 // ~85 ms dźwięku – starczy na kilka okresów najniższej struny E2
  source.connect(analyser)

  return {
    analyser,
    stop() {
      source.disconnect()
      stream.getTracks().forEach((track) => track.stop())
    },
  }
}

export function microphoneErrorMessage(error: unknown): string {
  const name = error instanceof DOMException ? error.name : ''
  switch (name) {
    case 'NotAllowedError':
      return 'Brak zgody na mikrofon. Kliknij ikonę kłódki przy adresie strony i pozwól na mikrofon.'
    case 'NotFoundError':
      return 'Nie znaleziono mikrofonu. Podłącz mikrofon i spróbuj jeszcze raz.'
    case 'NotReadableError':
      return 'Mikrofon jest zajęty przez inny program. Zamknij go i spróbuj jeszcze raz.'
    case 'SecurityError':
      return 'Mikrofon działa tylko na stronie z HTTPS (albo na localhost).'
    default:
      return 'Nie udało się włączyć mikrofonu. Spróbuj jeszcze raz.'
  }
}
