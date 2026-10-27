#!/usr/bin/env node
// Сборка статического сайта: node build.js → папка dist/
// Тексты и данные лежат в content/, стили и скрипты — в assets/.
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const OUT = path.join(ROOT, 'dist');

// ---------- данные ----------

const rawSite = require('./content/site.js');
const brandify = (v) =>
  typeof v === 'string' ? v.replace(/\{brand\}/g, rawSite.brand)
    : Array.isArray(v) ? v.map(brandify)
      : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, brandify(x)]))
        : v;

const site = brandify(rawSite);
const home = brandify(require('./content/home.js'));
const { categories, products } = brandify(require('./content/products.js'));
const news = brandify(require('./content/news.js')).sort((a, b) => b.date.localeCompare(a.date));
const stores = brandify(require('./content/stores.js'));
const palette = brandify(require('./content/palette.js'));
const privacy = brandify(require('./content/privacy.js'));

const categoryBySlug = new Map(categories.map((c) => [c.slug, c]));
const productBySlug = new Map(products.map((p) => [p.slug, p]));
const cities = [...new Set(stores.list.map((s) => s.city))];

for (const p of products) {
  if (!categoryBySlug.has(p.category)) throw new Error(`Товар «${p.name}»: нет раздела с slug «${p.category}» в products.js`);
}
for (const s of home.hero.slides) {
  if (!productBySlug.has(s.product)) throw new Error(`Слайд «${s.title}»: нет товара с slug «${s.product}» в products.js`);
}

// ---------- утилиты ----------

const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const nl2br = (s = '') => esc(s).replace(/\n/g, '<br>');
const isExternal = (u) => /^(https?:|mailto:|tel:|\/\/)/.test(u);

// Ссылки относительные, чтобы сайт работал из любой папки на хостинге.
function url(ctx, p = '') {
  if (isExternal(p)) return p;
  if (p.startsWith('#')) return (ctx.base || './') + p;
  return ctx.base + p || './';
}

const formatDate = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  const months = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  return `${d} ${months[m - 1]} ${y}`;
};

function shade(hex, amount) {
  const n = parseInt(hex.slice(1), 16);
  const ch = (shift) => {
    const v = (n >> shift) & 255;
    return Math.round(amount < 0 ? v * (1 + amount) : v + (255 - v) * amount);
  };
  return '#' + [16, 8, 0].map((s) => ch(s).toString(16).padStart(2, '0')).join('');
}

// ---------- иконки ----------

const icon = {
  phone: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1z"/></svg>',
  mail: '<svg width="22" height="18" viewBox="0 0 24 20" fill="currentColor" aria-hidden="true"><path d="M2 2h20a2 2 0 0 1 2 2v.3l-12 7.2L0 4.3V4a2 2 0 0 1 2-2Zm-2 4.6 12 7.2 12-7.2V16a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2Z"/></svg>',
  arrow: '<svg width="18" height="12" viewBox="0 0 18 12" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M0 6h16M11 1l5 5-5 5"/></svg>',
  prev: '<svg width="8" height="12" viewBox="0 0 8 12" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M7 1 2 6l5 5"/></svg>',
  next: '<svg width="8" height="12" viewBox="0 0 8 12" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="m1 1 5 5-5 5"/></svg>',
  instagram: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="5.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="17.6" cy="6.4" r="1" fill="currentColor" stroke="none"/></svg>',
  pdf: '<svg width="16" height="18" viewBox="0 0 16 18" aria-hidden="true"><path d="M2 0h8l6 6v10a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2Z" fill="#e8452c"/><text x="8" y="14" font-size="5.5" font-weight="700" fill="#fff" text-anchor="middle" font-family="Arial,sans-serif">PDF</text></svg>',
  close: '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="m2 2 16 16M18 2 2 18"/></svg>',
  burger: '<svg width="26" height="18" viewBox="0 0 26 18" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M0 1h26M0 9h26M0 17h26"/></svg>',
};

