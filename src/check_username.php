<?php
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
	echo json_encode(["error" => "Method not allowed"]);
	exit;
}


$rawInput = file_get_contents('php://input');
$data = json_decode($rawInput, true);
if (!is_array($data)) {
	error_log("check_username.php: Invalid or empty JSON body: " . $rawInput);
	http_response_code(400);
	echo json_encode(["error" => "Invalid or missing JSON body"]);
	exit;
}
$username = trim($data['username'] ?? '');
if ($username === '') {
	http_response_code(400);
	echo json_encode(["error" => "Username is required"]);
	exit;
}

include 'connect.php';

$stmt = mysqli_prepare($conn, 'SELECT id FROM users WHERE username = ?');
if (!$stmt) {
	http_response_code(500);
	echo json_encode(["error" => "DB prepare failed"]);
	exit;
}
mysqli_stmt_bind_param($stmt, 's', $username);
mysqli_stmt_execute($stmt);
mysqli_stmt_bind_result($stmt, $userId);

$exists = mysqli_stmt_fetch($stmt);
mysqli_stmt_close($stmt);
mysqli_close($conn);

// If $exists is false, username is unique
echo json_encode(["unique" => !$exists]);
