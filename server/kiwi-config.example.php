<?php
// Copy to /home/YOUR_CPANEL_USER/kiwi-config.php, OUTSIDE the domain's public folder.
return [
    'dsn' => 'mysql:host=localhost;dbname=CPANEL_DATABASE;charset=utf8mb4',
    'user' => 'CPANEL_DATABASE_USER',
    'password' => 'REPLACE_WITH_DATABASE_PASSWORD',
    // Generate 64 random hexadecimal characters in a password manager. Remove after setup.
    'setup_token' => 'REPLACE_WITH_A_RANDOM_SECRET_OF_AT_LEAST_32_CHARACTERS',
    'storage' => __DIR__ . '/kiwi-data',
];