// ---------- нарисованная банка (пока нет своих фото) ----------

let svgId = 0;
function bucket({ name, color, kind = 'pail' }) {
  const id = `b${++svgId}`;
  const lid = site.colors.accent;
  const brand = site.brand.toUpperCase();
  // ширина этикетки у ведра и у жестяной банки разная
  const room = kind === 'can' ? 112 : 150;
  const brandSize = Math.min(20, (room - 10) / (brand.length * 0.78)).toFixed(1);
  const nameSize = Math.max(8, Math.min(17, room / (name.length * 0.76))).toFixed(1);
  const font = 'font-family="Montserrat,Arial,sans-serif" text-anchor="middle"';
  const shading = `<linearGradient id="${id}" x1="0" x2="1"><stop offset="0" stop-color="#000" stop-opacity=".14"/><stop offset=".22" stop-color="#000" stop-opacity="0"/><stop offset=".7" stop-color="#fff" stop-opacity=".0"/><stop offset="1" stop-color="#000" stop-opacity=".16"/></linearGradient>`;
  const label = `<text x="120" y="108" ${font} font-size="${brandSize}" font-weight="700" letter-spacing="2" fill="#1d1b16">${esc(brand)}</text>
<text x="120" y="160" ${font} font-size="${nameSize}" font-weight="600" fill="#fff">${esc(name)}</text>`;

  if (kind === 'can') {
    const body = 'M52 58V198Q120 214 188 198V58Z';
    return `<svg class="bucket" viewBox="0 0 240 230" role="img" aria-label="${esc(name)}"><defs>${shading}</defs>
<ellipse cx="120" cy="214" rx="82" ry="8" fill="#000" opacity=".13"/>
<path d="M60 64Q120 -8 180 64" fill="none" stroke="#9c9c9c" stroke-width="2.5"/>
<path d="${body}" fill="#fff"/>
<path d="M52 126V178Q120 192 188 178V126Q120 140 52 126Z" fill="${color}"/>
${label}
<path d="${body}" fill="url(#${id})"/>
<path d="M50 44V62Q120 76 190 62V44Z" fill="${lid}"/>
<ellipse cx="120" cy="44" rx="70" ry="11" fill="${shade(lid, 0.18)}"/>
</svg>`;
  }

  const body = 'M28 62L38 200Q39 210 50 210H190Q201 210 202 200L212 62Z';
  return `<svg class="bucket" viewBox="0 0 240 230" role="img" aria-label="${esc(name)}"><defs>${shading}</defs>
<ellipse cx="120" cy="216" rx="96" ry="9" fill="#000" opacity=".13"/>
<path d="${body}" fill="#fff"/>
<path d="M32.8 128L36.7 182H203.3L207.2 128Z" fill="${color}"/>
${label}
<path d="${body}" fill="url(#${id})"/>
<circle cx="25" cy="80" r="6" fill="${shade(lid, -0.2)}"/><circle cx="215" cy="80" r="6" fill="${shade(lid, -0.2)}"/>
<path d="M20 44H220V62Q220 68 214 68H26Q20 68 20 62Z" fill="${lid}"/>
<path d="M24 45Q120 22 216 45Z" fill="${shade(lid, 0.15)}"/>
<rect x="20" y="58" width="200" height="3" fill="#000" opacity=".1"/>
</svg>`;
}

const productVisual = (ctx, p) => {
  if (p.images && p.images.length) return `<img src="${url(ctx, p.images[0])}" alt="${esc(p.name)}" loading="lazy">`;
  const c = categoryBySlug.get(p.category);
  return bucket({ name: p.name, color: c.color, kind: c.kind });
};

const categoryVisual = (ctx, c) => {
  if (c.image) return `<img src="${url(ctx, c.image)}" alt="${esc(c.name)}" loading="lazy">`;
  const first = products.find((p) => p.category === c.slug);
  if (first && first.images && first.images.length) return productVisual(ctx, first);
  return bucket({ name: first ? first.name : c.name.toUpperCase(), color: c.color, kind: c.kind });
};

