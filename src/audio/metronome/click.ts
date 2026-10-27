/** Krótki „tyk” metronomu zaplanowany dokładnie na `time` (zegar audio). Akcent jest wyższy i głośniejszy. */
export function playClick(ctx: AudioContext, time: number, accent: boolean): OscillatorNode {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.frequency.value = accent ? 1500 : 1000
  gain.gain.setValueAtTime(0.0001, time)
  gain.gain.exponentialRampToValueAtTime(accent ? 0.9 : 0.5, time + 0.002)
  gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.05)
  osc.connect(gain).connect(ctx.destination)
  osc.start(time)
  osc.stop(time + 0.06)
  return osc
}
