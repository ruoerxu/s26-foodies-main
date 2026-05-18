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

function normalize_restaurant_key($value) {
    return strtolower(trim((string)$value));
}

function parse_restaurant_tags($rawTags) {
    if ($rawTags === null) {
        return [];
    }

    if (is_array($rawTags)) {
        $values = $rawTags;
    } else {
        $decoded = json_decode((string)$rawTags, true);
        if (is_array($decoded)) {
            $values = $decoded;
        } else {
            $stringValue = trim((string)$rawTags);
            if ($stringValue === '') {
                return [];
            }
            $values = explode(',', $stringValue);
        }
    }

    $normalized = [];
    foreach ($values as $tag) {
        $tagValue = trim((string)$tag);
        if ($tagValue !== '') {
            $normalized[] = $tagValue;
        }
    }

    return $normalized;
}

function normalize_rating_value($value) {
    if ($value === null || $value === '') {
        return null;
    }

    $rating = floatval($value);
    return ($rating >= 1 && $rating <= 5) ? $rating : null;
}

function maybe_create_user_ratings_table($conn) {
    @mysqli_query($conn, 'CREATE TABLE IF NOT EXISTS user_ratings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        restaurant_id VARCHAR(255) NOT NULL,
        rating DECIMAL(2,1) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_user_restaurant (user_id, restaurant_id)
    )');
}

function get_user_rating_for_candidates($conn, $userId, $candidates) {
    if (!is_array($candidates) || empty($candidates)) {
        return null;
    }

    $cleanCandidates = [];
    foreach ($candidates as $candidate) {
        $value = trim((string)$candidate);
        if ($value === '') {
            continue;
        }
        if (!in_array($value, $cleanCandidates, true)) {
            $cleanCandidates[] = $value;
        }
    }

    if (empty($cleanCandidates)) {
        return null;
    }

    $exactStmt = mysqli_prepare($conn, 'SELECT rating FROM user_ratings WHERE user_id = ? AND restaurant_id = ? LIMIT 1');
    if ($exactStmt) {
        foreach ($cleanCandidates as $candidate) {
            mysqli_stmt_bind_param($exactStmt, 'is', $userId, $candidate);
            mysqli_stmt_execute($exactStmt);
            mysqli_stmt_bind_result($exactStmt, $exactRating);
            if (mysqli_stmt_fetch($exactStmt)) {
                mysqli_stmt_close($exactStmt);
                return normalize_rating_value($exactRating);
            }
            mysqli_stmt_free_result($exactStmt);
        }
        mysqli_stmt_close($exactStmt);
    }

    $normalizedCandidates = [];
    foreach ($cleanCandidates as $candidate) {
        $key = normalize_restaurant_key($candidate);
        if ($key !== '' && !in_array($key, $normalizedCandidates, true)) {
            $normalizedCandidates[] = $key;
        }
    }

    if (empty($normalizedCandidates)) {
        return null;
    }

    $normalizedStmt = mysqli_prepare(
        $conn,
        'SELECT rating FROM user_ratings WHERE user_id = ? AND LOWER(TRIM(restaurant_id)) = ? LIMIT 1'
    );
    if (!$normalizedStmt) {
        return null;
    }

    foreach ($normalizedCandidates as $candidateKey) {
        mysqli_stmt_bind_param($normalizedStmt, 'is', $userId, $candidateKey);
        mysqli_stmt_execute($normalizedStmt);
        mysqli_stmt_bind_result($normalizedStmt, $normalizedRating);
        if (mysqli_stmt_fetch($normalizedStmt)) {
            mysqli_stmt_close($normalizedStmt);
            return normalize_rating_value($normalizedRating);
        }
        mysqli_stmt_free_result($normalizedStmt);
    }

    mysqli_stmt_close($normalizedStmt);
    return null;
}

function get_user_visited_map($conn, $userId) {
    $query = "SELECT DISTINCT TRIM(vr.restaurant_id) AS restaurant_id
        FROM visited_restaurants vr
        WHERE EXISTS (
            SELECT 1
            FROM party_members pm
            WHERE pm.party_id = vr.party_id AND pm.user_id = ?
        )
        OR EXISTS (
            SELECT 1
            FROM parties p
            WHERE p.id = vr.party_id AND p.organizer_id = ?
        )";

    $stmt = mysqli_prepare($conn, $query);
    if (!$stmt) {
        return null;
    }

    mysqli_stmt_bind_param($stmt, 'ii', $userId, $userId);
    mysqli_stmt_execute($stmt);
    mysqli_stmt_bind_result($stmt, $restaurantIdRaw);

    $visitedMap = [];
    while (mysqli_stmt_fetch($stmt)) {
        $restaurantId = trim((string)$restaurantIdRaw);
        if ($restaurantId === '') {
            continue;
        }

        $key = normalize_restaurant_key($restaurantId);
        if ($key !== '' && !isset($visitedMap[$key])) {
            $visitedMap[$key] = $restaurantId;
        }
    }

    mysqli_stmt_close($stmt);
    return $visitedMap;
}

