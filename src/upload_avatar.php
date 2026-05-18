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

function avatar_upload_failed() {
    echo json_encode(['success' => false, 'message' => 'Failed to update profile picture.']);
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

$file = null;
if (isset($_FILES['avatar'])) {
    $file = $_FILES['avatar'];
} elseif (isset($_FILES['profile_pic'])) {
    $file = $_FILES['profile_pic'];
} elseif (isset($_FILES['file'])) {
    $file = $_FILES['file'];
}

if (!$file || !isset($file['error'])) {
    http_response_code(400);
    avatar_upload_failed();
}

if ($file['error'] !== UPLOAD_ERR_OK) {
    http_response_code(400);
    avatar_upload_failed();
}

$maxBytes = 2 * 1024 * 1024;
if ((int)$file['size'] > $maxBytes) {
    http_response_code(400);
    avatar_upload_failed();
}

$originalName = (string)($file['name'] ?? '');
$extension = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));
$allowedExtensions = ['jpg', 'jpeg', 'png'];
if (!in_array($extension, $allowedExtensions, true)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Only .jpg, .jpeg, and .png are allowed']);
    exit;
}

$finfo = finfo_open(FILEINFO_MIME_TYPE);
$mimeType = $finfo ? finfo_file($finfo, $file['tmp_name']) : null;
if ($finfo) {
    finfo_close($finfo);
}

$allowedMimeTypes = ['image/jpeg', 'image/png'];
if ($mimeType === false || ($mimeType !== null && !in_array($mimeType, $allowedMimeTypes, true))) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Only .jpg, .jpeg, and .png are allowed']);
    exit;
}

require_once __DIR__ . '/connect.php';

$userId = (int)$_SESSION['user_id'];
$oldProfilePic = null;

$stmt = mysqli_prepare($conn, 'SELECT img_addr FROM users WHERE id = ? LIMIT 1');
if (!$stmt) {
    mysqli_close($conn);
    http_response_code(500);
    avatar_upload_failed();
}
mysqli_stmt_bind_param($stmt, 'i', $userId);
mysqli_stmt_execute($stmt);
mysqli_stmt_bind_result($stmt, $oldProfilePicValue);
if (mysqli_stmt_fetch($stmt)) {
    $oldProfilePic = $oldProfilePicValue;
}
mysqli_stmt_close($stmt);

$uploadDir = __DIR__ . '/uploads/avatars';
if (!is_dir($uploadDir) && !mkdir($uploadDir, 0775, true)) {
    mysqli_close($conn);
    http_response_code(500);
    avatar_upload_failed();
}

$newFileName = uniqid('avatar_', true) . '.' . $extension;
$destinationPath = $uploadDir . '/' . $newFileName;
$newDbPath = 'src/uploads/avatars/' . $newFileName;

if (!move_uploaded_file($file['tmp_name'], $destinationPath)) {
    mysqli_close($conn);
    http_response_code(500);
    avatar_upload_failed();
}

$stmt = mysqli_prepare($conn, 'UPDATE users SET img_addr = ? WHERE id = ?');
if (!$stmt) {
    @unlink($destinationPath);
    mysqli_close($conn);
    http_response_code(500);
    avatar_upload_failed();
}
mysqli_stmt_bind_param($stmt, 'si', $newDbPath, $userId);
mysqli_stmt_execute($stmt);
$updateOk = mysqli_stmt_errno($stmt) === 0;
mysqli_stmt_close($stmt);

if (!$updateOk) {
    @unlink($destinationPath);
    mysqli_close($conn);
    http_response_code(500);
    avatar_upload_failed();
}

$oldFilePath = resolve_profile_pic_path($oldProfilePic);
if ($oldFilePath && is_file($oldFilePath)) {
    @unlink($oldFilePath);
}

mysqli_close($conn);

echo json_encode([
    'success' => true,
]);
