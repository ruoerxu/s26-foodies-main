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

require_once __DIR__ . '/connect.php';

$user_id    = (int) $_SESSION['user_id'];
$party_name = $_GET['party_name'] ?? '';

if ($party_name === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'party_name is required']);
    exit;
}

// Check that the party exists AND the user is a member
$check_sql  = "
    SELECT p.id
    FROM parties p JOIN party_members m ON p.id = m.party_id
    WHERE p.name = ? AND m.user_id = ?";
$check_stmt = mysqli_prepare($conn, $check_sql);
if (!$check_stmt) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'DB prepare failed']);
    exit;
}
mysqli_stmt_bind_param($check_stmt, 'si', $party_name, $user_id);
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

// Fetch all members of the party
$query = "
    SELECT u.id as user_id, u.username as name, u.img_addr
    FROM users u JOIN party_members m ON u.id = m.user_id
    WHERE m.party_id = (
        SELECT id
        FROM parties p JOIN party_members m ON p.id = m.party_id
        WHERE p.name = ? AND m.user_id = ?
    )";
$stmt = mysqli_prepare($conn, $query);
if (!$stmt) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'DB prepare failed']);
    exit;
}
mysqli_stmt_bind_param($stmt, 'si', $party_name, $user_id);
mysqli_stmt_execute($stmt);
$result  = mysqli_stmt_get_result($stmt);
$members = [];

while ($row = mysqli_fetch_assoc($result)) {
    $members[] = [
        'user_id' => $row['user_id'],
        'username' => $row['name'],
        'img_addr' => $row['img_addr']
    ];
}

mysqli_stmt_close($stmt);
mysqli_close($conn);

echo json_encode(['success' => true, 'members' => $members]);
exit;