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

$data = json_decode(file_get_contents('php://input'), true);
$currentPassword = $data['current_password'] ?? '';
$newPassword = $data['new_password'] ?? '';

if ($currentPassword === '' || $newPassword === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Current password and new password are required']);
    exit;
}

if (strlen($newPassword) < 8) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'New password must be at least 8 characters']);
    exit;
}
if (!preg_match('/[0-9]/', $newPassword)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'New password must include a number']);
    exit;
}
if (strlen($newPassword) > 64) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'New password must be no more than 64 characters']);
    exit;
}

require_once __DIR__ . '/connect.php';

$userId = (int) $_SESSION['user_id'];

$stmt = mysqli_prepare($conn, 'SELECT password FROM users WHERE id = ?');
mysqli_stmt_bind_param($stmt, 'i', $userId);
mysqli_stmt_execute($stmt);
mysqli_stmt_bind_result($stmt, $storedHash);
if (!mysqli_stmt_fetch($stmt)) {
    mysqli_stmt_close($stmt);
    mysqli_close($conn);
    http_response_code(404);
    echo json_encode(['success' => false, 'message' => 'User not found']);
    exit;
}
mysqli_stmt_close($stmt);

if (!password_verify($currentPassword, $storedHash)) {
    mysqli_close($conn);
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Current password is incorrect']);
    exit;
}

$newHash = password_hash($newPassword, PASSWORD_BCRYPT);
$update = mysqli_prepare($conn, 'UPDATE users SET password = ? WHERE id = ?');
mysqli_stmt_bind_param($update, 'si', $newHash, $userId);
mysqli_stmt_execute($update);
mysqli_stmt_close($update);
mysqli_close($conn);

echo json_encode(['success' => true, 'message' => 'Password updated']);
?>
