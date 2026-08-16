# Bilder einsetzen

Die Seite ist bereits vollständig verdrahtet. Sobald echte Fotos hier liegen,
erscheinen sie automatisch — es muss **kein Code** geändert werden.

Solange eine Datei fehlt, zeigt die Form einen ruhigen Farbverlauf
(kein Stockfoto, kein Platzhalterbild).

## Erwartete Dateien

| Pfad | Verwendung | Format |
|---|---|---|
| `hero/hotel.jpg`    | Poster für das Hero-Video | quer, ca. 2400 × 1200 px |
| `rooms/room-01.jpg` | Garden Room           | hoch, ca. 900 × 1400 px |
| `rooms/room-02.jpg` | Terrace Loft          | hoch, ca. 900 × 1400 px |
| `rooms/room-03.jpg` | Gabi Suite            | hoch, ca. 900 × 1400 px |
| `rooms/room-04.jpg` | Pool Villa            | hoch, ca. 900 × 1400 px |
| `rooms/room-05.jpg` | Panorama Penthouse    | hoch, ca. 900 × 1400 px |

Im Hero läuft das Video `assets/video/hotel.mp4` (1920 × 1080, 8 s).
`hero/hotel.jpg` ist nur das Standbild davor — am besten ein Frame aus dem Video.
Beides sitzt im selben **flachen Bogen**.

Die Raumbilder sitzen in einem **hohen Bogen** (oben halbrund, unten gerade).
Hochformat ist dort wichtig, Querformate werden stark beschnitten.

## Logo

`brand/gabi-logo.svg` ablegen und in `index.html` die beiden Wortmarken
(Header und Footer) durch ein `<img>` ersetzen. Bis dahin steht dort
„HOTEL Gabi" rein typografisch — kein erfundenes Logo.

## Bildausschnitt anpassen

Sitzt ein Motiv nicht ideal, im jeweiligen `.arch__media`
`background-position` überschreiben, z. B.:

```html
<div class="arch__media" style="--img:url('assets/img/hero/hotel.jpg'); background-position:center 30%"></div>
```
