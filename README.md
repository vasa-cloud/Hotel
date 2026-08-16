# Hotel Gabi — Startseite

Erste Ausbaustufe: **Hero → Räume → Buchung**.
Keine Abhängigkeiten, kein Build-Schritt, kein Node nötig.

## Öffnen

`index.html` doppelklicken. Das war's.

## Dateien

```
index.html                 Struktur der Startseite
assets/css/style.css       Gestaltung (nummerierte Abschnitte 1–9)
assets/js/main.js          Interaktion (6 Module, kommentiert)
assets/img/README.md       wo welche Fotos hingehören
```

## Was bereits umgesetzt ist

- **Header** — nur Wortmarke „Hotel Gabi". Kein Sign-In, kein Hamburger, keine Buttons.
- **Hero** — „HOTEL" klein und dunkel, „Gabi" groß in Rot, darunter das Hotelvideo
  in voller Breite als Hauptmotiv. Beide Zeilen steigen beim Laden aus einer Maske.
- **Video am Scrollrad** — das Video läuft nicht von selbst. Die Hero-Bühne bleibt
  stehen, und die Scrollposition bestimmt die Zeitmarke im Film: weiter runter
  scrollen = weiter im Video, hoch scrollen = zurück. Ist der Film durch, gibt
  die Bühne die Seite frei und die Räume folgen. Der Laufbalken unten zeigt den Stand.
  Tempo über `PX_PER_SECOND` in `assets/js/main.js` (Standard 320 px pro Filmsekunde,
  bei 8 s also ca. 2560 px Scrollweg).
- **Räume** — fünf Bilder in **Bogenform** (oben halbrund, unten gerade),
  versetzt gesetzt, verbunden durch eine feine gepunktete Linie.
- **Horizontaler Scroll** — vertikales Scrollen bewegt die Bilderreihe nach links.
  Die Sektion ist genau so hoch wie die Reihe breit ist, dadurch koppelt sich
  die Bewegung 1:1 an das Scrollrad. Ein leichter Nachlauf glättet sie.
- **Buchung** — rote Sektion mit gestalteter Suchleiste. Optik fertig,
  Logik bewusst noch nicht angebunden.

## Verhalten nach Bildschirmgröße

| Breite | Video | Räume |
|---|---|---|
| ≥ 860 px | angeheftet, Zeitmarke folgt dem Scrollen | angeheftet, Bewegung folgt dem Scrollen |
| < 860 px | läuft stumm in Schleife | native horizontale Wischgeste mit Einrasten |

Auf mobilen Browsern ist Video-Scrubbing unzuverlässig — beim Seeken wird oft kein
Frame gerendert. Deshalb dort bewusst die Schleife statt eines kaputten Effekts.

Bei `prefers-reduced-motion` fällt alles auf ruhige Darstellung ohne Bewegung zurück.

## Offen

1. **Standbild für den Hero** → `assets/img/hero/hotel.jpg`
   Dient als Poster, solange das Video lädt, und als Rückfall, wenn es fehlt.
   Am besten ein Frame aus dem Video selbst.
2. **Raumfotos** → `assets/img/rooms/room-01.jpg` … `room-05.jpg`
3. **Logo** → sobald es vorliegt, ersetzt es die Wortmarke im Header und Footer
4. Adresse im Footer und die Angaben unter dem Hero sind Platzhalter
5. Buchungsstrecke anbinden → `initBookingStub()` in `assets/js/main.js`

Details zu den Bildern in `assets/img/README.md`.

## Farben

| Token | Wert | Rolle |
|---|---|---|
| `--red` | `#B01B2E` | Primärfarbe |
| `--red-deep` | `#7A0F1E` | Tiefe, Hover, Schleier über Fotos |
| `--white` / `--paper` | `#FFFFFF` / `#FBF9F8` | Flächen |
| `--ink` | `#16110F` | Text |

Mehr Farben gibt es bewusst nicht.
