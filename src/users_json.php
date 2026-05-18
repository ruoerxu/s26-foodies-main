<?php
require_once __DIR__ . '/app_config.php';
foodies_require_local_request();

require_once __DIR__ . '/connect.php';
header('Content-Type: application/json; charset=utf-8');

$sql = "SELECT username FROM users";
$result = mysqli_query($conn, $sql);

if ($result === false) {
  http_response_code(500);
  echo json_encode([
    "error" => "Database query failed",
    "message" => mysqli_error($conn)
  ]);
  exit;
}

$users = [];
while ($row = mysqli_fetch_assoc($result)) {
  $users[] = [
    "username" => $row["username"]
  ];
}

echo json_encode(["users" => $users]);
