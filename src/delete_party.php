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

$rawBody = file_get_contents('php://input');
$payload = json_decode($rawBody, true);
if (!is_array($payload)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid request body format']);
    exit;
}

$partyId = filter_var($payload['party_id'] ?? null, FILTER_VALIDATE_INT);
$partyName = trim((string)($payload['party_name'] ?? ''));

if ($partyId === false || (int)$partyId <= 0 || $partyName === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'party_id and party_name are required']);
    exit;
}

require_once __DIR__ . '/connect.php';

mysqli_query($conn, '
    CREATE TABLE IF NOT EXISTS parties (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(120) NOT NULL,
        image_url LONGTEXT DEFAULT NULL,
        organizer_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
');

mysqli_query($conn, '
    CREATE TABLE IF NOT EXISTS party_members (
        party_id INT NOT NULL,
        user_id INT NOT NULL,
        PRIMARY KEY (party_id, user_id)
    )
');

$userId = (int)$_SESSION['user_id'];
$partyId = (int)$partyId;

$lookupStmt = mysqli_prepare($conn, 'SELECT name, organizer_id FROM parties WHERE id = ? LIMIT 1');
mysqli_stmt_bind_param($lookupStmt, 'i', $partyId);
mysqli_stmt_execute($lookupStmt);
mysqli_stmt_bind_result($lookupStmt, $storedPartyName, $organizerId);

if (!mysqli_stmt_fetch($lookupStmt)) {
    mysqli_stmt_close($lookupStmt);
    mysqli_close($conn);
    http_response_code(404);
    echo json_encode(['success' => false, 'message' => 'Party not found']);
    exit;
}
mysqli_stmt_close($lookupStmt);

if ((int)$organizerId !== $userId) {
    mysqli_close($conn);
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'You are not allowed to delete this party']);
    exit;
}

if ($storedPartyName !== $partyName) {
    mysqli_close($conn);
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Party name does not match']);
    exit;
}

mysqli_begin_transaction($conn);

try {
    $deleteMembersStmt = mysqli_prepare($conn, 'DELETE FROM party_members WHERE party_id = ?');
    mysqli_stmt_bind_param($deleteMembersStmt, 'i', $partyId);
    mysqli_stmt_execute($deleteMembersStmt);
    mysqli_stmt_close($deleteMembersStmt);

    $deletePartyStmt = mysqli_prepare($conn, 'DELETE FROM parties WHERE id = ? AND organizer_id = ?');
    mysqli_stmt_bind_param($deletePartyStmt, 'ii', $partyId, $userId);
    mysqli_stmt_execute($deletePartyStmt);
    $deletedRows = mysqli_stmt_affected_rows($deletePartyStmt);
    mysqli_stmt_close($deletePartyStmt);

    if ($deletedRows !== 1) {
        throw new RuntimeException('Failed to delete party');
    }

    mysqli_commit($conn);
    echo json_encode([
        'success' => true,
        'message' => 'Party deleted successfully',
        'party_id' => $partyId,
        'party_name' => $partyName,
    ]);
} catch (Throwable $error) {
    mysqli_rollback($conn);
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Failed to delete party',
        'error' => $error->getMessage(),
    ]);
}

mysqli_close($conn);
?>
