<?php
/**
 * One-time migration: add city, lat, lng columns to users for location settings.
 * Run against the same DB as connect.php. Safe to run multiple times.
 */
require_once __DIR__ . '/connect.php';

header('Content-Type: application/json; charset=utf-8');

$added = [];

$checkCity = mysqli_query($conn, "SHOW COLUMNS FROM users LIKE 'city'");
if (!$checkCity || !mysqli_fetch_assoc($checkCity)) {
    if ($checkCity) mysqli_free_result($checkCity);
    if (mysqli_query($conn, "ALTER TABLE users ADD COLUMN city VARCHAR(255) DEFAULT NULL") === true) {
        $added[] = 'city';
    }
} elseif ($checkCity) {
    mysqli_free_result($checkCity);
}

$checkLat = mysqli_query($conn, "SHOW COLUMNS FROM users LIKE 'lat'");
if (!$checkLat || !mysqli_fetch_assoc($checkLat)) {
    if ($checkLat) mysqli_free_result($checkLat);
    if (mysqli_query($conn, "ALTER TABLE users ADD COLUMN lat DECIMAL(10,8) DEFAULT NULL") === true) {
        $added[] = 'lat';
    }
} elseif ($checkLat) {
    mysqli_free_result($checkLat);
}

$checkLng = mysqli_query($conn, "SHOW COLUMNS FROM users LIKE 'lng'");
if (!$checkLng || !mysqli_fetch_assoc($checkLng)) {
    if ($checkLng) mysqli_free_result($checkLng);
    if (mysqli_query($conn, "ALTER TABLE users ADD COLUMN lng DECIMAL(11,8) DEFAULT NULL") === true) {
        $added[] = 'lng';
    }
} elseif ($checkLng) {
    mysqli_free_result($checkLng);
}

mysqli_close($conn);

if (count($added) > 0) {
    echo json_encode(['ok' => true, 'message' => 'Added: ' . implode(', ', $added)]);
} else {
    echo json_encode(['ok' => true, 'message' => 'Columns city, lat, and lng already exist']);
}
