# Hotel Gabi — Website

Reines HTML/CSS/JavaScript. **Kein Build-Schritt, keine Abhängigkeiten** —
`index.html` doppelklicken genügt zum Ansehen.

- **Live:** https://hotel-one-indol.vercel.app
- **Code:** https://github.com/vasa-cloud/Hotel
- Vercel baut bei jedem `git push` automatisch neu.

## Aufbau

```
index.html            Startseite
buchen.html           Buchung, Kategorien, Preisliste, Ablauf
galerie.html          19 Fotos, Vergrößerung beim Antippen
about.html            Über das Haus, Ausstattung, Anfahrt
kontakt.html          Kontaktwege, Anfahrt
zimmer-standard.html  ┐
zimmer-deluxe.html    ├ Detailseiten der drei Kategorien
zimmer-apartment.html ┘
video-test.html       Werkzeug zur Fehlersuche, nicht Teil der Website

assets/css/style.css  Gestaltung, nummerierte Abschnitte 1–12
assets/js/main.js     Interaktion, nummerierte Module
assets/js/i18n.js     Übersetzungen EN + BG
assets/img/           brand · rooms · gallery
assets/video/         hotel.mp4 (Hero, 6,2 MB)
```

### Wichtig zum Verständnis

**Sprache:** Deutsch steht direkt im HTML. Englisch und Bulgarisch liegen
in `i18n.js` und werden über den **deutschen Text als Schlüssel**
nachgeschlagen. Wer deutschen Text ändert, muss den Schlüssel in `i18n.js`
mitändern — sonst fällt die Stelle beim Umschalten auf Deutsch zurück.

**CSS-Reihenfolge:** Die Handy-Regeln stehen bewusst als **letzter Block**
in `style.css`. Bei gleicher Gewichtung gewinnt die spätere Regel — genau
daran war der Footer auf dem Handy schon einmal zweispaltig hängen
geblieben. Neue Handy-Regeln also dort einfügen, nicht weiter oben.

**Bildpfade:** Zimmerbilder werden per `background-image` direkt im HTML
gesetzt, nicht über eine CSS-Variable. Ein `url()` in einer CSS-Variablen
löst der Browser relativ zur **Stylesheet-Datei** auf, was auf dem Server
zu 404 führte.

## Preise (Stand: von hotelgabi-bg.com übernommen)

| | |
|---|---|
| Standard-Doppelzimmer | 85 BGN |
| Deluxe Doppelzimmer | 105 BGN |
| Studio | 140 BGN |
| Zusatzbett | 30 BGN |
| Frühstück pro Person | 15 BGN |
| Parkplatz pro Tag | 15 BGN |
| Konferenzsaal pro Tag | 120 BGN |

Enthalten: WLAN, Kurtaxe. Kinder unter 6 kostenfrei. Späte Abreise
12:30–16:00 gegen 50 %. Kartenzahlung +5 %.

## Offen

**Vor dem Livegang zwingend:**
1. **Gästebewertungen ersetzen** — die vier auf der Startseite sind
   erfunden. Gefälschte Bewertungen sind in der EU verboten.
2. **Allgemeine Bedingungen und Cookie-Richtlinie** verweisen noch auf
   hotelgabi-bg.com und müssen mitwandern.

**Zu klären (widersprüchliche Angaben in den Quellen):**
3. Parkplatz kostenlos oder 15 BGN pro Tag?
4. Konferenzsaal 24 oder 45 Plätze?
5. Dritte Kategorie: „Apartment für 2" oder „Studio"?
6. Rezeptionszeiten und Quadratmeterzahlen fehlen ganz.
7. Instagram-Link zeigt auf `hotelcapriplovdiv` — richtig?

**Danach:**
8. Buchungsstrecke anbinden (bisher nur gestaltet, siehe
   `initBookingStub` in `main.js`).
9. Bulgarische Texte von Muttersprachler gegenlesen lassen.
10. Eigene Domain statt der Vercel-Adresse.