// ---------- общие блоки ----------

function logo(ctx, light = false) {
  const file = light ? site.logoLight || site.logo : site.logo;
  const inner = file
    ? `<img src="${url(ctx, file)}" alt="${esc(site.brand)}">`
    : `<span class="logo__sq" aria-hidden="true"></span><span class="logo__text">${esc(site.brand)}</span>`;
  return `<a class="logo${light ? ' logo--light' : ''}" href="${url(ctx, '')}" aria-label="${esc(site.brand)} — на главную">${inner}</a>`;
}

const navLinks = (ctx, items, cls) =>
  items.map(([label, href]) => {
    const active = !href.startsWith('#') && ctx.section && href.startsWith(ctx.section);
    return `<a class="${cls}${active ? ' is-active' : ''}" href="${url(ctx, href)}">${esc(label)}</a>`;
  }).join('');

function header(ctx) {
  return `<header class="header">
  <div class="container">
    <div class="header__top">
      <div class="header__contacts">
        <a class="header__phone" href="tel:${esc(site.phone.tel)}">${icon.phone}<span>${esc(site.phone.display)}</span></a>
        <a class="header__mail" href="mailto:${esc(site.email)}" aria-label="Написать на почту">${icon.mail}</a>
      </div>
      ${logo(ctx)}
      <nav class="header__aux" aria-label="Дополнительное меню">${navLinks(ctx, site.nav.aux, 'nav-link')}</nav>
      <button class="burger" type="button" data-open="menu" aria-label="Открыть меню">${icon.burger}</button>
    </div>
    <nav class="header__nav" aria-label="Главное меню">${navLinks(ctx, site.nav.main, 'nav-link')}</nav>
  </div>
</header>`;
}

function footer(ctx) {
  return `<footer class="footer">
  <div class="container">
    <div class="footer__top">
      <div class="footer__left">
        ${logo(ctx, true)}
        ${site.instagram ? `<a class="social" href="${esc(site.instagram)}" target="_blank" rel="noopener" aria-label="Instagram">${icon.instagram}</a>` : ''}
      </div>
      <a class="footer__phone" href="tel:${esc(site.phone.tel)}">${icon.phone}<span>${esc(site.phone.display)}</span></a>
    </div>
    <div class="footer__bottom">
      <div class="footer__legal">
        <a href="${url(ctx, site.legal.privacy)}">Политика конфиденциальности</a>
        <a href="${url(ctx, site.legal.consent)}">Согласие на обработку данных</a>
      </div>
      <div>© ${new Date().getFullYear()} ${esc(site.brand)}</div>
    </div>
  </div>
</footer>`;
}

function leadForm(ctx, { compact = false } = {}) {
  const hidden = Object.entries(site.form.hidden || {})
    .map(([k, v]) => `<input type="hidden" name="${esc(k)}" value="${esc(v)}">`).join('');
  return `<form class="lead-form" data-lead data-endpoint="${esc(site.form.endpoint)}" data-whatsapp="${esc(site.form.whatsapp)}" data-phone="${esc(site.phone.display)}" novalidate>
  ${hidden}
  <input class="field" type="text" name="name" placeholder="Имя" autocomplete="name" required>
  <input class="field" type="tel" name="phone" placeholder="Телефон" autocomplete="tel" inputmode="tel" required>
  <label class="consent">
    <input type="checkbox" name="consent" required>
    <span>Продолжая использование сайта, вы принимаете условия <a href="${url(ctx, site.legal.privacy)}" target="_blank">Политики конфиденциальности</a> и даёте <a href="${url(ctx, site.legal.consent)}" target="_blank">согласие на обработку своих персональных данных</a>.</span>
  </label>
  <p class="form-error" data-error role="alert"></p>
  <button class="btn" type="submit">${compact ? 'Отправить' : 'Оставить заявку'}</button>
</form>`;
}

