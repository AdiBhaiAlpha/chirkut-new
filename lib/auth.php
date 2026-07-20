<?php
/**
 * Session-based auth helpers + CSRF protection.
 */

declare(strict_types=1);

function auth_username(): ?string {
    return $_SESSION['username'] ?? null;
}

/** Guard: returns the logged-in username or sends a 401 JSON error. */
function require_login(): string {
    $username = auth_username();
    if ($username === null) {
        json_error('অননুমোদিত অ্যাক্সেস। অনুগ্রহ করে লগইন করুন।', 401);
    }
    return $username;
}

/** Fetch the logged-in user's record from the users db (or 401 if gone). */
function require_user(): array {
    $username = require_login();
    $users = db_read('users');
    foreach ($users as $u) {
        if ($u['username'] === $username) return $u;
    }
    // Account no longer exists — kill the session.
    auth_logout();
    json_error('অননুমোদিত অ্যাক্সেস। অনুগ্রহ করে লগইন করুন।', 401);
}

function auth_login(string $username): void {
    session_regenerate_id(true);
    $_SESSION['username'] = $username;
}

function auth_logout(): void {
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'], $params['secure'], $params['httponly']);
    }
    session_destroy();
}

// ----------------------------------------------------
// CSRF
// ----------------------------------------------------
function csrf_token(): string {
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

/** Verify CSRF token on mutating requests. Token comes via X-CSRF-Token header. */
function require_csrf(): void {
    $sent = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    $stored = $_SESSION['csrf_token'] ?? '';
    if ($stored === '' || $sent === '' || !hash_equals($stored, $sent)) {
        json_error('অনুরোধটি যাচাই করা যায়নি। পৃষ্ঠাটি রিফ্রেশ করে আবার চেষ্টা করুন।', 403);
    }
}

/** Build the public (client-safe) user object, ported from api.ts. */
function client_user(array $dbUser): array {
    return [
        'username' => $dbUser['username'],
        'displayName' => $dbUser['displayName'],
        'avatar' => $dbUser['avatar'],
        'bio' => $dbUser['bio'],
        'joinedDate' => format_bangla_date($dbUser['joinedDate']),
        'mobile' => $dbUser['mobile'] ?? ''
    ];
}
