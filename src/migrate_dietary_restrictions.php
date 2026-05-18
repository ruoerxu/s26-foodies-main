<?php
/**
 * One-time migration: add dietary_restrictions column to users.
 * Run against the same DB as connect.php (or adjust include for local).
 */
require_once __DIR__ . '/connect.php';

header('Content-Type: application/json; charset=utf-8');

$check = mysqli_query($conn, "SHOW COLUMNS FROM users LIKE 'dietary_restrictions'");
if ($check && mysqli_fetch_assoc($check)) {
    echo json_encode(['ok' => true, 'message' => 'Column dietary_restrictions already exists']);
    mysqli_free_result($check);
    mysqli_close($conn);
    exit;
}
if ($check) {
    mysqli_free_result($check);
}

$result = mysqli_query($conn, "ALTER TABLE users ADD COLUMN dietary_restrictions TEXT DEFAULT NULL");
if ($result === false) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'message' => mysqli_error($conn)]);
    mysqli_close($conn);
    exit;
}

echo json_encode(['ok' => true, 'message' => 'Added dietary_restrictions column']);
mysqli_close($conn);
