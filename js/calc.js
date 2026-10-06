/* Калькулятор ЮИ Манэки. Цены — из реестра content.json и прайса tariffs.html (вставляет build.py). */
(function (root) {
  'use strict';

  var P = {"tg": "https://t.me/Irinaaaaaaak", "product": {"kadr": 500, "minOrder": 1000, "minQty": 2, "maxQty": 40, "packages": {"5": 2300, "10": 4500, "15": 6600, "20": 8500}, "extraEdit": 250}, "people": {"kadr": [400, 450, 500], "minOrder": 800, "minQty": 2, "maxQty": 40, "packages": {"10": [2500, 3000, 3500], "15": [3000, 3750, 4500], "20": [3600, 4600, 5600]}, "extra": [120, 150, 170]}, "info": {"tz": 550, "key": 700, "photo": 300, "video": 1200, "maxQty": 20, "packs": {"6": {"name": "Оптимальный", "tz": 5900, "tzOld": 6800, "key": 6700, "keyOld": 7700}, "10": {"name": "Расширенный", "tz": 6700, "tzOld": 7500, "key": 10000, "keyOld": 11300}}}, "video": {"roll": 6500, "anim": 1200, "maxQty": 10}};
  var NB = ' ';

  function fmt(n) {
    return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, NB) + NB + '₽';
  }
  function plural(n, forms) {
    var a = Math.abs(n) % 100, b = a % 10;
    if (a > 10 && a < 20) return forms[2];
    if (b > 1 && b < 5) return forms[1];
    if (b === 1) return forms[0];
    return forms[2];
  }
  function clamp(v, lo, hi) {
    v = parseInt(v, 10);
    if (isNaN(v)) v = lo;
    return Math.min(hi, Math.max(lo, v));
  }
  var KADR = ['кадр', 'кадра', 'кадров'];
  var SLIDE = ['слайд', 'слайда', 'слайдов'];

  function product(s) {
    var c = P.product, q = clamp(s.qty, c.minQty, c.maxQty), one = s.mode !== 'many';
    var piece = q * c.kadr;
    var rate = q >= 20 ? 0.10 : (q >= 10 ? 0.05 : 0);
    var pieceTotal = Math.round(piece * (1 - rate));
    var r = { lines: [], prefix: '', time: q <= 20 ? '1–3 дня' : 'больше 20 кадров отдаём партиями, срок обсудим', tip: null };
    var pack = one ? c.packages[q] : null;
    if (pack) {
      r.total = pack;
      r.lines.push(['Пакет на один товар, ' + q + ' ' + plural(q, KADR), fmt(pack)]);
      if (pieceTotal > pack) r.lines.push([rate ? 'Поштучно со скидкой вышло бы' : 'Поштучно вышло бы', fmt(pieceTotal), 'muted']);
    } else {
      r.total = pieceTotal;
      r.lines.push([q + ' × ' + fmt(c.kadr), fmt(piece)]);
      if (rate) r.lines.push(['Скидка ' + Math.round(rate * 100) + ' % от ' + (q >= 20 ? 20 : 10) + ' кадров', '−' + fmt(piece - pieceTotal), 'minus']);
      if (one) {
        var sizes = Object.keys(c.packages).map(Number).sort(function (a, b) { return a - b; });
        for (var i = 0; i < sizes.length; i++) {
          var p = sizes[i];
          if (p >= q && c.packages[p] <= r.total) {
            r.tip = 'За ' + fmt(c.packages[p]) + ' — пакет на ' + p + ' ' + plural(p, KADR) + ' одного товара' + (p > q ? ', это на ' + (p - q) + ' ' + plural(p - q, KADR) + ' больше.' : '.');
            break;
          }
        }
      }
    }
    if (q > 20 && !r.tip) r.tip = 'От 20 кадров считаем индивидуально и делим работу на партии: первые карточки получите раньше.';
    r.note = 'В цену входят до 3 предметов в кадре и круг правок по ТЗ. Дополнительная правка — ' + fmt(c.extraEdit) + '.' +
      (rate && !pack ? ' Вместо скидки можно взять ' + (q >= 20 ? '2 кадра' : '1 кадр') + ' в подарок.' : '') +
      (pack ? ' Скидки на пакеты не действуют.' : '');
    r.summary = 'ИИ-фото товара, ' + q + ' ' + plural(q, KADR) + ', ' + (one ? 'один товар' : 'разные товары') + ' — ' + fmt(r.total);
    r.service = 'product';
    return r;
  }

  function people(s) {
    var c = P.people, q = clamp(s.qty, c.minQty, c.maxQty), n = clamp(s.persons, 1, 3), i = n - 1;
    var rate = c.kadr[i], extra = c.extra[i];
    var r = { lines: [], prefix: '', time: '1–3 дня', tip: null };
    var sizes = Object.keys(c.packages).map(Number).sort(function (a, b) { return a - b; });
    if (q >= sizes[0]) {
      var best = null;
      sizes.forEach(function (p) {
        if (p <= q) best = { p: p, cost: c.packages[p][i] + (q - p) * extra };
      });
      r.total = best.cost;
      r.lines.push(['Пакет на ' + best.p + ' ' + plural(best.p, KADR), fmt(c.packages[best.p][i])]);
      if (q > best.p) r.lines.push(['Ещё ' + (q - best.p) + ' × ' + fmt(extra), fmt((q - best.p) * extra)]);
      r.lines.push(['Поштучно вышло бы', fmt(q * rate), 'muted']);
      sizes.forEach(function (p) {
        if (!r.tip && p > q && c.packages[p][i] <= r.total) r.tip = 'За ' + fmt(c.packages[p][i]) + ' — пакет на ' + p + ' ' + plural(p, KADR) + '.';
      });
    } else {
      r.total = Math.max(q * rate, c.minOrder);
      r.lines.push([q + ' × ' + fmt(rate), fmt(q * rate)]);
      var p0 = sizes[0];
      if (c.packages[p0][i] <= r.total) r.tip = 'За ' + fmt(c.packages[p0][i]) + ' — пакет на ' + p0 + ' ' + plural(p0, KADR) + '.';
    }
    if (n > 1) r.lines.unshift(['Людей в кадре', String(n)]);
    r.note = 'На 10 кадров нужны 3–5 исходных фото, на 15 — 7–8, на 20 — 9–10. Круг правок по заданию включён.';
    r.summary = 'ИИ-фотосессия, ' + q + ' ' + plural(q, KADR) + ', людей в кадре: ' + n + ' — ' + fmt(r.total);
    r.service = 'people';
    return r;
  }

  function info(s) {
    var c = P.info, q = clamp(s.qty, 1, c.maxQty), key = s.mode === 'key';
    var label = key ? 'под ключ' : 'по ТЗ';
    var r = { lines: [], prefix: '', time: '', tip: null, packaged: false };
    var pk = c.packs[q];
    if (pk) {
      r.packaged = true;
      r.total = key ? pk.key : pk.tz;
      r.lines.push(['Пакет «' + pk.name + '», ' + q + ' ' + plural(q, SLIDE) + ' ' + label, fmt(r.total)]);
      r.lines.push(['Те же работы без пакета', fmt(key ? pk.keyOld : pk.tzOld), 'muted']);
      r.note = 'В пакет уже входят нейрофото для слайдов, оживление главной обложки и 2 нейрофото в подарок. 3 круга правок включены.';
    } else {
      var per = key ? c.key : c.tz;
      r.total = q * per;
      r.lines.push([q + ' × ' + fmt(per) + ', ' + label, fmt(q * per)]);
      if (s.photo) { r.total += q * c.photo; r.lines.push(['Нейрофото на ' + q + ' ' + plural(q, SLIDE) + ' × ' + fmt(c.photo), fmt(q * c.photo)]); }
      if (s.cover) { r.total += c.video; r.lines.push(['Видеообложка', fmt(c.video)]); }
      Object.keys(c.packs).map(Number).sort(function (a, b) { return a - b; }).forEach(function (p) {
        var price = key ? c.packs[p].key : c.packs[p].tz;
        if (!r.tip && p >= q && price <= r.total) r.tip = 'За ' + fmt(price) + ' — пакет «' + c.packs[p].name + '»: ' + p + ' ' + plural(p, SLIDE) + ', нейрофото и оживлённая обложка.';
      });
      r.note = '3 круга правок включены. Если концепция меняется больше чем на 50 %, это считается новым слайдом.';
    }
    r.summary = 'Инфографика, ' + q + ' ' + plural(q, SLIDE) + ' ' + label + (!r.packaged && s.photo ? ', нейрофото' : '') + (!r.packaged && s.cover ? ', видеообложка' : '') + ' — ' + fmt(r.total);
    r.service = 'info';
    return r;
  }

  function video(s) {
    var c = P.video, r = { lines: [], prefix: 'от ', tip: null };
    if (s.kind === 'roll') {
      r.total = c.roll;
      r.lines.push(['Ролик от 30 секунд', 'от ' + fmt(c.roll)]);
      r.time = 'от 3 дней';
      r.note = 'Точную сумму назовём после согласования концепции: она зависит от числа сцен и генераций. Включены 2 круга правок.';
      r.summary = 'Нейровидео, ролик от 30 секунд — от ' + fmt(c.roll);
    } else {
      var q = clamp(s.qty, 1, c.maxQty);
      r.total = q * c.anim;
      r.lines.push(['Оживление ' + q + ' ' + plural(q, KADR) + ' до 5 секунд × ' + fmt(c.anim), fmt(r.total)]);
      r.time = 'обычно 1–2 дня';
      r.note = 'Самый недорогой вход в видео: сразу видно, реагирует ли аудитория на движение.';
      r.summary = 'Оживление ' + q + ' ' + plural(q, KADR) + ' до 5 секунд — от ' + fmt(r.total);
      if (q >= 6 && c.roll <= r.total) r.tip = 'За ' + fmt(c.roll) + ' можно сделать полноценный ролик от 30 секунд.';
    }
    r.service = 'video';
    return r;
  }

  function quote(s) {
    var r = s.svc === 'people' ? people(s) : s.svc === 'info' ? info(s) : s.svc === 'video' ? video(s) : product(s);
    r.totalText = r.prefix + fmt(r.total);
    r.prepay = r.prefix ? 'Предоплата 50 % — после согласования концепции' : 'Предоплата 50 % — ' + fmt(r.total / 2);
    r.meta = r.prepay + (r.time ? ' · Срок: ' + r.time : '');
    r.tg = P.tg + '?text=' + encodeURIComponent('Здравствуйте! Расчёт с сайта: ' + r.summary + '. Хочу обсудить заказ.');
    return r;
  }

  var api = { quote: quote, fmt: fmt, plural: plural, prices: P };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.UIM_CALC = api;

  if (typeof document === 'undefined') return;

  function esc(t) { return String(t).replace(/[&<>"]/g, function (ch) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]; }); }

  function bind(box) {
    var form = box.querySelector('[data-calc-form]');
    var out = {
      lines: box.querySelector('[data-r-lines]'), total: box.querySelector('[data-r-total]'),
      meta: box.querySelector('[data-r-meta]'), tip: box.querySelector('[data-r-tip]'),
      note: box.querySelector('[data-r-note]'), tg: box.querySelector('[data-r-tg]'), lead: box.querySelector('[data-r-lead]')
    };
    var last = null;
    function val(name) { var el = form.querySelector('[name="' + name + '"]:checked'); return el ? el.value : null; }
    function num(id) { var el = form.querySelector('#' + id); return el ? el.value : 0; }
    function state() {
      var svc = val('svc') || 'product';
      if (svc === 'people') return { svc: svc, qty: num('c-l-qty'), persons: val('l-persons') };
      if (svc === 'info') return { svc: svc, qty: +(val('i-pack') || 6), mode: val('i-mode') };
      if (svc === 'video') return { svc: svc, kind: val('v-kind'), qty: num('c-v-qty') };
      return { svc: svc, qty: num('c-p-qty'), mode: val('p-mode') };
    }
    function syncUi(s) {
      box.querySelectorAll('[data-group]').forEach(function (g) { g.hidden = g.getAttribute('data-group') !== s.svc; });
      box.querySelectorAll('.stepper').forEach(function (st) {
        var inp = st.querySelector('input'), lo = +inp.min, hi = +inp.max, v = clamp(inp.value, lo, hi);
        st.querySelector('[data-step="-1"]').disabled = v <= lo;
        st.querySelector('[data-step="1"]').disabled = v >= hi;
      });
      box.querySelectorAll('.quick').forEach(function (qk) {
        var inp = form.querySelector('#' + qk.getAttribute('data-for'));
        qk.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-set') === String(clamp(inp.value, +inp.min, +inp.max)))); });
      });
      var vq = box.querySelector('[data-video-qty]');
      if (vq) vq.hidden = s.svc !== 'video' || s.kind === 'roll';
    }
    function render() {
      var s = state();
      syncUi(s);
      var r = quote(s);
      last = r;
      out.lines.innerHTML = r.lines.map(function (l) {
        return '<li' + (l[2] ? ' class="' + l[2] + '"' : '') + '><span>' + esc(l[0]) + '</span><span>' + esc(l[1]) + '</span></li>';
      }).join('');
      if (out.total.textContent !== r.totalText) {
        out.total.textContent = r.totalText;
        out.total.classList.remove('is-bump'); void out.total.offsetWidth; out.total.classList.add('is-bump');
      }
      out.meta.textContent = r.meta;
      out.tip.hidden = !r.tip;
      out.tip.textContent = r.tip || '';
      out.note.textContent = r.note;
      out.tg.href = r.tg;
    }
    form.addEventListener('input', render);
    form.addEventListener('change', function (e) {
      var t = e.target;
      if (t.type === 'number') t.value = clamp(t.value, +t.min, +t.max);
      render();
    });
    form.addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (!b) return;
      if (b.hasAttribute('data-step')) {
        var inp = b.parentNode.querySelector('input');
        inp.value = clamp(+inp.value + (+b.getAttribute('data-step')), +inp.min, +inp.max);
        render();
      } else if (b.hasAttribute('data-set')) {
        var target = form.querySelector('#' + b.parentNode.getAttribute('data-for'));
        target.value = b.getAttribute('data-set');
        render();
      }
    });
    form.addEventListener('submit', function (e) { e.preventDefault(); });
    if (out.lead) out.lead.addEventListener('click', function (e) {
      var lead = document.querySelector('form[data-ajax-form="lead"]');
      if (!lead || !last) return;
      e.preventDefault();
      var msg = lead.querySelector('textarea[name="task"], textarea');
      if (msg) msg.value = 'Расчёт с сайта: ' + last.summary + '.';
      lead.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
      var nm = lead.querySelector('input[name="name"]');
      if (nm) setTimeout(function () { nm.focus({ preventScroll: true }); }, 350);
    });
    render();
  }

  function init() { document.querySelectorAll('[data-calc]').forEach(bind); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})(typeof window !== 'undefined' ? window : globalThis);
