<?php
session_name('foodies_session');
session_start();

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

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

require_once __DIR__ . '/connect.php';
require_once __DIR__ . '/app_config.php';

$rawBody = file_get_contents('php://input');
$body = json_decode($rawBody, true);

if (!is_array($body) || !isset($body['friend_id'])) {
	http_response_code(400);
	echo json_encode(['success' => false, 'message' => 'Invalid request body format']);
	exit;
}

$user_id = (int)$_SESSION['user_id'];
$friend_id = isset($body['friend_id']) ? (int)$body['friend_id'] : 0;

if ($friend_id <= 0) {
	http_response_code(400);
	echo json_encode(['success' => false, 'message' => 'friend_id must be a positive integer']);
	exit;
}

if ($friend_id === $user_id) {
	http_response_code(400);
	echo json_encode(['success' => false, 'message' => 'Cannot compare taste with yourself']);
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
		$tagLower = strtolower(trim((string)$tag));
		if ($tagLower !== '') {
			$normalized[] = $tagLower;
		}
	}

	return $normalized;
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

function fetch_google_place_display_name($placeId, $apiKey) {
	static $nameCache = [];
	$normalizedId = trim((string)$placeId);

	if ($normalizedId === '') {
		return null;
	}

	if (array_key_exists($normalizedId, $nameCache)) {
		return $nameCache[$normalizedId];
	}

	if (!is_string($apiKey) || trim($apiKey) === '') {
		$nameCache[$normalizedId] = null;
		return null;
	}

	$url = 'https://maps.googleapis.com/maps/api/place/details/json?place_id=' . rawurlencode($normalizedId)
		. '&fields=name&key=' . rawurlencode($apiKey);

	$response = @file_get_contents($url);
	if ($response === false) {
		$nameCache[$normalizedId] = null;
		return null;
	}

	$data = json_decode($response, true);
	if (!is_array($data)) {
		$nameCache[$normalizedId] = null;
		return null;
	}

	$status = strtoupper((string)($data['status'] ?? ''));
	if ($status !== 'OK') {
		$nameCache[$normalizedId] = null;
		return null;
	}

	$name = trim((string)($data['result']['name'] ?? ''));
	$nameCache[$normalizedId] = $name !== '' ? $name : null;
	return $nameCache[$normalizedId];
}

function normalize_rating_value($value) {
	$rating = isset($value) ? floatval($value) : null;
	if ($rating === null) {
		return null;
	}
	return ($rating >= 1 && $rating <= 5) ? $rating : null;
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

	// First try exact matches in candidate priority order.
	$exactStmt = $conn->prepare('SELECT rating FROM user_ratings WHERE user_id = ? AND restaurant_id = ? LIMIT 1');
	if ($exactStmt) {
		foreach ($cleanCandidates as $candidate) {
			$exactStmt->bind_param('is', $userId, $candidate);
			$exactStmt->execute();
			$result = $exactStmt->get_result();
			$row = $result->fetch_assoc();
			if ($row !== null) {
				$exactStmt->close();
				return normalize_rating_value($row['rating'] ?? null);
			}
		}
		$exactStmt->close();
	}

	// Fallback to case/whitespace-insensitive match.
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

	$placeholders = implode(',', array_fill(0, count($normalizedCandidates), '?'));
	$query = "SELECT rating FROM user_ratings WHERE user_id = ? AND LOWER(TRIM(restaurant_id)) IN ($placeholders) LIMIT 1";
	$normalizedStmt = $conn->prepare($query);
	if (!$normalizedStmt) {
		return null;
	}

	$types = 'i' . str_repeat('s', count($normalizedCandidates));
	$params = array_merge([$userId], $normalizedCandidates);
	$bindParams = [$types];
	foreach ($params as $index => $value) {
		$bindParams[] = &$params[$index];
	}
	call_user_func_array([$normalizedStmt, 'bind_param'], $bindParams);

	$normalizedStmt->execute();
	$result = $normalizedStmt->get_result();
	$row = $result->fetch_assoc();
	$normalizedStmt->close();

	if ($row === null) {
		return null;
	}

	return normalize_rating_value($row['rating'] ?? null);
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

	$stmt = $conn->prepare($query);
	if (!$stmt) {
		return null;
	}

	$stmt->bind_param('ii', $userId, $userId);
	$stmt->execute();
	$result = $stmt->get_result();

	$visitedMap = [];
	while ($row = $result->fetch_assoc()) {
		$restaurantId = trim((string)($row['restaurant_id'] ?? ''));
		if ($restaurantId === '') {
			continue;
		}

		$key = normalize_restaurant_key($restaurantId);
		if ($key !== '' && !isset($visitedMap[$key])) {
			$visitedMap[$key] = $restaurantId;
		}
	}

	$stmt->close();
	return $visitedMap;
}

// Verify friendship exists and is accepted
$friendshipStmt = $conn->prepare(
	"SELECT 1 FROM friendships 
	 WHERE ((sender_id = ? AND recipient_id = ?) OR (sender_id = ? AND recipient_id = ?))
	 AND status = 'accepted'"
);
$friendshipStmt->bind_param('iiii', $user_id, $friend_id, $friend_id, $user_id);
$friendshipStmt->execute();
$friendshipResult = $friendshipStmt->get_result();

if ($friendshipResult->num_rows === 0) {
	http_response_code(403);
	echo json_encode(['success' => false, 'message' => 'Not friends or friendship not accepted']);
	exit;
}
$friendshipStmt->close();

// Build normalized sets of all visited restaurants for each user.
$userVisitedMap = get_user_visited_map($conn, $user_id);
$friendVisitedMap = get_user_visited_map($conn, $friend_id);

