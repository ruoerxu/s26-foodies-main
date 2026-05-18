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

$rawBody = file_get_contents('php://input');
$body = json_decode($rawBody, true);
if (!is_array($body)) {
	if (trim((string)$rawBody) === '') {
		http_response_code(400);
		echo json_encode(['success' => false, 'message' => 'Invalid request body format']);
		exit;
	} else {
		http_response_code(400);
		echo json_encode(['success' => false, 'message' => 'Invalid request body format']);
		exit;
	}
}

$requestedLatitude = isset($body['latitude']) ? floatval($body['latitude']) : null;
$requestedLongitude = isset($body['longitude']) ? floatval($body['longitude']) : null;
$partyName = isset($body['party_name']) ? trim($body['party_name']) : '';
$priceFilter = isset($body['price']) ? $body['price'] : [];
$startTimeRaw = isset($body['start_time']) ? trim((string)$body['start_time']) : '';
$endTimeRaw = isset($body['end_time']) ? trim((string)$body['end_time']) : '';

if ($partyName === '') {
	http_response_code(400);
	echo json_encode(['success' => false, 'message' => 'Missing party_name']);
	exit;
}

$userId = (int)$_SESSION['user_id'];

// Find party by name for this user (organizer or member)
$partyId = null;
$partyMembers = [];
$stmt = mysqli_prepare($conn, 'SELECT p.id FROM parties p
	LEFT JOIN party_members pm ON pm.party_id = p.id
	WHERE p.name = ? AND (p.organizer_id = ? OR pm.user_id = ?) LIMIT 1');
if ($stmt) {
	mysqli_stmt_bind_param($stmt, 'sii', $partyName, $userId, $userId);
	mysqli_stmt_execute($stmt);
	mysqli_stmt_bind_result($stmt, $pid);
	if (mysqli_stmt_fetch($stmt)) {
		$partyId = (int)$pid;
	}
	mysqli_stmt_close($stmt);
}
if (!$partyId) {
	http_response_code(404);
	echo json_encode(['success' => false, 'message' => 'Party not found']);
	exit;
}

$latitude = null;
$longitude = null;

$stmt = mysqli_prepare($conn, 'SELECT latitude, longitude FROM group_sessions WHERE party_id = ? AND is_active = 1 LIMIT 1');
if ($stmt) {
	mysqli_stmt_bind_param($stmt, 'i', $partyId);
	mysqli_stmt_execute($stmt);
	mysqli_stmt_bind_result($stmt, $sessionLat, $sessionLon);
	if (mysqli_stmt_fetch($stmt) && $sessionLat !== null && $sessionLon !== null) {
		$latitude = floatval($sessionLat);
		$longitude = floatval($sessionLon);
	}
	mysqli_stmt_close($stmt);
}

if ($latitude === null || $longitude === null) {
	$stmt = mysqli_prepare($conn, 'SELECT lat, lng FROM users WHERE id = ? LIMIT 1');
	if ($stmt) {
		mysqli_stmt_bind_param($stmt, 'i', $userId);
		mysqli_stmt_execute($stmt);
		mysqli_stmt_bind_result($stmt, $profileLat, $profileLon);
		if (mysqli_stmt_fetch($stmt) && $profileLat !== null && $profileLon !== null) {
			$latitude = floatval($profileLat);
			$longitude = floatval($profileLon);
		}
		mysqli_stmt_close($stmt);
	}
}

if (($latitude === null || $longitude === null) && $requestedLatitude !== null && $requestedLongitude !== null) {
	$latitude = $requestedLatitude;
	$longitude = $requestedLongitude;
}

if ($latitude === null || $longitude === null) {
	http_response_code(400);
	echo json_encode(['success' => false, 'message' => 'Missing latitude or longitude and no session, profile, or request location found']);
	exit;
}

// Get all member user_ids for this party
$members = [];
$stmt = mysqli_prepare($conn, 'SELECT user_id FROM party_members WHERE party_id = ?');
if ($stmt) {
	mysqli_stmt_bind_param($stmt, 'i', $partyId);
	mysqli_stmt_execute($stmt);
	mysqli_stmt_bind_result($stmt, $memberId);
	while (mysqli_stmt_fetch($stmt)) {
		$members[] = (int)$memberId;
	}
	mysqli_stmt_close($stmt);
}
// Add organizer if not in members
$stmt = mysqli_prepare($conn, 'SELECT organizer_id FROM parties WHERE id = ?');
if ($stmt) {
	mysqli_stmt_bind_param($stmt, 'i', $partyId);
	mysqli_stmt_execute($stmt);
	mysqli_stmt_bind_result($stmt, $orgId);
	if (mysqli_stmt_fetch($stmt)) {
		if (!in_array((int)$orgId, $members, true)) {
			$members[] = (int)$orgId;
		}
	}
	mysqli_stmt_close($stmt);
}

if (empty($members)) {
	http_response_code(404);
	echo json_encode(['success' => false, 'message' => 'No members in party']);
	exit;
}

$dietaryRestrictions = [
    'Alcohol-Free' => [
		'qualify_tags'        => [],
		'disqualify_tags'     => ['bar', 'bar_and_grill', 'brewery', 'brewpub', 'cocktail_bar',
								'wine_bar', 'winery', 'beer_garden'],
        'qualify_fields'   => [],
        'disqualify_fields'=> ['servesBeer', 'servesWine', 'servesCocktails'],
    ],
	'Halal' => [
		'qualify_tags'        => ['halal_restaurant'],
		'disqualify_tags'     => ['bar', 'bar_and_grill', 'brewery', 'brewpub', 'cocktail_bar',
								'wine_bar', 'winery', 'beer_garden'],
		'qualify_fields'   => [],
		'disqualify_fields'=> [],
	],
	'Kosher' => [
		'qualify_tags'		=> ['israeli_restaurant'],
		'disqualify_tags' => [],
		'qualify_fields'   => [],
		'disqualify_fields'=> [],
	],
	   'Vegan' => [
		   'qualify_tags'        => ['vegan_restaurant', 'salad_shop', 'vegetarian_restaurant'],
		   'disqualify_tags'     => ['chicken_restaurant', 'chicken_wings_restaurant', 'steak_house'],
		   'qualify_fields'   => [],
		   'disqualify_fields'=> [],
	   ],
	'Vegetarian' => [
		'qualify_tags'        => ['vegan_restaurant', 'salad_shop', 'vegetarian_restaurant'],
		'disqualify_tags'     => ['chicken_restaurant', 'chicken_wings_restaurant', 'steak_house'],
		'qualify_fields'   => ['servesVegetarianFood'],
		'disqualify_fields'=> [],
	],
	'Pescatarian' => [
		'qualify_tags'        => ['vegan_restaurant', 'salad_shop', 'vegetarian_restaurant', 'oyster_bar_restaurant', 'seafood_restaurant', 'sushi_restaurant'],
		'disqualify_tags'     => ['chicken_restaurant', 'chicken_wings_restaurant', 'steak_house'],
		'qualify_fields'   => ['servesVegetarianFood'],
		'disqualify_fields'=> [],
	],
	'Seafood Allergy' => [
		'qualify_tags'        => [],
		'disqualify_tags'     => ['oyster_bar_restaurant', 'seafood_restaurant', 'sushi_restaurant'],
		'qualify_fields'   => [],
		'disqualify_fields'=> [],
	]
];

$cuisinesMap = ['american' => ['american_restaurant', 'californian_restaurant', 'diner', 'hamburger_restaurant', 'hot_dog_restaurant', 'hot_dog_stand', 'steak_house'], 
				'chinese' => ['chinese_restaurant', 'chinese_noodle_restaurant', 'dumpling_restaurant', ], 
				'indian' => ['indian_restaurant'], 
				'italian' => ['italian_restaurant', 'pizza_restaurant'], 
				'japanese' => ['japanese_restaurant', 'sushi_restaurant', 'ramen_restaurant', 'japanese_curry_restaurant', 'japanese_izakaya_restaurant'], 
				'korean' => ['korean_restaurant', 'korean_barbecue_restaurant'], 
				'mediterranean' => ['mediterranean_restaurant', 'greek_restaurant', 'lebanese_restaurant', 'turkish_restaurant'], 
				'mexican' => ['mexican_restaurant', 'taco_restaurant', 'tex_mex_restaurant', 'burrito_restaurant'], 
				'thai' => ['thai_restaurant'], 
				'vietnamese' => ['vietnamese_restaurant']];

// Get dietary restrictions and disliked cuisines for all members
$dietaryMap = [];
$dislikedCuisineMap = [];
$allDislikedCuisineKeys = [];
$dislikedCuisineLabels = [];
if (!empty($members)) {
	$in = implode(',', array_fill(0, count($members), '?'));
	$types = str_repeat('i', count($members));
	$sql = 'SELECT id, dietary_restrictions, disliked_cuisines FROM users WHERE id IN (' . $in . ')';
	$stmt = mysqli_prepare($conn, $sql);
	$bindNames = [$types];
	foreach ($members as $i => $id) {
		$bindNames[] = &$members[$i];
	}
	call_user_func_array([$stmt, 'bind_param'], $bindNames);
	mysqli_stmt_execute($stmt);
	mysqli_stmt_bind_result($stmt, $uid, $dietaryRaw, $dislikedRaw);
	while (mysqli_stmt_fetch($stmt)) {
		$dietary = [];
		if ($dietaryRaw) {
			$decoded = json_decode($dietaryRaw, true);
			if (is_array($decoded)) {
				$dietary = $decoded;
			}
		}
		$dietaryMap[$uid] = $dietary;

		$dislikedCuisineMap[$uid] = [];
		if ($dislikedRaw) {
			$decoded = json_decode($dislikedRaw, true);
			if (is_array($decoded)) {
				foreach ($decoded as $cuisine) {
					if (!is_string($cuisine)) {
						continue;
					}
					$normalizedCuisine = strtolower(trim($cuisine));
					if ($normalizedCuisine === '') {
						continue;
					}
					$dislikedCuisineMap[$uid][$normalizedCuisine] = true;
					$allDislikedCuisineKeys[$normalizedCuisine] = true;
					if (!isset($dislikedCuisineLabels[$normalizedCuisine])) {
						$dislikedCuisineLabels[$normalizedCuisine] = trim($cuisine);
					}
				}
			}
		}
		$dislikedCuisineMap[$uid] = array_keys($dislikedCuisineMap[$uid]);
	}
	mysqli_stmt_close($stmt);
}

// --- Google Places API Integration ---
function get_google_places($lat, $lon, $apiKey, $radius = 10000, $maxResults = 60) {
	$url = "https://maps.googleapis.com/maps/api/place/nearbysearch/json?location={$lat},{$lon}&radius={$radius}&type=restaurant&key={$apiKey}";
	$resp = file_get_contents($url);
	if ($resp === false) return [];
	$data = json_decode($resp, true);
	if (!is_array($data) || !isset($data['results'])) return [];
	return array_slice($data['results'], 0, $maxResults);
}

function get_place_details($placeId, $apiKey) {
	static $detailsCache = [];
	if (isset($detailsCache[$placeId])) {
		return $detailsCache[$placeId];
	}

	$fields = 'opening_hours,utc_offset';
	$url = "https://maps.googleapis.com/maps/api/place/details/json?place_id={$placeId}&fields={$fields}&key={$apiKey}";
	$resp = file_get_contents($url);
	if ($resp === false) {
		$detailsCache[$placeId] = null;
		return null;
	}
	$data = json_decode($resp, true);
	if (!is_array($data) || !isset($data['result'])) {
		$detailsCache[$placeId] = null;
		return null;
	}

	$detailsCache[$placeId] = $data['result'];
	return $detailsCache[$placeId];
}

function parse_filter_time_to_minutes($rawTime) {
	if (!is_string($rawTime)) {
		return null;
	}

	$rawTime = trim($rawTime);
	if ($rawTime === '') {
		return null;
	}

	if (preg_match('/^(\d{2}):(\d{2})$/', $rawTime, $matches)) {
		$hour = intval($matches[1]);
		$minute = intval($matches[2]);
		if ($hour < 0 || $hour > 23 || $minute < 0 || $minute > 59) {
			return null;
		}
		return ($hour * 60) + $minute;
	}

	if (!preg_match('/^(\d{1,2}):(\d{2})\s*([AP]M)$/i', $rawTime, $matches)) {
		return null;
	}

	$hour = intval($matches[1]);
	$minute = intval($matches[2]);
	$meridiem = strtoupper($matches[3]);
	if ($hour < 1 || $hour > 12 || $minute < 0 || $minute > 59) {
		return null;
	}

	$hour = $hour % 12;
	if ($meridiem === 'PM') {
		$hour += 12;
	}

	return ($hour * 60) + $minute;
}

function parse_google_period_time_to_minutes($rawTime) {
	if (!is_string($rawTime) || !preg_match('/^\d{4}$/', $rawTime)) {
		return null;
	}

	$hour = intval(substr($rawTime, 0, 2));
	$minute = intval(substr($rawTime, 2, 2));
	if ($hour < 0 || $hour > 23 || $minute < 0 || $minute > 59) {
		return null;
	}

	return ($hour * 60) + $minute;
}

function restaurant_is_open_during_window($periods, $startMinutes, $endMinutes, $dayOfWeek) {
	if (!is_array($periods) || empty($periods)) {
		return false;
	}

	$targetStart = ($dayOfWeek * 1440) + $startMinutes;
	$targetEnd = ($dayOfWeek * 1440) + $endMinutes;

	foreach ($periods as $period) {
		$open = isset($period['open']) && is_array($period['open']) ? $period['open'] : null;
		$close = isset($period['close']) && is_array($period['close']) ? $period['close'] : null;
		if ($open === null) {
			continue;
		}

		$openDay = isset($open['day']) ? intval($open['day']) : null;
		$openTime = isset($open['time']) ? parse_google_period_time_to_minutes($open['time']) : null;
		if ($openDay === null || $openTime === null) {
			continue;
		}

		if ($close === null) {
			$openAbs = ($openDay * 1440) + $openTime;
			$closeAbs = $openAbs + 1440;
		} else {
			$closeDay = isset($close['day']) ? intval($close['day']) : null;
			$closeTime = isset($close['time']) ? parse_google_period_time_to_minutes($close['time']) : null;
			if ($closeDay === null || $closeTime === null) {
				continue;
			}

			$openAbs = ($openDay * 1440) + $openTime;
			$closeAbs = ($closeDay * 1440) + $closeTime;
			if ($closeAbs <= $openAbs) {
				$closeAbs += 7 * 1440;
			}
		}

		for ($shift = -1; $shift <= 1; $shift++) {
			$shiftMinutes = $shift * 7 * 1440;
			$shiftedOpen = $openAbs + $shiftMinutes;
			$shiftedClose = $closeAbs + $shiftMinutes;
			if ($shiftedOpen <= $targetStart && $shiftedClose >= $targetEnd) {
				return true;
			}
		}
	}

	return false;
}

function get_travel_distances($originLat, $originLon, $destinations, $apiKey) {
	if (empty($destinations)) return [];
	$url = "https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix";
	$headers = [
		"Content-Type: application/json",
		"X-Goog-Api-Key: $apiKey",
		"X-Goog-FieldMask: originIndex,destinationIndex,duration,distanceMeters"
	];
	$origins = [["waypoint" => ["location" => ["latLng" => ["latitude" => $originLat, "longitude" => $originLon]]]]];
	$destArr = [];
	foreach ($destinations as $d) {
		$destArr[] = ["waypoint" => ["location" => ["latLng" => ["latitude" => $d['lat'], "longitude" => $d['lng']]]]];
	}
	$body = json_encode([
		"origins" => $origins,
		"destinations" => $destArr,
		"travelMode" => "DRIVE"
	]);
	$ch = curl_init($url);
	curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
	curl_setopt($ch, CURLOPT_POST, true);
	curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
	curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
	$resp = curl_exec($ch);
	$httpcode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
	curl_close($ch);
	if ($resp === false) return [];
	$data = json_decode($resp, true);
	$distances = array_fill(0, count($destinations), null);
	if (is_array($data)) {
		foreach ($data as $row) {
			if (isset($row['originIndex'], $row['destinationIndex'], $row['distanceMeters'])) {
				$idx = $row['destinationIndex'];
				$meters = $row['distanceMeters'];
				// Convert meters to miles (rounded to 1 decimal)
				$miles = round($meters / 1609.34, 1);
				$distances[$idx] = $miles;
			}
		}
	}
	return $distances;
}

function haversine_distance_miles($lat1, $lon1, $lat2, $lon2) {
	$earthRadiusMiles = 3958.8;
	$dLat = deg2rad($lat2 - $lat1);
	$dLon = deg2rad($lon2 - $lon1);
	$a = sin($dLat / 2) * sin($dLat / 2)
		+ cos(deg2rad($lat1)) * cos(deg2rad($lat2))
		* sin($dLon / 2) * sin($dLon / 2);
	$c = 2 * atan2(sqrt($a), sqrt(1 - $a));
	return $earthRadiusMiles * $c;
}

function get_place_matched_cuisines($name, $tags, $cuisinesMap) {
	$matched = [];
	$nameLower = strtolower((string)$name);
	$normalizedTags = [];
	foreach ($tags as $tag) {
		if (is_string($tag)) {
			$normalizedTags[] = strtolower($tag);
		}
	}

	foreach ($cuisinesMap as $cuisineKey => $mappedTags) {
		foreach ($mappedTags as $mappedTag) {
			if (in_array(strtolower($mappedTag), $normalizedTags, true)) {
				$matched[$cuisineKey] = true;
				continue 2;
			}
		}

		if (strpos($nameLower, $cuisineKey) !== false) {
			$matched[$cuisineKey] = true;
		}
	}

	return array_keys($matched);
}

require_once __DIR__ . '/app_config.php';
$GOOGLE_API_KEY = foodies_config_value('GOOGLE_API_KEY', 'GOOGLE_API_KEY', '');
if (!is_string($GOOGLE_API_KEY) || trim($GOOGLE_API_KEY) === '') {
	foodies_missing_config_response('Google API key is not configured.');
}
$currentDayOfWeek = intval((new DateTime('now', new DateTimeZone('America/New_York')))->format('w'));

$places = get_google_places($latitude, $longitude, $GOOGLE_API_KEY, 10000, 60);

// Allowed restaurant tags for filtering
$allowed_restaurant_tags = [
	'acai_shop','afghani_restaurant','african_restaurant','american_restaurant','argentinian_restaurant','asian_fusion_restaurant','asian_restaurant','australian_restaurant','austrian_restaurant','bagel_shop','bakery','bangladeshi_restaurant','bar','bar_and_grill','barbecue_restaurant','basque_restaurant','bavarian_restaurant','beer_garden','belgian_restaurant','bistro','brazilian_restaurant','breakfast_restaurant','brewery','brewpub','british_restaurant','brunch_restaurant','buffet_restaurant','burmese_restaurant','burrito_restaurant','cafe','cafeteria','cajun_restaurant','cake_shop','californian_restaurant','cambodian_restaurant','candy_store','cantonese_restaurant','caribbean_restaurant','cat_cafe','chicken_restaurant','chicken_wings_restaurant','chilean_restaurant','chinese_noodle_restaurant','chinese_restaurant','chocolate_factory','chocolate_shop','cocktail_bar','coffee_roastery','coffee_shop','coffee_stand','colombian_restaurant','confectionery','croatian_restaurant','cuban_restaurant','czech_restaurant','danish_restaurant','deli','dessert_restaurant','dessert_shop','dim_sum_restaurant','diner','dog_cafe','donut_shop','dumpling_restaurant','dutch_restaurant','eastern_european_restaurant','ethiopian_restaurant','european_restaurant','falafel_restaurant','family_restaurant','fast_food_restaurant','filipino_restaurant','fine_dining_restaurant','fish_and_chips_restaurant','fondue_restaurant','food_court','french_restaurant','fusion_restaurant','gastropub','german_restaurant','greek_restaurant','gyro_restaurant','halal_restaurant','hamburger_restaurant','hawaiian_restaurant','hookah_bar','hot_dog_restaurant','hot_dog_stand','hot_pot_restaurant','hungarian_restaurant','ice_cream_shop','indian_restaurant','indonesian_restaurant','irish_pub','irish_restaurant','israeli_restaurant','italian_restaurant','japanese_curry_restaurant','japanese_izakaya_restaurant','japanese_restaurant','juice_shop','kebab_shop','korean_barbecue_restaurant','korean_restaurant','latin_american_restaurant','lebanese_restaurant','lounge_bar','malaysian_restaurant','meal_delivery','meal_takeaway','mediterranean_restaurant','mexican_restaurant','middle_eastern_restaurant','mongolian_barbecue_restaurant','moroccan_restaurant','noodle_shop','north_indian_restaurant','oyster_bar_restaurant','pakistani_restaurant','pastry_shop','persian_restaurant','peruvian_restaurant','pizza_delivery','pizza_restaurant','polish_restaurant','portuguese_restaurant','pub','ramen_restaurant','restaurant','romanian_restaurant','russian_restaurant','salad_shop','sandwich_shop','scandinavian_restaurant','seafood_restaurant','shawarma_restaurant','snack_bar','soul_food_restaurant','soup_restaurant','south_american_restaurant','south_indian_restaurant','southwestern_us_restaurant','spanish_restaurant','sports_bar','sri_lankan_restaurant','steak_house','sushi_restaurant','swiss_restaurant','taco_restaurant','taiwanese_restaurant','tapas_restaurant','tea_house','tex_mex_restaurant','thai_restaurant','tibetan_restaurant','tonkatsu_restaurant','turkish_restaurant','ukrainian_restaurant','vegan_restaurant','vegetarian_restaurant','vietnamese_restaurant','western_restaurant','wine_bar','winery','yakiniku_restaurant','yakitori_restaurant'
];

// Build filtered list of restaurant places and destinations for distance calculation

$filtered_places = [];
$destinations = [];
foreach ($places as $place) {
	$types = isset($place['types']) && is_array($place['types']) ? $place['types'] : [];
	$is_restaurant = false;
	if (!empty($types)) {
		foreach ($types as $type) {
			if (in_array($type, $allowed_restaurant_tags, true)) {
				$is_restaurant = true;
				break;
			}
		}
	}
	$placeLat = $place['geometry']['location']['lat'] ?? null;
	$placeLon = $place['geometry']['location']['lng'] ?? null;
	if ($is_restaurant && $placeLat !== null && $placeLon !== null) {
		$filtered_places[] = $place;
		$destinations[] = ['lat' => $placeLat, 'lng' => $placeLon];
	}
}
$distances = get_travel_distances($latitude, $longitude, $destinations, $GOOGLE_API_KEY);

// Filter layer params from POST JSON body
$maxDist = isset($body['max_dist']) ? floatval($body['max_dist']) : 15.0;
$maxDist = max(0.0, min(15.0, $maxDist));

$mode = isset($body['mode']) ? strtolower(trim((string)$body['mode'])) : 'driving';
$speedByMode = [
	'walking' => 3.0,
	'biking' => 10.0,
	'driving' => 25.0,
];
if (!isset($speedByMode[$mode])) {
	$mode = 'driving';
}
$speedMph = $speedByMode[$mode];

$cuisinesRaw = $body['cuisines'] ?? [];
$selectedCuisines = [];
if (is_array($cuisinesRaw)) {
	foreach ($cuisinesRaw as $c) {
		if (is_string($c) && trim($c) !== '') {
			$selectedCuisines[] = strtolower(trim($c));
		}
	}
} elseif (is_string($cuisinesRaw) && trim($cuisinesRaw) !== '') {
	$selectedCuisines[] = strtolower(trim($cuisinesRaw));
}
$selectedCuisines = array_values(array_unique($selectedCuisines));
$selectedStartMinutes = parse_filter_time_to_minutes($startTimeRaw);
$selectedEndMinutes = parse_filter_time_to_minutes($endTimeRaw);
$hasTimeWindow = ($startTimeRaw !== '' || $endTimeRaw !== '');
$timeWindowFormatInvalid = (
	($startTimeRaw !== '' && $selectedStartMinutes === null) ||
	($endTimeRaw !== '' && $selectedEndMinutes === null)
);
$timeWindowPartiallyProvided = (
	($startTimeRaw === '' && $endTimeRaw !== '') ||
	($startTimeRaw !== '' && $endTimeRaw === '')
);
$timeWindowIsValid = (
	$startTimeRaw === '' && $endTimeRaw === ''
) || (
	$selectedStartMinutes !== null &&
	$selectedEndMinutes !== null &&
	$selectedStartMinutes < $selectedEndMinutes
);

if ($timeWindowFormatInvalid || $timeWindowPartiallyProvided) {
	http_response_code(400);
	echo json_encode(['success' => false, 'message' => 'Invalid request body format']);
	exit;
}

if (!$timeWindowIsValid) {
	http_response_code(400);
	echo json_encode(['success' => false, 'message' => 'Start time must be earlier than end time']);
	exit;
}

// Build a set of all tags for selected cuisines using cuisinesMap
$selectedCuisineTags = [];
if (!empty($selectedCuisines)) {
	foreach ($selectedCuisines as $cuisine) {
		if (isset($cuisinesMap[$cuisine])) {
			foreach ($cuisinesMap[$cuisine] as $tag) {
				$selectedCuisineTags[$tag] = true;
			}
		}
	}
}

// Use filtered_places and correct distance index
$restaurants = [];
foreach (array_values($filtered_places) as $idx => $place) {
	$name = $place['name'] ?? '';
	$rating = $place['rating'] ?? null;
	$price = isset($place['price_level']) ? str_repeat('$', intval($place['price_level'])) : null;
	$placeId = $place['place_id'] ?? null;
	$types = isset($place['types']) && is_array($place['types']) ? $place['types'] : [];
	$tags = array_values(array_filter($types, function($t) { return $t !== 'restaurant'; }));
	$distanceMiles = isset($distances[$idx]) ? floatval($distances[$idx]) : null;

	if ($distanceMiles === null) {
		$placeLat = $place['geometry']['location']['lat'] ?? null;
		$placeLon = $place['geometry']['location']['lng'] ?? null;
		if ($placeLat !== null && $placeLon !== null) {
			$distanceMiles = haversine_distance_miles($latitude, $longitude, floatval($placeLat), floatval($placeLon));
		}
	}

	if ($distanceMiles === null) {
		continue;
	}

	$distanceMiles = round($distanceMiles, 1);

	// Refine results: only include restaurants that pass max distance filter
	if ($distanceMiles > $maxDist) {
		continue;
	}

	//Filter by price if price filter is set
	if ($price != null) {
		if (!in_array($price, $priceFilter, true) && !empty($priceFilter)) {
			continue;
		}
	} else {
		if (is_array($priceFilter) && !empty($priceFilter)) {
			continue;
		}
	}

	$travelTimeMinutes = round(($distanceMiles / $speedMph) * 60, 1);
	$label = null;

	// Improved: filter by cuisine tags using cuisinesMap
	if (!empty($selectedCuisineTags)) {
		$hasCuisineTag = false;
		foreach ($tags as $tag) {
			if (isset($selectedCuisineTags[strtolower($tag)])) {
				$hasCuisineTag = true;
				$label = ucfirst($tag);
				break;
			}
		}
		if (!$hasCuisineTag) {
			// Fallback: keyword match in name for selected cuisines
			$nameLower = strtolower($name);
			$matchedKeyword = false;
			// Check for selected cuisine keywords in name
			foreach ($selectedCuisines as $cuisineKeyword) {
				if (strpos($nameLower, $cuisineKeyword) !== false) {
					$matchedKeyword = true;
					$label = ucfirst($cuisineKeyword);
					break;
				}
			}
			if (!$matchedKeyword) {
				continue;
			}
		}
	}

	// Only include if at least one allowed restaurant tag is present
	$is_restaurant = false;
	if (!empty($types)) {
		foreach ($types as $type) {
			if (in_array($type, $allowed_restaurant_tags, true)) {
				$is_restaurant = true;
				break;
			}
		}
	}
	if (!$is_restaurant) {
		continue;
	}

	if ($hasTimeWindow && $selectedStartMinutes !== null && $selectedEndMinutes !== null) {
		if (!$placeId) {
			continue;
		}

		$details = get_place_details($placeId, $GOOGLE_API_KEY);
		$periods = isset($details['opening_hours']['periods']) && is_array($details['opening_hours']['periods'])
			? $details['opening_hours']['periods']
			: [];
		if (!restaurant_is_open_during_window($periods, $selectedStartMinutes, $selectedEndMinutes, $currentDayOfWeek)) {
			continue;
		}
	}

	// Improved match score: use dietaryRestrictions mapping, only adjust score, normalize by group size
	$match_score = 100;
	$reasons = [];
	$reasonByRestriction = [];
	$setRestrictionReason = function ($restriction, $positive, $reason, $priority) use (&$reasonByRestriction) {
		$existing = $reasonByRestriction[$restriction] ?? null;
		if ($existing === null || $priority >= $existing['priority']) {
			$reasonByRestriction[$restriction] = [
				'priority' => $priority,
				'payload' => [
					'positive' => $positive,
					'reason' => $reason,
				],
			];
		}
	};
	$group_size = count($members);
	$violated_restrictions = [];
	$members_with_conflict = [];
	$matchedCuisineKeys = get_place_matched_cuisines($name, $tags, $cuisinesMap);
	$matchedCuisineKeySet = array_fill_keys($matchedCuisineKeys, true);
	foreach ($dietaryMap as $uid => $restrictions) {
		$member_conflict = false;
		foreach ($restrictions as $restriction) {
			$conflict = false;
			if (isset($dietaryRestrictions[$restriction])) {
				$map = $dietaryRestrictions[$restriction];
				// Check disqualify_tags
				foreach ($map['disqualify_tags'] as $badTag) {
					if (in_array($badTag, $tags, true)) {
						$conflict = true;
						$setRestrictionReason($restriction, false, "Not suitable for '$restriction' in your group.", 1);
					}
				}
				// Check disqualify_fields (if present in place)
				foreach ($map['disqualify_fields'] as $badField) {
					if (!empty($place[$badField])) {
						$conflict = true;
						$setRestrictionReason($restriction, false, "Not suitable for '$restriction' in your group.", 1);
					}
				}
				// If qualify_tags is set, require at least one match (by tag or name fallback)
				if (!empty($map['qualify_tags'])) {
					$qualifies = false;
					foreach ($map['qualify_tags'] as $goodTag) {
						if (in_array($goodTag, $tags, true)) {
							$qualifies = true;
							break;
						}
					}
					// Fallback: check if restaurant name contains any qualify tag or restriction keyword
					if (!$qualifies) {
						$nameLower = strtolower($name);
						foreach ($map['qualify_tags'] as $goodTag) {
							$tagKeyword = str_replace(['_restaurant', '_bar', '_shop', '_cafe'], '', $goodTag);
							if (strpos($nameLower, str_replace('_', ' ', $tagKeyword)) !== false) {
								$qualifies = true;
								break;
							}
						}
						// Also check if restriction keyword is in the name
						if (!$qualifies && strpos($nameLower, strtolower($restriction)) !== false) {
							$qualifies = true;
						}
					}
					if (!$qualifies) {
						$conflict = true;
						$setRestrictionReason($restriction, false, "No '$restriction' options for your group.", 2);
					}
				}
				// If qualify_fields is set, require at least one present
				if (!empty($map['qualify_fields'])) {
					$qualifies = false;
					foreach ($map['qualify_fields'] as $goodField) {
						if (!empty($place[$goodField])) {
							$qualifies = true;
							break;
						}
					}
					if (!$qualifies) {
						$conflict = true;
						$setRestrictionReason($restriction, false, "No '$restriction' options for your group.", 2);
					}
				}
			}
			// If not mapped, fallback to old logic (basic tag search)
			else if (stripos(json_encode($tags), $restriction) === false) {
				$conflict = true;
				$setRestrictionReason($restriction, false, "May not fit '$restriction' in your group.", 1);
			}
			if ($conflict) {
				$violated_restrictions[$restriction] = true;
				$member_conflict = true;
			}
		}
		if ($member_conflict) {
			$members_with_conflict[$uid] = true;
		}
	}
	$num_violated = count($violated_restrictions);
	$num_members_with_conflict = count($members_with_conflict);
	// Penalty: average of percent of unique restrictions violated and percent of group members affected
	$total_unique_restrictions = [];
	foreach ($dietaryMap as $restrictions) {
		foreach ($restrictions as $restriction) {
			$total_unique_restrictions[$restriction] = true;
		}
	}
	$num_total_restrictions = max(1, count($total_unique_restrictions));
	$group_size = max(1, count($members));
	$penalty_restrictions = 100 * $num_violated / $num_total_restrictions;
	$penalty_members = 100 * $num_members_with_conflict / $group_size;
	$penalty = ($penalty_restrictions + $penalty_members) / 2;
	$match_score = max(0, 100 - $penalty);

	$dislikedCuisineCounts = [];
	$members_with_disliked_conflict = [];
	foreach ($dislikedCuisineMap as $uid => $dislikedCuisines) {
		$memberDislikedConflict = false;
		foreach ($dislikedCuisines as $dislikedCuisine) {
			if (!isset($matchedCuisineKeySet[$dislikedCuisine])) {
				continue;
			}

			$dislikedCuisineCounts[$dislikedCuisine] = ($dislikedCuisineCounts[$dislikedCuisine] ?? 0) + 1;
			$memberDislikedConflict = true;
		}
		if ($memberDislikedConflict) {
			$members_with_disliked_conflict[$uid] = true;
		}
	}

	$num_disliked_cuisines = count($dislikedCuisineCounts);
	$num_members_with_disliked_conflict = count($members_with_disliked_conflict);
	$num_total_disliked_cuisines = max(1, count($allDislikedCuisineKeys));
	if ($num_disliked_cuisines > 0) {
		$dislikedPenaltyCuisines = 100 * $num_disliked_cuisines / $num_total_disliked_cuisines;
		$dislikedPenaltyMembers = 100 * $num_members_with_disliked_conflict / $group_size;
		$dislikedPenalty = (($dislikedPenaltyCuisines + $dislikedPenaltyMembers) / 2) * 0.5;
		$match_score = max(0, $match_score - $dislikedPenalty);

		foreach ($dislikedCuisineCounts as $cuisineKey => $count) {
			$cuisineLabel = $dislikedCuisineLabels[$cuisineKey] ?? ucwords($cuisineKey);
			$memberLabel = $count === 1 ? 'member dislikes' : 'members dislike';
			$reasons[] = [
				'positive' => false,
				'reason' => $count . ' ' . $memberLabel . ' ' . $cuisineLabel . ' cuisine.'
			];
		}
	}

	foreach ($reasonByRestriction as $reasonData) {
		$reasons[] = $reasonData['payload'];
	}
	if ($num_violated === 0 && $num_disliked_cuisines === 0) {
		$reasons[] = [
			'positive' => true,
			'reason' => 'No dietary conflicts.'
		];
	}

	$placeLat = $place['geometry']['location']['lat'] ?? null;
	$placeLon = $place['geometry']['location']['lng'] ?? null;
	$address = $place['vicinity'] ?? ($place['formatted_address'] ?? null);

	$restaurants[] = [
		'id' => $placeId ?: $name,
		'name' => $name,
		'restaurant_name' => $name,
		'address' => $address,
		'latitude' => $placeLat !== null ? floatval($placeLat) : null,
		'longitude' => $placeLon !== null ? floatval($placeLon) : null,
		'rating' => $rating,
		'cost' => $price,
		'distance' => $distanceMiles,
		'travel_time' => $travelTimeMinutes,
		'tags' => $tags, // now always a list of strings
		'label' => $label,
		'match_score' => max(0, $match_score),
		'reasons' => $reasons,
	];
}

// Sort recommendations by match_score descending
usort($restaurants, function($a, $b) {
	return $b['match_score'] <=> $a['match_score'];
});

$response = [
	'success' => true,
	'restaurants' => $restaurants,
	'recommendations' => $restaurants,
];

if ($hasTimeWindow && empty($restaurants)) {
	$response['message'] = 'No restaurants are open during the selected time window';
}

echo json_encode($response);
exit;
