// Основные данные компании.
// После правок пересоберите сайт: node build.js
// В любом тексте на сайте можно писать {brand} — подставится название компании.

module.exports = {
  brand: 'BRAND', // название компании: логотип, заголовки, подвал

  // Логотип: путь к файлу (svg/png), например 'assets/img/logo.svg'.
  // Пусто — будет текстовый логотип из названия.
  logo: '',
  logoLight: '', // светлая версия для тёмного подвала (если пусто — берётся logo)

  title: '{brand} — краски и лакокрасочные материалы', // заголовок главной во вкладке браузера
  description: 'Фасадные и интерьерные краски, грунтовки, эмали и лаки {brand}. Точки продаж по Казахстану.',
  url: 'https://example.kz', // адрес сайта после публикации (нужен для sitemap.xml)
  noindex: true, // пока сайт — макет, поисковики его не индексируют. Перед запуском поставьте false

  phone: { display: '+7 700 000 00 00', tel: '+77000000000' },
  email: 'info@example.kz',
  instagram: 'https://instagram.com/',

  // Цвета оформления. accent — фирменный цвет (крышки банок, ссылки-акценты).
  colors: {
    accent: '#e0805e',
    bg: '#e4dfdb', // фон страниц
    dark: '#13120e', // подвал
    slate: '#717e8f', // фон блока «Новости / Точки продаж»
    icon: '#1aa3e0', // иконки телефона, почты, стрелок
  },

  nav: {
    main: [
      ['Продукция', 'catalog/'],
      ['О нас', '#about'],
      ['Сервис', '#service'],
      ['Палитра', 'palette/'],
    ],
    aux: [
      ['Новости', 'news/'],
      ['Точки продаж', 'points-of-sale/'],
    ],
  },

  // Карта точек продаж. Создайте карту с метками в конструкторе Яндекс Карт
  // (https://yandex.ru/map-constructor/), выберите «Получить код → iframe»
  // и вставьте сюда адрес из src="...".
  mapEmbed: 'https://yandex.kz/map-widget/v1/?ll=68.0%2C48.2&z=4',

  // Куда отправлять заявки из форм. Заполните ОДИН из вариантов:
  form: {
    // 1) Сервис форм: Formspree (https://formspree.io) или Web3Forms (https://web3forms.com).
    //    endpoint: 'https://formspree.io/f/xxxxxxx'
    //    Для Web3Forms: endpoint: 'https://api.web3forms.com/submit', hidden: { access_key: 'ваш-ключ' }
    endpoint: '',
    hidden: {},
    // 2) WhatsApp: номер без плюса, например '77000000000' — заявка откроется в WhatsApp.
    whatsapp: '',
  },

  legal: {
    privacy: 'privacy/', // политика конфиденциальности (можно указать ссылку на PDF)
    consent: 'privacy/#consent', // согласие на обработку данных
  },
};
