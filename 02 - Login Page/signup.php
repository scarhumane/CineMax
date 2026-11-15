
<?php

$usersFile = __DIR__ . '/../03 - Data/users.json';

// Only allow POST requests
if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    header("Location: signup_page.html");
    exit;
}

// Get submitted values
$username = trim($_POST["username"] ?? "");
$email = trim($_POST["email"] ?? "");
$password = $_POST["password"] ?? "";
$confirmPassword = $_POST["confirm_password"] ?? "";

// Check required fields
if (
    $username === "" ||
    $email === "" ||
    $password === "" ||
    $confirmPassword === ""
) {
    exit("Please complete all fields.");
}

// Validate email
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    exit("Please enter a valid email address.");
}

// Validate all five password requirements
$passwordValid =
    strlen($password) >= 8 &&
    preg_match('/[a-z]/', $password) &&
    preg_match('/[A-Z]/', $password) &&
    preg_match('/[0-9]/', $password) &&
    preg_match('/[!@#$%]/', $password);

if (!$passwordValid) {
    exit("Password must meet all five requirements: at least 8 characters, one lowercase letter, one uppercase letter, one number, and one special character (! @ # $ %).");
}

// Confirm passwords match
if ($password !== $confirmPassword) {
    exit("Passwords do not match.");
}

// Check if JSON file exists
if (!file_exists($usersFile)) {
    exit("User data file not found.");
}

// Read JSON data
$jsonData = file_get_contents($usersFile);

$data = json_decode($jsonData, true);

// Validate JSON structure
if (
    !is_array($data) ||
    !isset($data["users"]) ||
    !is_array($data["users"])
) {
    exit("Unable to read user data.");
}

// Check for existing username and email
foreach ($data["users"] as $user) {

    $existingUsername = $user["username"] ?? "";
    $existingEmail = $user["email"] ?? "";

    if (strtolower($existingUsername) === strtolower($username)) {
        exit("Username already exists.");
    }

    if (strtolower($existingEmail) === strtolower($email)) {
        exit("Email is already registered.");
    }
}

// Hash password before saving
$hashedPassword = password_hash($password, PASSWORD_DEFAULT);

// Create new user
$newUser = [
    "username" => $username,
    "email" => $email,
    "password" => $hashedPassword,
    "role" => "user",
    "subscription_plan" => null,
    "billing_period" => null
];

// Add user to JSON data
$data["users"][] = $newUser;

// Convert updated data to JSON
$updatedData = json_encode($data, JSON_PRETTY_PRINT);

if ($updatedData === false) {
    exit("Unable to process user data.");
}

// Save updated JSON data
if (file_put_contents($usersFile, $updatedData, LOCK_EX) === false) {
    exit("Unable to save your account.");
}

// Redirect after successful registration
header("Location: login_page.html?registered=success");
exit;

?>
