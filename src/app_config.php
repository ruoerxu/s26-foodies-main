<?php
function foodies_load_local_config(): void {
  static $loaded = false;
  if ($loaded) {
    return;
  }

  $loaded = true;
  $localConfig = __DIR__ . '/config.php';
  if (is_file($localConfig)) {
    require_once $localConfig;
  }
}

function foodies_config_value(string $envName, ?string $constantName = null, $default = null) {
  foodies_load_local_config();

  $envValue = getenv($envName);
  if ($envValue !== false) {
    return $envValue;
  }

  if ($constantName !== null && defined($constantName)) {
    return constant($constantName);
  }

  return $default;
}

function foodies_missing_config_response(string $message): void {
  http_response_code(500);
  header('Content-Type: application/json; charset=utf-8');
  echo json_encode(['success' => false, 'message' => $message]);
  exit;
}

function foodies_require_local_request(): void {
  if (PHP_SAPI === 'cli') {
    return;
  }

  $remoteAddr = $_SERVER['REMOTE_ADDR'] ?? '';
  $serverName = $_SERVER['SERVER_NAME'] ?? '';
  $httpHost = $_SERVER['HTTP_HOST'] ?? '';
  $host = explode(':', $httpHost)[0];
  $localHosts = ['127.0.0.1', '::1', 'localhost'];

  if (
    in_array($remoteAddr, $localHosts, true) ||
    in_array($serverName, $localHosts, true) ||
    in_array($host, $localHosts, true)
  ) {
    return;
  }

  http_response_code(404);
  exit;
}
