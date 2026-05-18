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
$search = isset($_GET['search']) ? trim($_GET['search']) : '';

if ($search === '') {
    echo json_encode(['users' => []]);
    exit;
}

// Find users matching search, excluding self
$query = "SELECT u.id, u.username FROM users u WHERE u.id != ? AND u.username LIKE CONCAT('%', ?, '%')";
$stmt = mysqli_prepare($conn, $query);
if (!$stmt) {
    http_response_code(500);
    echo json_encode(["error" => "DB prepare failed"]);
    exit;
}
mysqli_stmt_bind_param($stmt, 'is', $userId, $search);
mysqli_stmt_execute($stmt);
mysqli_stmt_store_result($stmt); // Buffer results so we can run subqueries
mysqli_stmt_bind_result($stmt, $other_id, $other_username);

$users = [];
while (mysqli_stmt_fetch($stmt)) {
    // Check if already friends (accepted or pending)
    $friend_query = "SELECT 1 FROM friendships WHERE ((sender_id = ? AND recipient_id = ?) OR (sender_id = ? AND recipient_id = ?))";
    $friend_stmt = mysqli_prepare($conn, $friend_query);
    mysqli_stmt_bind_param($friend_stmt, 'iiii', $userId, $other_id, $other_id, $userId);
    mysqli_stmt_execute($friend_stmt);
    mysqli_stmt_store_result($friend_stmt);
    $is_friend = mysqli_stmt_num_rows($friend_stmt) > 0;
    mysqli_stmt_close($friend_stmt);

    $users[] = [
        'user_id' => $other_id,
        'username' => $other_username,
        'is_friend' => $is_friend
    ];
}
mysqli_stmt_close($stmt);
mysqli_close($conn);

echo json_encode(['users' => $users]);
exit;
