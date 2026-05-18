<?php
session_name('foodies_session');
session_start();

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];
if ($method !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Not authenticated']);
    exit;
}

require_once __DIR__ . '/connect.php';

$userId = (int) $_SESSION['user_id'];


$search = isset($_GET['search']) ? $_GET['search'] : '';

// Find all accepted friends for the current user
$query = "
    SELECT u.id AS user_id, u.username, u.img_addr
    FROM friendships f
    JOIN users u ON (
        (f.sender_id = ? AND u.id = f.recipient_id)
        OR (f.recipient_id = ? AND u.id = f.sender_id)
    )
    WHERE f.status = 'accepted'"
    . ($search !== '' ? " AND u.username LIKE CONCAT('%', ?, '%')" : "");

$stmt = mysqli_prepare($conn, $query);
if (!$stmt) {
    http_response_code(500);
    echo json_encode(["error" => "DB prepare failed"]);
    exit;
}

if ($search !== '') {
    mysqli_stmt_bind_param($stmt, 'iis', $userId, $userId, $search);
} else {
    mysqli_stmt_bind_param($stmt, 'ii', $userId, $userId);
}

mysqli_stmt_execute($stmt);
mysqli_stmt_bind_result($stmt, $friend_id, $friend_username, $img_addr);

$friends = [];
while (mysqli_stmt_fetch($stmt)) {
    $friends[] = [
        'user_id' => $friend_id,
        'username' => $friend_username,
        'img_addr' => $img_addr === null ? null : $img_addr
    ];
}
mysqli_stmt_close($stmt);
mysqli_close($conn);

echo json_encode(['friends' => $friends]);
exit;