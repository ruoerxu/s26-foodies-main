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

$sender_id = (int) $_SESSION['user_id'];
$body = json_decode(file_get_contents('php://input'), true);
$recipient_id = isset($body['user_id']) ? (int)$body['user_id'] : 0;

if ($recipient_id <= 0 || $recipient_id === $sender_id) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid recipient user ID']);
    exit;
}

// Removed early echo of $success; only output JSON after all logic is complete
// Check if recipient user exists
$user_check_query = "SELECT 1 FROM users WHERE id = ?";
$user_check_stmt = mysqli_prepare($conn, $user_check_query);
    mysqli_stmt_bind_param($user_check_stmt, 'i', $recipient_id);
    mysqli_stmt_execute($user_check_stmt);
    mysqli_stmt_store_result($user_check_stmt);
if (mysqli_stmt_num_rows($user_check_stmt) === 0) {
       // Remove duplicate echo and handle response here
       mysqli_stmt_close($user_check_stmt);
       mysqli_close($conn);
       http_response_code(400);
       echo json_encode(['success' => false, 'message' => 'Recipient user does not exist']);
       exit;
}
mysqli_stmt_close($user_check_stmt);

// Check if a friendship already exists
$check_query = "SELECT 1 FROM friendships WHERE (sender_id = ? AND recipient_id = ?) OR (sender_id = ? AND recipient_id = ?)";
$check_stmt = mysqli_prepare($conn, $check_query);
mysqli_stmt_bind_param($check_stmt, 'iiii', $sender_id, $recipient_id, $recipient_id, $sender_id);
mysqli_stmt_execute($check_stmt);
mysqli_stmt_store_result($check_stmt);
if (mysqli_stmt_num_rows($check_stmt) > 0) {
    mysqli_stmt_close($check_stmt);
    mysqli_close($conn);
    echo json_encode(['success' => false, 'message' => 'Friend request already exists or users are already friends']);
    exit;
}
mysqli_stmt_close($check_stmt);

// Insert new friendship with pending status
$insert_query = "INSERT INTO friendships (sender_id, recipient_id, status) VALUES (?, ?, 'pending')";
$insert_stmt = mysqli_prepare($conn, $insert_query);
if (!$insert_stmt) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'DB prepare failed']);
    exit;
}
mysqli_stmt_bind_param($insert_stmt, 'ii', $sender_id, $recipient_id);
$success = mysqli_stmt_execute($insert_stmt);
mysqli_stmt_close($insert_stmt);
mysqli_close($conn);

echo json_encode(['success' => $success]);
exit;
