<?php
session_name('foodies_session');
session_start();

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];
if ($method !== 'POST') {
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

$recipient_id = (int) $_SESSION['user_id'];
$body = json_decode(file_get_contents('php://input'), true);
$sender_id = isset($body['user_id']) ? (int)$body['user_id'] : 0;

if ($sender_id <= 0 || $sender_id === $recipient_id) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid user_id']);
    exit;
}

// Delete the pending friendship request
$query = "DELETE FROM friendships WHERE sender_id = ? AND recipient_id = ? AND status = 'pending'";
$stmt = mysqli_prepare($conn, $query);
if (!$stmt) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'DB prepare failed']);
    exit;
}
mysqli_stmt_bind_param($stmt, 'ii', $sender_id, $recipient_id);
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
    echo json_encode(['success' => false, 'message' => 'No pending friend request from this user or user does not exist']);
    exit;
}

echo json_encode(['success' => true]);
exit;
