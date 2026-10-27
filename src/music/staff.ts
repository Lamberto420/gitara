// Miejsce nuty na pięciolinii z kluczem wiolinowym.
// Gitara brzmi o oktawę niżej, niż się ją zapisuje (stąd „8” pod kluczem) – do pięciolinii
// trafia więc dźwięk o 12 półtonów WYŻSZY od brzmienia.

/**
 * Stopień (C=0 … H=6) według klasy wysokości. Dźwięk z krzyżykiem stoi na miejscu nuty
 * o półton niższej (F♯ na miejscu F), a ♯ rysujemy przed główką.
 */
const DIATONIC_STEP = [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6]
const SHARP = [false, true, false, true, false, false, true, false, true, false, true, false]

/** E4 (zapis) leży na dolnej linii pięciolinii. */
const BOTTOM_LINE_STEP = 4 * 7 + 2

export const GUITAR_OCTAVE_SHIFT = 12

/** Najwyższa pozycja na pięciolinii bez linii dodanych: 8 = górna linia (F5). */
export const TOP_LINE = 8

/**
 * Pozycja nuty względem dolnej linii, w krokach co pół odstępu: 0 = dolna linia, 1 = pierwsze pole,
 * 2 = druga linia… Ujemne – pod pięciolinią. Przyjmuje wysokość ZAPISU (midi).
 */
export function staffPosition(writtenMidi: number): number {
  const step = DIATONIC_STEP[((writtenMidi % 12) + 12) % 12]
  const octave = Math.floor(writtenMidi / 12) - 1
  return octave * 7 + step - BOTTOM_LINE_STEP
}

/** Pozycja nuty gitarowej na pięciolinii (z uwzględnieniem oktawy w górę w zapisie). */
export function guitarStaffPosition(soundingMidi: number): number {
  return staffPosition(soundingMidi + GUITAR_OCTAVE_SHIFT)
}

/** Czy przed nutą stoi krzyżyk (zapis i brzmienie różnią się o oktawę – krzyżyk ten sam). */
export function hasSharp(midi: number): boolean {
  return SHARP[((midi % 12) + 12) % 12]
}

/** Linie dodane potrzebne dla nuty (pozycje parzyste poza pięciolinią). */
export function ledgerLines(position: number): number[] {
  const lines: number[] = []
  for (let p = -2; p >= position; p -= 2) lines.push(p)
  for (let p = TOP_LINE + 2; p <= position; p += 2) lines.push(p)
  return lines
}

/** Laska w górę dla nut poniżej środkowej linii, w dół od środkowej wzwyż (reguła z podręczników). */
export function stemUp(position: number): boolean {
  return position < 4
}
