// Jeden wspólny AudioContext dla całej aplikacji (stroik, dźwięk wzorcowy, metronom).
// Przeglądarki (zwłaszcza Safari) pozwalają go uruchomić tylko po kliknięciu użytkownika.
let ctx: AudioContext | null = null

export async function resumeAudio(): Promise<AudioContext> {
  ctx ??= new AudioContext()
  if (ctx.state !== 'running') await ctx.resume()
  return ctx
}