function partnerSection(ctx) {
  const p = home.partner;
  return `<section class="section partner-section" id="partner">
  <div class="container partner">
    <div class="partner__text">
      <h2 class="h2">${esc(p.title)}</h2>
      <p class="partner__lead">${esc(p.text)}</p>
      ${leadForm(ctx)}
    </div>
    <div class="partner__media"><img src="${url(ctx, p.image)}" alt="" loading="lazy"></div>
  </div>
</section>`;
}

function modals(ctx) {
  return `<div class="modal" data-modal="success" aria-hidden="true">
  <div class="modal__box" role="dialog" aria-modal="true" aria-labelledby="success-title">
    <button class="modal__close" type="button" data-close aria-label="Закрыть">${icon.close}</button>
    <h3 class="modal__title" id="success-title">Заявка отправлена!</h3>
    <p>Мы свяжемся с вами в ближайшее время.</p>
  </div>
</div>
<div class="modal modal--menu" data-modal="menu" aria-hidden="true">
  <div class="mnav" role="dialog" aria-modal="true" aria-label="Меню">
    <button class="modal__close" type="button" data-close aria-label="Закрыть">${icon.close}</button>
    <nav class="mnav__links">${navLinks(ctx, [...site.nav.main, ...site.nav.aux], 'mnav__link')}</nav>
    <div class="mnav__contacts">
      <a href="tel:${esc(site.phone.tel)}">${icon.phone}<span>${esc(site.phone.display)}</span></a>
      <a href="mailto:${esc(site.email)}">${icon.mail}<span>${esc(site.email)}</span></a>
    </div>
  </div>
</div>`;
}

function layout(ctx, { title, description, body, partner = true }) {
  const vars = Object.entries(site.colors).map(([k, v]) => `--${k}:${v}`).join(';');
  const fullTitle = title ? `${title} — ${site.brand}` : site.title;
  return `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(fullTitle)}</title>
<meta name="description" content="${esc(description || site.description)}">
${site.noindex ? '<meta name="robots" content="noindex, nofollow">\n' : ''}
<meta property="og:title" content="${esc(fullTitle)}">
<meta property="og:description" content="${esc(description || site.description)}">
<meta property="og:type" content="website">
<link rel="icon" href="${url(ctx, 'assets/img/favicon.svg')}" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap">
<link rel="stylesheet" href="${url(ctx, 'assets/css/style.css')}">
<style>:root{${vars}}</style>
</head>
<body>
${header(ctx)}
<main>
${body}
${partner ? partnerSection(ctx) : ''}
</main>
${footer(ctx)}
${modals(ctx)}
<script src="${url(ctx, 'assets/js/main.js')}" defer></script>
</body>
</html>
`;
}

// ---------- карточки ----------

const categoryCard = (ctx, c) => `<a class="pcard" href="${url(ctx, `category/${c.slug}/`)}">
  <h3 class="pcard__title">${esc(c.name)}</h3>
  <p class="pcard__text">${esc(c.short)}</p>
  <div class="pcard__img">${categoryVisual(ctx, c)}</div>
</a>`;

const productCard = (ctx, p) => `<a class="pcard" href="${url(ctx, `product/${p.slug}/`)}">
  <h3 class="pcard__title">${esc(p.name)}</h3>
  <p class="pcard__text">${esc(p.short)}</p>
  <div class="pcard__img">${productVisual(ctx, p)}</div>
</a>`;

const newsImage = (ctx, n, i) => n.image
  ? `<img class="ncard__img" src="${url(ctx, n.image)}" alt="" loading="lazy">`
  : `<div class="ncard__img ncard__img--ph" style="--c1:${categories[i % categories.length].color};--c2:${categories[(i + 2) % categories.length].color}" aria-hidden="true"></div>`;

