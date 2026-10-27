// Jeden wspólny AudioContext dla całej aplikacji (stroik, dźwięk wzorcowy, metronom).
// Przeglądarki (zwłaszcza Safari) pozwalają go uruchomić tylko po kliknięciu użytkownika.
let ctx: AudioContext | null = null

export async function resumeAudio(): Promise<AudioContext> {
  ctx ??= new AudioContext()
  if (ctx.state !== 'running') await ctx.resume()
  return ctx
}

/**
 * Kontekst tylko wtedy, gdy już działa (był gest użytkownika). Do dźwięków „przy okazji”,
 * np. fanfary – nie mogą prosić o uruchomienie dźwięku poza kliknięciem.
 */
export function runningAudio(): AudioContext | null {
  return ctx?.state === 'running' ? ctx : null
}
