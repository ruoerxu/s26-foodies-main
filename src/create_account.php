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

// Read and validate JSON body
$rawInput = file_get_contents('php://input');
$data = json_decode($rawInput, true);
if (!is_array($data)) {
    error_log("create_account.php: Invalid or empty JSON body: " . $rawInput);
    http_response_code(400);
    echo json_encode(["error" => "Invalid or missing JSON body"]);
    exit;
}
$username = trim($data['username'] ?? '');
$email = trim($data['email'] ?? '');
$password = $data['password'] ?? '';
if ($username === '' || $email === '' || $password === '') {
    http_response_code(400);
    echo json_encode(["error" => "Username, email, and password are required"]);
    exit;
}
if (strlen($username) < 3 || strlen($username) > 30) {
    http_response_code(400);
    echo json_encode(["error" => "Username must be between 3 and 30 characters long"]);
    exit;
}
if (!preg_match('/^[a-zA-Z0-9_.\-]+$/', $username)) {
    http_response_code(400);
    echo json_encode(["error" => "Username can only contain letters, numbers, _, ., -"]);
    exit;
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(["error" => "Invalid email format"]);
    exit;
}
if (strlen($password) < 8 || strlen($password) > 64) {
    http_response_code(400);
    echo json_encode(["error" => "Password must be at least 8 characters and no more than 64 characters long"]);
    exit;
}
if (!preg_match('/[0-9]/', $password)) {
    http_response_code(400);
    echo json_encode(["error" => "Password must include a number"]);
    exit;
}
if (!preg_match('/[^a-zA-Z0-9]/', $password)) {
    http_response_code(400);
    echo json_encode(["error" => "Password must include a symbol"]);
    exit;
}

include 'connect.php';

// Check if username or email already exists
$stmt = mysqli_prepare($conn, 'SELECT id FROM users WHERE username = ? OR email = ?');
if (!$stmt) {
    http_response_code(500);
    echo json_encode(["error" => "DB prepare failed"]);
    exit;
}
mysqli_stmt_bind_param($stmt, 'ss', $username, $email);
mysqli_stmt_execute($stmt);
mysqli_stmt_bind_result($stmt, $userId);
$exists = mysqli_stmt_fetch($stmt);
mysqli_stmt_close($stmt);

if ($exists) {
    http_response_code(400);
    echo json_encode(["error" => "Username or email already exists"]);
    exit;
}

// Generate email confirmation token
$token = bin2hex(random_bytes(32));
$passwordHash = password_hash($password, PASSWORD_BCRYPT);

// Insert user with email confirmation fields
$stmt = mysqli_prepare($conn, 'INSERT INTO users (username, email, password, email_confirmed, email_token, friends_count, restaurant_count, dietary_restrictions) VALUES (?, ?, ?, 0, ?, 0, 0, NULL)');
if (!$stmt) {
    http_response_code(500);
    echo json_encode(["error" => "DB prepare failed"]);
    exit;
}
mysqli_stmt_bind_param($stmt, 'ssss', $username, $email, $passwordHash, $token);
if (!mysqli_stmt_execute($stmt)) {
    http_response_code(500);
    echo json_encode(["error" => "Failed to create account"]);
    $stmt->close();
    $conn->close();
    exit;
}
$stmt->close();

// Send confirmation email
$confirmUrl = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http') .
    '://' . $_SERVER['HTTP_HOST'] . dirname($_SERVER['REQUEST_URI']) . "/confirm_email.php?token=$token";
$subject = 'Please Verify your Email';
$message = "Hello $username,\n\nPlease verify your email by clicking the link below:\n$confirmUrl\n\nIf you did not sign up, please ignore this email.";
$headers = "From: no-reply@" . $_SERVER['HTTP_HOST'] . "\r\nContent-Type: text/plain; charset=utf-8";

// Use mail() function (ensure mail is configured on your server)
$emailSent = @mail($email, $subject, $message, $headers);

mysqli_close($conn);

if ($emailSent) {
    http_response_code(200);
    echo json_encode(["success" => true, "message" => "Account created. Please check your email to verify your account."]);
    exit;
} else {
    error_log("create_account.php: mail() failed for $email");
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(["error" => "Account created, but failed to send confirmation email. Contact support."]);
    exit;
}