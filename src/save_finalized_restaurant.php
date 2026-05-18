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

$partyName      = trim((string)($body['party_name'] ?? ''));
$restaurantName = trim((string)($body['restaurant_name'] ?? ''));

if ($partyName === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'party_name is required']);
    exit;
}
if ($restaurantName === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'restaurant_name is required']);
    exit;
}

$rating     = isset($body['rating'])     ? floatval($body['rating'])     : null;
$cost       = isset($body['cost'])       ? trim((string)$body['cost'])   : null;
$distance   = isset($body['distance'])   ? floatval($body['distance'])   : null;
$cuisine    = isset($body['cuisine'])    ? trim((string)$body['cuisine']): null;
$matchScore = isset($body['match_score'])? floatval($body['match_score']): null;
$tags       = isset($body['tags']) && is_array($body['tags'])
                ? json_encode($body['tags'])
                : (isset($body['tags']) ? trim((string)$body['tags']) : null);

require_once __DIR__ . '/connect.php';

$userId = (int)$_SESSION['user_id'];

// Look up party and verify user is the organizer
$stmt = mysqli_prepare($conn, 'SELECT id, organizer_id FROM parties WHERE name = ? LIMIT 1');
if (!$stmt) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'DB error']);
    exit;
}
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
    echo json_encode(['success' => false, 'message' => 'Only the party organizer can select the restaurant']);
    exit;
}

// Create table if it doesn't exist
mysqli_query($conn, 'CREATE TABLE IF NOT EXISTS finalized_plan (
    id INT AUTO_INCREMENT PRIMARY KEY,
    party_id INT NOT NULL UNIQUE,
    restaurant_name VARCHAR(255) NOT NULL,
    rating DECIMAL(3,1) DEFAULT NULL,
    cost VARCHAR(10) DEFAULT NULL,
    distance DECIMAL(5,1) DEFAULT NULL,
    cuisine VARCHAR(100) DEFAULT NULL,
    tags TEXT DEFAULT NULL,
    match_score DECIMAL(5,1) DEFAULT NULL,
    meeting_date VARCHAR(100) DEFAULT NULL,
    meeting_time VARCHAR(100) DEFAULT NULL,
    meeting_location VARCHAR(500) DEFAULT NULL,
    confirmed TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
)');

// Upsert — one plan per party
$stmt = mysqli_prepare($conn,
    'INSERT INTO finalized_plan (party_id, restaurant_name, rating, cost, distance, cuisine, tags, match_score, confirmed)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
     ON DUPLICATE KEY UPDATE
         restaurant_name = VALUES(restaurant_name),
         rating          = VALUES(rating),
         cost            = VALUES(cost),
         distance        = VALUES(distance),
         cuisine         = VALUES(cuisine),
         tags            = VALUES(tags),
         match_score     = VALUES(match_score),
         meeting_date    = NULL,
         meeting_time    = NULL,
         meeting_location= NULL,
         confirmed       = 0,
         updated_at      = CURRENT_TIMESTAMP'
);
if (!$stmt) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'DB error']);
    exit;
}
mysqli_stmt_bind_param($stmt, 'isdsdssd',
    $partyId, $restaurantName, $rating, $cost, $distance, $cuisine, $tags, $matchScore
);
if (!mysqli_stmt_execute($stmt)) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Failed to save restaurant']);
    mysqli_stmt_close($stmt);
    exit;
}
mysqli_stmt_close($stmt);
mysqli_close($conn);

http_response_code(200);
echo json_encode(['success' => true, 'message' => 'Restaurant saved to finalized plan']);
