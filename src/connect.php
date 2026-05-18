<?php
require_once __DIR__ . '/app_config.php';

// Configure with Apache env vars or ignored src/config.php constants:
// FOODIES_DB_HOST, FOODIES_DB_USER, FOODIES_DB_PASS, FOODIES_DB_NAME.
// Localhost defaults to XAMPP. Non-localhost must be explicitly configured.
$httpHost = $_SERVER['HTTP_HOST'] ?? '';
$serverName = $_SERVER['SERVER_NAME'] ?? '';
$isLocalHost = in_array($httpHost, ['localhost', '127.0.0.1'], true)
  || in_array($serverName, ['localhost', '127.0.0.1'], true);

if ($isLocalHost) {
  $defaultHost = 'localhost';
  $defaultUser = 'root';
  $defaultPass = '';
  $defaultDb = 'foodies_test';
} else {
  $defaultHost = null;
  $defaultUser = null;
  $defaultPass = null;
  $defaultDb = null;
}

$dbHost = foodies_config_value('FOODIES_DB_HOST', 'FOODIES_DB_HOST', $defaultHost);
$dbUser = foodies_config_value('FOODIES_DB_USER', 'FOODIES_DB_USER', $defaultUser);
$dbPass = foodies_config_value('FOODIES_DB_PASS', 'FOODIES_DB_PASS', $defaultPass);
$dbName = foodies_config_value('FOODIES_DB_NAME', 'FOODIES_DB_NAME', $defaultDb);

if ($dbHost === null || $dbUser === null || $dbPass === null || $dbName === null) {
  foodies_missing_config_response('Database credentials are not configured.');
}

$conn = mysqli_connect($dbHost, $dbUser, $dbPass, $dbName);
if (!$conn) {
  http_response_code(500);
  header('Content-Type: application/json; charset=utf-8');
  error_log('DB connect failed: ' . mysqli_connect_error());
  echo json_encode(["error" => "DB connect failed"]);
  exit;
}
