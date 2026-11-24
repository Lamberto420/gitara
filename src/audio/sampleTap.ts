// „Podsłuch” próbek z dokładnym czasem: AudioWorklet działa w wątku audio i dostaje każdą próbkę
// razem z `currentFrame` – numerem na zegarze, na którym planujemy tyki metronomu. Dzięki temu
// czas szarpnięcia i tyku porównujemy bez zgadywania opóźnień wątku strony (prototyp #3).

/** Paczka po 8 kwantach (1024 próbki, ~21 ms) – rzadziej budzimy wątek strony. */
const PROCESSOR = `
class GitaraSampleTap extends AudioWorkletProcessor {
  constructor() {
    super()
    this.buf = new Float32Array(1024)
    this.n = 0
    this.start = 0
  }
  process(inputs) {
    const ch = inputs[0] && inputs[0][0]
    if (ch) {
      if (this.n === 0) this.start = currentFrame
      this.buf.set(ch, this.n)
      this.n += ch.length
      if (this.n + ch.length > this.buf.length) {
        const data = this.buf.slice(0, this.n)
        this.port.postMessage({ frame: this.start, data }, [data.buffer])
        this.n = 0
      }
    }
    return true
  }
}
registerProcessor('gitara-sample-tap', GitaraSampleTap)
`

// Moduł ładujemy raz na kontekst. Z Bloba – działa offline (PWA) i bez osobnego pliku w buildzie.
const loaded = new WeakMap<BaseAudioContext, Promise<void>>()

function loadProcessor(ctx: AudioContext): Promise<void> {
  let p = loaded.get(ctx)
  if (!p) {
    const url = URL.createObjectURL(new Blob([PROCESSOR], { type: 'application/javascript' }))
    p = ctx.audioWorklet.addModule(url).finally(() => URL.revokeObjectURL(url))
    // Nieudane ładowanie: następna próba spróbuje jeszcze raz.
    p.catch(() => loaded.delete(ctx))
    loaded.set(ctx, p)
  }
  return p
}

export type SampleHandler = (startFrame: number, data: Float32Array) => void

/** Podpina podsłuch pod `source`; zwraca funkcję odpinającą. */
export async function tapSamples(ctx: AudioContext, source: AudioNode, onSamples: SampleHandler): Promise<() => void> {
  await loadProcessor(ctx)
  const tap = new AudioWorkletNode(ctx, 'gitara-sample-tap', {
    numberOfInputs: 1,
    numberOfOutputs: 1,
    channelCount: 1,
    channelCountMode: 'explicit', // mikrofon stereo → jeden kanał
  })
  // Węzeł musi prowadzić do wyjścia, żeby przeglądarka go liczyła – przez wyciszone wzmocnienie.
  const mute = ctx.createGain()
  mute.gain.value = 0
  tap.port.onmessage = (m: MessageEvent<{ frame: number; data: Float32Array }>) => onSamples(m.data.frame, m.data.data)
  source.connect(tap).connect(mute).connect(ctx.destination)
  return () => {
    tap.port.onmessage = null
    source.disconnect(tap)
    tap.disconnect()
    mute.disconnect()
  }
}
