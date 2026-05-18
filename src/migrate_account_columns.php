<?php
/**
 * One-time migration: add email and phone columns to users for account settings.
 * Run against the same DB as connect.php. Safe to run multiple times.
 */
require_once __DIR__ . '/connect.php';

header('Content-Type: application/json; charset=utf-8');

$added = [];

$checkEmail = mysqli_query($conn, "SHOW COLUMNS FROM users LIKE 'email'");
if (!$checkEmail || !mysqli_fetch_assoc($checkEmail)) {
    if ($checkEmail) mysqli_free_result($checkEmail);
    if (mysqli_query($conn, "ALTER TABLE users ADD COLUMN email VARCHAR(255) DEFAULT NULL") === true) {
        $added[] = 'email';
    }
} elseif ($checkEmail) {
    mysqli_free_result($checkEmail);
}

$checkPhone = mysqli_query($conn, "SHOW COLUMNS FROM users LIKE 'phone'");
if (!$checkPhone || !mysqli_fetch_assoc($checkPhone)) {
    if ($checkPhone) mysqli_free_result($checkPhone);
    if (mysqli_query($conn, "ALTER TABLE users ADD COLUMN phone VARCHAR(32) DEFAULT NULL") === true) {
        $added[] = 'phone';
    }
} elseif ($checkPhone) {
    mysqli_free_result($checkPhone);
}

mysqli_close($conn);

if (count($added) > 0) {
    echo json_encode(['ok' => true, 'message' => 'Added: ' . implode(', ', $added)]);
} else {
    echo json_encode(['ok' => true, 'message' => 'Columns email and phone already exist']);
}
