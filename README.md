# kiwi_biblioteca

Base local: Vite + TypeScript + Tailwind CSS y motor scroll-world.
Incluye catálogo conectado a PHP/MySQL, fichas de libros, búsqueda y filtros,
pedidos por WhatsApp y panel privado en `/admin/`. No incluye pagos ni entrega de PDFs.
Los libros y portadas se administran sin modificar el código.

## Activar la administración

Seguir [server/INSTALL.md](server/INSTALL.md) para crear la base de datos,
importar el esquema, guardar la configuración privada fuera del directorio público
y crear la cuenta del dueño. Hasta completar esos pasos, la web muestra un mensaje
de catálogo no configurado. Subir solamente `dist/` no crea la base de datos.

## Desarrollo

```powershell
npm install
npm run dev
```

## Preparar para Namecheap

```powershell
npm run build
```

Subir el contenido de `dist/` a la carpeta raíz asignada al dominio o subdominio en cPanel. No subir node_modules ni los archivos de desarrollo. No requiere un proceso Node en el servidor. El catálogo y el panel necesitan PHP y MySQL configurados.

Antes de publicar: confirmar nombre y marca, catálogo y portadas, precios y moneda, flujo de compra, datos de contacto y textos legales. Quitar noindex cuando la página final esté lista. Probar scroll, unión de clips y reproducción en Safari y móviles reales.

Los originales están en videos-optimizados; las copias servidas en public/videos. No hay versiones verticales ni clip de conexión: se usa una transición entre los dos videos. Orden: cecd43f9, 00a87a40. Las portadas siguen a sus clips.

Motor de scroll: oso95/scroll-world, licencia MIT en src/scroll-world-LICENSE.

## Repositorio y despliegue automatico

El workflow `.github/workflows/deploy.yml` compila el proyecto cada vez que haces push a `main` y actualiza la rama `hosting` con la web lista para servir. Tambien puedes ejecutarlo desde Actions con Run workflow sobre `main`. Si la compilacion falla, no se actualiza `hosting`. No editar `hosting` directamente: se genera desde `main`.

### Publicar desde Git Version Control en cPanel

Las dos carpetas tienen funciones distintas y deben mantenerse separadas:

- Repositorio clonado: `/home/metrdpex/repositories/kiwi_biblioteca`.
- Document Root del dominio: `/home/metrdpex/kiwicorporacion.com`.

1. Espera a que Actions termine correctamente y cree la rama `hosting` en GitHub.
2. En cPanel > Git Version Control > kiwi_biblioteca > Manage, pulsa Update from Remote para obtener las ramas nuevas.
3. En Basic Information > Checked-Out Branch, selecciona `hosting` y pulsa Update. Si no aparece, vuelve a actualizar desde el remoto.
4. En Pull or Deploy pulsa Update from Remote y despues Deploy HEAD Commit.
5. Abre el dominio y comprueba la web.

`hosting` incluye `.cpanel.yml`, que copia `assets`, `brand`, `posters`, `videos` y finalmente `index.html` a la carpeta del dominio. No copia el codigo fuente, `.git` ni archivos de configuracion al sitio publico. Conserva `.well-known`, `cgi-bin` y otros archivos existentes. Los recursos antiguos pueden permanecer; no hay borrado ni cambio atomico de version.

No hace falta Node en Namecheap: GitHub compila la web. No cambiar Document Root a la raiz del repositorio. La preparacion de `hosting` es automatica; para publicar en el servidor con este metodo hace falta Update from Remote + Deploy HEAD Commit. La clonacion por si sola no activa actualizaciones automaticas desde GitHub. Para automatizar tambien el servidor hay que configurar FTPS (abajo), o acceso SSH/una tarea cron de despliegue en cPanel.

### Automatizar cPanel con Cron Jobs

1. Con `hosting` seleccionada en cPanel, pulsa Update from Remote y Deploy HEAD Commit una vez para obtener el script nuevo.
2. Abre cPanel > Cron Jobs y crea una tarea con minuto `*/5`, hora `*`, dia `*`, mes `*` y dia de semana `*` (cada cinco minutos).
3. En Command pega:

