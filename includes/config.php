<?php
/**
 * চিরকুট (Chirkut) — Site configuration
 * Core PHP 8+, no external dependencies. Works on any cPanel shared host.
 */

declare(strict_types=1);

// ---- Site constants ----
define('SITE_NAME', 'চিরকুট');
define('SITE_TAGLINE', 'আপনার ডিজিটাল চিঠির বাক্স');

// ---- Paths ----
define('ROOT_PATH', dirname(__DIR__));
define('DATA_PATH', ROOT_PATH . '/data');
define('UPLOADS_PATH', ROOT_PATH . '/uploads/avatars');
define('UPLOADS_URL', 'uploads/avatars');

// ---- Limits (ported 1:1 from the original app) ----
define('MAX_TWEET_WORDS', 50);
define('MAX_COMMENT_CHARS', 200);
define('MAX_CHIRKUT_CHARS', 500);
define('MAX_BIO_CHARS', 160);
define('MAX_DISPLAY_NAME_CHARS', 50);
define('MIN_PASSWORD_CHARS', 6);
define('MAX_AVATAR_BYTES', 2 * 1024 * 1024); // 2MB decoded

// ---- Timezone (Bangla date formatting) ----
date_default_timezone_set('Asia/Dhaka');
