<?php
/**
 * Common bootstrap for all pages and API endpoints.
 */

declare(strict_types=1);

require_once dirname(__DIR__) . '/includes/config.php';
require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/jsondb.php';
require_once __DIR__ . '/auth.php';

// Sessions: httponly, samesite lax (works on shared hosts without config changes)
if (session_status() === PHP_SESSION_NONE) {
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'domain' => '',
        'secure' => isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
        'httponly' => true,
        'samesite' => 'Lax'
    ]);
    session_name('chirkut_session');
    session_start();
}

// First-run: create data files with the official seed account
db_seed_if_needed();