```bash
/bin/bash /home/metrdpex/repositories/kiwi_biblioteca/sync-hosting.sh >> /home/metrdpex/kiwi-deploy.log 2>&1
```

El script trae `hosting` desde GitHub y solicita el despliegue a cPanel solo si el commit es distinto al ultimo publicado correctamente. Un bloqueo evita dos sincronizaciones simultaneas. La marca `.kiwi-deployed-sha` se guarda fuera del repositorio solo despues de copiar todos los archivos. Los errores quedan en `/home/metrdpex/kiwi-deploy.log`; un despliegue fallido se reintenta en la proxima ejecucion. Se necesita que cPanel permita ejecutar Git y UAPI desde cron; si el acceso Shell esta deshabilitado y el registro indica restricciones, habilitarlo en Manage Shell.

Flujo: push a `main` > GitHub Actions genera `hosting` > cron detecta la version nueva > cPanel publica el sitio. El tiempo es la compilacion de GitHub mas hasta cinco minutos de espera y la duracion del despliegue. No configurar FTPS simultaneamente con esta tarea. Namecheap no permite intervalos menores a cinco minutos en hosting compartido.

Para verificar la version publicada, abre `https://kiwicorporacion.com/deploy-version.txt`. Debe mostrar el SHA del commit de `main` que genero la compilacion. Este archivo permite probar el recorrido completo sin cambios visuales.

### FTPS opcional para publicacion automatica al servidor

Si no hay secrets FTP, el workflow termina correctamente tras preparar `hosting` y omite FTPS. Si configuras los cuatro secrets, cada push a `main` tambien publica directamente en Namecheap. No configurar ambos metodos para escribir al sitio simultaneamente.

1. Crea un repositorio vacio en GitHub, preferiblemente privado, sin README ni .gitignore adicionales.
2. Conecta y sube este proyecto desde PowerShell, sustituyendo la URL:

```powershell
git add .
git commit -m "Preparar sitio y despliegue automatico"
git remote add origin https://github.com/AbnerCup/kiwi_biblioteca.git
git push -u origin main
```

3. En cPanel > FTP Accounts crea una cuenta FTP limitada a la carpeta del sitio. Comprueba en Domains la carpeta raiz real del dominio. No asumas que siempre es `public_html`.
4. En GitHub > Settings > Secrets and variables > Actions > New repository secret agrega:

| Secret | Valor |
| --- | --- |
| `FTP_SERVER` | Host del servidor indicado por Namecheap, sin `ftp://` ni ruta. Usa el nombre que coincida con el certificado TLS. |
| `FTP_USERNAME` | Usuario FTP completo de cPanel. |
| `FTP_PASSWORD` | Contrasena de esa cuenta FTP. No guardarla en el codigo ni enviarla por chat. |
| `FTP_SERVER_DIR` | Ruta del sitio relativa a la cuenta FTP, terminada en `/`. Si la cuenta esta limitada a la carpeta del sitio, normalmente `/`. Para una cuenta con acceso a todo el hosting podria ser `/public_html/` u otra carpeta segun el dominio. |

5. Ejecuta Actions > Publicar en Namecheap > Run workflow sobre `main`. El primer push puede fallar si todavia no agregaste los secrets; puedes volver a ejecutarlo despues de configurarlos.
6. Comprueba que el despliegue termina correctamente y abre tu dominio para verificarlo.

Se usa FTPS explicito en el puerto 21 con validacion del certificado. Se sincroniza unicamente el contenido de `dist/`, conservando archivos del servidor que no gestiona el workflow. Los archivos gestionados que elimines del proyecto tambien se eliminan en despliegues posteriores. No edites directamente en cPanel los archivos publicados por el workflow: el siguiente despliegue puede sobrescribirlos. La publicacion transfiere archivos de forma progresiva, sin cambio atomico de version.

### Cambios diarios

```powershell
npm run dev
# Editar y comprobar la web localmente.
npm run build
git add .
git commit -m "Actualizar contenido"
git push origin main
```

Guardar archivos en local no publica: el despliegue comienza al subir un commit a `main`. Revisa el resultado en Actions.
