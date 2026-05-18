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
if ($partyName === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'party_name is required']);
    exit;
}

require_once __DIR__ . '/connect.php';

$userId = (int)$_SESSION['user_id'];

// Verify user is a member or organizer of the party
$stmt = mysqli_prepare($conn,
    'SELECT p.id FROM parties p
     LEFT JOIN party_members pm ON pm.party_id = p.id
     WHERE p.name = ? AND (p.organizer_id = ? OR pm.user_id = ?) LIMIT 1');
if (!$stmt) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'DB error']);
    exit;
}
mysqli_stmt_bind_param($stmt, 'sii', $partyName, $userId, $userId);
mysqli_stmt_execute($stmt);
mysqli_stmt_bind_result($stmt, $partyId);
$found = mysqli_stmt_fetch($stmt);
mysqli_stmt_close($stmt);

if (!$found) {
    http_response_code(404);
    echo json_encode(['success' => false, 'message' => 'Party not found or access denied']);
    exit;
}

// Fetch finalized plan
$stmt = mysqli_prepare($conn,
    'SELECT restaurant_name, rating, cost, distance, cuisine, tags, match_score,
            meeting_date, meeting_time, meeting_location, confirmed
     FROM finalized_plan WHERE party_id = ? LIMIT 1');
if (!$stmt) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'DB error']);
    exit;
}
mysqli_stmt_bind_param($stmt, 'i', $partyId);
mysqli_stmt_execute($stmt);
mysqli_stmt_bind_result($stmt,
    $restaurantName, $rating, $cost, $distance, $cuisine, $tagsJson,
    $matchScore, $meetingDate, $meetingTime, $meetingLocation, $confirmed);
$planFound = mysqli_stmt_fetch($stmt);
mysqli_stmt_close($stmt);
mysqli_close($conn);

if (!$planFound) {
    http_response_code(404);
    echo json_encode(['success' => false, 'message' => 'No finalized plan found for this party']);
    exit;
}

$tags = $tagsJson ? json_decode($tagsJson, true) : [];

http_response_code(200);
echo json_encode([
    'success' => true,
    'plan' => [
        'restaurant_name'  => $restaurantName,
        'rating'           => $rating,
        'cost'             => $cost,
        'distance'         => $distance,
        'cuisine'          => $cuisine,
        'tags'             => $tags,
        'match_score'      => $matchScore,
        'meeting_date'     => $meetingDate,
        'meeting_time'     => $meetingTime,
        'meeting_location' => $meetingLocation,
        'confirmed'        => (bool)$confirmed,
    ]
]);
