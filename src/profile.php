<?php
session_name('foodies_session');
session_start();

/*
// Handle CORS for both local development and production
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$allowed_origins = [
    'http://localhost',
    'http://127.0.0.1',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5174',
    'http://localhost:4173',
    'http://127.0.0.1:4173',
    'https://aptitude.cse.buffalo.edu',
    'https://cattle.cse.buffalo.edu'
];

if ($origin === '') {
    // Same-origin / non-browser request: no CORS header needed.
    header('Vary: Origin');
} elseif (in_array($origin, $allowed_origins, true)) {
    // Allowed cross-origin request: set CORS header and continue.
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Vary: Origin');
} else {
    // Unknown origin: block.
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Origin not allowed']);
    exit;
}
*/
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: GET, PUT, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];
if ($method !== 'GET' && $method !== 'PUT') {
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

$userId = (int) $_SESSION['user_id'];

$allowed_dietary = [
  'Alcohol-Free', 'Halal', 'Kosher', 'Vegan', 'Vegetarian', 'Pescatarian', 'Seafood Allergy'
];

$allowed_cuisines = [
    'American', 'Barbecue', 'British', 'Chinese', 'French', 'Greek', 'Indian', 'Italian',
    'Japanese', 'Korean', 'Latin American', 'Mediterranean', 'Mexican', 'Thai', 'Vietnamese'
];

if ($method === 'GET') {
    // Fetch user basic info including counts
        $stmt = mysqli_prepare($conn, 'SELECT username, friends_count, restaurant_count, dietary_restrictions, disliked_cuisines, email, phone, city, lat, lng FROM users WHERE id = ?');
    mysqli_stmt_bind_param($stmt, 'i', $userId);
    mysqli_stmt_execute($stmt);
        mysqli_stmt_bind_result($stmt, $username, $friendsCount, $restaurantCount, $dietaryRaw, $dislikedRaw, $email, $phone, $city, $lat, $lng);
    if (!mysqli_stmt_fetch($stmt)) {
        mysqli_stmt_close($stmt);
        mysqli_close($conn);
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'User not found']);
        exit;
    }
    mysqli_stmt_close($stmt);

    $dietary = [];
    if ($dietaryRaw !== null && $dietaryRaw !== '') {
        $decoded = json_decode($dietaryRaw, true);
        if (is_array($decoded)) {
            $dietary = $decoded;
        }
    }

    $dislikedCuisines = [];
    if ($dislikedRaw !== null && $dislikedRaw !== '') {
        $decoded = json_decode($dislikedRaw, true);
        if (is_array($decoded)) {
            $dislikedCuisines = $decoded;
        }
    }

    // Get recent restaurants from visit_history (aptitude schema-safe)
    $restaurants = [];
    $stmt = mysqli_prepare($conn, '
        SELECT restaurant_name, cuisine, price_level
        FROM visit_history
        WHERE user_id = ?
        ORDER BY id DESC
        LIMIT 10
    ');

    if ($stmt) {
        mysqli_stmt_bind_param($stmt, 'i', $userId);
        mysqli_stmt_execute($stmt);
        mysqli_stmt_bind_result($stmt, $restaurantName, $cuisine, $priceLevel);

        while (mysqli_stmt_fetch($stmt)) {
            $restaurants[] = [
                'name' => $restaurantName,
                'cuisine' => $cuisine !== null ? $cuisine : 'Unknown',
                'rating' => 0,
                'price' => $priceLevel !== null && $priceLevel !== '' ? $priceLevel : '$$',
                'image' => 'https://via.placeholder.com/300x200?text=' . urlencode($restaurantName),
            ];
        }
        mysqli_stmt_close($stmt);
    }
    mysqli_close($conn);

    echo json_encode([
        'success' => true,
        'user' => [
            'username' => $username,
            'friends_count' => $friendsCount,
            'restaurant_count' => $restaurantCount,
        ],
        'restaurants' => $restaurants,
        'profile' => [
            'username' => $username,
            'dietary_restrictions' => $dietary,
            'disliked_cuisines' => $dislikedCuisines,
            'email' => $email === null ? '' : $email,
            'phone' => $phone === null ? '' : $phone,
            'city' => $city === null ? '' : $city,
            'lat'  => $lat === null ? null : (float) $lat,
            'lng'  => $lng === null ? null : (float) $lng,
        ],
    ]);
    exit;
}

// PUT
$body = json_decode(file_get_contents('php://input'), true);
if (!is_array($body)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid JSON body']);
    mysqli_close($conn);
    exit;
}

$updates = [];
$types = '';
$params = [];

$newUsername = isset($body['username']) ? trim($body['username']) : null;
if ($newUsername !== null) {
    if (strlen($newUsername) < 3 || strlen($newUsername) > 30) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Username must be between 3 and 30 characters']);
        mysqli_close($conn);
        exit;
    }
    if (!preg_match('/^[a-zA-Z0-9_.\-]+$/', $newUsername)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Username can only contain letters, numbers, underscores, periods, and hyphens']);
        mysqli_close($conn);
        exit;
    }

    $check = mysqli_prepare($conn, 'SELECT id FROM users WHERE username = ? AND id != ?');
    mysqli_stmt_bind_param($check, 'si', $newUsername, $userId);
    mysqli_stmt_execute($check);
    mysqli_stmt_store_result($check);
    if (mysqli_stmt_num_rows($check) > 0) {
        mysqli_stmt_close($check);
        mysqli_close($conn);
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Username already in use']);
        exit;
    }
    mysqli_stmt_close($check);

    $updates[] = 'username = ?';
    $types .= 's';
    $params[] = $newUsername;
}