$rawBody = file_get_contents('php://input');
$body = json_decode($rawBody, true);

$friendId = 0;
if (is_array($body) && isset($body['friend_id'])) {
    $friendId = (int)$body['friend_id'];
} elseif (isset($_POST['friend_id'])) {
    $friendId = (int)$_POST['friend_id'];
}

if ($friendId <= 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'friend_id is required and must be a positive integer']);
    exit;
}

require_once __DIR__ . '/connect.php';

$myId = (int)$_SESSION['user_id'];

if ($friendId === $myId) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Cannot view or compare with yourself']);
    exit;
}

// Verify accepted friendship once for both profile and comparison sections.
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

// ------- Existing get_friend_profile.php payload (preserved keys) -------
$stmt = mysqli_prepare($conn, 'SELECT username, dietary_restrictions FROM users WHERE id = ?');
mysqli_stmt_bind_param($stmt, 'i', $friendId);
mysqli_stmt_execute($stmt);
mysqli_stmt_bind_result($stmt, $username, $friendDietaryRaw);
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

$allRestrictions = array_unique(array_merge($myDietary, $friendDietary));
$totalRestrictions = count($allRestrictions);
if ($totalRestrictions === 0) {
    $compatibility = 90;
} else {
    $sharedRestrictions = count(array_intersect($myDietary, $friendDietary));
    $compatibility = (int)round(($sharedRestrictions / $totalRestrictions) * 85 + 15);
}

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

    $mappedTags = [];
    foreach ($tags as $tag) {
        $tag = trim((string)$tag);
        if ($tag === '') {
            continue;
        }
        $mappedTags[] = str_replace('_', ' ', $tag);
    }

    $visitedRestaurants[] = [
        'id'           => $rId,
        'name'         => $rName,
        'rating'       => round((float)$rRating, 1),
        'cost'         => null,
        'distance'     => null,
        'tags'         => $mappedTags,
        'visited_date' => $rVisitedAt ? substr($rVisitedAt, 0, 10) : null,
    ];
}
mysqli_stmt_close($stmt);

// ------- Additive comparison payload (shared_restaurants + shared_tags) -------
maybe_create_user_ratings_table($conn);

$userVisitedMap = get_user_visited_map($conn, $myId);
$friendVisitedMap = get_user_visited_map($conn, $friendId);

if ($userVisitedMap === null || $friendVisitedMap === null) {
    mysqli_close($conn);
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Failed to read visited restaurant data']);
    exit;
}

$sharedKeys = array_values(array_intersect(array_keys($userVisitedMap), array_keys($friendVisitedMap)));
$sharedRestaurantIds = [];
foreach ($sharedKeys as $key) {
    $sharedRestaurantIds[] = $userVisitedMap[$key];
}

$sharedRestaurants = [];
$sharedTagsCounter = [];
$sharedTagLabels = [];

