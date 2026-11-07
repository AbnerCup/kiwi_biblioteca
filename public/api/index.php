<?php
declare(strict_types=1);

ini_set('display_errors', '0');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');
header('Content-Type: application/json; charset=utf-8');

function reply(array $data, int $status = 200): never {
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
    exit;
}
function fail(string $message, int $status = 400): never { reply(['error' => $message], $status); }
function field(string $key, int $limit, bool $required = true): string {
    $value = $_POST[$key] ?? '';
    if (!is_string($value)) fail('Campo inválido: ' . $key);
    if ($key !== 'password') $value = trim($value);
    if (($required && $value === '') || mb_strlen($value) > $limit) fail('Revisa el campo ' . $key . '.');
    return $value;
}
function bookView(array $row): array {
    foreach (['available', 'published', 'featured'] as $key) $row[$key] = (bool)$row[$key];
    $row['cover'] = $row['cover'] ? 'api/index.php?action=cover&file=' . rawurlencode($row['cover']) : '';
    return $row;
}

try {
    $action = $_GET['action'] ?? 'books';
    if (!is_string($action)) fail('Solicitud inválida.');
    $configFile = dirname(rtrim($_SERVER['DOCUMENT_ROOT'], '/\\')) . '/kiwi-config.php';
    if (!is_file($configFile)) fail('El catálogo todavía no está configurado.', 503);
    $config = require $configFile;
    $db = new PDO($config['dsn'], $config['user'], $config['password'], [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC, PDO::ATTR_EMULATE_PREPARES => false]);
    $method = $_SERVER['REQUEST_METHOD'];

    // Anonymous requests never receive drafts or unpublished covers.
    if ($method === 'GET' && $action === 'books') {
        $books = $db->query('SELECT * FROM kiwi_books WHERE published = 1 ORDER BY featured DESC, updated_at DESC, id')->fetchAll();
        reply(['books' => array_map('bookView', $books), 'whatsapp' => $db->query('SELECT whatsapp FROM kiwi_settings WHERE id = 1')->fetchColumn()]);
    }
    if ($method === 'GET' && $action === 'cover') {
        $file = $_GET['file'] ?? '';
        if (!is_string($file) || !preg_match('/^[a-f0-9]{32}\.(jpg|png|webp)$/D', $file)) fail('Portada no encontrada.', 404);
        $q = $db->prepare('SELECT id FROM kiwi_books WHERE cover = ? AND published = 1');
        $q->execute([$file]);
        $public = (bool)$q->fetchColumn();
        // Draft covers are handled below after authentication.
        if ($public) {
            $path = $config['storage'] . '/' . $file;
            if (!is_file($path)) fail('Portada no encontrada.', 404);
            header('Content-Type: ' . ['jpg' => 'image/jpeg', 'png' => 'image/png', 'webp' => 'image/webp'][pathinfo($file, PATHINFO_EXTENSION)]);
            header('Cache-Control: no-store');
            readfile($path); exit;
        }
    }

    $local = in_array($_SERVER['REMOTE_ADDR'] ?? '', ['127.0.0.1', '::1'], true);
    $secure = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
    if (!$secure && !$local) fail('Accede al panel mediante HTTPS.', 403);
    ini_set('session.use_strict_mode', '1');
    ini_set('session.use_only_cookies', '1');
    session_name('kiwi_admin');
    session_set_cookie_params(['lifetime' => 0, 'path' => '/', 'secure' => $secure, 'httponly' => true, 'samesite' => 'Strict']);
    session_start();
    if (isset($_SESSION['last_seen']) && time() - $_SESSION['last_seen'] > 1800) $_SESSION = [];
    $_SESSION['csrf'] ??= bin2hex(random_bytes(32));
    if (isset($_SESSION['admin'])) $_SESSION['last_seen'] = time();
    $hasAdmin = (bool)$db->query('SELECT id FROM kiwi_admin WHERE id = 1')->fetchColumn();
    if ($method === 'GET' && $action === 'session') reply(['authenticated' => isset($_SESSION['admin']), 'setupRequired' => !$hasAdmin, 'csrf' => $_SESSION['csrf']]);

    if ($method === 'POST') {
        $csrf = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
        if (!is_string($csrf) || !hash_equals($_SESSION['csrf'], $csrf)) fail('La sesión cambió. Recarga el panel.', 403);
    } elseif ($method !== 'GET') fail('Método no permitido.', 405);

    if ($method === 'POST' && in_array($action, ['login', 'setup'], true)) {
        $key = hash('sha256', ($_SERVER['REMOTE_ADDR'] ?? '') . ':login');
        $now = time();
        $db->prepare('DELETE FROM kiwi_attempts WHERE started_at < ?')->execute([$now - 900]);
        try { $db->prepare('INSERT INTO kiwi_attempts VALUES (?, 0, ?)')->execute([$key, $now]); } catch (PDOException $e) { if (!in_array((string)$e->getCode(), ['23000', '23505'], true)) throw $e; }
        $q = $db->prepare('UPDATE kiwi_attempts SET attempts = attempts + 1 WHERE attempt_key = ? AND attempts < 10');
        $q->execute([$key]);
        if (!$q->rowCount()) fail('Demasiados intentos. Espera 15 minutos.', 429);
        $email = strtolower(field('email', 254));
        $password = field('password', 256);
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) fail('Escribe un correo válido.');
        if ($action === 'setup') {
            if ($hasAdmin) fail('La cuenta ya fue creada.', 409);
            $secret = $config['setup_token'] ?? '';
            if (strlen($secret) < 32 || str_starts_with($secret, 'REPLACE_') || !hash_equals($secret, field('setup_token', 256))) fail('Código de instalación incorrecto.', 403);
            if (strlen($password) < 12 || strlen($password) > 72) fail('La contraseña debe tener entre 12 y 72 bytes.');
            try { $db->prepare('INSERT INTO kiwi_admin VALUES (1, ?, ?)')->execute([$email, password_hash($password, PASSWORD_DEFAULT)]); } catch (PDOException $e) { if ((string)$e->getCode() === '23000') fail('La cuenta ya fue creada.', 409); throw $e; }
        } else {
            $admin = $db->query('SELECT * FROM kiwi_admin WHERE id = 1')->fetch();
            $valid = password_verify($password, $admin['password_hash'] ?? '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.');
            if (!$admin || !$valid || !hash_equals($admin['email'], $email)) fail('Correo o contraseña incorrectos.', 401);
        }
        $db->prepare('DELETE FROM kiwi_attempts WHERE attempt_key = ?')->execute([$key]);
        session_regenerate_id(true);
        $_SESSION = ['admin' => 1, 'last_seen' => time(), 'csrf' => bin2hex(random_bytes(32))];
        reply(['csrf' => $_SESSION['csrf']]);
    }
    if (!isset($_SESSION['admin'])) fail('Inicia sesión para continuar.', 401);
    if ($action === 'cover' && $method === 'GET') {
        $q = $db->prepare('SELECT id FROM kiwi_books WHERE cover = ?'); $q->execute([$file]);
        $path = $config['storage'] . '/' . $file;
        if (!$q->fetchColumn() || !is_file($path)) fail('Portada no encontrada.', 404);
        header('Content-Type: ' . ['jpg' => 'image/jpeg', 'png' => 'image/png', 'webp' => 'image/webp'][pathinfo($file, PATHINFO_EXTENSION)]);
        readfile($path); exit;
    }
    if ($action === 'admin-books' && $method === 'GET') reply(['books' => array_map('bookView', $db->query('SELECT * FROM kiwi_books ORDER BY updated_at DESC, id')->fetchAll()), 'whatsapp' => $db->query('SELECT whatsapp FROM kiwi_settings WHERE id = 1')->fetchColumn()]);
    if ($action === 'logout' && $method === 'POST') { $_SESSION = []; session_destroy(); reply(['ok' => true]); }
    if ($action === 'settings' && $method === 'POST') {
        $phone = field('whatsapp', 15, false);
        if ($phone !== '' && !preg_match('/^[1-9][0-9]{6,14}$/D', $phone)) fail('Usa el código de país y el número, solo dígitos.');
        $db->prepare('UPDATE kiwi_settings SET whatsapp = ? WHERE id = 1')->execute([$phone]);
        reply(['ok' => true]);
    }
    if ($action === 'save-book' && $method === 'POST') {
        $id = field('id', 32, false);
        $existing = null;
        if ($id !== '') {
            $q = $db->prepare('SELECT * FROM kiwi_books WHERE id = ?'); $q->execute([$id]); $existing = $q->fetch();
            if (!$existing) fail('Libro no encontrado.', 404);
        } else $id = bin2hex(random_bytes(16));
        $title = field('title', 180); $author = field('author', 180); $description = field('description', 5000, false);
        $category = field('category', 80); $format = field('format', 20); $price = field('price', 20, false); $currency = strtoupper(field('currency', 3));
        if (!in_array($format, ['Físico', 'PDF', 'Físico y PDF'], true)) fail('Formato inválido.');
        if ($price !== '' && !preg_match('/^(0|[1-9][0-9]{0,7})(\.[0-9]{1,2})?$/D', $price)) fail('Revisa el precio, con punto decimal y hasta dos decimales.');
        if (!preg_match('/^[A-Z]{3}$/D', $currency)) fail('Escribe un código de moneda de tres letras.');
        $flags = [];
        foreach (['available', 'published', 'featured'] as $flag) $flags[] = field($flag, 1) === '1' ? 1 : 0;
        $cover = $existing['cover'] ?? ''; $newPath = null;
        if (isset($_FILES['cover']) && $_FILES['cover']['error'] !== UPLOAD_ERR_NO_FILE) {
            $upload = $_FILES['cover'];
            if (!is_int($upload['error']) || $upload['error'] !== UPLOAD_ERR_OK || $upload['size'] > 5 * 1024 * 1024) fail('La portada no se pudo subir. Usa una imagen de hasta 5 MB.');
            $mime = (new finfo(FILEINFO_MIME_TYPE))->file($upload['tmp_name']);
            $extension = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'][$mime] ?? null;
            $size = @getimagesize($upload['tmp_name']);
            if (!$extension || !$size || $size[0] * $size[1] > 24000000) fail('Usa una portada JPG, PNG o WebP de hasta 24 megapíxeles.');
            if (!is_dir($config['storage']) && !mkdir($config['storage'], 0700, true)) throw new RuntimeException('Storage unavailable');
            $cover = bin2hex(random_bytes(16)) . '.' . $extension;
            $newPath = $config['storage'] . '/' . $cover;
            if (!move_uploaded_file($upload['tmp_name'], $newPath)) throw new RuntimeException('Upload failed');
            chmod($newPath, 0600);
        }
        $values = [$title, $author, $description, $category, $format, $price, $currency, ...$flags, $cover, gmdate('Y-m-d\TH:i:s\Z')];
        try {
            if ($existing) $db->prepare('UPDATE kiwi_books SET title=?, author=?, description=?, category=?, format=?, price=?, currency=?, available=?, published=?, featured=?, cover=?, updated_at=? WHERE id=?')->execute([...$values, $id]);
            else $db->prepare('INSERT INTO kiwi_books (title,author,description,category,format,price,currency,available,published,featured,cover,updated_at,id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)')->execute([...$values, $id]);
        } catch (Throwable $e) { if ($newPath) @unlink($newPath); throw $e; }
        if ($newPath && $existing && $existing['cover']) @unlink($config['storage'] . '/' . $existing['cover']);
        reply(['ok' => true, 'id' => $id]);
    }
    fail('Ruta no encontrada.', 404);
} catch (Throwable $e) {
    error_log('Kiwi API: ' . $e->getMessage());
    fail('No pudimos completar la operación. Comprueba la configuración del servidor e inténtalo de nuevo.', 503);
}
