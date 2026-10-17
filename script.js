/* ============================================================
   ASET EDITKU — script.js
   Isi: boot screen, waveform, reveal on-scroll, slot number
   animation, filter + search, timecode, custom cursor.
   Nggak perlu diubah kalau cuma mau ganti link/nama aset.
   ============================================================ */

(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  var pad = function (n) { return String(n).padStart(2, '0'); };

  /* ---------------- boot screen ---------------- */

  var boot = document.getElementById('boot');
  var bootNum = document.getElementById('bootNum');
  var bootBar = document.getElementById('bootBar');
  var bootTotal = document.querySelectorAll('.card').length || 54;

  function endBoot() {
    if (!boot) return;
    boot.classList.add('is-done');
    document.body.classList.remove('is-booting');
    setTimeout(function () { if (boot.parentNode) boot.parentNode.removeChild(boot); }, 700);
  }

  if (reduce || !boot) {
    if (boot) boot.parentNode.removeChild(boot);
  } else {
    document.body.classList.add('is-booting');
    var b0 = performance.now();
    (function bootTick(now) {
      var p = Math.min(1, (now - b0) / 850);
      bootNum.textContent = pad(Math.round(p * bootTotal));
      bootBar.style.width = (p * 100) + '%';
      if (p < 1) requestAnimationFrame(bootTick);
      else setTimeout(endBoot, 130);
    })(b0);
  }

  /* ---------------- waveform hero ---------------- */

  var wave = document.getElementById('wave');
  if (wave && !reduce) {
    for (var w = 0; w < 26; w++) {
      var bar = document.createElement('i');
      bar.style.setProperty('--h', (16 + Math.random() * 84).toFixed(0) + '%');
      bar.style.setProperty('--d', (Math.random() * 0.9).toFixed(2) + 's');
      bar.style.setProperty('--s', (0.7 + Math.random() * 0.9).toFixed(2) + 's');
      wave.appendChild(bar);
    }
  }

  /* ---------------- cards ---------------- */

  var grid = document.getElementById('grid');
  var cards = Array.prototype.slice.call(grid.querySelectorAll('.card'));
  var countEl = document.getElementById('count');
  var emptyEl = document.getElementById('empty');
  var input = document.getElementById('q');
  var chips = Array.prototype.slice.call(document.querySelectorAll('.chip'));

  cards.forEach(function (card, i) {
    card.dataset.i = i;
    var slot = card.querySelector('.idx');
    slot.dataset.final = slot.textContent;
  });

  function slotRoll(el) {
    var final = el.dataset.final;
    if (reduce) { el.textContent = final; return; }
    var t0 = performance.now();
    (function roll(now) {
      if (now - t0 >= 400) { el.textContent = final; return; }
      el.textContent = pad(Math.floor(Math.random() * 99) + 1);
      requestAnimationFrame(roll);
    })(t0);
  }

  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var card = entry.target;
        var i = Number(card.dataset.i || 0);
        card.style.transitionDelay = Math.min(i * 20, 420) + 'ms';
        card.classList.add('is-in');
        io.unobserve(card);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });

    cards.forEach(function (card) { io.observe(card); });

    grid.addEventListener('transitionend', function (e) {
      if (e.propertyName === 'opacity' && e.target.classList.contains('card')) {
        e.target.style.transitionDelay = '0ms';
        var slot = e.target.querySelector('.idx');
        if (!slot.dataset.rolled) { slot.dataset.rolled = '1'; slotRoll(slot); }
      }
    });
  } else {
    cards.forEach(function (card) { card.classList.add('is-in'); });
  }

  /* ---------------- filter + search ---------------- */

  var activeCat = 'all';
  var keyword = '';
  var shownCount = cards.length;

  function animateCount(to) {
    var from = shownCount;
    shownCount = to;
    if (reduce) { countEl.textContent = to; return; }
    var t0 = performance.now();
    (function tick(now) {
      var p = Math.min(1, (now - t0) / 260);
      countEl.textContent = Math.round(from + (to - from) * p);
      if (p < 1) requestAnimationFrame(tick);
    })(t0);
  }

  function restagger() {
    if (reduce) return;
    var j = 0;
    cards.forEach(function (card) {
      if (card.classList.contains('is-hidden')) return;
      card.classList.remove('is-in');
      card.style.transitionDelay = Math.min(j * 14, 260) + 'ms';
      void card.offsetWidth;
      requestAnimationFrame(function () { card.classList.add('is-in'); });
      j++;
    });
  }

  function apply() {
    var shown = 0;
    cards.forEach(function (card) {
      var name = (card.dataset.name || '') + ' ' + card.querySelector('h3').textContent;
      var catOk = activeCat === 'all' || card.dataset.cat === activeCat;
      var keyOk = keyword === '' || name.toLowerCase().indexOf(keyword) !== -1;
      var visible = catOk && keyOk;
      card.classList.toggle('is-hidden', !visible);
      if (visible) shown++;
    });
    animateCount(shown);
    emptyEl.hidden = shown !== 0;
    restagger();
  }

  chips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      chips.forEach(function (c) { c.classList.remove('is-on'); });
      chip.classList.add('is-on');
      activeCat = chip.dataset.cat;
      apply();
    });
  });

  var t;
  input.addEventListener('input', function () {
    clearTimeout(t);
    t = setTimeout(function () {
      keyword = input.value.trim().toLowerCase();
      apply();
    }, 110);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === '/' && document.activeElement !== input) {
      e.preventDefault();
      input.focus();
    }
    if (e.key === 'Escape' && document.activeElement === input) input.blur();
  });

  /* ---------------- cursor ---------------- */

  var ring = document.getElementById('curRing');
  var dot = document.getElementById('curDot');
  var cursorOn = fine && !reduce && ring && dot;
  var cx = window.innerWidth / 2, cy = window.innerHeight / 2;
  var tx = cx, ty = cy;

  if (cursorOn) {
    document.body.classList.add('cursor-on');
    window.addEventListener('mousemove', function (e) {
      tx = e.clientX;
      ty = e.clientY;
    });
    document.addEventListener('mouseover', function (e) {
      var hot = e.target.closest('.card, .btn, .chip, .brand, button, a');
      ring.classList.toggle('is-big', !!hot);
    });
  }

  /* ---------------- loop: progress, topbar, timecode ---------------- */

  var progressBar = document.getElementById('progressBar');
  var timecode = document.getElementById('timecode');
  var topbar = document.querySelector('.topbar');
  var heroTitle = document.getElementById('heroTitle');
  var lastY = window.scrollY;
  var tcPrev = '';
  var yearPrev = 0;

  function frame(now) {
    var y = window.scrollY;
    var max = document.documentElement.scrollHeight - window.innerHeight;

    if (progressBar) progressBar.style.width = (max > 0 ? (y / max) * 100 : 0) + '%';

    if (topbar) {
      if (y > lastY + 4 && y > 160) topbar.classList.add('is-down');
      else if (y < lastY - 4) topbar.classList.remove('is-down');
    }
    lastY = y;

    if (timecode) {
      var f = Math.floor((now / 1000) * 24);
      var tc = pad(Math.floor(f / 86400) % 24) + ':' + pad(Math.floor(f / 1440) % 60) + ':' +
               pad(Math.floor(f / 24) % 60) + ':' + pad(f % 24);
      if (tc !== tcPrev) { timecode.textContent = tc; tcPrev = tc; }
    }

    if (heroTitle && y < window.innerHeight) {
      var year = 1979 + Math.round(Math.min(1, y / Math.max(1, window.innerHeight)) * 71);
      if (year !== yearPrev) {
        yearPrev = year;
        heroTitle.style.fontVariationSettings = '"YEAR" ' + year;
      }
    }

    if (cursorOn) {
      cx += (tx - cx) * 0.18;
      cy += (ty - cy) * 0.18;
      var px = cx.toFixed(1) + 'px', py = cy.toFixed(1) + 'px';
      ring.style.setProperty('--x', px);
      ring.style.setProperty('--y', py);
      dot.style.setProperty('--x', px);
      dot.style.setProperty('--y', py);
    }

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
})();
