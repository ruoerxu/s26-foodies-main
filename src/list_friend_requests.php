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

$query = "SELECT u.id AS user_id, u.username FROM friendships f JOIN users u ON f.sender_id = u.id WHERE f.recipient_id = ? AND f.status = 'pending'";
$stmt = mysqli_prepare($conn, $query);
if (!$stmt) {
    http_response_code(500);
    echo json_encode(["error" => "DB prepare failed"]);
    exit;
}
mysqli_stmt_bind_param($stmt, 'i', $userId);
mysqli_stmt_execute($stmt);
mysqli_stmt_bind_result($stmt, $request_id, $request_username);

$requests = [];
while (mysqli_stmt_fetch($stmt)) {
    $requests[] = [
        'user_id' => $request_id,
        'username' => $request_username
    ];
}
mysqli_stmt_close($stmt);
mysqli_close($conn);

echo json_encode(['requests' => $requests]);
exit;
