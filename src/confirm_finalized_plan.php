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

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
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

$body = json_decode(file_get_contents('php://input'), true);
if (!is_array($body)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid JSON body']);
    exit;
}

$partyName = trim((string)($body['party_name'] ?? ''));
if ($partyName === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'party_name is required']);
    exit;
}

require_once __DIR__ . '/connect.php';

$userId = (int)$_SESSION['user_id'];

// Verify organizer
$stmt = mysqli_prepare($conn, 'SELECT id, organizer_id FROM parties WHERE name = ? LIMIT 1');
if (!$stmt) { http_response_code(500); echo json_encode(['success' => false, 'message' => 'DB error']); exit; }
mysqli_stmt_bind_param($stmt, 's', $partyName);
mysqli_stmt_execute($stmt);
mysqli_stmt_bind_result($stmt, $partyId, $organizerId);
$found = mysqli_stmt_fetch($stmt);
mysqli_stmt_close($stmt);

if (!$found) {
    http_response_code(404);
    echo json_encode(['success' => false, 'message' => 'Party not found']);
    exit;
}
if ((int)$organizerId !== $userId) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Only the party organizer can confirm the plan']);
    exit;
}

// Fetch the finalized plan
$stmt = mysqli_prepare($conn,
    'SELECT restaurant_name, meeting_date, meeting_time, meeting_location
     FROM finalized_plan WHERE party_id = ? LIMIT 1');
if (!$stmt) { http_response_code(500); echo json_encode(['success' => false, 'message' => 'DB error']); exit; }
mysqli_stmt_bind_param($stmt, 'i', $partyId);
mysqli_stmt_execute($stmt);
mysqli_stmt_bind_result($stmt, $restaurantName, $meetingDate, $meetingTime, $meetingLocation);
$planFound = mysqli_stmt_fetch($stmt);
mysqli_stmt_close($stmt);

if (!$planFound) {
    http_response_code(404);
    echo json_encode(['success' => false, 'message' => 'No finalized plan found for this party']);
    exit;
}

// Mark as confirmed
$stmt = mysqli_prepare($conn,
    'UPDATE finalized_plan SET confirmed = 1, updated_at = CURRENT_TIMESTAMP WHERE party_id = ?');
if (!$stmt) { http_response_code(500); echo json_encode(['success' => false, 'message' => 'DB error']); exit; }
mysqli_stmt_bind_param($stmt, 'i', $partyId);
mysqli_stmt_execute($stmt);
mysqli_stmt_close($stmt);

// Get all party member emails (members + organizer)
$emails = [];
$stmt = mysqli_prepare($conn,
    'SELECT u.email, u.username FROM users u
     INNER JOIN party_members pm ON pm.user_id = u.id
     WHERE pm.party_id = ? AND u.email IS NOT NULL AND u.email != ""');
if ($stmt) {
    mysqli_stmt_bind_param($stmt, 'i', $partyId);
    mysqli_stmt_execute($stmt);
    mysqli_stmt_bind_result($stmt, $memberEmail, $memberUsername);
    while (mysqli_stmt_fetch($stmt)) {
        $emails[] = ['email' => $memberEmail, 'username' => $memberUsername];
    }
    mysqli_stmt_close($stmt);
}

// Also get organizer email
$stmt = mysqli_prepare($conn,
    'SELECT u.email, u.username FROM users u
     INNER JOIN parties p ON p.organizer_id = u.id
     WHERE p.id = ? AND u.email IS NOT NULL AND u.email != ""');
if ($stmt) {
    mysqli_stmt_bind_param($stmt, 'i', $partyId);
    mysqli_stmt_execute($stmt);
    mysqli_stmt_bind_result($stmt, $orgEmail, $orgUsername);
    if (mysqli_stmt_fetch($stmt)) {
        $emails[] = ['email' => $orgEmail, 'username' => $orgUsername];
    }
    mysqli_stmt_close($stmt);
}

mysqli_close($conn);

// Remove duplicate emails
$seen = [];
$uniqueEmails = [];
foreach ($emails as $entry) {
    if (!in_array($entry['email'], $seen, true)) {
        $seen[] = $entry['email'];
        $uniqueEmails[] = $entry;
    }
}

// Send notification emails
$host    = $_SERVER['HTTP_HOST'] ?? 'foodies.app';
$from    = "no-reply@$host";
$subject = "Foodies: Your group outing to $restaurantName is confirmed!";

$dateStr     = $meetingDate     ? $meetingDate     : 'TBD';
$timeStr     = $meetingTime     ? $meetingTime     : 'TBD';
$locationStr = $meetingLocation ? $meetingLocation : 'TBD';

$emailsSent = 0;
foreach ($uniqueEmails as $entry) {
    $name    = $entry['username'];
    $to      = $entry['email'];
    $message = "Hi $name,\n\n"
        . "Your group \"$partyName\" has finalized your outing!\n\n"
        . "Restaurant: $restaurantName\n"
        . "Date:       $dateStr\n"
        . "Time:       $timeStr\n"
        . "Location:   $locationStr\n\n"
        . "See you there!\n\n"
        . "— The Foodies Team";
    $headers = "From: $from\r\nContent-Type: text/plain; charset=utf-8";
    if (@mail($to, $subject, $message, $headers)) {
        $emailsSent++;
    }
}

http_response_code(200);
echo json_encode([
    'success'      => true,
    'message'      => 'Plan confirmed and notifications sent',
    'emails_sent'  => $emailsSent,
    'total_members'=> count($uniqueEmails),
]);
