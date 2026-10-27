# Gitara – aplikacja do nauki gry na gitarze klasycznej

## Cel
Aplikacja dla taty (dorosły początkujący) i syna (9 lat). Interfejs po polsku.
Dla dziecka: duże przyciski, kolory, natychmiastowa pozytywna informacja zwrotna.

**Grywalizacja (à la Duolingo) to rdzeń aplikacji** – najbardziej motywuje syna (odznaki, serie, postęp).
Każdą nową funkcję podłączaj do systemu nutek/odznak.

Syn uczy się z nauczycielem z książki „Gitara Pierwsza Klasa” (T. Stachak), jest na Części 3,
czyta nuty z pięciolinii, zna całą I pozycję (wszystkie struny do 3. progu). W ćwiczeniach
pokazujemy pięciolinię **i** gryf z miejscem przyciśnięcia (numer palca 1–4).
Nie odtwarzamy ćwiczeń/melodii z książki (prawa autorskie) – gry generujemy z zakresu znanych
nut, a zadania domowe tata wpisze w (przyszłym) edytorze ćwiczeń.

Publikacja: https://lamberto420.github.io/gitara/ (repo publiczne: github.com/Lamberto420/gitara).

## Stack
- Vite 8 + React 19 + TypeScript 7 (strict), Vitest; wersje przypięte dokładnie w package.json
- Web Audio API (stroik, metronom), mikrofon przetwarzany tylko lokalnie
- PWA (`vite-plugin-pwa`): instalacja na telefonie/tablecie/komputerze, działa offline, `autoUpdate`
- Dane w localStorage, brak backendu (synchronizacja: patrz „Plan”)
- GitHub Pages przez Actions (`.github/workflows/deploy.yml`): push na `main` → `npm audit --audit-level=high` → testy → build → publikacja. Akcje przypięte do SHA. `base: '/gitara/'` tylko przy buildzie
- Dependabot: cotygodniowe PR-y (npm + actions), alerty bezpieczeństwa włączone
- Przy nowej zależności: sprawdź aktualną wersję i znane podatności, uruchom `npm audit`

## Architektura
```
src/audio/      czysta logika dźwięku: pitch/ (YIN, nuty, mediana), metronome/ (harmonogram, tap tempo)
src/data/       model danych, łączenie (merge), migracje, zapis, kopia zapasowa
src/progress/   silnik postępu: nutki, poziomy, seria, ochrona, rodzinna seria (czyste funkcje)
src/features/   ekrany i hooki React: tuner/, metronome/, profiles/, progress/
src/storage.ts  bezpieczny dostęp do localStorage (try/catch, `save` zwraca false przy błędzie)
```
- **Logika = czysty TypeScript z testami**; komponenty React tylko ją wywołują i wyświetlają.
- Testy jednostkowe obok kodu (`*.test.ts`). Po napisaniu testów zrób test mutacyjny: celowo zepsuj
  kluczową linię, sprawdź, że testy to łapią, przywróć.
- `ProfileContext` (`useProfiles()`): dane aplikacji, aktywny profil, `addEvents()`, import kopii.
  `useProgress()` / `useToday()` (zmienia się o północy) w `features/progress/`.

## Model danych (ważne – nie łam tych zasad)
- **Postęp to log zdarzeń** (`ActivityEvent` z unikalnym `id`), a nie zagregowane liczniki.
  Punkty/serie/poziomy/odznaki są **wyliczane** ze zdarzeń. Dzięki temu dane z kilku urządzeń
  łączą się bez konfliktów (`mergeAppData`: suma zdarzeń po id, profil z nowszym `updatedAt`).
- Nutki (`xp`) zapisujemy **w zdarzeniu w chwili powstania** – zmiana punktacji nie zabiera nutek wstecz.
- Zdarzenie „cel spełniony” ma id `goal:<profileId>:<dzień>` – po połączeniu urządzeń liczy się raz;
  seria liczona ze zdarzeń `goal`, więc zmiana celu nie psuje przeszłych dni.
- `day` w zdarzeniu = data lokalna „RRRR-MM-DD” z chwili zdarzenia; działania na dniach w `progress/days.ts`
  (UTC na datach – odporne na zmianę czasu).
- Usunięty profil = `deleted: true` (nagrobek), nie usuwamy go z tablicy.
- Zmiana formatu: podbij `DATA_VERSION` i dopisz migrację w `data/migrations.ts` (+ test).
- Uszkodzone dane nie są kasowane – odkładane pod `gitara:data-uszkodzone-<czas>`.
- Aktywny profil to ustawienie urządzenia (`gitara:active-profile`), nie trafia do kopii.

