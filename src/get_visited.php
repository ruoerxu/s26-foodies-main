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

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
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

$partyName = trim((string)($_GET['party_name'] ?? ''));
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

// Create table if it doesn't exist
mysqli_query($conn, 'CREATE TABLE IF NOT EXISTS visited_restaurants (
    id INT AUTO_INCREMENT PRIMARY KEY,
    party_id INT NOT NULL,
    restaurant_id VARCHAR(255) NOT NULL,
    visited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_visit (party_id, restaurant_id)
)');

// Fetch all visited restaurant IDs for this party
$stmt = mysqli_prepare($conn,
    'SELECT restaurant_id FROM visited_restaurants WHERE party_id = ?');
if (!$stmt) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'DB error']);
    exit;
}
mysqli_stmt_bind_param($stmt, 'i', $partyId);
mysqli_stmt_execute($stmt);
mysqli_stmt_bind_result($stmt, $restaurantId);

$visited = [];
while (mysqli_stmt_fetch($stmt)) {
    $visited[] = $restaurantId;
}
mysqli_stmt_close($stmt);
mysqli_close($conn);

http_response_code(200);
echo json_encode(['success' => true, 'visited' => $visited]);
