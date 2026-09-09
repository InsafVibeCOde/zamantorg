document.documentElement.classList.add('js');

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const revealables = document.querySelectorAll('[data-reveal]');

if (prefersReducedMotion || !('IntersectionObserver' in window)) {
  revealables.forEach((element) => element.classList.add('is-visible'));
} else {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );

  revealables.forEach((element) => observer.observe(element));
}

/* Шапка: над hero прозрачная, после скролла получает фон и тень-линию */
const header = document.querySelector('.header');

if (header) {
  const setHeaderState = () => {
    header.classList.toggle('is-scrolled', window.scrollY > 24);
  };

  setHeaderState();
  window.addEventListener('scroll', setHeaderState, { passive: true });
}

/* Мобильное меню: бургер открывает/закрывает панель навигации */
const burger = document.querySelector('.header__burger');
const nav = document.querySelector('.nav');

if (burger && nav) {
  const setMenu = (open) => {
    nav.classList.toggle('is-open', open);
    burger.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
  };

  burger.addEventListener('click', () => setMenu(!nav.classList.contains('is-open')));

  nav.addEventListener('click', (event) => {
    if (event.target.closest('.nav__link')) setMenu(false);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') setMenu(false);
  });
}

/* Поиск по каталогу: фильтрует карточки по названию товара */
const searchInput = document.querySelector('.catalog-search__input');

if (searchInput) {
  const searchEmpty = document.querySelector('.catalog-search__empty');
  const categories = Array.from(document.querySelectorAll('.category'));
  const defaultOpen = new Map(categories.map((category) => [category, category.open]));

  /* «задвижка» → «задвижк», «трубы» → «труб»: поиск находит товар
     независимо от числа и падежа слова в запросе */
  const toStem = (word) => {
    if (word.length < 4) {
      return word;
    }
    return word.replace(/[аеёиоуыэюяйьъ]+$/u, '');
  };

  const resetSearch = () => {
    categories.forEach((category) => {
      category.classList.remove('is-hidden');
      category.open = defaultOpen.get(category);
      category.querySelectorAll('.product-card').forEach((card) => {
        card.classList.remove('is-hidden');
      });
    });
    searchEmpty.hidden = true;
  };

  const cardMatches = (card, stems) => {
    const title = card
      .querySelector('.product-card__title')
      .textContent
      .toLowerCase();
    return stems.every((stem) => title.includes(stem));
  };

  searchInput.addEventListener('input', () => {
    const stems = searchInput.value.trim().toLowerCase().split(/\s+/).map(toStem);

    if (!stems[0]) {
      resetSearch();
      return;
    }

    let found = 0;

    categories.forEach((category) => {
      let matches = 0;

      category.querySelectorAll('.product-card').forEach((card) => {
        const hit = cardMatches(card, stems);
        card.classList.toggle('is-hidden', !hit);
        if (hit) matches += 1;
      });

      found += matches;
      category.classList.toggle('is-hidden', matches === 0);
      category.open = matches > 0;
    });

    searchEmpty.hidden = found > 0;
  });
}

/* Наклон карточек каталога за курсором: лёгкий 3D-отклик
   только на устройствах с точным указателем и без reduced-motion */
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

if (finePointer && !prefersReducedMotion) {
  const cards = document.querySelectorAll('.product-card');

  cards.forEach((card) => {
    card.addEventListener('mousemove', (event) => {
      const rect = card.getBoundingClientRect();
      const px = (event.clientX - rect.left) / rect.width - 0.5;
      const py = (event.clientY - rect.top) / rect.height - 0.5;
      card.style.setProperty('--tilt-x', `${(-py * 7).toFixed(2)}deg`);
      card.style.setProperty('--tilt-y', `${(px * 9).toFixed(2)}deg`);
    });

    card.addEventListener('mouseleave', () => {
      card.style.setProperty('--tilt-x', '0deg');
      card.style.setProperty('--tilt-y', '0deg');
    });
  });
}

/* Форма заявки: собираем текст и отправляем выбранным каналом.
   Почта - mailto с готовым письмом; МАКС - копируем текст в буфер
   и открываем чат, чтобы вставить. */
const requestForm = document.querySelector('.request__form');

if (requestForm) {
  const requestNote = requestForm.querySelector('.request__note');
  const REQUEST_EMAIL = 'info@zamantorg.ru';
  const REQUEST_MAX_URL = 'https://max.ru/zamantorg';

  requestForm.addEventListener('submit', (event) => {
    event.preventDefault();

    if (!requestForm.reportValidity()) return;

    const data = new FormData(requestForm);
    const channel = requestForm.querySelector('input[name="channel"]:checked').value;
    const lines = [
      'Заявка с сайта zamantorg.ru',
      'Имя: ' + data.get('name'),
      'Телефон: ' + data.get('phone'),
      'Позиции: ' + (data.get('list') || '-'),
      'Ответить: ' + (channel === 'max' ? 'через МАКС' : 'на почту')
    ];
    const text = lines.join('\n');

    if (channel === 'mail') {
      window.location.href = 'mailto:' + REQUEST_EMAIL +
        '?subject=' + encodeURIComponent('Заявка с сайта') +
        '&body=' + encodeURIComponent(text);
      requestNote.textContent = 'Открываем почту — письмо уже сформировано.';
      return;
    }

    const openMax = () => {
      window.open(REQUEST_MAX_URL, '_blank', 'noopener');
      requestNote.textContent = 'Чат МАКС открыт — текст заявки в буфере, вставьте его и отправьте.';
    };

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(openMax).catch(() => {
        requestNote.textContent = 'Открываем МАКС. Автоматом скопировать не вышло — наберите заявку вручную.';
        window.open(REQUEST_MAX_URL, '_blank', 'noopener');
      });
    } else {
      openMax();
    }
  });
}