const newsCard = (ctx, n, i) => `<a class="ncard" href="${url(ctx, `news/${n.slug}/`)}">
  ${newsImage(ctx, n, i)}
  <div class="ncard__body">
    <h3 class="ncard__title">${esc(n.title)}</h3>
    <span class="more">${icon.arrow}Подробнее</span>
  </div>
</a>`;

function storeInfo(s) {
  const lines = [esc(s.address)];
  for (const ph of s.phones || []) lines.push(`<a href="tel:${esc(ph.replace(/[^\d+]/g, ''))}">${esc(ph)}</a>`);
  if (s.site) lines.push(`<a href="https://${esc(s.site.replace(/^https?:\/\//, ''))}" target="_blank" rel="noopener">${esc(s.site)}</a>`);
  if (s.instagram) lines.push(`<a href="https://instagram.com/${esc(s.instagram.replace(/^@/, ''))}" target="_blank" rel="noopener">${esc(s.instagram)}</a>`);
  if (s.hours) lines.push(nl2br(s.hours));
  return `<div class="store">
  <div class="store__name">${esc(s.name)}</div>
  <div class="store__info">${lines.join('<br>')}</div>
</div>`;
}

const sliderHead = (title, dark = false) => `<div class="slider-head">
  <h2 class="h2">${esc(title)}</h2>
  <div class="arrows${dark ? ' arrows--dark' : ''}">
    <button class="arrow" type="button" data-prev aria-label="Назад">${icon.prev}</button>
    <button class="arrow" type="button" data-next aria-label="Вперёд">${icon.next}</button>
  </div>
</div>`;

const mapFrame = (title) => `<iframe class="map" src="${esc(site.mapEmbed)}" title="${esc(title)}" loading="lazy" allowfullscreen></iframe>`;

// ---------- страницы ----------

function homePage(ctx) {
  const h = home.hero;
  const slides = h.slides.map((s, i) => {
    const p = productBySlug.get(s.product);
    return `<a class="hero__slide${i === 0 ? ' is-active' : ''}" href="${url(ctx, `product/${p.slug}/`)}" style="--slide-color:${s.color}" data-slide>
      <h2 class="hero__title">${esc(s.title)}</h2>
      <div class="hero__product">${productVisual(ctx, p)}</div>
      <div class="hero__name">${esc(p.name)}</div>
    </a>`;
  }).join('');
  const dots = h.slides.map((s, i) => `<button class="hero__dot${i === 0 ? ' is-active' : ''}" type="button" data-dot="${i}" aria-label="Слайд ${i + 1}"></button>`).join('');

  const split = (id, block, extra = '') => `<section class="section" id="${id}">
  <div class="container">
    <div class="split">
      <div class="split__text">
        <h2 class="h2">${esc(block.title)}</h2>
        ${block.paragraphs.map((t) => `<p>${esc(t)}</p>`).join('')}
        ${extra}
      </div>
      <div class="split__media"><img src="${url(ctx, block.image)}" alt="" loading="lazy"></div>
    </div>
  </div>
</section>`;

  const badge = `<div class="badge"><span class="logo__sq logo__sq--lg" aria-hidden="true"></span><span>${nl2br(home.service.badge)}</span></div>`;
  const featured = cities.slice(0, 2).map((c) => {
    const s = stores.list.find((x) => x.city === c);
    return `<div><h3 class="store__city">${esc(c)}</h3>${storeInfo(s)}</div>`;
  }).join('');

  return {
    body: `<section class="hero" data-hero>
  <div class="hero__media" style="background-image:url('${url(ctx, h.image)}')">
    <div class="hero__brand">${esc(site.brand)}</div>
    <p class="hero__tagline">${nl2br(h.tagline)}</p>
  </div>
  <div class="hero__slides">${slides}<div class="hero__dots">${dots}</div></div>
</section>
${split('about', home.about)}
<section class="section section--tight" id="products">
  <div class="container">
    <h2 class="h2 h2--center">Наша продукция</h2>
    <div class="cards">${categories.slice(0, 6).map((c) => categoryCard(ctx, c)).join('')}</div>
    <div class="center"><a class="btn" href="${url(ctx, 'catalog/')}">Каталог продукции</a></div>
  </div>
</section>
${split('service', home.service, badge)}
<section class="slate">
  <div class="section"><div class="container" data-slider>
    ${sliderHead('Новости')}
    <div class="track" data-track>${news.map((n, i) => newsCard(ctx, n, i)).join('')}</div>
  </div></div>
  <div class="section section--top0"><div class="container">
    <h2 class="h2 h2--center">Точки продаж</h2>
    <div class="stores-card">
      <div class="stores-card__list">
        <div class="store-cols">${featured}</div>
        <div class="stores-card__foot">
          <a class="more" href="${url(ctx, 'points-of-sale/')}">${icon.arrow}Смотреть ещё</a>
          <a class="btn" href="#partner">Стать партнёром</a>
        </div>
      </div>
      <div class="stores-card__map">${mapFrame('Карта точек продаж')}</div>
    </div>
  </div></div>
</section>`,
  };
}

