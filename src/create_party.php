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

$contentType = $_SERVER['CONTENT_TYPE'] ?? '';
$isMultipart = stripos($contentType, 'multipart/form-data') !== false;

$payload = [];
if ($isMultipart) {
    $payload = $_POST;
} else {
    $decoded = json_decode(file_get_contents('php://input'), true);
    if (is_array($decoded)) {
        $payload = $decoded;
    }
}

$partyName = trim((string)($payload['name'] ?? ''));
if ($partyName === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Party name is required']);
    exit;
}

$invitedFriends = $payload['invited_friends'] ?? [];
if (is_string($invitedFriends)) {
    $decodedFriends = json_decode($invitedFriends, true);
    $invitedFriends = is_array($decodedFriends) ? $decodedFriends : [];
}
if (!is_array($invitedFriends)) {
    $invitedFriends = [];
}

$partyImageUrl = trim((string)($payload['image_url'] ?? ''));
if ($isMultipart && isset($_FILES['image']) && (int)$_FILES['image']['error'] === UPLOAD_ERR_OK) {
    $imageTmpPath = $_FILES['image']['tmp_name'] ?? '';
    $imageMime = (string)($_FILES['image']['type'] ?? '');
    $allowedMimes = [
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/gif' => 'gif',
        'image/webp' => 'webp',
    ];

    if (!isset($allowedMimes[$imageMime])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Unsupported image format']);
        exit;
    }

    $uploadDirFs = dirname(__DIR__) . '/uploads/parties';
    if (!is_dir($uploadDirFs) && !mkdir($uploadDirFs, 0777, true) && !is_dir($uploadDirFs)) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to create upload folder']);
        exit;
    }

    $fileName = 'party_' . bin2hex(random_bytes(8)) . '.' . $allowedMimes[$imageMime];
    $targetFsPath = $uploadDirFs . '/' . $fileName;
    if (!move_uploaded_file($imageTmpPath, $targetFsPath)) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to save image']);
        exit;
    }

    $scriptDir = str_replace('\\', '/', (string)dirname($_SERVER['SCRIPT_NAME'] ?? '/src'));
    $basePath = preg_replace('#/src/?$#', '', rtrim($scriptDir, '/'));
    $partyImageUrl = ($basePath === '' ? '' : $basePath) . '/uploads/parties/' . $fileName;
}

$friendIds = [];
foreach ($invitedFriends as $value) {
    $friendId = filter_var($value, FILTER_VALIDATE_INT);
    if ($friendId === false) {
        continue;
    }
    $friendId = (int)$friendId;
    if ($friendId <= 0) {
        continue;
    }
    $friendIds[$friendId] = true;
}
$friendIds = array_keys($friendIds);

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

$organizerId = (int)$_SESSION['user_id'];

mysqli_begin_transaction($conn);

try {
    $insertParty = mysqli_prepare($conn, 'INSERT INTO parties (name, image_url, organizer_id) VALUES (?, ?, ?)');
    mysqli_stmt_bind_param($insertParty, 'ssi', $partyName, $partyImageUrl, $organizerId);
    mysqli_stmt_execute($insertParty);
    $partyId = mysqli_insert_id($conn);
    mysqli_stmt_close($insertParty);

    $insertMember = mysqli_prepare($conn, 'INSERT IGNORE INTO party_members (party_id, user_id) VALUES (?, ?)');
    mysqli_stmt_bind_param($insertMember, 'ii', $partyId, $organizerId);
    mysqli_stmt_execute($insertMember);

    if (!empty($friendIds)) {
        $validateFriend = mysqli_prepare($conn, '
            SELECT 1
            FROM friendships
            WHERE status = \'accepted\'
              AND (
                (sender_id = ? AND recipient_id = ?)
                OR (sender_id = ? AND recipient_id = ?)
              )
            LIMIT 1
        ');

        foreach ($friendIds as $friendId) {
            if ((int)$friendId === $organizerId) {
                continue;
            }

            mysqli_stmt_bind_param($validateFriend, 'iiii', $organizerId, $friendId, $friendId, $organizerId);
            mysqli_stmt_execute($validateFriend);
            mysqli_stmt_store_result($validateFriend);

            if (mysqli_stmt_num_rows($validateFriend) > 0) {
                mysqli_stmt_bind_param($insertMember, 'ii', $partyId, $friendId);
                mysqli_stmt_execute($insertMember);
            }

            mysqli_stmt_free_result($validateFriend);
        }

        mysqli_stmt_close($validateFriend);
    }

    mysqli_stmt_close($insertMember);

    $countStmt = mysqli_prepare($conn, 'SELECT COUNT(*) FROM party_members WHERE party_id = ?');
    mysqli_stmt_bind_param($countStmt, 'i', $partyId);
    mysqli_stmt_execute($countStmt);
    mysqli_stmt_bind_result($countStmt, $memberCount);
    mysqli_stmt_fetch($countStmt);
    mysqli_stmt_close($countStmt);

    mysqli_commit($conn);

    echo json_encode([
        'success' => true,
        'party' => [
            'id' => $partyId,
            'name' => $partyName,
            'image_url' => $partyImageUrl,
            'members' => (int)$memberCount,
        ],
    ]);
} catch (Throwable $error) {
    mysqli_rollback($conn);
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Failed to create party',
        'error' => $error->getMessage(),
    ]);
}

mysqli_close($conn);
?>
