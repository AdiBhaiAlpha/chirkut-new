<?php
/**
 * Shared helpers: JSON responses, Bangla formatting, ids, validation.
 */

declare(strict_types=1);

// ----------------------------------------------------
// JSON response helpers
// ----------------------------------------------------
function json_out(array $data, int $status = 200): never {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function json_error(string $message, int $status = 400): never {
    json_out(['error' => $message], $status);
}

/** Read the JSON request body as an associative array. */
function request_body(): array {
    $raw = file_get_contents('php://input');
    if ($raw === false || $raw === '') return [];
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

// ----------------------------------------------------
// Bengali date and digits formatting (ported from api.ts)
// ----------------------------------------------------
const BANGLA_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

function to_bangla_digits(int|string $num): string {
    return preg_replace_callback('/\d/', fn($m) => BANGLA_DIGITS[(int) $m[0]], (string) $num);
}

function bangla_day_period(int $hour): string {
    if ($hour < 6) return 'শেষ রাত';
    if ($hour < 12) return 'সকাল';
    if ($hour < 16) return 'দুপুর';
    if ($hour < 19) return 'বিকাল';
    return 'রাত';
}

function format_bangla_date(string $dateStr): string {
    $ts = strtotime($dateStr);
    if ($ts === false) return '';
    $now = time();
    $diffMins = (int) floor(($now - $ts) / 60);
    $diffHours = (int) floor($diffMins / 60);
    $diffDays = (int) floor($diffHours / 24);

    if ($diffMins < 1) return 'এইমাত্র';
    if ($diffMins < 60) return to_bangla_digits($diffMins) . ' মিনিট আগে';

    $hour = (int) date('G', $ts);
    $min = date('i', $ts);
    $formattedHour = $hour > 12 ? $hour - 12 : ($hour === 0 ? 12 : $hour);
    $period = bangla_day_period($hour);

    if ($diffHours < 24 && date('j', $ts) === date('j', $now)) {
        return 'আজ ' . $period . ' ' . to_bangla_digits($formattedHour) . ':' . to_bangla_digits($min);
    }

    if ($diffDays === 1 || ($diffHours < 48 && date('j', $ts) === date('j', $now - 86400))) {
        return 'গতকাল ' . $period . ' ' . to_bangla_digits($formattedHour) . ':' . to_bangla_digits($min);
    }

    $months = [
        'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
        'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
    ];
    return to_bangla_digits((int) date('j', $ts)) . ' ' . $months[(int) date('n', $ts) - 1] . ' ' . to_bangla_digits(date('Y', $ts));
}

// ----------------------------------------------------
// Ids and misc
// ----------------------------------------------------
function rand_id(string $prefix): string {
    return $prefix . bin2hex(random_bytes(8));
}

function now_iso(): string {
    return gmdate('Y-m-d\TH:i:s\Z');
}

/** Count words the same way the Angular app does (split on whitespace). */
function count_words(string $text): int {
    $trimmed = trim($text);
    if ($trimmed === '') return 0;
    return count(preg_split('/\s+/u', $trimmed));
}

/** Multibyte-safe string length. */
function mb_len(string $text): int {
    return mb_strlen($text, 'UTF-8');
}

// ----------------------------------------------------
// Avatar handling: decode base64 data-URL and save as a file
// ----------------------------------------------------
/**
 * Accepts a data-URL (data:image/jpeg;base64,... or data:image/png;base64,...)
 * or an SVG data URI (kept as-is for seed users). Returns the string to store
 * in the users db (either a relative file path or the original data URI).
 * Throws on invalid/oversized payloads.
 */
function save_avatar(string $avatarBase64, string $username): string {
    // Seed users use inline SVG data URIs — small, safe to store directly.
    if (str_starts_with($avatarBase64, 'data:image/svg+xml')) {
        return $avatarBase64;
    }

    if (!preg_match('#^data:image/(jpeg|jpg|png|webp);base64,(.+)$#s', $avatarBase64, $m)) {
        throw new RuntimeException('ছবির ফরম্যাটটি সঠিক নয়। অনুগ্রহ করে আবার চেষ্টা করুন।');
    }

    $binary = base64_decode($m[2], true);
    if ($binary === false || strlen($binary) === 0) {
        throw new RuntimeException('ছবিটি প্রক্রিয়া করা যায়নি। অনুগ্রহ করে আবার চেষ্টা করুন।');
    }
    if (strlen($binary) > MAX_AVATAR_BYTES) {
        throw new RuntimeException('ছবির আকার খুব বড়। অনুগ্রহ করে ছোট একটি ছবি ব্যবহার করুন।');
    }

    // Verify it is a real image.
    $info = @getimagesizefromstring($binary);
    if ($info === false) {
        throw new RuntimeException('ছবিটি প্রক্রিয়া করা যায়নি। অনুগ্রহ করে আবার চেষ্টা করুন।');
    }

    if (!is_dir(UPLOADS_PATH)) {
        mkdir(UPLOADS_PATH, 0755, true);
    }

    $ext = $m[1] === 'png' ? 'png' : ($m[1] === 'webp' ? 'webp' : 'jpg');
    $safeUsername = preg_replace('/[^a-z0-9_]/', '', strtolower($username));
    $filename = $safeUsername . '_' . substr(bin2hex(random_bytes(4)), 0, 8) . '.' . $ext;
    $path = UPLOADS_PATH . '/' . $filename;

    if (file_put_contents($path, $binary) === false) {
        throw new RuntimeException('ছবিটি সংরক্ষণ করা যায়নি। সার্ভার সমস্যার জন্য আবার চেষ্টা করুন।');
    }

    return UPLOADS_URL . '/' . $filename;
}

/** Delete a user's stored avatar file (if it is a file, not a data URI). */
function delete_avatar_file(string $avatar): void {
    if (str_starts_with($avatar, UPLOADS_URL . '/')) {
        $path = ROOT_PATH . '/' . $avatar;
        $real = realpath($path);
        if ($real !== false && str_starts_with($real, UPLOADS_PATH) && is_file($real)) {
            @unlink($real);
        }
    }
}
