<?php
session_name('foodies_session');
session_start();

header('Content-Type: application/json; charset=utf-8');
header('Vary: Origin');
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: POST, DELETE, OPTIONS');
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

$method = $_SERVER['REQUEST_METHOD'];
if ($method !== 'POST' && $method !== 'DELETE') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Not authenticated']);
    exit;
}

function starts_with($haystack, $needle) {
    return $needle === '' || strpos($haystack, $needle) === 0;
}

function resolve_profile_pic_path($storedPath) {
    if (!is_string($storedPath)) {
        return null;
    }

    $normalized = trim(str_replace('\\', '/', $storedPath));
    if ($normalized === '' || preg_match('/^https?:\/\//i', $normalized)) {
        return null;
    }

    $projectRoot = dirname(__DIR__);
    $srcRoot = __DIR__;

    if (preg_match('/^[A-Za-z]:\//', $normalized)) {
        return $normalized;
    }

    if (starts_with($normalized, 'src/')) {
        return $projectRoot . '/' . $normalized;
    }

    if (starts_with($normalized, 'uploads/')) {
        return $srcRoot . '/' . $normalized;
    }

    return $srcRoot . '/' . ltrim($normalized, '/');
}

require_once __DIR__ . '/connect.php';

$userId = (int)$_SESSION['user_id'];
$currentProfilePic = null;

$stmt = mysqli_prepare($conn, 'SELECT img_addr FROM users WHERE id = ? LIMIT 1');
if (!$stmt) {
    mysqli_close($conn);
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Failed to fetch avatar path']);
    exit;
}
mysqli_stmt_bind_param($stmt, 'i', $userId);
mysqli_stmt_execute($stmt);
mysqli_stmt_bind_result($stmt, $profilePicValue);
if (mysqli_stmt_fetch($stmt)) {
    $currentProfilePic = $profilePicValue;
}
mysqli_stmt_close($stmt);

$stmt = mysqli_prepare($conn, 'UPDATE users SET img_addr = NULL WHERE id = ?');
if (!$stmt) {
    mysqli_close($conn);
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Failed to clear avatar path']);
    exit;
}
mysqli_stmt_bind_param($stmt, 'i', $userId);
mysqli_stmt_execute($stmt);
$updateOk = mysqli_stmt_errno($stmt) === 0;
mysqli_stmt_close($stmt);

if (!$updateOk) {
    mysqli_close($conn);
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Failed to clear avatar path']);
    exit;
}

$filePath = resolve_profile_pic_path($currentProfilePic);
if ($filePath && is_file($filePath)) {
    @unlink($filePath);
}

mysqli_close($conn);

echo json_encode([
    'success' => true,
    'img_addr' => null,
]);
