<?php
session_name('foodies_session');
session_start();

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Not authenticated']);
    exit;
}

$rawInput = file_get_contents('php://input');
$body = json_decode($rawInput, true);
if ($body === null && json_last_error() !== JSON_ERROR_NONE) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Malformed JSON body']);
    exit;
}

$friend_id = isset($body['friend_id']) ? (int)$body['friend_id'] : 0;
$user_id = (int)$_SESSION['user_id'];

if ($friend_id <= 0 || $friend_id === $user_id) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid friend_id']);
    exit;
}

require_once __DIR__ . '/connect.php';

// Confirm the target user exists before deleting the friendship.
$userCheckQuery = 'SELECT 1 FROM users WHERE id = ?';
$userCheckStmt = mysqli_prepare($conn, $userCheckQuery);
if (!$userCheckStmt) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'DB prepare failed']);
    exit;
}

mysqli_stmt_bind_param($userCheckStmt, 'i', $friend_id);
mysqli_stmt_execute($userCheckStmt);
mysqli_stmt_store_result($userCheckStmt);
if (mysqli_stmt_num_rows($userCheckStmt) === 0) {
    mysqli_stmt_close($userCheckStmt);
    mysqli_close($conn);
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Friend user not found']);
    exit;
}
mysqli_stmt_close($userCheckStmt);

$query = "DELETE FROM friendships WHERE ((sender_id = ? AND recipient_id = ?) OR (sender_id = ? AND recipient_id = ?)) AND status = 'accepted'";
$stmt = mysqli_prepare($conn, $query);
if (!$stmt) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'DB prepare failed']);
    exit;
}

mysqli_stmt_bind_param($stmt, 'iiii', $user_id, $friend_id, $friend_id, $user_id);
$executed = mysqli_stmt_execute($stmt);
$affected = mysqli_stmt_affected_rows($stmt);
mysqli_stmt_close($stmt);
mysqli_close($conn);

if (!$executed) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database error']);
    exit;
}

if ($affected === 0) {
    echo json_encode(['success' => false, 'message' => 'No accepted friendship found with this user']);
    exit;
}

echo json_encode(['success' => true, 'message' => 'Friend removed successfully']);
exit;
