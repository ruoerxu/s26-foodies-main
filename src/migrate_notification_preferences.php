<?php
session_name('foodies_session');
session_start();

header('Content-Type: application/json; charset=utf-8');

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Not authenticated']);
    exit;
}

require_once __DIR__ . '/connect.php';

$result = mysqli_query($conn, "
    CREATE TABLE IF NOT EXISTS party_notification_preferences (
        user_id  INT NOT NULL,
        party_id INT NOT NULL,
        pref_key VARCHAR(50) NOT NULL,
        enabled  TINYINT(1) NOT NULL DEFAULT 1,
        PRIMARY KEY (user_id, party_id, pref_key)
    )
");

if (!$result) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => mysqli_error($conn)]);
    mysqli_close($conn);
    exit;
}

mysqli_close($conn);
echo json_encode(['success' => true, 'message' => 'party_notification_preferences table ready']);
