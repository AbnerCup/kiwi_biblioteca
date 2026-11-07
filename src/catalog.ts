export type Book = {
  id: string; title: string; author: string; description: string; category: string;
  format: string; price: string; currency: string; available: boolean;
  published: boolean; featured: boolean; cover: string;
};
export const siteRoot = new URL(location.pathname.includes('/admin/') ? '../' : './', location.href);
export const escape = (value: string) => value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
export const coverURL = (book: Book) => new URL(book.cover, siteRoot).href;
export const priceLabel = (book: Book) => book.price === '' ? 'Consultar precio' : `${book.currency} ${Number(book.price).toFixed(2)}`;
export async function api<T>(action: string, data?: FormData, csrf?: string): Promise<T> {
  const response = await fetch(new URL(`api/index.php?action=${action}`, siteRoot), {
    method: data ? 'POST' : 'GET', credentials: 'same-origin',
    headers: csrf ? { 'X-CSRF-Token': csrf } : {}, body: data, cache: 'no-store',
  });
  const result = await response.json().catch(() => { throw new Error('No se pudo conectar con el catálogo. Inténtalo de nuevo más tarde.'); });
  if (!response.ok) throw new Error(result.error || 'No se pudo completar la operación.');
  return result;
}
export function coverMarkup(book: Book) {
  return book.cover ? `<img class="real-cover" src="${escape(coverURL(book))}" alt="Portada de ${escape(book.title)}" loading="lazy" width="300" height="400">` : `<div class="book-cover book-cover--sage"><span>KIWI · BIBLIOTECA</span><strong>${escape(book.title)}</strong><span>${escape(book.author)}</span></div>`;
}
function card(book: Book) {
  return `<button type="button" class="book-card" data-book="${escape(book.id)}">${coverMarkup(book)}<span class="book-genre">${escape(book.category)} · ${escape(book.format)}</span><h3>${escape(book.title)}</h3><p>${escape(book.author)}</p><span class="book-link">${escape(priceLabel(book))}</span><span class="book-genre">${book.available ? 'Ver libro ↗' : 'No disponible'}</span></button>`;
}
export async function mountCatalog(teaser: HTMLElement, section: HTMLElement) {
  const load = async () => {
    teaser.innerHTML = '<p role="status">Cargando libros…</p>';
    section.innerHTML = '<div class="loading-shelf" role="status" aria-label="Cargando catálogo"></div>';
    try {
      const { books, whatsapp } = await api<{ books: Book[]; whatsapp: string }>('books');
      const featured = books.filter(book => book.featured);
      teaser.innerHTML = books.length ? (featured.length ? featured : books).slice(0, 4).map(card).join('') : '<p>Estamos preparando nuestra selección de libros. Vuelve pronto para descubrirla.</p>';
      section.innerHTML = `<span class="sw-copy__eyebrow">La biblioteca de Kiwi</span><h2>Encuentra tu próxima lectura</h2><p>Explora los títulos disponibles y consulta por WhatsApp para hacer tu pedido.</p><div class="catalog-filters"><label>Buscar por título o autor<input id="book-search" type="search" placeholder="Escribe un título o un autor"></label><label>Categoría<select id="book-category"><option value="">Todas las categorías</option>${[...new Set(books.map(b => b.category))].sort().map(c => `<option>${escape(c)}</option>`).join('')}</select></label></div><p id="result-count" role="status"></p><div class="book-grid" id="full-catalog"></div>`;
      const grid = section.querySelector<HTMLElement>('#full-catalog')!;
      const search = section.querySelector<HTMLInputElement>('#book-search')!;
      const category = section.querySelector<HTMLSelectElement>('#book-category')!;
      const filter = () => {
        const query = search.value.trim().toLocaleLowerCase('es');
        const filtered = books.filter(b => `${b.title} ${b.author}`.toLocaleLowerCase('es').includes(query) && (!category.value || b.category === category.value));
        section.querySelector('#result-count')!.textContent = `${filtered.length} ${filtered.length === 1 ? 'libro' : 'libros'}`;
        grid.innerHTML = filtered.length ? filtered.map(card).join('') : '<p>No hay libros que coincidan con tu búsqueda.</p>';
      };
      search.addEventListener('input', filter); category.addEventListener('change', filter); filter();
      const dialog = document.createElement('dialog');
      dialog.className = 'book-dialog';
      document.body.append(dialog);
      dialog.addEventListener('click', event => { if (event.target === dialog || (event.target as HTMLElement).closest('[data-close]')) dialog.close(); });
      const showBook = (event: Event) => {
        const target = (event.target as HTMLElement).closest<HTMLElement>('[data-book]');
        const book = books.find(b => b.id === target?.dataset.book);
        if (!book) return;
        const message = encodeURIComponent(`Hola, me interesa el libro «${book.title}», de ${book.author}, en formato ${book.format}. ¿Me confirman el precio y la disponibilidad?`);
        dialog.innerHTML = `<button class="button secondary dialog-close" data-close aria-label="Cerrar ficha">Cerrar</button><div class="book-detail">${coverMarkup(book)}<div><p>${escape(book.category)} · ${escape(book.format)}</p><h2 id="book-dialog-title">${escape(book.title)}</h2><p>${escape(book.author)}</p><p class="book-description">${escape(book.description || 'Consulta para conocer más sobre este título.')}</p><p><strong>${escape(priceLabel(book))}</strong></p>${book.available && whatsapp ? `<a class="button" href="https://wa.me/${escape(whatsapp)}?text=${message}" target="_blank" rel="noopener noreferrer">Consultar por WhatsApp</a>` : `<p>${book.available ? 'El contacto para pedidos estará disponible próximamente.' : 'Este libro no está disponible por el momento.'}</p>`}</div></div>`;
        dialog.setAttribute('aria-labelledby', 'book-dialog-title'); dialog.showModal();
      };
      teaser.addEventListener('click', showBook); section.addEventListener('click', showBook);
    } catch (error) {
      teaser.innerHTML = '<p>La selección estará disponible próximamente.</p>';
      section.innerHTML = `<h2>Catálogo</h2><p role="status">${escape((error as Error).message)}</p><button class="button" id="retry-catalog">Volver a intentar</button>`;
      section.querySelector('#retry-catalog')!.addEventListener('click', () => void load());
    }
  };
  await load();
}
