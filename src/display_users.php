<?php
require_once __DIR__ . '/app_config.php';
foodies_require_local_request();

include 'connect.php'; 

$sql = "SELECT username FROM users";
$result = mysqli_query($conn, $sql);

// We start by echoing basic HTML and CSS
echo "<html>
<head>
    <style>
        /* This is very basic CSS to make the table look neat */
        table { width: 50%; border-collapse: collapse; font-family: sans-serif; }
        th, td { border: 1px solid black; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>";

echo "<h2>Registered Users</h2>";

if (mysqli_num_rows($result) > 0) {
    echo "<table>";
    echo "<tr><th>Username</th></tr>";
    
    // This loop prints one row for every user found
    while($row = mysqli_fetch_assoc($result)) {
        echo "<tr>";
        echo "<td>" . htmlspecialchars($row["username"], ENT_QUOTES, 'UTF-8') . "</td>";
        echo "</tr>";
    }
    echo "</table>";
} else {
    echo "No users found.";
}

echo "</body></html>";
mysqli_close($conn);
?>