function catalogPage(ctx) {
  return {
    title: 'Продукция',
    description: `Каталог продукции ${site.brand}: ${categories.map((c) => c.name.toLowerCase()).join(', ')}.`,
    body: `<section class="section section--page">
  <div class="container">
    <h1 class="h2 h2--center">Продукция</h1>
    <div class="cards">${categories.map((c) => categoryCard(ctx, c)).join('')}</div>
  </div>
</section>`,
  };
}

function categoryPage(ctx, c) {
  const items = products.filter((p) => p.category === c.slug);
  return {
    title: c.name,
    description: c.short,
    body: `<section class="section section--page">
  <div class="container">
    <div class="page-head">
      <h1 class="h2">${esc(c.name)}</h1>
      <a class="back" href="${url(ctx, 'catalog/')}">Вернуться в каталог</a>
    </div>
    <div class="cards">${items.map((p) => productCard(ctx, p)).join('') || '<p>Скоро здесь появятся товары.</p>'}</div>
  </div>
</section>`,
  };
}

function productPage(ctx, p) {
  const c = categoryBySlug.get(p.category);
  const specs = (p.specs || []).map(([label, value]) => `<div class="specs__row"><dt>${esc(label)}</dt><dd>${
    Array.isArray(value) ? `<ul class="dash">${value.map((v) => `<li>${esc(v)}</li>`).join('')}</ul>` : `<p>${esc(value)}</p>`
  }</dd></div>`).join('');
  const table = p.table && p.table.length
    ? `<table class="ptable"><tbody>${p.table.map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join('')}</tbody></table>`
    : '';
  const images = p.images || [];
  const gallery = images.length > 1
    ? `<div class="gallery" data-gallery>
        <div class="gallery__main" data-main><img src="${url(ctx, images[0])}" alt="${esc(p.name)}"></div>
        <div class="gallery__thumbs">${images.map((src, i) => `<button class="thumb${i === 0 ? ' is-active' : ''}" type="button" data-thumb="${url(ctx, src)}"><img src="${url(ctx, src)}" alt=""></button>`).join('')}</div>
      </div>`
    : `<div class="gallery"><div class="gallery__main">${productVisual(ctx, p)}</div></div>`;
  const docs = (p.docs || []).length
    ? `<div class="docs">${p.docs.map((d) => `<a class="doc" href="${url(ctx, d.url)}" target="_blank" rel="noopener">${icon.pdf}<span>${esc(d.title)}</span></a>`).join('')}</div>`
    : '';
  const related = [...products.filter((x) => x.category === p.category && x !== p), ...products.filter((x) => x.category !== p.category)].slice(0, 8);

  return {
    title: p.name,
    description: p.lead,
    body: `<section class="section section--page">
  <div class="container">
    <a class="crumb" href="${url(ctx, `category/${c.slug}/`)}">Вернуться в раздел: ${esc(c.name)}</a>
    <article class="product">
      <div class="product__info">
        <h1 class="product__title">${esc(p.name)}</h1>
        <p class="product__lead">${esc(p.lead)}</p>
        ${specs ? `<dl class="specs">${specs}</dl>` : ''}
        ${table}
      </div>
      <div class="product__side">${gallery}${docs}</div>
    </article>
  </div>
  <div class="container related" data-slider>
    ${sliderHead('Ещё может подойти', true)}
    <div class="track track--small" data-track>${related.map((r) => `<a class="mini" href="${url(ctx, `product/${r.slug}/`)}"><div class="mini__img">${productVisual(ctx, r)}</div><div class="mini__name">${esc(r.name)}</div></a>`).join('')}</div>
  </div>
</section>`,
  };
}