$dietary = $body['dietary_restrictions'] ?? null;
if (is_array($dietary)) {
    $filteredDietary = [];
    foreach ($dietary as $item) {
        if (is_string($item) && in_array($item, $allowed_dietary, true)) {
            $filteredDietary[] = $item;
        }
    }
    $updates[] = 'dietary_restrictions = ?';
    $types .= 's';
    $params[] = json_encode(array_values(array_unique($filteredDietary)));
}

$dislikedCuisines = $body['disliked_cuisines'] ?? null;
if (is_array($dislikedCuisines)) {
    $filteredDisliked = [];
    foreach ($dislikedCuisines as $item) {
        if (is_string($item) && in_array(trim($item), $allowed_cuisines, true)) {
            $filteredDisliked[] = trim($item);
        }
    }
    $filteredDisliked = array_slice(array_values(array_unique($filteredDisliked)), 0, 30);
    $updates[] = 'disliked_cuisines = ?';
    $types .= 's';
    $params[] = json_encode($filteredDisliked);
}

$newEmail = isset($body['email']) ? trim($body['email']) : null;
if ($newEmail !== null) {
    if ($newEmail !== '' && !filter_var($newEmail, FILTER_VALIDATE_EMAIL)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid email format']);
        mysqli_close($conn);
        exit;
    }
    if ($newEmail !== '') {
        $check = mysqli_prepare($conn, 'SELECT id FROM users WHERE email = ? AND id != ?');
        mysqli_stmt_bind_param($check, 'si', $newEmail, $userId);
        mysqli_stmt_execute($check);
        mysqli_stmt_store_result($check);
        if (mysqli_stmt_num_rows($check) > 0) {
            mysqli_stmt_close($check);
            mysqli_close($conn);
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Email already in use']);
            exit;
        }
        mysqli_stmt_close($check);
    }
    $updates[] = 'email = ?';
    $types .= 's';
    $params[] = $newEmail === '' ? null : $newEmail;
}

$newPhone = isset($body['phone']) ? trim($body['phone']) : null;
if ($newPhone !== null) {
    if (strlen($newPhone) > 32) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Phone too long']);
        mysqli_close($conn);
        exit;
    }
    $updates[] = 'phone = ?';
    $types .= 's';
    $params[] = $newPhone === '' ? null : $newPhone;
}

$newCity = isset($body['city']) ? trim($body['city']) : null;
if ($newCity !== null) {
    if (strlen($newCity) > 255) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'City name too long (max 255 characters)']);
        mysqli_close($conn); exit;
    }
    $updates[] = 'city = ?'; $types .= 's';
    $params[] = $newCity === '' ? null : $newCity;
}

$newLat = array_key_exists('lat', $body) ? $body['lat'] : 'MISSING';
if ($newLat !== 'MISSING') {
    if ($newLat !== null) {
        $newLat = filter_var($newLat, FILTER_VALIDATE_FLOAT);
        if ($newLat === false || $newLat < -90 || $newLat > 90) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Invalid latitude']);
            mysqli_close($conn); exit;
        }
    }
    $updates[] = 'lat = ?'; $types .= 'd'; $params[] = $newLat;
}

$newLng = array_key_exists('lng', $body) ? $body['lng'] : 'MISSING';
if ($newLng !== 'MISSING') {
    if ($newLng !== null) {
        $newLng = filter_var($newLng, FILTER_VALIDATE_FLOAT);
        if ($newLng === false || $newLng < -180 || $newLng > 180) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Invalid longitude']);
            mysqli_close($conn); exit;
        }
    }
    $updates[] = 'lng = ?'; $types .= 'd'; $params[] = $newLng;
}

if (empty($updates)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'No valid fields to update']);
    mysqli_close($conn);
    exit;
}

$params[] = $userId;
$types .= 'i';
$sql = 'UPDATE users SET ' . implode(', ', $updates) . ' WHERE id = ?';
$stmt = mysqli_prepare($conn, $sql);
$bindArgs = [$types];
foreach ($params as $key => $value) {
    $bindArgs[] = &$params[$key];
}
call_user_func_array([$stmt, 'bind_param'], $bindArgs);
mysqli_stmt_execute($stmt);

if (mysqli_errno($conn) !== 0) {
    mysqli_stmt_close($stmt);
    mysqli_close($conn);
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => mysqli_error($conn)]);
    exit;
}

mysqli_stmt_close($stmt);
mysqli_close($conn);

$responseProfile = [];
if (isset($filteredDietary)) {
    $responseProfile['dietary_restrictions'] = array_values(array_unique($filteredDietary));
}
if (isset($filteredDisliked)) {
    $responseProfile['disliked_cuisines'] = $filteredDisliked;
}
if ($newEmail !== null) {
    $responseProfile['email'] = $newEmail === '' ? '' : $newEmail;
}
if ($newPhone !== null) {
    $responseProfile['phone'] = $newPhone === '' ? '' : $newPhone;
}
if ($newCity !== null) { $responseProfile['city'] = $newCity === '' ? '' : $newCity; }
if ($newLat !== 'MISSING') { $responseProfile['lat'] = $newLat; }
if ($newLng !== 'MISSING') { $responseProfile['lng'] = $newLng; }

echo json_encode([
    'success' => true,
    'profile' => $responseProfile,
]);