## Zasady grywalizacji (ustalone)
- ⭐ Nutki: 2 za minutę grania, 10 za spełniony cel dzienny.
- Poziomy: próg poziomu n = 25·n·(n−1) (0, 50, 150, 300, 500…), nazwy w `progress/levels.ts`.
- Cel dzienny: minuty grania (10/15/20 w profilu), liczone przez mikrofon – tylko gdy słychać gitarę.
- 🔥 Seria: dni z rzędu ze spełnionym celem; dzisiejszy dzień nie przerywa serii, dopóki trwa.
- 🧊 Ochrona serii: +1 co 7 dni serii (maks. 2), zużywa się automatycznie przy opuszczonym dniu.
- Rodzinna seria (współpraca, bez rankingów): dni, w których każda osoba spełniła cel
  (dzień uratowany ochroną też się liczy).

## Konwencje
- Teksty w UI po polsku i **neutralne płciowo** (profil może należeć do każdego, np. „tej osoby”, „wszyscy”).
- Struna 2 nazywa się **H** (polska notacja).
- Duże elementy dotykowe (≥ 48 px). W siatkach CSS używaj `minmax(0, 1fr)`, a fieldset potrzebuje
  `min-width: 0` – inaczej treść (emoji) wystaje poza ekran telefonu.
- Komentarze w kodzie po polsku, wyjaśniają „dlaczego”.

## Pułapki audio
- `AudioContext` startuje dopiero po geście użytkownika (`resumeAudio()` w handlerze kliknięcia).
- Mikrofon: wyłączone `echoCancellation`, `noiseSuppression`, `autoGainControl`.
- Gitara brzmi **oktawę niżej** niż zapis nutowy – uwzględniaj przy sprawdzaniu nut przez mikrofon.
- iOS: przełącznik wyciszenia ścisza też Web Audio (w metronomie jest podpowiedź).
- Metronom: harmonogram z wyprzedzeniem na zegarze audio (nie `setInterval` do dźwięku).

## Weryfikacja
- `npm test`, `npm run build` (sprawdza typy), `npm audit`.
- Test w przeglądarce bez okna: `chromium --headless=new --remote-debugging-port=9333` + skrypt
  Node (wbudowany `WebSocket`) sterujący przez Chrome DevTools Protocol. Mikrofon udajemy plikiem:
  `--use-fake-ui-for-media-stream --use-fake-device-for-media-stream --use-file-for-fake-audio-capture=ton.wav`
  (ton z `ffmpeg -f lavfi -i sine=frequency=110`), dźwięk bez gestu: `--autoplay-policy=no-user-gesture-required`.
  Poczekaj, aż serwer Vite odpowie, zanim otworzysz stronę.
- Układ sprawdzaj pomiarem (brak poziomego przewijania) przy szerokościach 320, 390 i 768 px.

## Plan (stan na 2026-10-27)
Zrobione: stroik (auto + blokada struny + dźwięk wzorcowy), metronom (tempo, metrum, tap tempo,
Wake Lock), PWA, publikacja, profile z kopią zapasową, silnik postępu z nagłówkiem (seria, nutki, cel).

Dalej, w tej kolejności:
1. **Licznik „Ćwiczę 🎸”** – liczy minuty tylko, gdy mikrofon słyszy grę; zapisuje zdarzenia
   `practice` (np. co pełną minutę, żeby zamknięcie aplikacji nic nie gubiło) i `goal`
   (`pendingGoalEvent`); nutki także za metronom i stroik. Od tego kroku postęp realnie przybywa.
2. **Odznaki i świętowanie** – odznaki wyliczane ze zdarzeń, gablota (niezdobyte jako zagadki),
   konfetti/dźwięk przy odznace, awansie i celu.
3. **Komponenty gryfu i pięciolinii** (własne SVG).
4. **Gra „Zagraj nutę”** (I pozycja, sprawdzanie mikrofonem), potem edytor ćwiczeń dla taty.
5. Później: trener tempa w metronomie; automatyczna synchronizacja przez Firebase, jeśli ręczne
   kopie okażą się uciążliwe (wymaga zmiany zasady „brak backendu”, reguł dostępu tylko dla
   kont rodziny i sprawdzenia aktualnych limitów darmowego planu).

## Zasady pracy
- Małe, działające kroki; po każdym kroku commit
- Przed większą funkcją przedstaw plan
- Wyjaśniaj krótko, co i dlaczego zrobiłeś – uczę się Claude Code
- Po każdym kroku napisz, co konkretnie zobaczę w aplikacji, a czego jeszcze nie
- Pytaj przed `git push`, publicznymi i nieodwracalnymi operacjami (force push, tworzenie repo)