function newsListPage(ctx) {
  return {
    title: 'Новости',
    body: `<section class="section section--page">
  <div class="container">
    <h1 class="h2 h2--center">Новости</h1>
    <div class="news-grid">${news.map((n, i) => newsCard(ctx, n, i)).join('')}</div>
  </div>
</section>`,
  };
}

function newsPage(ctx, n, i) {
  return {
    title: n.title,
    description: n.body[0],
    body: `<section class="section section--page">
  <div class="container">
    <a class="crumb" href="${url(ctx, 'news/')}">Все новости</a>
    <article class="article">
      <time class="article__date" datetime="${esc(n.date)}">${formatDate(n.date)}</time>
      <h1>${esc(n.title)}</h1>
      ${newsImage(ctx, n, i).replace('ncard__img', 'article__img')}
      ${n.body.map((t) => `<p>${esc(t)}</p>`).join('')}
    </article>
  </div>
</section>`,
  };
}

function storesPage(ctx) {
  const count = (c) => stores.list.filter((s) => s.city === c).length;
  const chips = [`<button class="chip is-active" type="button" data-city="all">Все города <span>${stores.list.length}</span></button>`,
    ...cities.map((c) => `<button class="chip" type="button" data-city="${esc(c)}">${esc(c)} <span>${count(c)}</span></button>`)].join('');
  const blocks = cities.map((c) => `<section class="city-block" data-city-block="${esc(c)}">
    <h2 class="store__city">${esc(c)}</h2>
    <div class="store-grid">${stores.list.filter((s) => s.city === c).map(storeInfo).join('')}</div>
  </section>`).join('');
  return {
    title: 'Точки продаж',
    description: stores.intro,
    body: `<section class="section section--page">
  <div class="container">
    <div class="page-head">
      <h1 class="h2">Точки продаж</h1>
      <p class="page-head__text">${esc(stores.intro)}</p>
      <a class="btn" href="#partner">Стать партнёром</a>
    </div>
    <div class="cities" data-cities>${chips}</div>
    <div class="pos-map">${mapFrame('Карта точек продаж')}</div>
    ${blocks}
  </div>
</section>`,
  };
}

