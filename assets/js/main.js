/* ============================================================
   HOTEL GABI — Interaktion
   Ohne externe Bibliotheken. Bewusst wenige, ruhige Effekte.

   Module:
     1. utils          — Helfer
     1b. scrollGuard   — Nachlauf des Touch-Scrolls bändigen (nur Handy)
     2. reveal         — Eintritts-Animationen (IntersectionObserver)
     3. header         — Zustand beim Scrollen
     4. smoothAnchors  — geglättete Sprünge zu Ankern
     5. filmScrub      — vertikales Scrollen → Videozeit
     6. roomsRail      — vertikales Scrollen → horizontale Bewegung
     7. bookingStub    — Platzhalter-Verhalten, Logik folgt später
     7b. heroMotion    — Hero-Bewegung auf schmalen Screens
     7c. lightbox      — Galeriebilder vergrößert anzeigen
     7d. youtube       — Player erst auf Klick laden
     8. langSwitch     — Sprachwahl merken (Übersetzung folgt)
   ============================================================ */
(function () {
  'use strict';

  /* --- 1 · utils ------------------------------------------- */
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  var desktop = window.matchMedia('(min-width: 860px)');
  /* Gegenstück zu desktop: alles darunter fährt die Handy-Fassung der
     Sequenzen. Bewusst dieselbe Grenze wie im CSS (859 px). */
  var narrow  = window.matchMedia('(max-width: 859px)');

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  /* Sanftes Ein-/Ausgleiten – kein Überschwingen, kein Bounce. */
  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function debounce(fn, wait) {
    var t;
    return function () {
      var args = arguments, self = this;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(self, args); }, wait);
    };
  }

  function motionOff() { return reduced.matches; }

  /* Auf dem Handy löst schon das Ein- und Ausblenden der Adressleiste ein
     resize aus — die Höhe ändert sich dabei um 60 bis 80 px. Würde daraufhin
     neu vermessen, änderte sich die Höhe einer angehefteten Sektion mitten
     im Scrollen und die Seite darunter springt. Nur echte Breitenwechsel
     (Drehen, Fenstergröße) lösen deshalb eine Neumessung aus. */
  function onViewportChange(fn) {
    var lastW = window.innerWidth;
    return function () {
      var w = window.innerWidth;
      if (w === lastW && narrow.matches) return;
      lastW = w;
      fn();
    };
  }

  /* --- 1b · scrollGuard ------------------------------------- */
  /* Nur für Touch. Ein Wisch trägt die Seite nach dem Loslassen noch weit
     weiter — eine angeheftete Sequenz wäre damit nach einer einzigen
     Geste vorbei, mit übersprungenen Zwischenschritten.

     Der Guard greift deshalb genau an einer Stelle ein: solange der Finger
     liegt, scrollt der Browser ganz normal 1:1 — das fühlt sich am
     natürlichsten an und ein Daumenzug schafft ohnehin höchstens eine
     Bildschirmhöhe. Erst der Nachlauf danach wird übernommen und mit
     gedeckelter Geschwindigkeit durch den Abschnitt geführt.

     An den Rändern eines Abschnitts gibt er sofort wieder ab: der nächste
     Wisch scrollt die Seite ganz gewöhnlich weiter. Es wird nie etwas
     dauerhaft blockiert — fällt der Guard aus, bleibt normales Scrollen. */
  var scrollGuard = (function () {
    var ranges = [];        // Funktionen → {from,to} in Dokumentkoordinaten
    var gliding = false;    // führt gerade selbst statt den Browser zu lassen
    var suspended = false;  // fremde Scroll-Animation läuft (Ankersprung)
    var raf = null;
    var lastY = 0, lastTs = 0, still = 0;
    var vel = 0, edge = 0, dir = 0;

    var DECAY = 0.0028;     // 1/ms — der Nachlauf klingt in gut 350 ms ab
    var MIN_V = 0.05;       // px/ms, darunter ist Schluss
    var MIN_MS = 900;       // so lange braucht ein Abschnitt mindestens

    /* html{scroll-behavior:smooth} würde jeden dieser Schritte glätten
       und damit gegen die eigene Führung arbeiten. */
    function setY(y) {
      try { window.scrollTo({ top: y, behavior: 'instant' }); }
      catch (err) { window.scrollTo(0, y); }
    }

    function maxY() {
      return Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    }

    /* Streng innerhalb: genau auf der Kante muss der normale Scroll
       übernehmen, sonst käme man aus dem Abschnitt nicht mehr heraus. */
    function rangeAt(y) {
      for (var i = 0; i < ranges.length; i++) {
        var r = ranges[i]();
        if (r && y > r.from + 2 && y < r.to - 2) return r;
      }
      return null;
    }

    function stop() {
      gliding = false;
      if (raf) { cancelAnimationFrame(raf); raf = null; }
    }

    function frame(ts) {
      raf = null;
      if (suspended) { stop(); return; }

      var dt = lastTs ? Math.min(ts - lastTs, 50) : 16.7;
      lastTs = ts;

      if (gliding) {
        vel *= Math.exp(-DECAY * dt);
        if (Math.abs(vel) < MIN_V) { stop(); return; }

        var y = clamp(window.scrollY + vel * dt, 0, maxY());
        /* Am Ende des Abschnitts hält die Führung an. Der nächste Wisch
           setzt dann ganz normal auf der Seite auf. */
        if ((dir > 0 && y >= edge) || (dir < 0 && y <= edge)) {
          setY(edge); stop(); return;
        }
        setY(y);
        raf = requestAnimationFrame(frame);
        return;
      }

      /* Beobachten: wie schnell trägt der Browser gerade von selbst? */
      var cur = window.scrollY;
      var moved = cur - lastY;
      var v = moved / dt;
      lastY = cur;

      if (Math.abs(moved) < 0.4) {
        still += dt;
        if (still > 160) { stop(); return; }
      } else {
        still = 0;
      }

      var r = rangeAt(cur);
      if (r && Math.abs(v) > MIN_V) {
        dir = v > 0 ? 1 : -1;
        /* Tempo so deckeln, dass der Abschnitt nie schneller als in
           MIN_MS durchläuft — unabhängig davon, wie hart gewischt wurde. */
        var lim = Math.max(0.35, (r.to - r.from) / MIN_MS);
        vel = clamp(v, -lim, lim);
        edge = dir > 0 ? r.to : r.from;
        gliding = true;
      }
      raf = requestAnimationFrame(frame);
    }

    function begin() {
      if (suspended || !ranges.length) return;
      lastY = window.scrollY;
      lastTs = 0;
      still = 0;
      if (!raf) raf = requestAnimationFrame(frame);
    }

    if ('ontouchstart' in window) {
      /* Der Finger selbst scrollt immer nativ — hier wird nichts
         abgefangen, nur eine noch laufende Führung beendet. */
      window.addEventListener('touchstart', stop, { passive: true });
      window.addEventListener('touchend', begin, { passive: true });
      window.addEventListener('touchcancel', begin, { passive: true });
      /* Mausrad und Tastatur bleiben unangetastet. */
      window.addEventListener('wheel', stop, { passive: true });
      window.addEventListener('keydown', stop, { passive: true });
    }

    return {
      /* fn liefert {from,to} oder null, wenn der Abschnitt gerade nicht
         angeheftet ist — damit ist der Guard auf dem Desktop untätig. */
      add: function (fn) { ranges.push(fn); },
      suspend: function () { suspended = true; stop(); },
      resume: function () { suspended = false; },
      stop: stop
    };
  })();

  /* --- 2 · reveal ------------------------------------------ */
  function initReveal() {
    var nodes = document.querySelectorAll('[data-reveal], [data-room]');
    var stepped = document.querySelectorAll('[data-reveal-step]');
    if (!nodes.length && !stepped.length) return;

    if (motionOff() || !('IntersectionObserver' in window)) {
      Array.prototype.forEach.call(nodes, function (n) { n.classList.add('is-in'); });
      Array.prototype.forEach.call(stepped, function (n) { n.classList.add('is-in'); });
      return;
    }

    Array.prototype.forEach.call(nodes, function (n) {
      var d = n.getAttribute('data-reveal-delay');
      if (d) n.style.setProperty('--d', d);
    });

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('is-in');
        io.unobserve(e.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

    Array.prototype.forEach.call(nodes, function (n) { io.observe(n); });

    /* Gestaffelt am Scroll statt an der Uhr: Elemente nebeneinander liegen
       auf gleicher Höhe und würden sonst gleichzeitig auslösen. Je höher
       die Stufe, desto weiter muss gescrollt werden, bis das Element als
       sichtbar gilt — dadurch steigen sie nacheinander auf. */
    Array.prototype.forEach.call(stepped, function (n) {
      var step = parseInt(n.getAttribute('data-reveal-step'), 10) || 0;
      /* Engere Staffelung als zuvor: die Reihenfolge bleibt sichtbar,
         aber man muss nicht mehr weit scrollen, bis alle da sind. */
      var bottom = -(4 + step * 6);
      /* Nicht so weit reinziehen, dass es auf kurzen Fenstern nie auslöst. */
      if (bottom < -32) bottom = -32;

      var obs = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          e.target.classList.add('is-in');
          obs.unobserve(e.target);
        });
      }, { threshold: 0.05, rootMargin: '0px 0px ' + bottom + '% 0px' });

      obs.observe(n);
    });
  }

  /* --- 3 · header ------------------------------------------ */
  function initHeader() {
    var header = document.querySelector('[data-header]');
    if (!header) return;
    var stuck = false;

    function sync() {
      var next = window.scrollY > 40;
      if (next !== stuck) {
        stuck = next;
        header.classList.toggle('is-stuck', stuck);
      }
    }
    sync();
    window.addEventListener('scroll', sync, { passive: true });
  }

  /* --- 4 · smoothAnchors ----------------------------------- */
  function initSmoothAnchors() {
    var links = document.querySelectorAll('[data-scroll][href^="#"]');
    if (!links.length) return;

    /* Eigene Easing-Kurve statt des nativen Verhaltens. */
    if (!motionOff()) document.documentElement.style.scrollBehavior = 'auto';

    var animId = null;

    function stop() {
      if (animId) { cancelAnimationFrame(animId); animId = null; }
      /* Ab hier gehört der Scroll wieder dem Guard. */
      scrollGuard.resume();
    }
    ['wheel', 'touchstart', 'keydown'].forEach(function (evt) {
      window.addEventListener(evt, stop, { passive: true });
    });

    function scrollTo(targetY, duration) {
      stop();
      /* Der Sprung führt durch die angehefteten Abschnitte hindurch. Ohne
         diese Pause würde der Guard die Bewegung als Nachlauf deuten und
         gegen die eigene Easing-Kurve arbeiten. */
      scrollGuard.suspend();

      var startY = window.scrollY;
      var delta = targetY - startY;
      var t0 = null;

      function step(ts) {
        if (t0 === null) t0 = ts;
        var p = clamp((ts - t0) / duration, 0, 1);
        window.scrollTo(0, startY + delta * easeInOutCubic(p));
        if (p < 1) { animId = requestAnimationFrame(step); }
        else { animId = null; scrollGuard.resume(); }
      }
      animId = requestAnimationFrame(step);
    }

    Array.prototype.forEach.call(links, function (link) {
      link.addEventListener('click', function (e) {
        var id = link.getAttribute('href');
        if (!id || id === '#') return;
        var el = document.querySelector(id);
        if (!el) return;
        e.preventDefault();

        var y = el.getBoundingClientRect().top + window.scrollY;
        if (motionOff()) { window.scrollTo(0, y); return; }

        /* Distanzabhängige Dauer, gedeckelt – nie hektisch, nie zäh. */
        var dist = Math.abs(y - window.scrollY);
        scrollTo(y, clamp(320 + dist * 0.16, 380, 850));
      });
    });
  }

  /* --- 5 · filmScrub --------------------------------------- */
  /* Das Video wird nicht abgespielt, sondern gescrubbt: die Scrollposition
     bestimmt die Zeitmarke. Die Hero-Bühne bleibt so lange stehen, bis der
     Film durchgelaufen ist — danach gibt sie die Seite wieder frei.

     Auf schmalen Screens ist Scrubbing unzuverlässig: mobile Browser
     rendern Frames beim Seeken oft nicht, und bei 6 Mbit/s wird jeder
     Sprung zur Ruckelquelle. Die Bühne wird dort trotzdem angeheftet und
     am Scroll geführt — nur der Film wird nicht gesprungen, sondern
     ECHT abgespielt. Gekoppelt wird über die Abspielgeschwindigkeit:
     sie steuert den Film sanft auf die Zeitmarke zu, die zur
     Scrollposition gehört. Damit hängt das Bild am Scroll, ohne je
     einzufrieren — Smoothness geht hier vor Bildgenauigkeit.

     Ohne JS, bei reduzierter Bewegung oder wenn die Filmlänge nicht
     ermittelbar ist, bleibt es beim alten Verhalten: Schleife, kein
     Anheften.                                                          */
  function initFilmScrub() {
    var section = document.querySelector('[data-film]');
    if (!section) return;

    var video = section.querySelector('[data-film-video]');
    var progress = section.querySelector('[data-film-progress]');
    if (!video) return;

    /* Scrollweg pro Sekunde Film. Höher = langsamer, ruhiger.
       Bei 8 s Film ergibt 120 rund einen Bildschirm Scrollweg — vorher
       waren es mit 320 fast drei, was sich zäh anfühlte. */
    var PX_PER_SECOND = 120;

    /* Handy: 300 px Scrollweg entsprechen einer Sekunde Film. Wer in
       ruhigem Tempo scrollt (rund 300 px/s), sieht den Film dadurch in
       normaler Geschwindigkeit — schneller gewischt zieht er an, langsamer
       läuft er aus. Der Wert bestimmt nur die Kopplung, nicht den
       Scrollweg: der steht in MOBILE_SCREENS. */
    var PX_PER_SECOND_MOBILE = 300;
    /* Scrollweg der angehefteten Bühne, in Bildschirmhöhen. 1.5 heißt:
       eine volle Daumenbewegung schafft gut die Hälfte — die Sequenz kann
       also nicht mit einem Wisch übersprungen werden, bleibt aber kurz
       genug, um nicht zäh zu wirken. */
    var MOBILE_SCREENS = 1.5;

    var duration = 0;
    var distance = 0;
    var currentT = 0;    // gerenderte Zeitmarke
    var targetT = 0;     // aus dem Scroll abgeleitete Zeitmarke
    var running = false;
    var visible = false;
    var lastTs = 0;

    /* Handy-Zweig */
    var mobileOn = false;   // Bühne angeheftet, Film läuft gekoppelt
    var mRunning = false;
    var mP = 0;             // Fortschritt der Sequenz, 0…1
    var mSeekAt = 0;        // Zeitpunkt des letzten Notsprungs
    var mPlayAt = 0;        // Zeitpunkt des letzten Abspielversuchs
    var retryBound = false;

    /* --- Sprungsteuerung ---
       Es darf immer nur ein Sprung gleichzeitig laufen. Trifft währenddessen
       eine neue Anforderung ein, ersetzt sie die vorige und wird nach dem
       Abschluss nachgeholt — sie darf nicht verworfen werden. Genau daran
       bleibt das Bild bei hohen Bitraten sonst stehen, während weiter
       gescrollt wird. */
    var seekBusy = false;
    var seekPending = null;
    var seekGuard = 0;

    function releaseSeek() {
      clearTimeout(seekGuard);
      seekBusy = false;
      if (seekPending !== null) {
        var t = seekPending;
        seekPending = null;
        applySeek(t);
      }
    }

    function applySeek(t) {
      seekBusy = true;
      clearTimeout(seekGuard);
      /* Bleibt 'seeked' aus, darf das nicht dauerhaft blockieren. */
      seekGuard = setTimeout(releaseSeek, 300);
      try { video.currentTime = t; }
      catch (err) { seekBusy = false; }
    }

    function requestSeek(t) {
      t = clamp(t, 0, Math.max(0, duration - 0.04));
      if (seekBusy) { seekPending = t; return; }
      if (Math.abs(video.currentTime - t) < 0.015) return;
      applySeek(t);
    }

    video.addEventListener('seeked', releaseSeek);

    /* Ohne einen ersten Sprung zeigen manche Browser überhaupt kein Bild,
       solange das Video nie abgespielt wurde. */
    var primed = false;
    function primeFirstFrame() {
      if (primed) return;
      primed = true;
      try { video.currentTime = 0.04; } catch (err) {}
    }
    video.addEventListener('loadeddata', primeFirstFrame, { once: true });
    if (video.readyState >= 2) primeFirstFrame();

    function active() { return desktop.matches && !motionOff() && duration > 0; }

    /* Handy-Fassung: gleiche angeheftete Bühne, aber laufender Film statt
       Sprüngen. Braucht die Filmlänge nicht — die Höhe steht sofort. */
    function pinMobile() { return narrow.matches && !motionOff(); }

    /* Abspielen scheitert auf dem Handy häufiger, als man denkt: im
       Energiesparmodus verweigern iOS und Android es grundsätzlich, und
       bei 6 Mbit/s ist oft schlicht noch zu wenig gepuffert. Dann bleibt
       das erste Bild stehen — und die ganze Sequenz sieht aus wie ein
       Foto, das nach oben rutscht.

       Deshalb wird nicht nur einmal versucht. Die Wiederholung hängt an
       der ersten Berührung, am ersten Scrollen und am Moment, in dem der
       Puffer reicht. Sobald der Film läuft, hängen sich alle Zuhörer
       wieder aus. */
    function playSoft() {
      var p = video.play();
      if (p && p.catch) p.catch(function () {});
      bindRetry();
    }

    function bindRetry() {
      if (retryBound) return;
      retryBound = true;

      function unbind() {
        retryBound = false;
        document.removeEventListener('touchstart', retry);
        document.removeEventListener('click', retry);
        window.removeEventListener('scroll', retry);
        video.removeEventListener('canplay', retry);
      }

      function retry() {
        /* Bei reduzierter Bewegung steht der Film absichtlich still. */
        if (motionOff()) { unbind(); return; }
        if (!video.paused) { unbind(); return; }
        var q = video.play();
        if (q && q.catch) q.catch(function () {});
      }

      document.addEventListener('touchstart', retry, { passive: true });
      document.addEventListener('click', retry);
      window.addEventListener('scroll', retry, { passive: true });
      video.addEventListener('canplay', retry);
    }

    function loopMode() {
      /* Ohne Anheften: kein Scrubbing, kein Scrollbezug. */
      mobileOn = false;
      section.classList.remove('is-pinned');
      section.style.height = '';
      if (progress) progress.style.width = '';

      if (motionOff()) { video.pause(); return; }

      video.loop = true;
      video.muted = true;
      video.playbackRate = 1;
      playSoft();
    }

    function scrubMode() {
      mobileOn = false;
      video.loop = false;
      video.autoplay = false;
      video.playbackRate = 1;
      video.pause();

      distance = Math.round(duration * PX_PER_SECOND);
      section.classList.add('is-pinned');
      section.style.height = (window.innerHeight + distance) + 'px';

      readTarget();
      currentT = targetT;
      requestSeek(currentT);
      render();
    }

    function pinMobileMode() {
      video.loop = true;
      video.muted = true;
      /* Erst als Eigenschaft gesetzt, nicht im HTML: sonst liefe der Film
         auf dem Desktop kurz an, bevor der Scrub-Modus ihn anhält. */
      video.autoplay = true;
      playSoft();

      /* Der Scrollweg hängt hier an der Bildschirmhöhe, nicht an der
         Filmlänge: gefragt ist ein verlässliches Gefühl auf jedem Gerät,
         keine bildgenaue Abbildung des Films. */
      distance = Math.round(clamp(window.innerHeight * MOBILE_SCREENS, 800, 1700));
      section.classList.add('is-pinned');
      section.style.height = (window.innerHeight + distance) + 'px';

      mobileOn = true;
      readMobile();
      render();
      if (visible) mStart();
    }

    function measure() {
      if (duration > 0 && active()) { scrubMode(); return; }
      if (pinMobile()) { pinMobileMode(); return; }
      if (!duration) return;
      loopMode();
    }

    function readTarget() {
      var travel = section.offsetHeight - window.innerHeight;
      if (travel <= 0) { targetT = 0; return; }
      var p = clamp(-section.getBoundingClientRect().top / travel, 0, 1);
      targetT = p * duration;
    }

    function readMobile() {
      var travel = section.offsetHeight - window.innerHeight;
      mP = travel > 0 ? clamp(-section.getBoundingClientRect().top / travel, 0, 1) : 0;
    }

    /* Der Laufbalken hängt an der Scrollposition, nicht am Decoder —
       sonst friert er mit ein, sobald ein Sprung länger dauert. */
    function render() {
      if (!progress) return;
      if (mobileOn) {
        progress.style.width = (mP * 100).toFixed(2) + '%';
      } else if (duration > 0) {
        progress.style.width = ((clamp(currentT, 0, duration) / duration) * 100).toFixed(2) + '%';
      }
    }

    /* --- Handy: Film an den Scroll koppeln -------------------
       Statt zu springen wird die Abspielgeschwindigkeit nachgeregelt.
       Liegt der Film hinter der Scrollposition, zieht er an; liegt er
       davor, läuft er langsamer weiter — er steht aber nie still. */
    function mFrame() {
      if (!mRunning) return;
      if (!mobileOn) { mRunning = false; return; }

      readMobile();
      render();

      /* Steht der Film — abgelehnter Autoplay, leergelaufener Puffer,
         Rückkehr aus dem Hintergrund —, wird er von hier aus wieder
         angestoßen. Gedrosselt, damit kein Dauerfeuer entsteht. */
      if (video.paused && !motionOff()) {
        var jetzt = Date.now();
        if (jetzt - mPlayAt > 1500) {
          mPlayAt = jetzt;
          var pr = video.play();
          if (pr && pr.catch) pr.catch(function () {});
        }
      }

      if (duration > 0 && !video.paused) {
        /* Nur ein Ausschnitt des Films wird auf den Scrollweg gelegt:
           Über die volle Länge müsste er bei normalem Scrolltempo
           vierfach laufen, was wie Vorspulen aussieht. */
        var span = Math.min(duration, distance / PX_PER_SECOND_MOBILE);
        var d = mP * span - video.currentTime;

        /* Der Film läuft in Schleife — die kürzere Richtung im Kreis
           nehmen, sonst gilt der Rücksprung auf 0 als riesiger Abstand. */
        while (d >  duration / 2) d -= duration;
        while (d < -duration / 2) d += duration;

        /* Ein einziger Sprung, wenn der Abstand nicht mehr einzuholen ist
           (z. B. nach langem Stillstand oder Zurückscrollen). Selten und
           gedrosselt — genau das verträgt ein mobiler Decoder noch. */
        var now = Date.now();
        if (Math.abs(d) > 2.6 && now - mSeekAt > 700) {
          mSeekAt = now;
          try { video.currentTime = clamp(mP * span, 0, duration - 0.05); } catch (err) {}
        } else {
          var rate = clamp(1 + d * 0.6, 0.5, 3);
          if (Math.abs(video.playbackRate - rate) > 0.04) {
            try { video.playbackRate = rate; } catch (err) {}
          }
        }
      }

      if (visible) requestAnimationFrame(mFrame);
      else mRunning = false;
    }

    function mStart() {
      if (mRunning || !mobileOn) return;
      mRunning = true;
      requestAnimationFrame(mFrame);
    }

    /* Solange die Bühne angeheftet ist, führt der Guard den Nachlauf des
       Touch-Scrolls durch genau diesen Bereich. Auf dem Desktop liefert
       die Funktion null — dort bleibt der Guard untätig. */
    scrollGuard.add(function () {
      if (!mobileOn) return null;
      var top = section.getBoundingClientRect().top + window.scrollY;
      return { from: top, to: top + section.offsetHeight - window.innerHeight };
    });

    function frame(ts) {
      if (!running) return;

      var dt = lastTs ? Math.min(ts - lastTs, 50) : 16.7;
      lastTs = ts;

      readTarget();

      var k = 1 - Math.pow(1 - 0.26, dt / 16.7);
      currentT += (targetT - currentT) * k;
      if (Math.abs(targetT - currentT) < 0.004) currentT = targetT;

      requestSeek(currentT);
      render();

      if (visible) {
        requestAnimationFrame(frame);
      } else {
        running = false;
        lastTs = 0;
      }
    }

    function start() {
      if (running || !active()) return;
      running = true;
      lastTs = 0;
      requestAnimationFrame(frame);
    }

    function onMeta() {
      duration = video.duration;
      if (!isFinite(duration) || duration <= 0) { duration = 0; return; }
      measure();
      if (visible) { start(); mStart(); }
    }

    /* Auf dem Handy hängt die Sektionshöhe nicht an der Filmlänge. Sie darf
       deshalb sofort stehen — sonst würde die halbe Seite darunter beim
       Eintreffen der Metadaten nachrutschen. */
    if (pinMobile()) measure();

    if (video.readyState >= 1) onMeta();
    else video.addEventListener('loadedmetadata', onMeta, { once: true });

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        if (visible) { start(); mStart(); }
      }, { rootMargin: '20% 0px 20% 0px' }).observe(section);
    } else {
      visible = true;
      start();
      mStart();
    }

    window.addEventListener('resize', debounce(onViewportChange(measure), 160));
    if (desktop.addEventListener) desktop.addEventListener('change', measure);
    if (reduced.addEventListener) reduced.addEventListener('change', measure);
  }

  /* --- 6 · roomsRail --------------------------------------- */
  /* Die Sektion wird so hoch gemacht, wie die Bilderreihe breit ist.
     Dadurch koppelt sich die horizontale Strecke 1:1 an das Scrollen.
     Ein leichter Nachlauf (lerp) nimmt der Bewegung die Härte.       */
  function initRoomsRail() {
    var section = document.querySelector('[data-rooms]');
    if (!section) return;

    var viewport = section.querySelector('[data-rooms-viewport]');
    var track = section.querySelector('[data-rooms-track]');
    var progress = section.querySelector('[data-rooms-progress]');
    if (!viewport || !track) return;

    var distance = 0;     // horizontal zurückzulegende Strecke in px
    var current = 0;      // gerenderte Position
    var target = 0;       // vom Scroll abgeleitete Sollposition
    var running = false;
    var visible = false;
    var lastTs = 0;

    function active() { return desktop.matches && !motionOff(); }

    /* Auf dem Handy läuft dieselbe Mechanik, nur mit längerem Scrollweg —
       siehe factor in measure(). Ohne JS bleibt die Reihe ein nativer
       Querscroller, so wie bisher. */
    function pinMobile() { return narrow.matches && !motionOff(); }

    function reset() {
      section.style.height = '';
      section.classList.remove('is-pinned');
      track.style.transform = '';
      track.style.willChange = '';
      if (progress) progress.style.width = '';
      current = target = distance = 0;
    }

    function measure() {
      if (!active() && !pinMobile()) { reset(); return; }

      section.classList.add('is-pinned');
      track.style.transform = 'translate3d(0,0,0)';
      /* Vorher war die Reihe ein Querscroller; ein stehengebliebener
         Versatz würde sich sonst zur Verschiebung addieren. */
      viewport.scrollLeft = 0;

      distance = Math.max(0, Math.round(track.getBoundingClientRect().width - viewport.clientWidth));

      if (distance === 0) { reset(); return; }

      /* Scrollweg bewusst kürzer als die horizontale Strecke: bei 1:1
         musste man sehr lange scrollen. Mit 0.55 legt die Reihe pro
         Mausrad-Umdrehung fast doppelt so viel Weg zurück.

         Auf dem Handy fast 1:1 (0.85): dort ist der Daumenweg pro Geste
         kurz, und die Zimmer sollen einzeln vorbeiziehen statt im Rutsch.
         Bei rund 1250 px Reihenbreite ergibt das gut 1,3 Bildschirme
         Scrollweg — genug, dass ein Wisch die Reihe nicht überspringt. */
      var factor = active() ? 0.55 : 0.85;
      section.style.height = (window.innerHeight + distance * factor) + 'px';

      readTarget();
      current = target;
      render();
    }

    function readTarget() {
      var travel = section.offsetHeight - window.innerHeight;
      if (travel <= 0) { target = 0; return; }
      var p = clamp(-section.getBoundingClientRect().top / travel, 0, 1);
      target = p * distance;
    }

    function render() {
      track.style.transform = 'translate3d(' + (-current).toFixed(2) + 'px,0,0)';
      if (progress && distance > 0) {
        progress.style.width = ((current / distance) * 100).toFixed(2) + '%';
      }
    }

    function frame(ts) {
      if (!running) return;

      var dt = lastTs ? Math.min(ts - lastTs, 50) : 16.7;
      lastTs = ts;

      readTarget();

      /* framerate-unabhängige Glättung */
      var k = 1 - Math.pow(1 - 0.22, dt / 16.7);
      current += (target - current) * k;

      if (Math.abs(target - current) < 0.15) current = target;
      render();

      if (visible) {
        requestAnimationFrame(frame);
      } else {
        running = false;
        lastTs = 0;
        track.style.willChange = '';
      }
    }

    function start() {
      if (running || (!active() && !pinMobile()) || distance === 0) return;
      running = true;
      lastTs = 0;
      track.style.willChange = 'transform';
      requestAnimationFrame(frame);
    }

    /* Solange die Reihe angeheftet ist, führt der Guard den Nachlauf des
       Touch-Scrolls durch genau diesen Bereich — sonst wäre die Reihe
       nach einem harten Wisch in einem Rutsch durchgelaufen. */
    scrollGuard.add(function () {
      if (!narrow.matches || !section.classList.contains('is-pinned')) return null;
      var top = section.getBoundingClientRect().top + window.scrollY;
      return { from: top, to: top + section.offsetHeight - window.innerHeight };
    });

    /* Die Schleife läuft ausschließlich, solange die Sektion in Sicht ist. */
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        if (visible) start();
      }, { rootMargin: '20% 0px 20% 0px' }).observe(section);
    } else {
      visible = true;
      start();
    }

    /* Bildmaße können nachträglich eintreffen → neu vermessen */
    window.addEventListener('load', function () { measure(); start(); });
    window.addEventListener('resize', debounce(onViewportChange(function () {
      measure();
      start();
    }), 160));
    if (desktop.addEventListener) desktop.addEventListener('change', measure);
    if (reduced.addEventListener) reduced.addEventListener('change', measure);

    measure();
  }

  /* --- 7 · bookingStub ------------------------------------- */
  /* Auf der Startseite führt die Leiste weiter zur Buchungsseite und nimmt
     die Eingaben als Parameter mit — sonst müsste man Zeitraum und Gäste
     dort ein zweites Mal eintragen. Auf der Buchungsseite selbst bleibt es
     beim Hinweis, solange die Strecke nicht angebunden ist. */
  function initBookingStub() {
    var form = document.querySelector('.bookbar');
    if (!form) return;

    var hint = document.querySelector('[data-booking-hint]');
    var target = form.getAttribute('data-booking-target');

    /* Vorbelegen, wenn Werte aus der Startseite mitkommen. */
    if (!target && window.location.search) {
      var p = new URLSearchParams(window.location.search);
      ['checkin', 'checkout', 'guests', 'room'].forEach(function (name) {
        var v = p.get(name);
        if (!v) return;
        var field = form.querySelector('[name="' + name + '"]');
        if (field) field.value = v;
      });
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      if (target) {
        var q = [];
        ['checkin', 'checkout', 'guests', 'room'].forEach(function (name) {
          var field = form.querySelector('[name="' + name + '"]');
          if (field && field.value) {
            q.push(name + '=' + encodeURIComponent(field.value));
          }
        });
        window.location.href = target + (q.length ? '?' + q.join('&') : '');
        return;
      }

      if (hint) {
        hint.textContent =
          'Danke — die Verfügbarkeitsprüfung wird im nächsten Schritt angebunden.';
      }
    });
  }

  /* --- 7b · heroMotion ------------------------------------- */
  /* Auf schmalen Screens wird der Hero nicht angeheftet, das Video läuft
     dort in Schleife — es gab also keinerlei Scroll-Bewegung. Diese
     Ergänzung koppelt Zoom und Ausblenden an die Scrollposition.

     Bewusst nur transform und opacity: beides läuft auf Mobilgeräten in
     der GPU und bleibt flüssig, anders als Videosprünge. */
  function initHeroMotion() {
    var section = document.querySelector('[data-film]');
    if (!section) return;

    var video = section.querySelector('[data-film-video]');
    var grid = section.querySelector('.hero__grid');
    var foot = section.querySelector('.hero__foot');
    if (!video || !grid) return;

    var running = false;
    var visible = false;

    /* Auf dem Desktop trägt der gescrubbte Film die Bewegung allein —
       dort bleibt dieses Modul stumm, sobald die Bühne angeheftet ist.
       Auf dem Handy ist es umgekehrt: der Film läuft dort nur, die
       sichtbare Bewegung (Zoom, Ausblenden) kommt von hier. */
    function active() {
      if (motionOff()) return false;
      if (section.classList.contains('is-pinned')) return narrow.matches;
      return true;
    }

    function reset() {
      video.style.transform = '';
      grid.style.opacity = '';
      grid.style.transform = '';
      if (foot) foot.style.opacity = '';
    }

    function frame() {
      if (!running) return;

      if (!active()) { reset(); running = false; return; }

      /* Angeheftet zählt nur der Weg, den die Bühne wirklich stehenbleibt.
         Mit der vollen Sektionshöhe käme die Bewegung nie über 60 %. */
      var travel = section.classList.contains('is-pinned')
        ? (section.offsetHeight - window.innerHeight)
        : section.offsetHeight;
      if (travel <= 0) travel = 1;
      var p = clamp(-section.getBoundingClientRect().top / travel, 0, 1);

      /* Auf dem Handy trägt allein diese Bewegung die Sequenz — der Film
         wird dort nicht gescrubbt, sondern läuft. Mit 12 % Zoom über zwei
         Bildschirme Scrollweg sah das aus wie ein Standbild, das nach oben
         rutscht. Deshalb hier deutlich kräftiger: mehr Zoom plus ein
         langsamer Versatz nach oben, der das Bild gegen die Bewegung des
         Schriftzugs laufen lässt. Beides liegt in der GPU. */
      var stark = section.classList.contains('is-pinned') && narrow.matches;
      var zoom  = stark ? 0.26 : 0.12;   // Endmaßstab des Bildes
      var drift = stark ? -7   : 0;      // Prozent der Bildhöhe
      var hub   = stark ? -120 : -56;    // px, um die der Schriftzug steigt

      /* Der Versatz muss innerhalb des Zooms bleiben, sonst käme unter dem
         Bild der Sektionsgrund durch: 26 % Zoom geben 13 % Rand auf jeder
         Seite, davon werden höchstens 9 % gebraucht. */
      video.style.transform =
        'scale(' + (1 + p * zoom).toFixed(4) + ')' +
        (drift ? ' translate3d(0,' + (p * drift).toFixed(2) + '%,0)' : '');

      /* Faktor bewusst nur knapp über 1: mit 1.7 war der Schriftzug schon
         bei halbem Scrollweg verschwunden, das wirkte abrupt. So bleibt er
         bis rund 80 % sichtbar und geht erst zum Ende hin. */
      var o = clamp(1 - p * 1.25, 0, 1);
      grid.style.opacity = o.toFixed(3);
      grid.style.transform = 'translateY(' + (p * hub).toFixed(1) + 'px)';
      if (foot) foot.style.opacity = o.toFixed(3);

      if (visible) requestAnimationFrame(frame);
      else { running = false; }
    }

    function start() {
      /* Wechselt die Breite, während der Hero außer Sicht ist, läuft die
         Schleife nicht mehr und könnte den letzten Zoom-Wert stehen lassen.
         Deshalb hier aufräumen statt nur auszusteigen. */
      if (!active()) { reset(); return; }
      if (running) return;
      running = true;
      requestAnimationFrame(frame);
    }

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        if (visible) start(); else reset();
      }, { rootMargin: '10% 0px 10% 0px' }).observe(section);
    } else {
      visible = true;
      start();
    }

    window.addEventListener('resize', debounce(onViewportChange(function () {
      reset();
      if (visible) start();
    }), 160));
  }

  /* --- 7c · lightbox --------------------------------------- */
  /* Die Galeriekacheln sind auf dem Handy klein. Antippen zeigt das Bild
     gross; blättern per Pfeil, Tastatur oder Wischen. */
  function initLightbox() {
    var items = document.querySelectorAll('.gallery__item img');
    if (!items.length) return;

    var quellen = Array.prototype.map.call(items, function (i) { return i.getAttribute('src'); });
    var index = 0;

    var box = document.createElement('div');
    box.className = 'lightbox';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-label', 'Bild vergrößert');
    box.innerHTML =
      '<img class="lightbox__img" alt="Hotel Gabi Plovdiv">' +
      '<button class="lightbox__btn lightbox__close" type="button" aria-label="Schließen">' +
        '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button>' +
      '<button class="lightbox__btn lightbox__prev" type="button" aria-label="Vorheriges Bild">' +
        '<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg></button>' +
      '<button class="lightbox__btn lightbox__next" type="button" aria-label="Nächstes Bild">' +
        '<svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg></button>' +
      '<span class="lightbox__count"></span>';
    document.body.appendChild(box);

    var bild  = box.querySelector('.lightbox__img');
    var zaehler = box.querySelector('.lightbox__count');

    function zeigen(i) {
      index = (i + quellen.length) % quellen.length;
      bild.src = quellen[index];
      zaehler.textContent = (index + 1) + ' / ' + quellen.length;
    }

    function oeffnen(i) {
      zeigen(i);
      box.classList.add('is-open');
      document.body.classList.add('has-lightbox');
      box.querySelector('.lightbox__close').focus();
    }

    function schliessen() {
      box.classList.remove('is-open');
      document.body.classList.remove('has-lightbox');
    }

    Array.prototype.forEach.call(items, function (img, i) {
      img.parentNode.addEventListener('click', function () { oeffnen(i); });
    });

    box.querySelector('.lightbox__close').addEventListener('click', schliessen);
    box.querySelector('.lightbox__prev').addEventListener('click', function (e) {
      e.stopPropagation(); zeigen(index - 1);
    });
    box.querySelector('.lightbox__next').addEventListener('click', function (e) {
      e.stopPropagation(); zeigen(index + 1);
    });
    /* Klick auf den Hintergrund schließt, Klick aufs Bild nicht. */
    box.addEventListener('click', function (e) { if (e.target === box) schliessen(); });

    document.addEventListener('keydown', function (e) {
      if (!box.classList.contains('is-open')) return;
      if (e.key === 'Escape') schliessen();
      else if (e.key === 'ArrowLeft') zeigen(index - 1);
      else if (e.key === 'ArrowRight') zeigen(index + 1);
    });

    /* Wischen auf dem Handy */
    var startX = null;
    box.addEventListener('touchstart', function (e) {
      startX = e.changedTouches[0].clientX;
    }, { passive: true });
    box.addEventListener('touchend', function (e) {
      if (startX === null) return;
      var dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 45) zeigen(index + (dx < 0 ? 1 : -1));
      startX = null;
    }, { passive: true });
  }

  /* --- 7d · youtube ---------------------------------------- */
  /* Lädt den YouTube-Player erst auf Klick. Vorher liegt nur das
     Vorschaubild auf der Seite — schneller Seitenaufbau, und Besucher,
     die nicht abspielen, bekommen keine Fremd-Cookies gesetzt. */
  function initYoutube() {
    var frames = document.querySelectorAll('[data-youtube]');
    if (!frames.length) return;

    Array.prototype.forEach.call(frames, function (frame) {
      var id = frame.getAttribute('data-youtube');
      var thumb = frame.querySelector('.videoframe__thumb');

      /* Nicht jedes Video hat ein maxres-Vorschaubild. YouTube antwortet
         dann aber NICHT mit einem Fehler, sondern liefert ein graues
         Platzhalterbild in 120×90 — auf volle Breite gezogen sähe das
         aus wie ein Ladefehler. Deshalb wird die Größe geprüft, nicht
         nur auf einen Fehler gewartet. */
      if (thumb) {
        var stufen = ['sddefault', 'hqdefault'];

        function naechsteStufe() {
          var s = stufen.shift();
          if (!s) return;
          thumb.src = 'https://i.ytimg.com/vi/' + id + '/' + s + '.jpg';
        }

        thumb.addEventListener('load', function () {
          if (thumb.naturalWidth > 0 && thumb.naturalWidth <= 120) naechsteStufe();
        });
        thumb.addEventListener('error', naechsteStufe);

        /* Bereits fertig geladen, bevor die Zuhörer hingen? */
        if (thumb.complete && thumb.naturalWidth > 0 && thumb.naturalWidth <= 120) {
          naechsteStufe();
        }
      }

      function laden() {
        if (frame.dataset.loaded) return;
        frame.dataset.loaded = '1';

        var f = document.createElement('iframe');
        /* Läuft von selbst und stumm — Ton nur, wenn der Gast ihn
           einschaltet. mute=1 ist Bedingung dafür, dass Browser das
           Abspielen ohne Zutun überhaupt zulassen.
           loop braucht bei einem Einzelvideo zusätzlich playlist.
           nocookie-Variante hält die Datenspur klein. */
        f.src = 'https://www.youtube-nocookie.com/embed/' + id +
                '?autoplay=1&mute=1&loop=1&playlist=' + id +
                '&playsinline=1&rel=0&modestbranding=1';
        f.title = 'Hotel Gabi Plovdiv — Video';
        f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
        f.allowFullscreen = true;
        f.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');

        frame.innerHTML = '';
        frame.appendChild(f);
        frame.style.cursor = 'default';
      }

      /* Erst laden, wenn der Abschnitt tatsächlich zu sehen ist. So
         startet das Video von selbst, ohne dass YouTube schon beim
         Seitenaufruf kontaktiert wird. */
      if ('IntersectionObserver' in window) {
        var io = new IntersectionObserver(function (entries) {
          if (!entries[0].isIntersecting) return;
          io.disconnect();
          laden();
        }, { threshold: 0.35 });
        io.observe(frame);
      } else {
        laden();
      }

      /* Antippen lädt sofort, falls jemand nicht warten will. */
      frame.addEventListener('click', laden);
      frame.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); laden(); }
      });
    });
  }

  /* --- 8 · langSwitch -------------------------------------- */
  /* Deutsch steht im HTML; Englisch und Bulgarisch kommen aus i18n.js
     und werden über den deutschen Text nachgeschlagen.

     Übersetzt werden Textknoten statt ganzer Elemente: Überschriften wie
     „Mitten in<br>Plovdiv." bestehen aus mehreren Knoten, die einzeln
     ersetzt werden müssen. Die deutsche Ausgangsfassung wird beim ersten
     Lauf gesichert, damit der Rückweg nach DE verlustfrei ist. */
  function initLangSwitch() {
    var opts = document.querySelectorAll('[data-lang]');
    var dicts = window.GABI_I18N || {};

    /* Leerraum normalisieren: &nbsp; wird im DOM zu  , die
       Schlüssel in i18n.js verwenden aber normale Leerzeichen. */
    function norm(s) {
      return s.replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
    }

    /* Alle übersetzbaren Textknoten einsammeln — ohne Skript und Stil. */
    var nodes = [];
    (function collect(el) {
      for (var i = 0; i < el.childNodes.length; i++) {
        var n = el.childNodes[i];
        if (n.nodeType === 3) {
          if (norm(n.nodeValue)) nodes.push({ node: n, de: n.nodeValue });
        } else if (n.nodeType === 1) {
          var tag = n.nodeName;
          if (tag === 'SCRIPT' || tag === 'STYLE') continue;
          /* Der Sprachschalter selbst bleibt immer BG/EN/DE. */
          if (n.classList && n.classList.contains('langswitch')) continue;
          collect(n);
        }
      }
    })(document.body);

    var titleDe = document.title;

    function apply(lang) {
      var dict = dicts[lang] || {};

      nodes.forEach(function (item) {
        if (lang === 'de' && !dict[norm(item.de)]) {
          item.node.nodeValue = item.de;
          return;
        }
        /* Führenden und folgenden Leerraum erhalten — sonst kleben
           Wörter an Nachbar-Elementen wie <strong> fest. */
        var m = item.de.match(/^(\s*)([\s\S]*?)(\s*)$/);
        var t = dict[norm(m[2])];
        item.node.nodeValue = t ? (m[1] + t + m[3]) : item.de;
      });

      document.title = dict[titleDe] || titleDe;
      document.documentElement.lang = lang;

      Array.prototype.forEach.call(opts, function (o) {
        var on = o.getAttribute('data-lang') === lang;
        o.classList.toggle('is-active', on);
        if (on) o.setAttribute('aria-current', 'true');
        else o.removeAttribute('aria-current');
      });
    }

    var stored = null;
    try { stored = localStorage.getItem('gabi-lang'); } catch (err) {}
    if (stored && stored !== 'de') apply(stored);

    Array.prototype.forEach.call(opts, function (o) {
      o.addEventListener('click', function () {
        var lang = o.getAttribute('data-lang');
        apply(lang);
        try { localStorage.setItem('gabi-lang', lang); } catch (err) {}
      });
    });
  }

  /* --- boot ------------------------------------------------ */
  function boot() {
    var y = document.querySelector('[data-year]');
    if (y) y.textContent = new Date().getFullYear();

    initReveal();
    initHeader();
    initSmoothAnchors();
    initFilmScrub();
    initRoomsRail();
    initBookingStub();
    initHeroMotion();
    initLightbox();
    initYoutube();
    initLangSwitch();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
