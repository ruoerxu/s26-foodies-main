<?php
session_name('foodies_session');
session_start();

header('Content-Type: application/json; charset=utf-8');
header('Vary: Origin');
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin !== '') {
    $originHost = parse_url($origin, PHP_URL_HOST);
    $isLocalOrigin = in_array($originHost, ['localhost', '127.0.0.1'], true);
    $isBuffaloCseOrigin = is_string($originHost) && (
        $originHost === 'aptitude.cse.buffalo.edu'
        || $originHost === 'cattle.cse.buffalo.edu'
        || str_ends_with($originHost, '.cse.buffalo.edu')
    );
    if ($isLocalOrigin || $isBuffaloCseOrigin) {
        header('Access-Control-Allow-Origin: ' . $origin);
    }
}

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

$body = json_decode(file_get_contents('php://input'), true);
if (!is_array($body)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid request body format']);
    exit;
}

$partyId = isset($body['party_id']) ? (int) $body['party_id'] : 0;
if ($partyId <= 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'party_id is required and must be a positive integer']);
    exit;
}

$notificationType = $body['notification_type'] ?? '';
$validKeys = ['member_joined', 'member_left', 'plan_finalized', 'new_recommendations', 'restaurant_visited'];
if (!in_array($notificationType, $validKeys, true)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid notification_type']);
    exit;
}

if (!isset($body['enabled']) || !is_bool($body['enabled'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'enabled must be a boolean']);
    exit;
}
$enabled = $body['enabled'] ? 1 : 0;

require_once __DIR__ . '/connect.php';

$userId = (int) $_SESSION['user_id'];

$stmt = mysqli_prepare($conn, "
    INSERT INTO party_notification_preferences (user_id, party_id, pref_key, enabled)
    VALUES (?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE enabled = VALUES(enabled)
");
if (!$stmt) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'DB prepare failed']);
    mysqli_close($conn);
    exit;
}

mysqli_stmt_bind_param($stmt, 'iisi', $userId, $partyId, $notificationType, $enabled);
mysqli_stmt_execute($stmt);
mysqli_stmt_close($stmt);
mysqli_close($conn);

echo json_encode(['success' => true, 'message' => 'Preference updated']);
