<?php
require_once __DIR__ . '/app_config.php';
foodies_require_local_request();

include 'connect.php';

$user = 'testuser';
$pass = password_hash('password123', PASSWORD_BCRYPT);

echo "<html><body>";

try {
    // Delete existing testuser row if it exists
    $del = mysqli_prepare($conn, 'DELETE FROM users WHERE username = ?');
    mysqli_stmt_bind_param($del, 's', $user);
    mysqli_stmt_execute($del);
    mysqli_stmt_close($del);
    echo "<p>Deleted any existing testuser row.</p>";

    // Insert with hashed password
    $stmt = mysqli_prepare($conn, 'INSERT INTO users (username, password, friends_count, restaurant_count) VALUES (?, ?, 0, 0)');
    mysqli_stmt_bind_param($stmt, 'ss', $user, $pass);
    mysqli_stmt_execute($stmt);
    mysqli_stmt_close($stmt);

    echo "<h3 style='color: green;'>Success! testuser added with hashed password.</h3>";
} catch (Exception $e) {
    echo "<h3 style='color: red;'>Error: " . $e->getMessage() . "</h3>";
}

echo "<a href='display_users.php'>Click here to see the user list</a>";
echo "</body></html>";

mysqli_close($conn);
?>
