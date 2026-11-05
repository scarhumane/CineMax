
<?php

$usersFile = __DIR__ . '/../data/users.json';

// Read existing user data
$jsonData = file_get_contents($usersFile);
$data = json_decode($jsonData, true);

if (!is_array($data) || !isset($data["users"])) {
    exit("Unable to read users.json.");
}

// Temporary test account
$username = "cinemafan";
$email = "cinemafan@example.com";
$password = "MovieTest123!";

// Check if account already exists
foreach ($data["users"] as $user) {
    if (
        strtolower($user["username"]) === strtolower($username) ||
        strtolower($user["email"]) === strtolower($email)
    ) {
        exit("Test account already exists!");
    }
}

// Save account with a hashed password
$data["users"][] = [
    "username" => $username,
    "email" => $email,
    "password" => password_hash($password, PASSWORD_DEFAULT)
];

// Update users.json
$result = file_put_contents(
    $usersFile,
    json_encode($data, JSON_PRETTY_PRINT),
    LOCK_EX
);

if ($result !== false) {
    echo "Test account created successfully!";
} else {
    echo "Unable to save test account.";
}

?>