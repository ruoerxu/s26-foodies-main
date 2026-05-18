<?php
ob_start();
session_name('foodies_session');
session_start();

header_remove('Access-Control-Allow-Origin');
header_remove('Access-Control-Allow-Credentials');
header_remove('Access-Control-Allow-Methods');
header_remove('Access-Control-Allow-Headers');
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

function ensure_group_sessions_table(mysqli $conn): bool
{
    $sql = 'CREATE TABLE IF NOT EXISTS group_sessions (
        party_id INT NOT NULL PRIMARY KEY,
        is_active TINYINT(1) NOT NULL DEFAULT 0,
        selected_cuisines TEXT DEFAULT NULL,
        latitude DECIMAL(10, 7) DEFAULT NULL,
        longitude DECIMAL(10, 7) DEFAULT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )';

    return mysqli_query($conn, $sql) === true;
}

function get_party_id_for_user(mysqli $conn, int $userId, string $partyName): ?int
{
    $sql = 'SELECT p.id
            FROM parties p
            LEFT JOIN party_members pm ON pm.party_id = p.id
            WHERE p.name = ? AND (p.organizer_id = ? OR pm.user_id = ?)
            LIMIT 1';
    $stmt = mysqli_prepare($conn, $sql);
    if (!$stmt) {
        return null;
    }

    mysqli_stmt_bind_param($stmt, 'sii', $partyName, $userId, $userId);
    mysqli_stmt_execute($stmt);
    mysqli_stmt_bind_result($stmt, $partyId);
    $result = mysqli_stmt_fetch($stmt) ? (int)$partyId : null;
    mysqli_stmt_close($stmt);

    return $result;
}

$body = json_decode(file_get_contents('php://input'), true);
if (!is_array($body)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid request']);
    exit;
}

$partyName = isset($body['party_name']) ? trim((string)$body['party_name']) : '';
if ($partyName === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid request']);
    exit;
}

$userId = (int)$_SESSION['user_id'];
$partyId = get_party_id_for_user($conn, $userId, $partyName);
if ($partyId === null) {
    http_response_code(404);
    echo json_encode(['success' => false, 'message' => "Party doesn't exist"]);
    exit;
}

if (!ensure_group_sessions_table($conn)) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database error']);
    exit;
}

$clearSql = 'INSERT INTO group_sessions (party_id, is_active, selected_cuisines, latitude, longitude)
             VALUES (?, 0, NULL, NULL, NULL)
             ON DUPLICATE KEY UPDATE
                is_active = 0,
                selected_cuisines = NULL,
                latitude = NULL,
                longitude = NULL';
$stmt = mysqli_prepare($conn, $clearSql);
if (!$stmt) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database error']);
    exit;
}

mysqli_stmt_bind_param($stmt, 'i', $partyId);
$ok = mysqli_stmt_execute($stmt);
mysqli_stmt_close($stmt);

if (!$ok) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database error']);
    exit;
}

echo json_encode(['success' => true, 'message' => 'Session cleared successfully']);