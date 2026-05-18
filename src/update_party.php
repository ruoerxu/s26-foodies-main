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

$partyId = filter_var($_POST['party_id'] ?? '', FILTER_VALIDATE_INT);
if ($partyId === false || $partyId <= 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid or missing party_id']);
    exit;
}
$partyId = (int)$partyId;

$name = trim((string)($_POST['name'] ?? ''));
if ($name === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Party name is required']);
    exit;
}
if (strlen($name) > 15) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Group name cannot be greater than 15 characters']);
    exit;
}

require_once __DIR__ . '/connect.php';

$stmt = mysqli_prepare($conn, 'SELECT organizer_id, image_url FROM parties WHERE id = ? LIMIT 1');
if (!$stmt) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database error']);
    mysqli_close($conn);
    exit;
}
mysqli_stmt_bind_param($stmt, 'i', $partyId);
mysqli_stmt_execute($stmt);
mysqli_stmt_bind_result($stmt, $organizerId, $existingImageUrl);
$found = mysqli_stmt_fetch($stmt);
mysqli_stmt_close($stmt);

if (!$found) {
    http_response_code(404);
    echo json_encode(['success' => false, 'message' => 'Party not found']);
    mysqli_close($conn);
    exit;
}

if ((int)$organizerId !== (int)$_SESSION['user_id']) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => "You are not allowed to edit this party's profile"]);
    mysqli_close($conn);
    exit;
}

$partyImageUrl = (string)($existingImageUrl ?? '');

if (isset($_FILES['image']) && (int)$_FILES['image']['error'] === UPLOAD_ERR_OK) {
    if ((int)$_FILES['image']['size'] > 5 * 1024 * 1024) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Group picture cannot be larger than 5mb']);
        mysqli_close($conn);
        exit;
    }

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
        mysqli_close($conn);
        exit;
    }

    $uploadDirFs = dirname(__DIR__) . '/uploads/parties';
    if (!is_dir($uploadDirFs) && !mkdir($uploadDirFs, 0777, true) && !is_dir($uploadDirFs)) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to create upload folder']);
        mysqli_close($conn);
        exit;
    }

    $fileName = 'party_' . bin2hex(random_bytes(8)) . '.' . $allowedMimes[$imageMime];
    $targetFsPath = $uploadDirFs . '/' . $fileName;
    if (!move_uploaded_file($imageTmpPath, $targetFsPath)) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to save image']);
        mysqli_close($conn);
        exit;
    }

    // Delete old image file from disk if it exists
    if ($existingImageUrl !== null && $existingImageUrl !== '') {
        $oldRelative = ltrim((string)$existingImageUrl, '/');
        $projectRoot = dirname(__DIR__);
        // Try path relative to project root first, then relative to src/
        $oldFsPath = null;
        if (str_starts_with($oldRelative, 'uploads/parties/')) {
            $oldFsPath = $projectRoot . '/' . $oldRelative;
        } elseif (preg_match('#(?:^|/)uploads/parties/[^/]+$#', $oldRelative, $m)) {
            $oldFsPath = $projectRoot . '/' . ltrim($m[0], '/');
        }
        if ($oldFsPath && is_file($oldFsPath)) {
            @unlink($oldFsPath);
        }
    }

    $scriptDir = str_replace('\\', '/', (string)dirname($_SERVER['SCRIPT_NAME'] ?? '/src'));
    $basePath = preg_replace('#/src/?$#', '', rtrim($scriptDir, '/'));
    $partyImageUrl = ($basePath === '' ? '' : $basePath) . '/uploads/parties/' . $fileName;
}

$updateStmt = mysqli_prepare($conn, 'UPDATE parties SET name = ?, image_url = ? WHERE id = ?');
if (!$updateStmt) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database error']);
    mysqli_close($conn);
    exit;
}
mysqli_stmt_bind_param($updateStmt, 'ssi', $name, $partyImageUrl, $partyId);
mysqli_stmt_execute($updateStmt);
$updateOk = mysqli_stmt_errno($updateStmt) === 0;
mysqli_stmt_close($updateStmt);

if (!$updateOk) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Failed to update party']);
    mysqli_close($conn);
    exit;
}

mysqli_close($conn);

echo json_encode([
    'success' => true,
    'party' => [
        'id' => $partyId,
        'name' => $name,
        'image_url' => $partyImageUrl,
    ],
]);
?>
