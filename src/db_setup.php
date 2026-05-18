<?php
require_once __DIR__ . '/app_config.php';
foodies_require_local_request();

// Local XAMPP setup script — run this once to create the test DB, table, and a test user.
// Default XAMPP credentials: root / (no password)
$conn = mysqli_connect('localhost', 'root', '');

if (!$conn) {
    die('Could not connect to MySQL: ' . mysqli_connect_error());
}

mysqli_query($conn, 'CREATE DATABASE IF NOT EXISTS foodies_test');
mysqli_select_db($conn, 'foodies_test');


mysqli_query($conn, '
    CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE DEFAULT NULL,
        password VARCHAR(255) NOT NULL,
        email_confirmed TINYINT(1) DEFAULT 0,
        email_token VARCHAR(64) DEFAULT NULL,
        dietary_restrictions TEXT DEFAULT NULL,
        disliked_cuisines TEXT DEFAULT NULL,
        phone VARCHAR(32) DEFAULT NULL,
        city VARCHAR(255) DEFAULT NULL,
        lat DECIMAL(10,8) DEFAULT NULL,
        lng DECIMAL(11,8) DEFAULT NULL
    )
');

$testUser = 'testuser';
$testPass = password_hash('password123', PASSWORD_BCRYPT);

$stmt = mysqli_prepare($conn, 'INSERT IGNORE INTO users (username, password) VALUES (?, ?)');
mysqli_stmt_bind_param($stmt, 'ss', $testUser, $testPass);
mysqli_stmt_execute($stmt);

$affected = mysqli_stmt_affected_rows($stmt);

echo '<html><body style="font-family: sans-serif; padding: 2rem;">';
echo '<h2>DB Setup</h2>';
echo '<p style="color: green;">&#10003; Database <strong>foodies_test</strong> ready.</p>';
echo '<p style="color: green;">&#10003; Table <strong>users</strong> ready.</p>';

if ($affected > 0) {
    echo '<p style="color: green;">&#10003; Test user inserted.</p>';
} else {
    echo '<p style="color: gray;">&#8211; Test user already exists (skipped).</p>';
}

echo '<hr>';
echo '<p><strong>Test credentials:</strong> username <code>testuser</code> / password <code>password123</code></p>';
echo '<p><a href="test_login.html">Go to test login page &rarr;</a></p>';
echo '</body></html>';

mysqli_stmt_close($stmt);
mysqli_close($conn);
?>
