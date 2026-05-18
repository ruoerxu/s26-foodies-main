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

$friendId = filter_input(INPUT_GET, 'user_id', FILTER_VALIDATE_INT);
if (!$friendId || $friendId <= 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'user_id is required and must be a positive integer']);
    exit;
}

require_once __DIR__ . '/connect.php';

$myId = (int)$_SESSION['user_id'];

if ($friendId === $myId) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Cannot view your own profile here']);
    exit;
}

// Verify accepted friendship
$stmt = mysqli_prepare($conn, "
    SELECT 1 FROM friendships
    WHERE ((sender_id = ? AND recipient_id = ?) OR (sender_id = ? AND recipient_id = ?))
    AND status = 'accepted'
");
mysqli_stmt_bind_param($stmt, 'iiii', $myId, $friendId, $friendId, $myId);
mysqli_stmt_execute($stmt);
mysqli_stmt_store_result($stmt);
$isFriend = mysqli_stmt_num_rows($stmt) > 0;
mysqli_stmt_close($stmt);

if (!$isFriend) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Not friends with this user']);
    exit;
}

// Fetch friend's username and profile preference data
$stmt = mysqli_prepare($conn, 'SELECT username, dietary_restrictions, disliked_cuisines FROM users WHERE id = ?');
mysqli_stmt_bind_param($stmt, 'i', $friendId);
mysqli_stmt_execute($stmt);
mysqli_stmt_bind_result($stmt, $username, $friendDietaryRaw, $friendDislikedRaw);
if (!mysqli_stmt_fetch($stmt)) {
    mysqli_stmt_close($stmt);
    mysqli_close($conn);
    http_response_code(404);
    echo json_encode(['success' => false, 'message' => 'User not found']);
    exit;
}
mysqli_stmt_close($stmt);

$friendDietary = json_decode($friendDietaryRaw ?? '[]', true);
if (!is_array($friendDietary)) {
    $friendDietary = [];
}

$friendDislikedCuisines = json_decode($friendDislikedRaw ?? '[]', true);
if (!is_array($friendDislikedCuisines)) {
	$friendDislikedCuisines = [];
}

// Fetch my dietary restrictions for compatibility calculation
$stmt = mysqli_prepare($conn, 'SELECT dietary_restrictions FROM users WHERE id = ?');
mysqli_stmt_bind_param($stmt, 'i', $myId);
mysqli_stmt_execute($stmt);
mysqli_stmt_bind_result($stmt, $myDietaryRaw);
mysqli_stmt_fetch($stmt);
mysqli_stmt_close($stmt);

$myDietary = json_decode($myDietaryRaw ?? '[]', true);
if (!is_array($myDietary)) {
    $myDietary = [];
}

// Calculate compatibility score based on dietary restriction overlap
$allRestrictions = array_unique(array_merge($myDietary, $friendDietary));
$total = count($allRestrictions);
if ($total === 0) {
    // Neither has dietary restrictions — highly compatible
    $compatibility = 90;
} else {
    $shared = count(array_intersect($myDietary, $friendDietary));
    $compatibility = (int)round(($shared / $total) * 85 + 15);
}

// Fetch friend's visited restaurants (most recent first, deduplicated, limit 10)
$stmt = mysqli_prepare($conn, "
    SELECT r.id, r.name, r.tags, r.rating, MAX(vr.visited_at) AS visited_at
    FROM visited_restaurants vr
    JOIN restaurants r ON r.id = vr.restaurant_id
    WHERE (
        EXISTS (
            SELECT 1 FROM party_members pm
            WHERE pm.party_id = vr.party_id AND pm.user_id = ?
        )
        OR EXISTS (
            SELECT 1 FROM parties p
            WHERE p.id = vr.party_id AND p.organizer_id = ?
        )
    )
    GROUP BY r.id, r.name, r.tags, r.rating
    ORDER BY visited_at DESC
    LIMIT 10
");
mysqli_stmt_bind_param($stmt, 'ii', $friendId, $friendId);
mysqli_stmt_execute($stmt);
mysqli_stmt_bind_result($stmt, $rId, $rName, $rTagsRaw, $rRating, $rVisitedAt);

$visitedRestaurants = [];
while (mysqli_stmt_fetch($stmt)) {
    $tags = json_decode($rTagsRaw ?? '[]', true);
    if (!is_array($tags)) {
        $tags = $rTagsRaw !== null && $rTagsRaw !== '' ? array_map('trim', explode(',', $rTagsRaw)) : [];
    }

    $visitedRestaurants[] = [
        'id'           => $rId,
        'name'         => $rName,
        'rating'       => round((float)$rRating, 1),
        'cost'         => null,
        'distance'     => null,
        'tags'         => $tags,
        'visited_date' => $rVisitedAt ? substr($rVisitedAt, 0, 10) : null,
    ];
}
mysqli_stmt_close($stmt);
mysqli_close($conn);

echo json_encode([
    'success'              => true,
    'username'             => $username,
    'compatibility'        => $compatibility,
    'dietary_restrictions' => $friendDietary,
    'disliked_cuisines'    => $friendDislikedCuisines,
    'visited_restaurants'  => $visitedRestaurants,
]);
