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

$userId = (int)$_SESSION['user_id'];

$username = '';
$friendCount = 0;
$restaurantCount = 0;
$history = [];
$profilePic = null;

$stmt = mysqli_prepare($conn, 'SELECT username FROM users WHERE id = ? LIMIT 1');
if ($stmt) {
    mysqli_stmt_bind_param($stmt, 'i', $userId);
    mysqli_stmt_execute($stmt);
    mysqli_stmt_bind_result($stmt, $usernameValue);
    if (mysqli_stmt_fetch($stmt)) {
        $username = $usernameValue !== null ? (string)$usernameValue : '';
    }
    mysqli_stmt_close($stmt);
}

$stmt = mysqli_prepare(
    $conn,
    "SELECT COUNT(*) FROM friendships WHERE status = 'accepted' AND (sender_id = ? OR recipient_id = ?)"
);
if (!$stmt) {
    mysqli_close($conn);
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Failed to prepare friend count query']);
    exit;
}
mysqli_stmt_bind_param($stmt, 'ii', $userId, $userId);
mysqli_stmt_execute($stmt);
mysqli_stmt_bind_result($stmt, $friendCountValue);
if (mysqli_stmt_fetch($stmt)) {
    $friendCount = (int)$friendCountValue;
}
mysqli_stmt_close($stmt);

$stmt = mysqli_prepare(
    $conn,
        "SELECT COUNT(*)
         FROM (
                SELECT
                        COALESCE(NULLIF(LOWER(TRIM(r.name)), ''), LOWER(TRIM(ur.restaurant_id))) AS restaurant_key
                FROM user_ratings ur
                LEFT JOIN restaurants r ON r.id = ur.restaurant_id
                WHERE ur.user_id = ?
                    AND TRIM(ur.restaurant_id) <> ''
                GROUP BY restaurant_key
         ) AS deduped_restaurants"
);
if (!$stmt) {
    mysqli_close($conn);
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Failed to prepare restaurant count query']);
    exit;
}
mysqli_stmt_bind_param($stmt, 'i', $userId);
mysqli_stmt_execute($stmt);
mysqli_stmt_bind_result($stmt, $restaurantCountValue);
if (mysqli_stmt_fetch($stmt)) {
    $restaurantCount = (int)$restaurantCountValue;
}
mysqli_stmt_close($stmt);

$stmt = mysqli_prepare(
    $conn,
    "SELECT
        grouped.latest_restaurant_name AS restaurant_name,
        grouped.latest_rating
     FROM (
        SELECT
            COALESCE(NULLIF(LOWER(TRIM(r.name)), ''), LOWER(TRIM(ur.restaurant_id))) AS restaurant_key,
            SUBSTRING_INDEX(
                GROUP_CONCAT(
                    COALESCE(NULLIF(TRIM(r.name), ''), TRIM(ur.restaurant_id))
                    ORDER BY ur.created_at DESC, ur.id DESC
                    SEPARATOR '||'
                ),
                '||',
                1
            ) AS latest_restaurant_name,
            SUBSTRING_INDEX(
                GROUP_CONCAT(ur.rating ORDER BY ur.created_at DESC, ur.id DESC),
                ',',
                1
            ) AS latest_rating,
            MAX(ur.created_at) AS latest_created_at
        FROM user_ratings ur
        LEFT JOIN restaurants r ON r.id = ur.restaurant_id
        WHERE ur.user_id = ?
          AND TRIM(ur.restaurant_id) <> ''
        GROUP BY restaurant_key
        ORDER BY MAX(ur.created_at) DESC
        LIMIT 5
     ) AS grouped
     ORDER BY grouped.latest_created_at DESC"
);
if ($stmt) {
    mysqli_stmt_bind_param($stmt, 'i', $userId);
    mysqli_stmt_execute($stmt);
    mysqli_stmt_bind_result($stmt, $restaurantName, $rating);

    while (mysqli_stmt_fetch($stmt)) {
        $history[] = [
            'restaurant' => $restaurantName,
            'rating' => $rating === null ? null : (float)$rating,
        ];
    }
    mysqli_stmt_close($stmt);
}

$stmt = mysqli_prepare($conn, 'SELECT img_addr FROM users WHERE id = ? LIMIT 1');
if (!$stmt) {
    mysqli_close($conn);
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Failed to prepare profile picture query']);
    exit;
}
mysqli_stmt_bind_param($stmt, 'i', $userId);
mysqli_stmt_execute($stmt);
mysqli_stmt_bind_result($stmt, $profilePicValue);
if (mysqli_stmt_fetch($stmt)) {
    $profilePic = $profilePicValue !== null && $profilePicValue !== '' ? $profilePicValue : null;
}
mysqli_stmt_close($stmt);

mysqli_close($conn);

echo json_encode([
    'success' => true,
    'username' => $username,
    'friend_count' => $friendCount,
    'restaurant_count' => $restaurantCount,
    'history' => $history,
    'img_addr' => $profilePic,
]);
