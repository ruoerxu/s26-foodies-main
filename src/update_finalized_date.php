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

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
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
    echo json_encode(['success' => false, 'message' => 'Invalid JSON body']);
    exit;
}

$partyName = trim((string)($body['party_name'] ?? ''));
$date      = trim((string)($body['date'] ?? ''));

if ($partyName === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'party_name is required']);
    exit;
}
if ($date === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'date is required']);
    exit;
}

require_once __DIR__ . '/connect.php';

$userId = (int)$_SESSION['user_id'];

// Verify organizer
$stmt = mysqli_prepare($conn, 'SELECT id, organizer_id FROM parties WHERE name = ? LIMIT 1');
if (!$stmt) { http_response_code(500); echo json_encode(['success' => false, 'message' => 'DB error']); exit; }
mysqli_stmt_bind_param($stmt, 's', $partyName);
mysqli_stmt_execute($stmt);
mysqli_stmt_bind_result($stmt, $partyId, $organizerId);
$found = mysqli_stmt_fetch($stmt);
mysqli_stmt_close($stmt);

if (!$found) {
    http_response_code(404);
    echo json_encode(['success' => false, 'message' => 'Party not found']);
    exit;
}
if ((int)$organizerId !== $userId) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Only the party organizer can update meeting details']);
    exit;
}

// Verify finalized plan exists
$stmt = mysqli_prepare($conn, 'SELECT id FROM finalized_plan WHERE party_id = ? LIMIT 1');
if (!$stmt) { http_response_code(500); echo json_encode(['success' => false, 'message' => 'DB error']); exit; }
mysqli_stmt_bind_param($stmt, 'i', $partyId);
mysqli_stmt_execute($stmt);
mysqli_stmt_bind_result($stmt, $planId);
$planFound = mysqli_stmt_fetch($stmt);
mysqli_stmt_close($stmt);

if (!$planFound) {
    http_response_code(404);
    echo json_encode(['success' => false, 'message' => 'No finalized plan found for this party']);
    exit;
}

$stmt = mysqli_prepare($conn, 'UPDATE finalized_plan SET meeting_date = ?, updated_at = CURRENT_TIMESTAMP WHERE party_id = ?');
if (!$stmt) { http_response_code(500); echo json_encode(['success' => false, 'message' => 'DB error']); exit; }
mysqli_stmt_bind_param($stmt, 'si', $date, $partyId);
mysqli_stmt_execute($stmt);
mysqli_stmt_close($stmt);
mysqli_close($conn);

http_response_code(200);
echo json_encode(['success' => true, 'message' => 'Meeting date updated successfully']);
