<?php
ob_start();
session_name('foodies_session');
session_start();

header_remove('Access-Control-Allow-Origin');
header_remove('Access-Control-Allow-Methods');
header_remove('Access-Control-Allow-Headers');
header_remove('Access-Control-Allow-Credentials');

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

$userId = filter_input(INPUT_POST, 'user_id', FILTER_VALIDATE_INT);
$partyId = filter_input(INPUT_POST, 'party_id', FILTER_VALIDATE_INT);
$restaurantId = trim((string)($_POST['restaurant_id'] ?? ''));
$name = trim((string)($_POST['name'] ?? ''));
$tags = trim((string)($_POST['tags'] ?? ''));
$ratingRaw = $_POST['rating'] ?? null;

if ($userId === false || $userId === null || $userId <= 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'user_id is required and must be a positive integer']);
    exit;
}

if ($partyId === false || $partyId === null || $partyId <= 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'party_id is required and must be a positive integer']);
    exit;
}

if ($restaurantId === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'restaurant_id is required']);
    exit;
}

if ($name === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'name is required']);
    exit;
}

if ($tags === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'tags is required']);
    exit;
}

if ($ratingRaw === null || !is_numeric($ratingRaw)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'rating is required and must be numeric']);
    exit;
}

$decodedTags = json_decode($tags, true);
if ($decodedTags === null && json_last_error() !== JSON_ERROR_NONE) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'tags must be a valid JSON string']);
    exit;
}

$rating = (float)$ratingRaw;
if ($rating < 0 || $rating > 5) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'rating must be between 0 and 5']);
    exit;
}

require_once __DIR__ . '/connect.php';

mysqli_begin_transaction($conn);

try {
    $restaurantSql = 'INSERT INTO restaurants (id, name, tags, rating)
                      VALUES (?, ?, ?, ?)
                      ON DUPLICATE KEY UPDATE
                        name = VALUES(name),
                        tags = VALUES(tags),
                        rating = VALUES(rating)';
    $restaurantStmt = mysqli_prepare($conn, $restaurantSql);
    if (!$restaurantStmt) {
        throw new RuntimeException('Failed to prepare restaurant upsert');
    }

    mysqli_stmt_bind_param($restaurantStmt, 'sssd', $restaurantId, $name, $tags, $rating);
    if (!mysqli_stmt_execute($restaurantStmt)) {
        mysqli_stmt_close($restaurantStmt);
        throw new RuntimeException('Failed to upsert restaurant metadata');
    }
    mysqli_stmt_close($restaurantStmt);

    $ratingSql = 'INSERT INTO user_ratings (user_id, restaurant_id, rating)
                  VALUES (?, ?, ?)
                  ON DUPLICATE KEY UPDATE
                    rating = VALUES(rating)';
    $ratingStmt = mysqli_prepare($conn, $ratingSql);
    if (!$ratingStmt) {
        throw new RuntimeException('Failed to prepare user rating upsert');
    }

    mysqli_stmt_bind_param($ratingStmt, 'isd', $userId, $restaurantId, $rating);
    if (!mysqli_stmt_execute($ratingStmt)) {
        mysqli_stmt_close($ratingStmt);
        throw new RuntimeException('Failed to upsert user rating');
    }
    mysqli_stmt_close($ratingStmt);

    $visitedSql = 'INSERT IGNORE INTO visited_restaurants (party_id, restaurant_id) VALUES (?, ?)';
    $visitedStmt = mysqli_prepare($conn, $visitedSql);
    if (!$visitedStmt) {
        throw new RuntimeException('Failed to prepare visited insert');
    }

    mysqli_stmt_bind_param($visitedStmt, 'is', $partyId, $restaurantId);
    if (!mysqli_stmt_execute($visitedStmt)) {
        mysqli_stmt_close($visitedStmt);
        throw new RuntimeException('Failed to mark restaurant as visited');
    }
    $visitedInserted = mysqli_stmt_affected_rows($visitedStmt) > 0;
    mysqli_stmt_close($visitedStmt);

    mysqli_commit($conn);
    mysqli_close($conn);

    http_response_code(200);
    echo json_encode([
        'success' => true,
        'message' => 'Restaurant visit and rating saved',
        'data' => [
            'user_id' => $userId,
            'party_id' => $partyId,
            'restaurant_id' => $restaurantId,
            'visited_inserted' => $visitedInserted
        ]
    ]);
} catch (Throwable $e) {
    mysqli_rollback($conn);
    mysqli_close($conn);

    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Failed to save restaurant visit and rating',
        'error' => $e->getMessage()
    ]);
}