if ($userVisitedMap === null || $friendVisitedMap === null) {
	http_response_code(500);
	echo json_encode(['success' => false, 'message' => 'Failed to read visited restaurant data']);
	exit;
}

// Find intersection by normalized key so case/whitespace differences still match.
$sharedKeys = array_values(array_intersect(array_keys($userVisitedMap), array_keys($friendVisitedMap)));
$sharedRestaurantIds = [];
foreach ($sharedKeys as $key) {
	$sharedRestaurantIds[] = $userVisitedMap[$key];
}

// Create user_ratings table if it doesn't exist
maybe_create_user_ratings_table($conn);

if (empty($sharedRestaurantIds)) {
	http_response_code(200);
	echo json_encode([
		'success' => true,
		'shared_restaurants' => [],
		'shared_tags' => []
	]);
	exit;
}

// Fetch details by restaurant ID when possible.
$placeholders = implode(',', array_fill(0, count($sharedRestaurantIds), '?'));
$restaurantStmt = $conn->prepare(
	"SELECT id, name, tags, rating FROM restaurants WHERE id IN ($placeholders) ORDER BY name"
);

// Dynamically bind parameters
$types = str_repeat('s', count($sharedRestaurantIds));
$restaurantStmt->bind_param($types, ...$sharedRestaurantIds);
$restaurantStmt->execute();
$restaurantResult = $restaurantStmt->get_result();

$detailsById = [];
$detailsByNormalizedName = [];
$allTags = [];

while ($row = $restaurantResult->fetch_assoc()) {
	$id = (string)($row['id'] ?? '');
	$name = trim((string)($row['name'] ?? ''));
	$rating = isset($row['rating']) ? floatval($row['rating']) : 0.0;

	if ($id !== '') {
		$detailsById[$id] = [
			'id' => $id,
			'name' => $name !== '' ? $name : $id,
			'rating' => $rating,
			'tags' => $row['tags'] ?? null,
		];
	}

	if ($name !== '') {
		$detailsByNormalizedName[normalize_restaurant_key($name)] = [
			'id' => $id !== '' ? $id : $name,
			'name' => $name,
			'rating' => $rating,
			'tags' => $row['tags'] ?? null,
		];
	}
}
$restaurantStmt->close();

// For shared IDs not found in restaurants.id, try matching by restaurant name.
$unmatched = [];
foreach ($sharedRestaurantIds as $restaurantId) {
	if (!isset($detailsById[$restaurantId])) {
		$unmatched[] = normalize_restaurant_key($restaurantId);
	}
}

if (!empty($unmatched)) {
	$unmatched = array_values(array_unique(array_filter($unmatched, function($value) {
		return $value !== '';
	})));

	if (!empty($unmatched)) {
		$namePlaceholders = implode(',', array_fill(0, count($unmatched), '?'));
		$nameStmt = $conn->prepare(
			"SELECT id, name, tags, rating FROM restaurants WHERE LOWER(TRIM(name)) IN ($namePlaceholders)"
		);

		if ($nameStmt) {
			$nameTypes = str_repeat('s', count($unmatched));
			$nameStmt->bind_param($nameTypes, ...$unmatched);
			$nameStmt->execute();
			$nameResult = $nameStmt->get_result();

			while ($row = $nameResult->fetch_assoc()) {
				$nameKey = normalize_restaurant_key($row['name'] ?? '');
				if ($nameKey === '') {
					continue;
				}

				$detailsByNormalizedName[$nameKey] = [
					'id' => (string)($row['id'] ?? $row['name']),
					'name' => trim((string)($row['name'] ?? '')),
					'rating' => isset($row['rating']) ? floatval($row['rating']) : 0.0,
					'tags' => $row['tags'] ?? null,
				];
			}

			$nameStmt->close();
		}
	}
}

$sharedRestaurants = [];
$allTags = [];
$googleApiKey = foodies_config_value('GOOGLE_API_KEY', 'GOOGLE_API_KEY', '');

foreach ($sharedRestaurantIds as $restaurantId) {
	$detail = $detailsById[$restaurantId] ?? null;

	if ($detail === null) {
		$nameKey = normalize_restaurant_key($restaurantId);
		$detail = $detailsByNormalizedName[$nameKey] ?? null;
	}

	if ($detail === null) {
		$displayName = fetch_google_place_display_name($restaurantId, $googleApiKey);
		$detail = [
			'id' => $restaurantId,
			'name' => $displayName !== null ? $displayName : $restaurantId,
			'rating' => 0.0,
			'tags' => null,
		];
	}

	$ratingCandidates = [$restaurantId, $detail['id'] ?? '', $detail['name'] ?? ''];
	$userRating = get_user_rating_for_candidates($conn, $user_id, $ratingCandidates);
	$friendRating = get_user_rating_for_candidates($conn, $friend_id, $ratingCandidates);

	$sharedRestaurants[] = [
		'id' => $detail['id'],
		'name' => $detail['name'],
		'global_rating' => floatval($detail['rating']),
		'user_rating' => $userRating,
		'friend_rating' => $friendRating,
	];

	foreach (parse_restaurant_tags($detail['tags']) as $tagLower) {
		if (!isset($allTags[$tagLower])) {
			$allTags[$tagLower] = 0;
		}
		$allTags[$tagLower]++;
	}
}

usort($sharedRestaurants, function($a, $b) {
	return strcasecmp($a['name'], $b['name']);
});

// Sort tags by strength (occurrence count) in descending order
arsort($allTags);

// Convert to array of objects with tag and strength
$sharedTags = [];
foreach ($allTags as $tag => $strength) {
	$sharedTags[] = [
		'tag' => $tag,
		'strength' => $strength
	];
}

http_response_code(200);
echo json_encode([
	'success' => true,
	'shared_restaurants' => $sharedRestaurants,
	'shared_tags' => $sharedTags
]);
