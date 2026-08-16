/* ============================================================
   HOTEL GABI — Interaktion
   Ohne externe Bibliotheken. Bewusst wenige, ruhige Effekte.

   Module:
     1. utils          — Helfer
     2. reveal         — Eintritts-Animationen (IntersectionObserver)
     3. header         — Zustand beim Scrollen
     4. smoothAnchors  — geglättete Sprünge zu Ankern
     5. filmScrub      — vertikales Scrollen → Videozeit
     6. roomsRail      — vertikales Scrollen → horizontale Bewegung
     7. bookingStub    — Platzhalter-Verhalten, Logik folgt später
     8. langSwitch     — Sprachwahl merken (Übersetzung folgt)
   ============================================================ */
(function () {
  'use strict';

  /* --- 1 · utils ------------------------------------------- */
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  var desktop = window.matchMedia('(min-width: 860px)');

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
    }
    ['wheel', 'touchstart', 'keydown'].forEach(function (evt) {
      window.addEventListener(evt, stop, { passive: true });
    });

    function scrollTo(targetY, duration) {
      stop();
      var startY = window.scrollY;
      var delta = targetY - startY;
      var t0 = null;

      function step(ts) {
        if (t0 === null) t0 = ts;
        var p = clamp((ts - t0) / duration, 0, 1);
        window.scrollTo(0, startY + delta * easeInOutCubic(p));
        if (p < 1) animId = requestAnimationFrame(step);
        else animId = null;
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

     Auf schmalen Screens ist Scrubbing unzuverlässig (mobile Browser
     rendern Frames beim Seeken oft nicht). Dort läuft das Video schlicht
     stumm in Schleife — gleiche Bildsprache, kein Risiko.               */
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

    var duration = 0;
    var distance = 0;
    var currentT = 0;    // gerenderte Zeitmarke
    var targetT = 0;     // aus dem Scroll abgeleitete Zeitmarke
    var running = false;
    var visible = false;
    var lastTs = 0;

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

    function loopMode() {
      /* Mobil / reduzierte Bewegung: kein Scrubbing. */
      section.classList.remove('is-pinned');
      section.style.height = '';
      if (progress) progress.style.width = '';

      if (motionOff()) { video.pause(); return; }

      video.loop = true;
      video.muted = true;
      var p = video.play();
      if (p && p.catch) p.catch(function () { /* Autoplay blockiert — Poster bleibt */ });
    }

    function measure() {
      if (!duration) return;

      if (!active()) { loopMode(); return; }

      video.loop = false;
      video.pause();

      distance = Math.round(duration * PX_PER_SECOND);
      section.classList.add('is-pinned');
      section.style.height = (window.innerHeight + distance) + 'px';

      readTarget();
      currentT = targetT;
      requestSeek(currentT);
      render();
    }

    function readTarget() {
      var travel = section.offsetHeight - window.innerHeight;
      if (travel <= 0) { targetT = 0; return; }
      var p = clamp(-section.getBoundingClientRect().top / travel, 0, 1);
      targetT = p * duration;
    }

    /* Der Laufbalken hängt an der Scrollposition, nicht am Decoder —
       sonst friert er mit ein, sobald ein Sprung länger dauert. */
    function render() {
      if (progress && duration > 0) {
        progress.style.width = ((clamp(currentT, 0, duration) / duration) * 100).toFixed(2) + '%';
      }
    }

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
      if (visible) start();
    }

    if (video.readyState >= 1) onMeta();
    else video.addEventListener('loadedmetadata', onMeta, { once: true });

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        if (visible) start();
      }, { rootMargin: '20% 0px 20% 0px' }).observe(section);
    } else {
      visible = true;
      start();
    }

    window.addEventListener('resize', debounce(measure, 160));
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

    function reset() {
      section.style.height = '';
      section.classList.remove('is-pinned');
      track.style.transform = '';
      track.style.willChange = '';
      if (progress) progress.style.width = '';
      current = target = distance = 0;
    }

    function measure() {
      if (!active()) { reset(); return; }

      section.classList.add('is-pinned');
      track.style.transform = 'translate3d(0,0,0)';

      distance = Math.max(0, Math.round(track.getBoundingClientRect().width - viewport.clientWidth));

      if (distance === 0) { reset(); return; }

      /* Scrollweg bewusst kürzer als die horizontale Strecke: bei 1:1
         musste man sehr lange scrollen. Mit 0.55 legt die Reihe pro
         Mausrad-Umdrehung fast doppelt so viel Weg zurück. */
      section.style.height = (window.innerHeight + distance * 0.55) + 'px';

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
      if (running || !active()) return;
      running = true;
      lastTs = 0;
      track.style.willChange = 'transform';
      requestAnimationFrame(frame);
    }

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
    window.addEventListener('load', measure);
    window.addEventListener('resize', debounce(measure, 160));
    if (desktop.addEventListener) desktop.addEventListener('change', measure);
    if (reduced.addEventListener) reduced.addEventListener('change', measure);

    measure();
  }

  /* --- 7 · bookingStub ------------------------------------- */
  function initBookingStub() {
    var form = document.querySelector('.bookbar');
    var hint = document.querySelector('[data-booking-hint]');
    if (!form) return;

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (hint) {
        hint.textContent =
          'Danke — die Verfügbarkeitsprüfung wird im nächsten Schritt angebunden.';
      }
    });
  }

  /* --- 8 · langSwitch -------------------------------------- */
  /* Merkt sich die Sprachwahl und markiert sie. Die Übersetzung selbst
     ist noch nicht angebunden — deshalb wird hier bewusst kein Text
     ausgetauscht und nichts vorgetäuscht. */
  function initLangSwitch() {
    var opts = document.querySelectorAll('[data-lang]');
    if (!opts.length) return;

    var stored = null;
    try { stored = localStorage.getItem('gabi-lang'); } catch (err) {}

    function apply(lang) {
      Array.prototype.forEach.call(opts, function (o) {
        var on = o.getAttribute('data-lang') === lang;
        o.classList.toggle('is-active', on);
        if (on) o.setAttribute('aria-current', 'true');
        else o.removeAttribute('aria-current');
      });
    }

    if (stored) apply(stored);

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
    initLangSwitch();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
