(function () {
  'use strict';

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  // ---------- модальные окна и мобильное меню ----------

  var lastFocus = null;

  function openModal(name) {
    var modal = $('[data-modal="' + name + '"]');
    if (!modal) return;
    lastFocus = document.activeElement;
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('no-scroll');
    var close = $('[data-close]', modal);
    if (close) close.focus();
  }

  function closeModal(modal) {
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('no-scroll');
    if (lastFocus) lastFocus.focus();
  }

  document.addEventListener('click', function (e) {
    var opener = e.target.closest('[data-open]');
    if (opener) return openModal(opener.getAttribute('data-open'));
    var modal = e.target.closest('.modal');
    if (!modal) return;
    // клик по фону, крестику или пункту меню закрывает окно
    if (e.target === modal || e.target.closest('[data-close]') || e.target.closest('.mnav__link')) closeModal(modal);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    var open = $('.modal.is-open');
    if (open) closeModal(open);
  });

  // ---------- слайдер на первом экране ----------

  var hero = $('[data-hero]');
  if (hero) {
    var slides = $$('[data-slide]', hero);
    var dots = $$('[data-dot]', hero);
    var current = 0;
    var timer = null;

    var show = function (i) {
      current = (i + slides.length) % slides.length;
      slides.forEach(function (s, n) { s.classList.toggle('is-active', n === current); });
      dots.forEach(function (d, n) { d.classList.toggle('is-active', n === current); });
    };
    var play = function () {
      stop();
      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) timer = setInterval(function () { show(current + 1); }, 6000);
    };
    var stop = function () { clearInterval(timer); };

    dots.forEach(function (d) {
      d.addEventListener('click', function () { show(+d.getAttribute('data-dot')); play(); });
    });
    hero.addEventListener('mouseenter', stop);
    hero.addEventListener('mouseleave', play);

    var startX = null;
    hero.addEventListener('touchstart', function (e) { startX = e.touches[0].clientX; }, { passive: true });
    hero.addEventListener('touchend', function (e) {
      if (startX === null) return;
      var dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 40) { show(current + (dx < 0 ? 1 : -1)); play(); }
      startX = null;
    });
    play();
  }

  // ---------- горизонтальные ленты (новости, похожие товары) ----------

  $$('[data-slider]').forEach(function (root) {
    var track = $('[data-track]', root);
    var prev = $('[data-prev]', root);
    var next = $('[data-next]', root);
    if (!track || !prev || !next) return;

    var step = function () {
      var item = track.firstElementChild;
      if (!item) return track.clientWidth;
      var gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      return item.getBoundingClientRect().width + gap;
    };
    var update = function () {
      prev.disabled = track.scrollLeft <= 2;
      next.disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 2;
    };
    prev.addEventListener('click', function () { track.scrollBy({ left: -step(), behavior: 'smooth' }); });
    next.addEventListener('click', function () { track.scrollBy({ left: step(), behavior: 'smooth' }); });
    track.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
  });

  // ---------- галерея товара ----------

  $$('[data-gallery]').forEach(function (g) {
    var main = $('[data-main] img', g);
    $$('[data-thumb]', g).forEach(function (t) {
      t.addEventListener('click', function () {
        main.src = t.getAttribute('data-thumb');
        $$('[data-thumb]', g).forEach(function (x) { x.classList.toggle('is-active', x === t); });
      });
    });
  });

  // ---------- палитра ----------

  var tabs = $('[data-tabs]');
  if (tabs) {
    var preview = $('[data-preview]');
    var setPreview = function (sw) {
      $('.swatch-preview__color', preview).style.background = sw.getAttribute('data-hex');
      $('.swatch-preview__name', preview).textContent = sw.getAttribute('data-name');
      $('.swatch-preview__hex', preview).textContent = sw.getAttribute('data-code') || sw.getAttribute('data-hex');
      $$('.swatch.is-active').forEach(function (x) { x.classList.remove('is-active'); });
      sw.classList.add('is-active');
    };

    $$('[data-tab]', tabs).forEach(function (tab) {
      tab.addEventListener('click', function () {
        var key = tab.getAttribute('data-tab');
        $$('[data-tab]', tabs).forEach(function (t) { t.classList.toggle('is-active', t === tab); });
        $$('[data-panel]').forEach(function (p) { p.hidden = p.getAttribute('data-panel') !== key; });
        var first = $('[data-panel="' + key + '"] .swatch');
        if (first) setPreview(first);
      });
    });
    $$('.swatch').forEach(function (sw) {
      sw.addEventListener('click', function () { setPreview(sw); });
    });
    var firstSwatch = $('.swatch');
    if (firstSwatch) firstSwatch.classList.add('is-active');
  }

  // ---------- фильтр городов ----------

  var citiesBar = $('[data-cities]');
  if (citiesBar) {
    $$('[data-city]', citiesBar).forEach(function (chip) {
      chip.addEventListener('click', function () {
        var city = chip.getAttribute('data-city');
        $$('[data-city]', citiesBar).forEach(function (c) { c.classList.toggle('is-active', c === chip); });
        $$('[data-city-block]').forEach(function (b) {
          b.hidden = city !== 'all' && b.getAttribute('data-city-block') !== city;
        });
      });
    });
  }

  // ---------- формы заявок ----------

  $$('form[data-lead]').forEach(function (form) {
    var error = $('[data-error]', form);
    var button = $('button[type="submit"]', form);
    var name = form.elements.name;
    var phone = form.elements.phone;
    var consent = form.elements.consent;

    phone.addEventListener('input', function () {
      phone.value = phone.value.replace(/[^\d+()\-\s]/g, '');
    });
    [name, phone].forEach(function (f) {
      f.addEventListener('input', function () { f.classList.remove('is-error'); });
    });
    consent.addEventListener('change', function () { consent.closest('.consent').classList.remove('is-error'); });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      error.textContent = '';

      var digits = phone.value.replace(/\D/g, '');
      var bad = [];
      if (!name.value.trim()) bad.push(name);
      if (digits.length < 10) bad.push(phone);
      bad.forEach(function (f) { f.classList.add('is-error'); });
      if (!consent.checked) consent.closest('.consent').classList.add('is-error');
      if (bad.length || !consent.checked) {
        error.textContent = bad.length ? 'Заполните отмеченные поля' : 'Подтвердите согласие на обработку данных';
        return;
      }

      var endpoint = form.getAttribute('data-endpoint');
      var whatsapp = form.getAttribute('data-whatsapp');
      var done = function () {
        form.reset();
        openModal('success');
      };

      if (endpoint) {
        var data = new FormData(form);
        data.append('page', location.href);
        button.disabled = true;
        fetch(endpoint, { method: 'POST', body: data, headers: { Accept: 'application/json' } })
          .then(function (r) { if (!r.ok) throw new Error(r.status); done(); })
          .catch(function () {
            error.textContent = 'Не удалось отправить заявку. Позвоните нам: ' + form.getAttribute('data-phone');
          })
          .then(function () { button.disabled = false; });
      } else if (whatsapp) {
        var text = 'Заявка с сайта\nИмя: ' + name.value.trim() + '\nТелефон: ' + phone.value.trim();
        window.open('https://wa.me/' + whatsapp + '?text=' + encodeURIComponent(text), '_blank', 'noopener');
        done();
      } else {
        error.textContent = 'Форма ещё не подключена: укажите form.endpoint или form.whatsapp в content/site.js';
      }
    });
  });
})();