if (!empty($sharedRestaurantIds)) {
    $placeholders = implode(',', array_fill(0, count($sharedRestaurantIds), '?'));
    $restaurantStmt = mysqli_prepare(
        $conn,
        "SELECT id, name, tags, rating FROM restaurants WHERE id IN ($placeholders) ORDER BY name"
    );

    $types = str_repeat('s', count($sharedRestaurantIds));
    mysqli_stmt_bind_param($restaurantStmt, $types, ...$sharedRestaurantIds);
    mysqli_stmt_execute($restaurantStmt);
    mysqli_stmt_bind_result($restaurantStmt, $detailId, $detailName, $detailTags, $detailRating);

    $detailsById = [];
    $detailsByNormalizedName = [];
    while (mysqli_stmt_fetch($restaurantStmt)) {
        $id = (string)($detailId ?? '');
        $name = trim((string)($detailName ?? ''));
        $rating = isset($detailRating) ? floatval($detailRating) : 0.0;

        if ($id !== '') {
            $detailsById[$id] = [
                'id' => $id,
                'name' => $name !== '' ? $name : $id,
                'tags' => $detailTags,
                'rating' => $rating,
            ];
        }

        if ($name !== '') {
            $detailsByNormalizedName[normalize_restaurant_key($name)] = [
                'id' => $id !== '' ? $id : $name,
                'name' => $name,
                'tags' => $detailTags,
                'rating' => $rating,
            ];
        }
    }
    mysqli_stmt_close($restaurantStmt);

    $unmatchedNames = [];
    foreach ($sharedRestaurantIds as $restaurantId) {
        if (!isset($detailsById[$restaurantId])) {
            $normalizedName = normalize_restaurant_key($restaurantId);
            if ($normalizedName !== '') {
                $unmatchedNames[] = $normalizedName;
            }
        }
    }

    $unmatchedNames = array_values(array_unique($unmatchedNames));
    if (!empty($unmatchedNames)) {
        $namePlaceholders = implode(',', array_fill(0, count($unmatchedNames), '?'));
        $nameStmt = mysqli_prepare(
            $conn,
            "SELECT id, name, tags, rating FROM restaurants WHERE LOWER(TRIM(name)) IN ($namePlaceholders)"
        );

        if ($nameStmt) {
            $nameTypes = str_repeat('s', count($unmatchedNames));
            mysqli_stmt_bind_param($nameStmt, $nameTypes, ...$unmatchedNames);
            mysqli_stmt_execute($nameStmt);
            mysqli_stmt_bind_result($nameStmt, $nameMatchId, $nameMatchName, $nameMatchTags, $nameMatchRating);

            while (mysqli_stmt_fetch($nameStmt)) {
                $nameKey = normalize_restaurant_key($nameMatchName ?? '');
                if ($nameKey === '') {
                    continue;
                }

                $detailsByNormalizedName[$nameKey] = [
                    'id' => (string)($nameMatchId ?? $nameMatchName),
                    'name' => trim((string)($nameMatchName ?? '')),
                    'tags' => $nameMatchTags,
                    'rating' => isset($nameMatchRating) ? floatval($nameMatchRating) : 0.0,
                ];
            }
            mysqli_stmt_close($nameStmt);
        }
    }

    foreach ($sharedRestaurantIds as $restaurantId) {
        $detail = $detailsById[$restaurantId] ?? null;
        if ($detail === null) {
            $detail = $detailsByNormalizedName[normalize_restaurant_key($restaurantId)] ?? null;
        }

        if ($detail === null) {
            $detail = [
                'id' => $restaurantId,
                'name' => $restaurantId,
                'tags' => null,
                'rating' => 0.0,
            ];
        }

        $ratingCandidates = [$restaurantId, $detail['id'] ?? '', $detail['name'] ?? ''];
        $userRating = get_user_rating_for_candidates($conn, $myId, $ratingCandidates);
        $friendRating = get_user_rating_for_candidates($conn, $friendId, $ratingCandidates);

        $sharedRestaurants[] = [
            'name' => $detail['name'],
            'user_rating' => $userRating,
            'friend_rating' => $friendRating,
            'global_rating' => floatval($detail['rating']),
        ];

        foreach (parse_restaurant_tags($detail['tags']) as $tagRaw) {
            $tag = str_replace('_', ' ', trim((string)$tagRaw));
            $key = strtolower($tag);
            if ($key === '') {
                continue;
            }
            if (!isset($sharedTagsCounter[$key])) {
                $sharedTagsCounter[$key] = 0;
                $sharedTagLabels[$key] = ucwords($key);
            }
            $sharedTagsCounter[$key]++;
        }
    }

    usort($sharedRestaurants, function($a, $b) {
        return strcasecmp($a['name'], $b['name']);
    });
}

arsort($sharedTagsCounter);
$sharedTags = [];
foreach ($sharedTagsCounter as $tagKey => $strength) {
    $sharedTags[] = [
        'tag' => $sharedTagLabels[$tagKey] ?? $tagKey,
        'strength' => (int)$strength,
    ];
}

mysqli_close($conn);

echo json_encode([
    'success'              => true,
    'username'             => $username,
    'compatibility'        => $compatibility,
    'dietary_restrictions' => $friendDietary,
    'disliked_cuisines'    => [],
    'visited_restaurants'  => $visitedRestaurants,
    'shared_restaurants'   => $sharedRestaurants,
    'shared_tags'          => $sharedTags,
]);