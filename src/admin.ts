import './style.css';
import { api, escape, coverMarkup, priceLabel, type Book } from './catalog';

const app = document.querySelector<HTMLElement>('#admin-app')!;
let csrf = '';
let books: Book[] = [];
let whatsapp = '';
const message = (text: string, error = false) => {
  const status = app.querySelector<HTMLElement>('#admin-status')!;
  status.textContent = text; status.classList.toggle('is-error', error);
};
async function submit(form: HTMLFormElement, action: string, then: (result: { csrf?: string }) => Promise<void>) {
  if (!form.reportValidity()) return;
  const buttons = form.querySelectorAll<HTMLButtonElement>('button');
  buttons.forEach(b => b.disabled = true);
  message('Guardando…');
  try { const result = await api<{ csrf?: string }>(action, new FormData(form), csrf); await then(result); }
  catch (error) { message((error as Error).message, true); }
  finally { buttons.forEach(b => b.disabled = false); }
}
async function start() {
  try {
    const session = await api<{ authenticated: boolean; setupRequired: boolean; csrf: string }>('session');
    csrf = session.csrf;
    if (session.authenticated) return dashboard();
    app.innerHTML = `<section class="admin-login panel"><p class="eyebrow">Tu biblioteca, a tu ritmo</p><h1>${session.setupRequired ? 'Crea la cuenta del dueño' : 'Entra a tu biblioteca'}</h1><p>${session.setupRequired ? 'Usa el código de instalación entregado por tu desarrollador. Solo se puede crear una cuenta.' : 'Publica libros, actualiza portadas y organiza tu catálogo.'}</p><form id="login-form">${session.setupRequired ? '<label>Código de instalación<input name="setup_token" type="password" required autocomplete="off"></label>' : ''}<label>Correo<input name="email" type="email" required maxlength="254" autocomplete="username"></label><label>Contraseña<input name="password" type="password" required ${session.setupRequired ? 'minlength="12" maxlength="72" autocomplete="new-password"' : 'autocomplete="current-password"'}></label><button class="button">${session.setupRequired ? 'Crear cuenta' : 'Entrar'}</button></form><p id="admin-status" role="status" aria-live="polite"></p></section>`;
    app.querySelector('form')!.addEventListener('submit', event => {
      event.preventDefault();
      void submit(event.target as HTMLFormElement, session.setupRequired ? 'setup' : 'login', async result => { csrf = result.csrf!; await dashboard(); });
    });
  } catch (error) {
    app.innerHTML = `<section class="panel"><h1>El panel no está disponible</h1><p role="alert">${escape((error as Error).message)}</p><p>Si es la primera instalación, completa la configuración de PHP y la base de datos en cPanel.</p><button class="button" id="retry">Volver a intentar</button></section>`;
    app.querySelector('#retry')!.addEventListener('click', () => void start());
  }
}
async function dashboard() {
  const result = await api<{ books: Book[]; whatsapp: string }>('admin-books');
  books = result.books; whatsapp = result.whatsapp;
  app.innerHTML = `<div class="admin-heading"><div><p class="eyebrow">Administración</p><h1>Tu biblioteca</h1><p>${books.length} libros · ${books.filter(b => b.published).length} publicados</p></div><button class="button secondary" id="logout">Cerrar sesión</button></div><p id="admin-status" role="status" aria-live="polite"></p><section class="panel"><h2>Contacto para pedidos</h2><p>Los botones del catálogo abrirán una conversación con este número.</p><form id="settings-form" class="settings-form"><label>WhatsApp con código de país<input name="whatsapp" inputmode="numeric" pattern="[1-9][0-9]{6,14}" maxlength="15" value="${escape(whatsapp)}" placeholder="Código de país y número" aria-describedby="phone-help"><small id="phone-help">Solo dígitos, sin +, espacios ni guiones. Déjalo vacío para desactivar los pedidos.</small></label><button class="button">Guardar contacto</button></form></section><div class="admin-columns"><section class="panel"><h2 id="editor-title">Agregar libro</h2><div id="book-editor"></div></section><section class="panel"><div class="admin-heading"><h2>Libros del catálogo</h2><button class="button secondary" id="new-book">Nuevo libro</button></div><label>Buscar libros<input id="admin-search" type="search" placeholder="Título o autor"></label><div id="admin-books"></div></section></div>`;
  app.querySelector('#logout')!.addEventListener('click', async () => {
    try { await api('logout', new FormData(), csrf); await start(); } catch (e) { message((e as Error).message, true); }
  });
  app.querySelector('#settings-form')!.addEventListener('submit', event => {
    event.preventDefault(); void submit(event.target as HTMLFormElement, 'settings', async () => { message('Contacto actualizado.'); });
  });
  app.querySelector('#new-book')!.addEventListener('click', () => edit());
  app.querySelector('#admin-search')!.addEventListener('input', renderList);
  app.querySelector('#admin-books')!.addEventListener('click', event => {
    const target = (event.target as HTMLElement).closest<HTMLElement>('[data-edit]');
    if (target) edit(books.find(b => b.id === target.dataset.edit));
  });
  renderList(); edit();
}
function renderList() {
  const query = app.querySelector<HTMLInputElement>('#admin-search')!.value.toLocaleLowerCase('es');
  const filtered = books.filter(b => `${b.title} ${b.author}`.toLocaleLowerCase('es').includes(query));
  app.querySelector('#admin-books')!.innerHTML = filtered.length ? filtered.map(b => `<article class="admin-book"><div>${coverMarkup(b)}</div><div><h3>${escape(b.title)}</h3><p>${escape(b.author)}</p><p>${escape(priceLabel(b))} · ${b.published ? 'Publicado' : 'Borrador'}${b.featured ? ' · Destacado' : ''}${b.available ? '' : ' · No disponible'}</p><button class="button secondary" data-edit="${b.id}">Editar libro</button></div></article>`).join('') : '<p>No hay libros para mostrar. Agrega tu primer título o cambia la búsqueda.</p>';
}
function edit(book?: Book) {
  app.querySelector('#editor-title')!.textContent = book ? 'Editar libro' : 'Agregar libro';
  const input = (name: keyof Book, label: string, max: number, required = true) => `<label>${label}<input name="${name}" maxlength="${max}" ${required ? 'required' : ''} value="${escape(String(book?.[name] ?? ''))}"></label>`;
  app.querySelector('#book-editor')!.innerHTML = `<form id="book-form"><input type="hidden" name="id" value="${book?.id ?? ''}">${input('title', 'Título', 180)}${input('author', 'Autor', 180)}<label>Descripción<textarea name="description" maxlength="5000" rows="5">${escape(book?.description ?? '')}</textarea></label>${input('category', 'Categoría', 80)}<label>Formato<select name="format">${['Físico', 'PDF', 'Físico y PDF'].map(f => `<option ${book?.format === f ? 'selected' : ''}>${f}</option>`).join('')}</select></label><div class="form-pair"><label>Precio (opcional)<input name="price" type="number" min="0" max="99999999.99" step="0.01" value="${escape(book?.price ?? '')}"></label><label>Moneda<input name="currency" required pattern="[A-Za-z]{3}" minlength="3" maxlength="3" placeholder="Ej.: USD" value="${escape(book?.currency ?? '')}"></label></div><label>Portada<input type="file" name="cover" accept="image/jpeg,image/png,image/webp"><small>JPG, PNG o WebP. Máximo 5 MB y 24 megapíxeles. Si no eliges otra, se conserva la portada actual.</small></label><div id="cover-preview">${book ? coverMarkup(book) : ''}</div><label class="check"><input name="available" type="checkbox" value="1" ${!book || book.available ? 'checked' : ''}> Disponible para pedidos</label><label class="check"><input name="featured" type="checkbox" value="1" ${book?.featured ? 'checked' : ''}> Destacar en la página principal</label><label class="check"><input name="published" type="checkbox" value="1" ${book?.published ? 'checked' : ''}> Publicar en el catálogo</label><p class="form-help">Desmarca “Publicar” para guardar un borrador u ocultar un libro. Los archivos PDF no se cargan aquí; los pedidos se coordinan por WhatsApp.</p><button class="button">${book ? 'Guardar cambios' : 'Guardar libro'}</button><p id="editor-status" role="status"></p></form>`;
  const form = app.querySelector<HTMLFormElement>('#book-form')!;
  form.querySelector<HTMLInputElement>('[name="cover"]')!.addEventListener('change', event => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024 || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      (event.target as HTMLInputElement).value = ''; form.querySelector('#editor-status')!.textContent = 'Elige una imagen JPG, PNG o WebP de hasta 5 MB.'; return;
    }
    const image = document.createElement('img'); const url = URL.createObjectURL(file);
    image.src = url; image.alt = 'Vista previa de la portada'; image.className = 'real-cover';
    image.onload = () => URL.revokeObjectURL(url);
    app.querySelector('#cover-preview')!.replaceChildren(image);
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    for (const name of ['available', 'published', 'featured']) {
      const existing = form.querySelector(`input[type="hidden"][name="${name}"]`); existing?.remove();
      if (!form.querySelector<HTMLInputElement>(`input[type="checkbox"][name="${name}"]`)!.checked) {
        const hidden = document.createElement('input'); hidden.type = 'hidden'; hidden.name = name; hidden.value = '0'; form.append(hidden);
      }
    }
    void submit(form, 'save-book', async () => { await dashboard(); message('Libro guardado. El catálogo ya refleja los cambios.'); });
  });
  if (book) { app.querySelector('#editor-title')!.scrollIntoView({ block: 'start' }); form.querySelector<HTMLInputElement>('[name="title"]')!.focus({ preventScroll: true }); }
}
void start();
