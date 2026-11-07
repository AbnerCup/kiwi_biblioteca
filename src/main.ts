import './style.css';
import { mountScrollWorld } from './scrub-engine.js';

const base = import.meta.env.BASE_URL;
mountScrollWorld(document.querySelector('#world'), {
  brand: { name: 'Kiwi Coorporacion', href: '#inicio', logo: `${base}brand/kiwi-logo.png` },
  hint: 'Desliza para descubrir',
  atmosphere: false,
  crossfade: 0.65,
  sections: [
    {
      id: 'inicio', label: 'Descubre',
      clip: `${base}videos/video_00a87a40.mp4`,
      still: `${base}posters/01.webp`,
      scroll: 2, accent: '#87a843',
      eyebrow: 'Tu próxima lectura empieza aquí',
      title: 'Entra en una nueva historia.',
      body: 'Descubre libros físicos y PDFs. Encuentra tu próxima lectura con Kiwi Coorporacion.',
      tags: ['Libros físicos', 'PDFs'],
    },
    {
      id: 'historias', label: 'Libros',
      still: `${base}posters/02.webp`,
      scroll: 2, accent: '#87a843',
      eyebrow: 'Elige cómo quieres leer',
      title: 'Tu próxima lectura, a tu manera.',
      body: 'Visita nuestro local comercial o consulta por WhatsApp para hacer tu pedido.',
      tags: ['Local comercial', 'Pedidos por WhatsApp'],
    },
  ],
  connectors: [null],
});

const hero = document.querySelector('.sw-copy');
if (hero) {
  const signature = document.createElement('div');
  signature.className = 'kiwi-signature';
  const logo = document.createElement('img');
  logo.src = `${base}brand/kiwi-logo.png`;
  logo.alt = 'Kiwi Coorporacion';
  logo.width = 1536;
  logo.height = 1024;
  signature.appendChild(logo);
  hero.prepend(signature);
}

const catalog = document.querySelectorAll<HTMLElement>('.sw-copy')[1];
if (catalog) {
  catalog.classList.add('kiwi-catalog');
  catalog.id = 'catalogo';
  const samples = [
    { title: 'Orgullo y prejuicio', author: 'Jane Austen', tone: 'sage', genre: 'Novela' },
    { title: 'Don Quijote de la Mancha', author: 'Miguel de Cervantes', tone: 'sand', genre: 'Clásicos' },
    { title: 'La metamorfosis', author: 'Franz Kafka', tone: 'pine', genre: 'Relatos' },
    { title: 'Alicia en el país de las maravillas', author: 'Lewis Carroll', tone: 'rose', genre: 'Fantasía' },
  ];
  catalog.innerHTML = `
    <span class="sw-copy__eyebrow">La estantería de Kiwi</span>
    <h2 class="sw-copy__title">Una historia para cada lector.</h2>
    <p class="sw-copy__body">Descubre tu próxima lectura. Libros físicos y PDFs en un mismo lugar.</p>
    <p class="catalog-note">Selección de ejemplo. Títulos, formatos y disponibilidad por confirmar.</p>
    <div class="book-grid">${samples.map((book, i) => `
      <a class="book-card" href="#libro-${i}">
        <div class="book-cover book-cover--${book.tone}"><span>KIWI · BIBLIOTECA</span><strong>${book.title}</strong><span>${book.author}</span></div>
        <span class="book-genre">${book.genre}</span>
        <h3>${book.title}</h3><p>${book.author}</p>
        <span class="book-link">Ver libro ↗</span>
      </a>`).join('')}</div>
    <a class="catalog-link" href="#seleccion-completa">Explorar la selección ↓</a>`;
  const details = document.createElement('section');
  details.className = 'catalog-details';
  details.id = 'seleccion-completa';
  details.innerHTML = `<span class="sw-copy__eyebrow">Kiwi Coorporacion</span><h2>Explora la selección</h2><p>Estos títulos ilustran el diseño del catálogo. La oferta comercial se incorporará con sus portadas, precios y enlaces de pedido.</p>${samples.map((book, i) => `<article id="libro-${i}"><h3>${book.title}</h3><p>${book.author} · ${book.genre}</p><p>Disponibilidad y formatos por confirmar.</p><a href="#catalogo">Volver a los libros ↑</a></article>`).join('')}`;
  document.querySelector('main')?.appendChild(details);
}
