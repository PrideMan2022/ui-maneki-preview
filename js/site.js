/* Шаблон ЮИ Манэки: меню, панель услуг, вкладки работ, просмотр, отзывы, формы, нижняя панель. */
(function () {
  'use strict';
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* Панель «Услуги» */
  var trig = $('.nav__trigger'), panel = $('#svc-panel'), scrim = $('.nav-scrim'), hoverT = null;
  function setPanel(open) {
    if (!trig || !panel) return;
    panel.hidden = !open;
    if (scrim) scrim.hidden = !open;
    trig.setAttribute('aria-expanded', String(open));
  }
  if (scrim) scrim.addEventListener('click', function () { setPanel(false); });
  if (trig && panel) {
    trig.addEventListener('click', function () { setPanel(panel.hidden); });
    var hdr = $('.hdr');
    if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      [trig, panel].forEach(function (el) {
        el.addEventListener('mouseenter', function () { clearTimeout(hoverT); hoverT = setTimeout(function () { setPanel(true); }, 120); });
        el.addEventListener('mouseleave', function () { clearTimeout(hoverT); hoverT = setTimeout(function () { setPanel(false); }, 260); });
      });
    }
    document.addEventListener('click', function (e) { if (!hdr.contains(e.target)) setPanel(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !panel.hidden) { setPanel(false); trig.focus(); } });
    panel.addEventListener('focusout', function (e) { if (!hdr.contains(e.relatedTarget)) setPanel(false); });
  }

  /* Мобильное меню */
  var menuBtn = $('.hdr__menu'), sheet = $('#sheet');
  function setSheet(open) {
    if (!menuBtn || !sheet) return;
    sheet.hidden = !open;
    menuBtn.setAttribute('aria-expanded', String(open));
    document.documentElement.style.overflow = open ? 'hidden' : '';
    if (open) { var f = $('.sheet__close', sheet); if (f) f.focus(); } else { menuBtn.focus(); }
  }
  if (menuBtn && sheet) {
    menuBtn.addEventListener('click', function () { setSheet(true); });
    $$('.sheet__close', sheet).forEach(function (b) { b.addEventListener('click', function () { setSheet(false); }); });
    sheet.addEventListener('click', function (e) { if (e.target.closest('a[href*="#"]')) setSheet(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !sheet.hidden) setSheet(false); });
  }

  /* Вкладки работ */
  $$('[data-tabs]').forEach(function (list) {
    var tabs = $$('[role="tab"]', list);
    function select(tab, focus) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        var p = document.getElementById(t.getAttribute('aria-controls'));
        if (p) p.hidden = !on;
      });
      if (focus) tab.focus({ preventScroll: true });
    }
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { select(t); });
      t.addEventListener('keydown', function (e) {
        var k = e.key, j = k === 'ArrowRight' ? i + 1 : k === 'ArrowLeft' ? i - 1 : k === 'Home' ? 0 : k === 'End' ? tabs.length - 1 : null;
        if (j === null) return;
        e.preventDefault();
        select(tabs[(j + tabs.length) % tabs.length], true);
      });
    });
  });

  /* Фильтр направлений на странице работ */
  $$('[data-filter]').forEach(function (bar) {
    var btns = $$('button', bar);
    btns.forEach(function (b) {
      b.addEventListener('click', function () {
        var v = b.getAttribute('data-value');
        btns.forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
        $$('[data-dir]').forEach(function (sec) { sec.hidden = v !== 'all' && sec.getAttribute('data-dir') !== v; });
      });
    });
  });

  /* Просмотр фото и видео */
  var lb = $('[data-lb]');
  if (lb) {
    var fig = $('.lb__fig', lb), cap = $('.lb__cap', lb), items = [], idx = 0;
    function show(i) {
      idx = (i + items.length) % items.length;
      var it = items[idx], kind = it.getAttribute('data-kind');
      var media = fig.querySelector('img, video');
      if (media) media.remove();
      var el;
      if (kind === 'video') {
        el = document.createElement('video');
        el.controls = true; el.playsInline = true; el.preload = 'metadata';
        el.poster = it.getAttribute('data-poster') || '';
        el.src = it.getAttribute('data-src');
        if (!reduce) el.autoplay = true;
      } else {
        el = document.createElement('img');
        el.src = it.getAttribute('data-src');
        el.alt = it.getAttribute('data-alt') || '';
      }
      fig.insertBefore(el, cap);
      cap.textContent = it.getAttribute('data-alt') || '';
      $$('.lb__prev, .lb__next', lb).forEach(function (b) { b.hidden = items.length < 2; });
    }
    function close() {
      var v = fig.querySelector('video'); if (v) v.pause();
      if (lb.close) lb.close(); else lb.removeAttribute('open');
    }
    document.addEventListener('click', function (e) {
      var it = e.target.closest('[data-lb-item]');
      if (!it) return;
      var group = it.closest('[data-lb-group]') || document;
      items = $$('[data-lb-item]', group).filter(function (x) { return x.offsetParent !== null; });
      if (lb.showModal) lb.showModal(); else lb.setAttribute('open', '');
      show(items.indexOf(it));
    });
    $('.lb__close', lb).addEventListener('click', close);
    $('.lb__prev', lb).addEventListener('click', function () { show(idx - 1); });
    $('.lb__next', lb).addEventListener('click', function () { show(idx + 1); });
    lb.addEventListener('click', function (e) { if (e.target === lb) close(); });
    lb.addEventListener('close', function () { var v = fig.querySelector('video'); if (v) v.pause(); });
    lb.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') show(idx + 1);
      if (e.key === 'ArrowLeft') show(idx - 1);
    });
  }

  /* Отзывы: показать все */
  $$('[data-more]').forEach(function (btn) {
    var list = document.getElementById(btn.getAttribute('aria-controls'));
    var label = btn.textContent;
    btn.addEventListener('click', function () {
      var open = btn.getAttribute('aria-expanded') !== 'true';
      $$('[data-extra]', list).forEach(function (li) { li.hidden = !open; });
      btn.setAttribute('aria-expanded', String(open));
      btn.textContent = open ? 'Свернуть отзывы' : label;
    });
  });

  /* Нижняя панель прячется, пока открыта клавиатура */
  var dock = $('.dock');
  if (dock) {
    document.addEventListener('focusin', function (e) { if (e.target.matches('input, textarea, select')) dock.classList.add('is-hidden'); });
    document.addEventListener('focusout', function (e) { if (e.target.matches('input, textarea, select')) dock.classList.remove('is-hidden'); });
  }

  /* Ссылка вида brief.html#brief-product-photo открывает нужный бриф */
  function openFromHash() {
    var el = location.hash && document.getElementById(location.hash.slice(1));
    if (el && el.tagName === 'DETAILS') { el.open = true; el.scrollIntoView({ block: 'start' }); }
  }
  openFromHash();
  window.addEventListener('hashchange', openFromHash);

  /* Ролик в первом экране: стартует после загрузки страницы, не мешая первому показу */
  function play(v) {
    v.muted = true; v.preload = 'auto';
    var p = v.play();
    // браузер не дал запустить ролик сам — возвращаем обложку, запустить можно кнопкой
    if (p && p.catch) p.catch(function () { v.preload = 'none'; v.load(); });
  }
  function startVideos() {
    var vids = $$('video[data-autoplay]');
    if (reduce || !vids.length) return;
    if (!('IntersectionObserver' in window)) { vids.forEach(play); return; }
    var vo = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        var v = e.target;
        if (e.isIntersecting) { if (!v.dataset.userPaused) play(v); }
        else {
          if (!v.paused) v.pause();
          // ролик так и не пошёл — показываем обложку, а не первый кадр
          if (v.currentTime < 0.2 && v.readyState > 0) { v.preload = 'none'; v.load(); }
        }
      });
    }, { threshold: 0.25 });
    vids.forEach(function (v) { vo.observe(v); });
  }
  if (document.readyState === 'complete') setTimeout(startVideos, 300); else window.addEventListener('load', function () { setTimeout(startVideos, 300); });

  /* Пауза и запуск ролика в первом экране */
  var ICON_PAUSE = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2.5h3v11H4zM9 2.5h3v11H9z" fill="currentColor"/></svg>';
  var ICON_PLAY = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2.5v11l9-5.5z" fill="currentColor"/></svg>';
  $$('[data-video-toggle]').forEach(function (b) {
    var v = b.parentNode.querySelector('video');
    if (!v) return;
    function sync() {
      var on = !v.paused;
      b.setAttribute('aria-label', on ? 'Остановить ролик' : 'Запустить ролик');
      b.innerHTML = on ? ICON_PAUSE : ICON_PLAY;
    }
    b.addEventListener('click', function () {
      if (v.paused) { delete v.dataset.userPaused; v.muted = true; var p = v.play(); if (p && p.catch) p.catch(function () {}); }
      else { v.dataset.userPaused = '1'; v.pause(); }
    });
    v.addEventListener('play', sync); v.addEventListener('pause', sync);
    sync();
  });

  var io = 'IntersectionObserver' in window;

  /* Обложки роликов грузятся, только когда ролик близко к экрану */
  var lazyPosters = $$('video[data-poster-lazy]');
  function setPoster(v) { v.poster = v.getAttribute('data-poster-lazy'); v.removeAttribute('data-poster-lazy'); }
  if (io) {
    var lpo = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { setPoster(e.target); lpo.unobserve(e.target); } });
    }, { rootMargin: '300px 0px' });
    lazyPosters.forEach(function (v) { lpo.observe(v); });
  } else lazyPosters.forEach(setPoster);

  /* Появление при прокрутке: запускается в простое, видимое на экране не прячется */
  var idle = window.requestIdleCallback || function (f) { return setTimeout(f, 200); };
  if (io && !reduce) idle(function () {
    var items = $$('[data-reveal], .step'), first = true;
    $$('[data-stagger]').forEach(function (g) {
      Array.prototype.forEach.call(g.children, function (c, i) { c.style.setProperty('--d', Math.min(i, 8) * 70 + 'ms'); });
    });
    var ro = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); ro.unobserve(e.target); } });
      if (first) { first = false; document.documentElement.classList.add('js-reveal'); }
    }, { rootMargin: '0px 0px -6% 0px' });
    items.forEach(function (el) { ro.observe(el); });
  });

  /* Счётчики цифр */
  if (io && !reduce) {
    var co = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        co.unobserve(e.target);
        var el = e.target, to = +el.getAttribute('data-count'), t0 = null;
        function step(t) {
          if (!t0) t0 = t;
          var k = Math.min(1, (t - t0) / 1100), v = Math.round(to * (1 - Math.pow(1 - k, 3)));
          el.textContent = v;
          if (k < 1) requestAnimationFrame(step);
        }
        el.textContent = '0';
        requestAnimationFrame(step);
      });
    }, { threshold: 0.6 });
    $$('[data-count]').forEach(function (el) { co.observe(el); });
  }

  /* Анимации замирают вне экрана — экономим батарею и процессор */
  if (io) {
    var po = new IntersectionObserver(function (es) {
      es.forEach(function (e) { e.target.classList.toggle('is-paused', !e.isIntersecting); });
    });
    $$('.hero--field, .night, .ticker, .about__visual, .band').forEach(function (el) { po.observe(el); });
  }

  /* Подсветка за курсором и наклон мозаики — только мышь */
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches && !reduce) {
    var raf = null, last = null;
    document.addEventListener('pointermove', function (e) {
      last = e;
      if (raf) return;
      raf = requestAnimationFrame(function () {
        raf = null;
        var s = last.target.closest && last.target.closest('[data-spot]');
        if (s) { var r = s.getBoundingClientRect(); s.style.setProperty('--mx', (last.clientX - r.left) + 'px'); s.style.setProperty('--my', (last.clientY - r.top) + 'px'); }
      });
    }, { passive: true });
    var hero = $('.hero--field'), mos = $('.mosaic');
    if (hero && mos) {
      hero.addEventListener('pointermove', function (e) {
        var r = hero.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        mos.style.setProperty('--ry', (-5 + x * 8).toFixed(2) + 'deg');
        mos.style.setProperty('--rx', (2 - y * 6).toFixed(2) + 'deg');
      }, { passive: true });
      hero.addEventListener('pointerleave', function () { mos.style.removeProperty('--ry'); mos.style.removeProperty('--rx'); });
    }
  }
})();