function palettePage(ctx) {
  const tabs = palette.groups.map((g, i) => `<button class="ptab${i === 0 ? ' is-active' : ''}" type="button" data-tab="${esc(g.key)}">${esc(g.title)}</button>`).join('');
  const panels = palette.groups.map((g, i) => `<div class="swatches" data-panel="${esc(g.key)}"${i === 0 ? '' : ' hidden'}>${
    g.colors.map(([name, hex, code]) => `<button class="swatch" type="button" data-name="${esc(name)}" data-hex="${esc(hex)}"${code ? ` data-code="${esc(code)}"` : ''}><span class="swatch__color" style="background:${esc(hex)}"></span><span class="swatch__name">${esc(name)}</span></button>`).join('')
  }</div>`).join('');
  const first = palette.groups[0].colors[0];
  return {
    title: 'Палитра',
    description: 'Палитра цветов для интерьера и фасада.',
    body: `<section class="section section--page">
  <div class="container">
    <h1 class="h2 h2--center">Палитра</h1>
    <div class="palette">
      <aside class="ptabs" data-tabs>${tabs}</aside>
      <div class="swatches-card">
        <div class="swatch-preview" data-preview>
          <span class="swatch-preview__color" style="background:${esc(first[1])}"></span>
          <div><div class="swatch-preview__name">${esc(first[0])}</div><div class="swatch-preview__hex">${esc(first[2] || first[1])}</div></div>
        </div>
        ${panels}
        <p class="palette__note">${esc(palette.note)}</p>
      </div>
    </div>
  </div>
</section>`,
  };
}

function privacyPage() {
  return {
    title: privacy.title,
    partner: false,
    body: `<section class="section section--page">
  <div class="container">
    <article class="article">
      <h1>${esc(privacy.title)}</h1>
      ${privacy.sections.map((s) => `<h2${s.id ? ` id="${esc(s.id)}"` : ''}>${esc(s.title)}</h2>${s.text.map((t) => `<p>${esc(t)}</p>`).join('')}`).join('')}
    </article>
  </div>
</section>`,
  };
}

function notFoundPage(ctx) {
  return {
    title: 'Страница не найдена',
    partner: false,
    body: `<section class="section section--page">
  <div class="container page-head">
    <h1 class="h2">Страница не найдена</h1>
    <p class="page-head__text">Возможно, она была удалена или адрес набран с ошибкой.</p>
    <a class="btn" href="${url(ctx, '')}">На главную</a>
  </div>
</section>`,
  };
}

// ---------- сборка ----------

const routes = [];
// При публикации через GitHub Actions адрес сайта приходит в SITE_URL.
const siteUrl = (process.env.SITE_URL || site.url).replace(/\/$/, '');

function page(route, section, render, { file = 'index.html', base } = {}) {
  const depth = route.split('/').filter(Boolean).length;
  const ctx = { route, section, base: base !== undefined ? base : '../'.repeat(depth) };
  const html = layout(ctx, render(ctx));
  const dir = path.join(OUT, route);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, file), html);
  if (file === 'index.html') routes.push(route);
}

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
fs.cpSync(path.join(ROOT, 'assets'), path.join(OUT, 'assets'), { recursive: true });

page('', '', homePage);
page('catalog/', 'catalog/', catalogPage);
for (const c of categories) page(`category/${c.slug}/`, 'catalog/', (ctx) => categoryPage(ctx, c));
for (const p of products) page(`product/${p.slug}/`, 'catalog/', (ctx) => productPage(ctx, p));
page('news/', 'news/', newsListPage);
news.forEach((n, i) => page(`news/${n.slug}/`, 'news/', (ctx) => newsPage(ctx, n, i)));
page('points-of-sale/', 'points-of-sale/', storesPage);
page('palette/', 'palette/', palettePage);
page('privacy/', 'privacy/', privacyPage);
// 404 открывается по любому адресу, поэтому ссылки в нём от корня сайта
// (с учётом подпапки, например /company-site/ на GitHub Pages).
page('', '', notFoundPage, { file: '404.html', base: new URL(`${siteUrl}/`).pathname });

fs.writeFileSync(path.join(OUT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes.map((r) => `  <url><loc>${esc(`${siteUrl}/${r}`)}</loc></url>`).join('\n')}
</urlset>
`);
fs.writeFileSync(path.join(OUT, 'robots.txt'), site.noindex
  ? 'User-agent: *\nDisallow: /\n'
  : `User-agent: *\nAllow: /\nSitemap: ${siteUrl}/sitemap.xml\n`);

console.log(`Готово: ${routes.length} страниц в папке dist/`);
