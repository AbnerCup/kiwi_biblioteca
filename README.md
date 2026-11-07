# Librería

Base local: Vite + TypeScript + Tailwind CSS y motor scroll-world.
Los textos actuales son un borrador; no incluye catálogo, precios ni pagos.

## Desarrollo

```powershell
npm install
npm run dev
```

## Preparar para Namecheap

```powershell
npm run build
```

Subir el contenido de `dist/` a la carpeta raíz asignada al dominio o subdominio en cPanel. No subir node_modules ni los archivos de desarrollo. No requiere un proceso Node en el servidor.

Antes de publicar: confirmar nombre y marca, catálogo y portadas, precios y moneda, flujo de compra, datos de contacto y textos legales. Quitar noindex cuando la página final esté lista. Probar scroll, unión de clips y reproducción en Safari y móviles reales.

Los originales están en videos-optimizados; las copias servidas en public/videos. No hay versiones verticales ni clip de conexión: se usa una transición entre los dos videos. Orden: cecd43f9, 00a87a40. Las portadas siguen a sus clips.

Motor de scroll: oso95/scroll-world, licencia MIT en src/scroll-world-LICENSE.

## Repositorio y despliegue automatico

El workflow `.github/workflows/deploy.yml` compila el proyecto y publica `dist/` en Namecheap cada vez que haces push a `main`. Tambien puedes ejecutarlo desde la pestana Actions con Run workflow. Las otras ramas no publican. Si la compilacion falla, no se suben archivos.

### Configuracion inicial

1. Crea un repositorio vacio en GitHub, preferiblemente privado, sin README ni .gitignore adicionales.
2. Conecta y sube este proyecto desde PowerShell, sustituyendo la URL:

```powershell
git add .
git commit -m "Preparar sitio y despliegue automatico"
git remote add origin https://github.com/TU_USUARIO/kiwi.git
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
