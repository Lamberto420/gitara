// Piosenki wbudowane – ścieżka od najłatwiejszej. WYŁĄCZNIE domena publiczna (ADR 0001):
// piosenki ludowe i utwory, których autorzy zmarli ponad 70 lat temu. Tekst dodajemy tylko tam,
// gdzie on też jest ludowy – polskie przekłady bywają chronione, więc wtedy sama melodia.
// Zapis nut: patrz `SongSource` w song.ts (wysokość zapisu, nie brzmienia).
// Id piosenek są stałe – zapisują się z nimi korony.
import { parseSong, type Song, type SongSource } from './song'

const SOURCES: readonly SongSource[] = [
  {
    id: 'mary-lamb',
    title: 'Mary Had a Little Lamb',
    origin: 'amerykańska piosenka dziecięca, 1830',
    meter: [4, 4],
    bpm: 100,
    phrases: [
      { notes: 'E5 D5 C5 D5 | E5 E5 E5/2 |' },
      { notes: 'D5 D5 D5/2 | E5 G5 G5/2 |' },
      { notes: 'E5 D5 C5 D5 | E5 E5 E5 E5 |' },
      { notes: 'D5 D5 E5 D5 | C5/1' },
    ],
  },
  {
    id: 'alle-meine-entchen',
    title: 'Alle meine Entchen',
    origin: 'niemiecka piosenka ludowa, XIX w.',
    meter: [4, 4],
    bpm: 100,
    phrases: [
      { notes: 'C4 D4 E4 F4 | G4/2 G4/2 |' },
      { notes: 'A4 A4 A4 A4 | G4/1 |' },
      { notes: 'A4 A4 A4 A4 | G4/1 |' },
      { notes: 'F4 F4 F4 F4 | E4/2 E4/2 |' },
      { notes: 'D4 D4 D4 D4 | C4/1' },
    ],
  },
  {
    id: 'twinkle',
    title: 'Twinkle, Twinkle, Little Star',
    origin: 'francuska melodia ludowa „Ah, vous dirai-je, maman”, XVIII w.',
    meter: [4, 4],
    bpm: 100,
    phrases: [
      { notes: 'G4 G4 D5 D5 | E5 E5 D5/2 |' },
      { notes: 'C5 C5 H4 H4 | A4 A4 G4/2 |' },
      { notes: 'D5 D5 C5 C5 | H4 H4 A4/2 |' },
      { notes: 'D5 D5 C5 C5 | H4 H4 A4/2 |' },
      { notes: 'G4 G4 D5 D5 | E5 E5 D5/2 |' },
      { notes: 'C5 C5 H4 H4 | A4 A4 G4/2' },
    ],
  },
  {
    id: 'ode-to-joy',
    title: 'Oda do radości',
    origin: 'L. van Beethoven (zm. 1827), IX Symfonia – temat',
    meter: [4, 4],
    bpm: 90,
    phrases: [
      { notes: 'E5 E5 F5 G5 | G5 F5 E5 D5 |' },
      { notes: 'C5 C5 D5 E5 | E5/4. D5/8 D5/2 |' },
      { notes: 'E5 E5 F5 G5 | G5 F5 E5 D5 |' },
      { notes: 'C5 C5 D5 E5 | D5/4. C5/8 C5/2' },
    ],
  },
  {
    id: 'panie-janie',
    title: 'Panie Janie',
    origin: 'francuska piosenka ludowa „Frère Jacques”, polski tekst ludowy',
    meter: [4, 4],
    bpm: 100,
    phrases: [
      { notes: 'G4 A4 H4 G4 | G4 A4 H4 G4 |', lyrics: 'Pa-nie Ja-nie, pa-nie Ja-nie,' },
      { notes: 'H4 C5 D5/2 | H4 C5 D5/2 |', lyrics: 'ra-no wstań, ra-no wstań,' },
      {
        notes: 'D5/8 E5/8 D5/8 C5/8 H4 G4 | D5/8 E5/8 D5/8 C5/8 H4 G4 |',
        lyrics: 'wszyst-kie dzwo-ny bi-ją, wszyst-kie dzwo-ny bi-ją,',
      },
      { notes: 'G4 D4 G4/2 | G4 D4 G4/2', lyrics: 'bim, bam, bom, bim, bam, bom.' },
    ],
  },
  {
    id: 'jingle-bells',
    title: 'Jingle Bells',
    origin: 'J. L. Pierpont (zm. 1893) – refren',
    meter: [4, 4],
    bpm: 110,
    phrases: [
      { notes: 'E5 E5 E5/2 | E5 E5 E5/2 | E5 G5 C5/4. D5/8 | E5/1 |' },
      { notes: 'F5 F5 F5/4. F5/8 | F5 E5 E5 E5/8 E5/8 | E5 D5 D5 E5 | D5/2 G5/2 |' },
      { notes: 'E5 E5 E5/2 | E5 E5 E5/2 | E5 G5 C5/4. D5/8 | E5/1 |' },
      { notes: 'F5 F5 F5 F5 | F5 E5 E5 E5/8 E5/8 | G5 G5 F5 D5 | C5/1' },
    ],
  },
  {
    id: 'happy-birthday',
    title: 'Happy Birthday',
    origin: 'M. i P. Hill (zm. 1916 i 1946) – „Good Morning to All”',
    meter: [3, 4],
    bpm: 100,
    phrases: [
      // Każda fraza zaczyna się przedtaktem („Hap-py”).
      { notes: 'G4/8. G4/16 | A4 G4 C5 | H4/2' },
      { notes: 'G4/8. G4/16 | A4 G4 D5 | C5/2' },
      { notes: 'G4/8. G4/16 | G5 E5 C5 | H4 A4' },
      { notes: 'F5/8. F5/16 | E5 C5 D5 | C5/2.' },
    ],
  },
  {
    id: 'silent-night',
    title: 'Cicha noc',
    origin: 'F. X. Gruber (zm. 1863), kolęda',
    meter: [6, 8],
    bpm: 100,
    phrases: [
      { notes: 'G4/4. A4/8 G4 | E4/2. | G4/4. A4/8 G4 | E4/2. |' },
      { notes: 'D5/2 D5 | H4/2. | C5/2 C5 | G4/2. |' },
      { notes: 'A4/2 A4 | C5/4. H4/8 A4 | G4/4. A4/8 G4 | E4/2. |' },
      { notes: 'A4/2 A4 | C5/4. H4/8 A4 | G4/4. A4/8 G4 | E4/2. |' },
      { notes: 'D5/2 D5 | F5/4. D5/8 H4 | C5/2. | E5/2. |' },
      { notes: 'C5/4. G4/8 E4 | G4/4. F4/8 D4 | C4/2.' },
    ],
  },
]

export const SONGS: readonly Song[] = SOURCES.map(parseSong)
