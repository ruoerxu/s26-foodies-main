<?php
session_name('foodies_session');
session_start();

header('Content-Type: application/json; charset=utf-8');
header('Vary: Origin');
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: GET, OPTIONS');
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

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Not authenticated']);
    exit;
}

$partyId = filter_input(INPUT_GET, 'party_id', FILTER_VALIDATE_INT);
if (!$partyId || $partyId <= 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'party_id is required and must be a positive integer']);
    exit;
}

require_once __DIR__ . '/connect.php';

$userId = (int) $_SESSION['user_id'];

$validKeys = ['member_joined', 'member_left', 'plan_finalized', 'new_recommendations', 'restaurant_visited'];

$stmt = mysqli_prepare($conn, "
    SELECT pref_key, enabled
    FROM party_notification_preferences
    WHERE user_id = ? AND party_id = ?
");
if (!$stmt) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'DB prepare failed']);
    mysqli_close($conn);
    exit;
}

mysqli_stmt_bind_param($stmt, 'ii', $userId, $partyId);
mysqli_stmt_execute($stmt);
$result = mysqli_stmt_get_result($stmt);

$saved = [];
while ($row = mysqli_fetch_assoc($result)) {
    $saved[$row['pref_key']] = (bool) $row['enabled'];
}
mysqli_stmt_close($stmt);
mysqli_close($conn);

// Build response — default to true for any key not yet saved
$preferences = [];
foreach ($validKeys as $key) {
    $preferences[$key] = isset($saved[$key]) ? $saved[$key] : true;
}

echo json_encode(['success' => true, 'preferences' => $preferences]);
