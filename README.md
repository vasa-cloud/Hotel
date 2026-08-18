| Hero | angeheftet, Video wird **gescrubbt** (Scrollposition = Zeitmarke) | **nicht** angeheftet, statt des Films das Nachtbild `img/hero/hotel-abend.jpg` |)# Hotel Gabi — Website

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
assets/img/           brand · hero · rooms · gallery
assets/video/         hotel.mp4 (Hero am Desktop, 6,2 MB)
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

**Scroll-Sequenzen:** Eine Sektion wird per JS angeheftet — sie bekommt eine
Höhe, die Bühne darin steht per `position:sticky` still, und die
Scrollposition steuert die Animation. Erkennbar an der Klasse `is-pinned`,
die JS setzt. Alle CSS-Regeln für den nicht angehefteten Fall stehen deshalb
unter `:not(.is-pinned)` — wer dort ein `!important` einbaut, hebelt die
Inline-Höhe von JS aus und die Sequenz steht still.

Was wo angeheftet wird:

| | Desktop | Handy |
|---|---|---|
| Hero | angeheftet, Video wird **gescrubbt** (Scrollposition = Zeitmarke) | **nicht** angeheftet, statt des Films das Nachtbild `img/hero/hotel-abend.jpg` |
| Zimmer-Reihe | angeheftet, Faktor 0.55 | angeheftet, Faktor 0.85 |

Der Hero bleibt auf dem Handy bewusst frei scrollbar: dort steht das
3D-Logo (`.hero__logo`) anstelle des gesetzten Schriftzugs, weil „HOTEL"
und die drei Sterne im Kopfzeilen-Logo bei 30 px Höhe nur noch 8 bzw. 6 px
groß sind. Eine Sequenz, die den Scroll anhält, stünde genau davor. Solange
der Hero sichtbar ist, blendet sich deshalb auch das kleine Logo in der
Kopfzeile aus — sonst stünde dieselbe Grafik zweimal im Bild.

Das Video wird unterhalb von 860 px **gar nicht geladen**: die Quelle steht
im HTML in `data-src`, `main.js` hängt sie erst als `src` ein, wenn wirklich
Desktop vorliegt. Mit `src` im HTML lüde jedes Handy die 6,2 MB mit, obwohl
dort das Nachtbild zu sehen ist. Dessen Ausschnitt steht bewusst auf
`background-position:30%` — bei 50 % schneidet der Rand das Dach-Leuchtschild
mitten im Wort an und „HOTEL GABI" stünde dreimal im selben Bild.

**scrollGuard (nur Touch):** Ein Wisch trägt die Seite nach dem Loslassen
weit weiter; eine Sequenz wäre nach einer Geste vorbei. Der Guard übernimmt
deshalb genau diesen Nachlauf und führt ihn mit gedeckelter Geschwindigkeit
durch den Abschnitt. Solange der Finger liegt, scrollt der Browser normal.
An den Rändern gibt der Guard sofort ab — es wird nichts dauerhaft
blockiert.

**Adressleiste:** Auf dem Handy löst schon das Ein- und Ausblenden der
Adressleiste ein `resize` aus. Neu vermessen würde die Sektionshöhe mitten
im Scrollen ändern und die Seite springt — deshalb reagiert `onViewportChange`
in `main.js` nur auf echte Breitenwechsel. Aus demselben Grund steht die
Bühnenhöhe auf dem Handy in `dvh`, nicht in `svh`: sonst bliebe unten ein
weißer Streifen, sobald sich die Leiste ausblendet.

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
