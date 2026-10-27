export interface Microphone {
  analyser: AnalyserNode
  stop(): void
}

// Jeden wspólny strumień mikrofonu dla stroika, licznika „Ćwiczę” i gry – każdy dostaje własny
// analizator. Drugi getUserMedia na iOS potrafi wyciszyć pierwszy, a tak działają jednocześnie.
let shared: Promise<MediaStreamAudioSourceNode> | null = null
let users = 0

async function openSource(ctx: AudioContext): Promise<MediaStreamAudioSourceNode> {
  if (!navigator.mediaDevices?.getUserMedia) {
    // Brak API = strona nie jest otwarta przez HTTPS ani localhost.
    throw new DOMException('Brak bezpiecznego połączenia', 'SecurityError')
  }
  const stream = await navigator.mediaDevices.getUserMedia({
    // Filtry „do rozmów” zniekształcają dźwięk instrumentu – wyłączamy je.
    audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
  })
  return ctx.createMediaStreamSource(stream)
}

function release(source: Promise<MediaStreamAudioSourceNode>) {
  if (--users > 0) return
  shared = null
  // Ostatni użytkownik – wyłącz mikrofon (znika też kropka „nagrywanie” w przeglądarce).
  source.then((s) => s.mediaStream.getTracks().forEach((t) => t.stop())).catch(() => {})
}

export async function openMicrophone(ctx: AudioContext): Promise<Microphone> {
  users++
  const source = (shared ??= openSource(ctx))
  let node: MediaStreamAudioSourceNode
  try {
    node = await source
  } catch (e) {
    // Nieudane otwarcie: następna próba (np. po udzieleniu zgody) zapyta jeszcze raz.
    if (shared === source) shared = null
    users--
    throw e
  }
  const analyser = ctx.createAnalyser()
  analyser.fftSize = 4096 // ~85 ms dźwięku – starczy na kilka okresów najniższej struny E2
  node.connect(analyser)

  let stopped = false
  return {
    analyser,
    stop() {
      if (stopped) return
      stopped = true
      node.disconnect(analyser)
      release(source)
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
