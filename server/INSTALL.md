# Activar el catálogo administrable en cPanel

La web conserva Vite y TypeScript. El panel `/admin/` y el catálogo usan
`/api/index.php`, PHP y una base de datos MySQL. No requiere Node en el hosting.
El dueño puede cargar portadas y fichas, guardar borradores, publicar u ocultar,
marcar destacados y cambiar el número de WhatsApp. No incluye pagos ni subida
o entrega de archivos PDF. El formato PDF es una descripción del producto.

## 1. Preparar el servidor

- Activar HTTPS y forzar la redirección de HTTP a HTTPS en cPanel.
- Seleccionar PHP 8.2 o superior, con PDO MySQL, Fileinfo y Mbstring.
- Configurar `upload_max_filesize = 5M` y `post_max_size = 8M` o más.
- En MySQL Databases crear una base dedicada con juego de caracteres `utf8mb4`
  y un usuario con permisos sobre esa base. Conservar los nombres completos,
  incluido el prefijo de cPanel.
- En phpMyAdmin seleccionar esa base e importar `server/schema.sql` una sola vez.
  No volver a importarlo sobre una instalación en uso.

## 2. Guardar la configuración privada

Copiar `server/kiwi-config.example.php` como:

```text
/home/metrdpex/kiwi-config.php
```

Para el Document Root actual `/home/metrdpex/kiwicorporacion.com`, la API busca
la configuración en su carpeta padre. Si se cambia el Document Root, ajustar
la ubicación del archivo privado. Nunca colocarlo dentro de la carpeta pública.

Completar DSN (nombre de base), usuario y contraseña MySQL. Generar un código
de instalación secreto de al menos 32 caracteres aleatorios con un gestor de
contraseñas, reemplazar `setup_token` y conservarlo hasta crear la cuenta.
No enviarlo al repositorio ni pegarlo en el chat.

`storage` debe apuntar a `/home/metrdpex/kiwi-data`, fuera del Document Root.
La API crea esa carpeta al subir la primera portada. Si el hosting no lo permite,
crearla manualmente. Restringir configuración y archivos al usuario del hosting
(idealmente archivo 0600 y carpeta 0700, si el manejador PHP lo permite).
Las restricciones open_basedir de PHP deben permitir leer el archivo privado y
escribir en la carpeta de portadas. Las sesiones PHP necesitan una ruta de escritura válida.

## 3. Publicar el código

Ejecutar `npm run build` y publicar `dist/`, o usar el flujo existente de GitHub
y cPanel. El despliegue actualizado incluye `api/` y `admin/` además de los recursos
existentes. No subir `server/`, configuración privada, pruebas ni base de datos
al directorio público.

El script cPanel y FTPS administran únicamente el código compilado. La base y
`kiwi-data` quedan fuera de ese despliegue. Los libros no requieren nuevos commits.
Si existen reglas de reescritura, asegurar que `/api/index.php` y `/admin/index.html`
se sirvan desde este proyecto.

## 4. Crear y entregar la cuenta

1. Abrir `https://kiwicorporacion.com/admin/`.
2. Introducir el código de instalación y el correo del dueño.
3. Crear una contraseña única de entre 12 y 72 bytes (72 caracteres si son ASCII).
4. Tras entrar, quitar `setup_token` de `kiwi-config.php`.
5. Guardar el WhatsApp con código de país, sin `+`, espacios ni guiones.
6. Agregar un libro de prueba, dejarlo en borrador y comprobar que no aparece
   en el catálogo público.
7. Publicarlo y verificar portada, ficha, búsqueda y pedido por WhatsApp.
8. Probar que editarlo u ocultarlo se refleje al recargar el catálogo.
9. Publicar una actualización del código y comprobar que libro y portada siguen presentes.

Solo se admite una cuenta dueña. No hay registro público, recuperación por correo
ni gestión de múltiples empleados. Una recuperación de contraseña requiere
intervención técnica en el servidor; conservar el acceso en un gestor de contraseñas.
La sesión expira tras 30 minutos de inactividad. Después de una expiración o error
de sesión, recargar el panel para volver a entrar.

## Copias de seguridad

Respaldar conjuntamente la base MySQL, `/home/metrdpex/kiwi-data` y la configuración
privada. GitHub solo contiene el código: no respalda los libros cargados por el
cliente. Programar copias según el servicio de hosting y comprobar una restauración.

## Desarrollo y comprobaciones

`npm run build` valida TypeScript y genera las dos páginas. `php -l public/api/index.php`
comprueba la sintaxis PHP. `npm run test:api` requiere Node 22 y PHP con PDO SQLite,
Fileinfo y Mbstring; inicia un servidor HTTP local con almacenamiento aislado en
`tests/.runtime/`. Usa el mismo SQL y API, pero SQLite: no sustituye la comprobación
en el MySQL real de cPanel. Los datos de prueba son ficticios y no se publican.

Para desarrollo local con MySQL, colocar un `kiwi-config.php` en la raíz del
proyecto (ignorado por Git) e iniciar `php -S 127.0.0.1:8081 -t public` y `npm run dev`.
Vite reenvía `/api` al servidor PHP. Guardar las portadas en `kiwi-data/` (ignorada).
No usar el servidor integrado de PHP para producción.

La API usa consultas preparadas, hashes de contraseña, cookies HttpOnly con
SameSite y HTTPS, token CSRF, límite de intentos de acceso y validación real del
tipo y tamaño de imagen. Guarda portadas con nombres aleatorios fuera del directorio
público y no sirve portadas de borradores a visitantes. No se aceptan SVG ni ejecutables.
Referencias: [sesiones PHP](https://www.php.net/manual/en/session.security.ini.php)
y [carga de archivos PHP](https://www.php.net/manual/en/features.file-upload.php).
