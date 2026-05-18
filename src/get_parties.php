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
$hasImageColumnResult = mysqli_query($conn, "SHOW COLUMNS FROM parties LIKE 'image_url'");
if (!$hasImageColumnResult) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Failed to verify parties schema']);
    mysqli_close($conn);
    exit;
}
if (mysqli_num_rows($hasImageColumnResult) === 0) {
    if (!mysqli_query($conn, "ALTER TABLE parties ADD COLUMN image_url LONGTEXT DEFAULT NULL")) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to update parties schema']);
        mysqli_close($conn);
        exit;
    }
}
mysqli_free_result($hasImageColumnResult);

mysqli_query($conn, '
    CREATE TABLE IF NOT EXISTS party_members (
        party_id INT NOT NULL,
        user_id INT NOT NULL,
        PRIMARY KEY (party_id, user_id)
    )
');

$userId = (int)$_SESSION['user_id'];

$stmt = mysqli_prepare($conn, '
    SELECT
        p.id,
        p.name,
        p.image_url,
        (SELECT COUNT(*) FROM party_members pm_count WHERE pm_count.party_id = p.id) AS member_count
    FROM parties p
    LEFT JOIN party_members pm_user ON pm_user.party_id = p.id AND pm_user.user_id = ?
    WHERE p.organizer_id = ? OR pm_user.user_id IS NOT NULL
    GROUP BY p.id, p.name, p.created_at
    ORDER BY p.created_at DESC, p.id DESC
');

mysqli_stmt_bind_param($stmt, 'ii', $userId, $userId);
mysqli_stmt_execute($stmt);
mysqli_stmt_bind_result($stmt, $partyId, $partyName, $partyImageUrl, $memberCount);

$parties = [];
while (mysqli_stmt_fetch($stmt)) {
    $imageOutput = $partyImageUrl;
    if (is_string($partyImageUrl) && $partyImageUrl !== '' && str_starts_with($partyImageUrl, '/')) {
        $isHttps = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
        $scheme = $isHttps ? 'https' : 'http';
        $host = $_SERVER['HTTP_HOST'] ?? ($_SERVER['SERVER_NAME'] ?? 'localhost');
        $imageOutput = $scheme . '://' . $host . $partyImageUrl;
    }

    $parties[] = [
        'id' => (int)$partyId,
        'name' => $partyName,
        'image_url' => $imageOutput,
        'members' => (int)$memberCount,
    ];
}

mysqli_stmt_close($stmt);
mysqli_close($conn);

echo json_encode([
    'success' => true,
    'parties' => $parties,
]);
?>
