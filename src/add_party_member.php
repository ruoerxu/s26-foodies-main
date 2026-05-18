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

require_once __DIR__ . '/connect.php';

$user_id    = (int) $_SESSION['user_id'];

$rawBody = file_get_contents('php://input');
$body = json_decode($rawBody, true);
if (!is_array($body)) {
	if (trim((string)$rawBody) === '') {
		http_response_code(400);
		echo json_encode(['success' => false, 'message' => 'Invalid request body format']);
		exit;
	} else {
		http_response_code(400);
		echo json_encode(['success' => false, 'message' => 'Invalid request body format']);
		exit;
	}
}

$party_id = (int) ($body['party_id'] ?? -1);
$target_id = (int) ($body['target_id'] ?? -1);

if ($party_id === -1) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'party_id is required']);
    exit;
}
if ($target_id === -1) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'target_id is required']);
    exit;
}

// Check that the party exists AND the user is a member
$check_sql  = "
    SELECT *
    FROM party_members
    WHERE party_id = ? AND user_id = ?";
$check_stmt = mysqli_prepare($conn, $check_sql);
if (!$check_stmt) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'DB prepare failed']);
    exit;
}
mysqli_stmt_bind_param($check_stmt, 'ii', $party_id, $user_id);
mysqli_stmt_execute($check_stmt);
$check_result = mysqli_stmt_get_result($check_stmt);

if (mysqli_num_rows($check_result) === 0) {
    // Could be that the party doesn't exist, or the user isn't a member.
    // We intentionally return the same message for both to avoid leaking info.
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Party not found or you are not a member']);
    exit;
}

mysqli_stmt_close($check_stmt);

// Check that the target user exists and is a friend of the current user
$check_sql  = "
    SELECT *
    FROM friendships
    WHERE (sender_id = ? AND recipient_id = ?) OR (sender_id = ? AND recipient_id = ?)";
$check_stmt = mysqli_prepare($conn, $check_sql);
if (!$check_stmt) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'DB prepare failed']);
    exit;
}
mysqli_stmt_bind_param($check_stmt, 'iiii', $user_id, $target_id, $target_id, $user_id);
mysqli_stmt_execute($check_stmt);
$check_result = mysqli_stmt_get_result($check_stmt);

if (mysqli_num_rows($check_result) === 0) {
    // Could be that the party doesn't exist, or the user isn't a member.
    // We intentionally return the same message for both to avoid leaking info.
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Target user not found or is not a friend of the current user']);
    exit;
}

mysqli_stmt_close($check_stmt);

// Check that the target user is not already a member of the party
$check_sql  = "
    SELECT *
    FROM party_members
    WHERE party_id = ? AND user_id = ?";
$check_stmt = mysqli_prepare($conn, $check_sql);
if (!$check_stmt) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'DB prepare failed']);
    exit;
}
mysqli_stmt_bind_param($check_stmt, 'ii', $party_id, $target_id);
mysqli_stmt_execute($check_stmt);
$check_result = mysqli_stmt_get_result($check_stmt);

if (mysqli_num_rows($check_result) !== 0) {
    // Could be that the party doesn't exist, or the user isn't a member.
    // We intentionally return the same message for both to avoid leaking info.
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Target user is already a member of the party']);
    exit;
}

mysqli_stmt_close($check_stmt);

$add_sql  = "INSERT INTO party_members (party_id, user_id) VALUES (?, ?)";
$add_stmt = mysqli_prepare($conn, $add_sql);
if (!$add_stmt) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'DB prepare failed']);
    exit;
}
mysqli_stmt_bind_param($add_stmt, 'ii', $party_id, $target_id);
mysqli_stmt_execute($add_stmt);
mysqli_stmt_close($add_stmt);
mysqli_close($conn);

echo json_encode(['success' => true, 'message' => 'User added to party successfully']);
exit;