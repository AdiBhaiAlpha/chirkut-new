<?php
/**
 * JSON-file "database" with file locking and atomic writes.
 * Collections: users, tweets, chirkuts, friendships, notifications.
 */

declare(strict_types=1);

function db_file(string $name): string {
    if (!preg_match('/^[a-z_]+$/', $name)) {
        throw new InvalidArgumentException('Invalid collection name');
    }
    return DATA_PATH . '/' . $name . '.json';
}

/** Read a collection. Returns an empty array if the file does not exist. */
function db_read(string $name): array {
    $file = db_file($name);
    if (!is_file($file)) return [];

    $fp = fopen($file, 'rb');
    if ($fp === false) return [];
    flock($fp, LOCK_SH);
    $contents = stream_get_contents($fp);
    flock($fp, LOCK_UN);
    fclose($fp);

    if ($contents === false || $contents === '') return [];
    $data = json_decode($contents, true);
    return is_array($data) ? $data : [];
}

/** Write a collection atomically (temp file + rename) under an exclusive lock. */
function db_write(string $name, array $data): void {
    $file = db_file($name);
    if (!is_dir(DATA_PATH)) {
        mkdir(DATA_PATH, 0755, true);
    }

    $json = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
    if ($json === false) {
        throw new RuntimeException('Failed to encode data for ' . $name);
    }

    // Exclusive lock on the target file guards concurrent writers.
    $lock = fopen($file . '.lock', 'c');
    if ($lock === false) {
        throw new RuntimeException('Failed to open lock for ' . $name);
    }
    flock($lock, LOCK_EX);

    $tmp = $file . '.tmp';
    if (file_put_contents($tmp, $json) === false) {
        flock($lock, LOCK_UN);
        fclose($lock);
        throw new RuntimeException('Failed to write ' . $name);
    }
    rename($tmp, $file);

    flock($lock, LOCK_UN);
    fclose($lock);
}

/**
 * Read-modify-write a collection under a single exclusive lock.
 * $fn receives the current array and must return the new array.
 */
function db_update(string $name, callable $fn): array {
    $file = db_file($name);
    if (!is_dir(DATA_PATH)) {
        mkdir(DATA_PATH, 0755, true);
    }

    $lock = fopen($file . '.lock', 'c');
    if ($lock === false) {
        throw new RuntimeException('Failed to open lock for ' . $name);
    }
    flock($lock, LOCK_EX);

    $current = [];
    if (is_file($file)) {
        $contents = file_get_contents($file);
        if ($contents !== false && $contents !== '') {
            $decoded = json_decode($contents, true);
            if (is_array($decoded)) $current = $decoded;
        }
    }

    $updated = $fn($current);

    $json = json_encode($updated, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
    if ($json === false) {
        flock($lock, LOCK_UN);
        fclose($lock);
        throw new RuntimeException('Failed to encode data for ' . $name);
    }

    $tmp = $file . '.tmp';
    file_put_contents($tmp, $json);
    rename($tmp, $file);

    flock($lock, LOCK_UN);
    fclose($lock);

    return $updated;
}

// ----------------------------------------------------
// First-run seeding (ported from api.ts defaults)
// ----------------------------------------------------
function db_seed_if_needed(): void {
    if (is_file(DATA_PATH . '/users.json')) return;

    $avOfficial = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><defs><linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%236366F1"/><stop offset="100%" stop-color="%234F46E5"/></linearGradient></defs><rect width="100" height="100" rx="24" fill="url(%23g1)"/><path d="M25 35h50v30H25z" fill="none" stroke="white" stroke-width="4"/><path d="M25 35l25 18 25-18" fill="none" stroke="white" stroke-width="4"/></svg>';

    $users = [
        [
            'username' => 'chirkut_official',
            'passwordHash' => password_hash('chitron@2448766', PASSWORD_DEFAULT),
            'displayName' => 'চিরকুট অফিশিয়াল',
            'mobile' => '01945971168',
            'bio' => 'চিরকুট এর অফিসিয়াল বট। নতুন নতুন বন্ধুদের আমন্ত্রণ জানাতে প্রস্তুত ও প্ল্যাটফর্ম সংক্রান্ত নোটিফিকেশন পাঠাতে নিয়োজিত।',
            'avatar' => $avOfficial,
            'joinedDate' => '2026-01-01T12:00:00Z'
        ]
    ];

    $tweets = [
        [
            'id' => 'tweet_1',
            'username' => 'chirkut_official',
            'content' => 'শুভকামনা চিরকুট প্ল্যাটফর্মে! বন্ধু ও প্রিয়জনদের সাথে ব্যক্তিগত চিঠি (চিরকুট) ও পাবলিক টুইট শেয়ার করতে থাকুন। ❤️ আপনার যেকোনো সুন্দর চিরকুট আমাদের সাথেও শেয়ার করতে পারেন।',
            'createdAt' => '2026-07-16T10:00:00Z',
            'loves' => [],
            'comments' => [],
            'repostCount' => 0,
            'repostedBy' => [],
            'originalTweetId' => null
        ]
    ];

    db_write('users', $users);
    db_write('tweets', $tweets);
    db_write('chirkuts', []);
    db_write('friendships', []);
    db_write('notifications', []);
}
