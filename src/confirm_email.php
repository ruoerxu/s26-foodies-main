<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(["error" => "Method not allowed"]);
    exit;
}

$token = $_GET['token'] ?? '';
if (!$token || strlen($token) !== 64) {
    http_response_code(400);
    echo json_encode(["error" => "Invalid or missing token"]);
    exit;
}

include 'connect.php';

$stmt = mysqli_prepare($conn, 'SELECT id, email_confirmed FROM users WHERE email_token = ?');
if (!$stmt) {
    http_response_code(500);
    echo json_encode(["error" => "DB prepare failed"]);
    exit;
}
mysqli_stmt_bind_param($stmt, 's', $token);
mysqli_stmt_execute($stmt);
mysqli_stmt_bind_result($stmt, $userId, $confirmed);

if (!mysqli_stmt_fetch($stmt)) {
    http_response_code(400);
    echo json_encode(["error" => "Invalid or expired token"]);
    $stmt->close();
    $conn->close();
    exit;
}

if ($confirmed) {
    http_response_code(200);
    echo json_encode(["success" => true, "message" => "Email already confirmed."]);
    $stmt->close();
    $conn->close();
    exit;
}

$stmt->close();

// Mark email as confirmed and clear token
$update = mysqli_prepare($conn, 'UPDATE users SET email_confirmed = 1, email_token = NULL WHERE id = ?');
if (!$update) {
    http_response_code(500);
    echo json_encode(["error" => "DB update failed"]);
    $conn->close();
    exit;
}
mysqli_stmt_bind_param($update, 'i', $userId);
mysqli_stmt_execute($update);
mysqli_stmt_close($update);

mysqli_close($conn);

http_response_code(200);
echo json_encode(["success" => true, "message" => "Email confirmed successfully."]);
