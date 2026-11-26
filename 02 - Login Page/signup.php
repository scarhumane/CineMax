<?php

// Start session before using $_SESSION
session_start();

// Send the visitor back to the form with an error code
function signupFail(string $code, string $logMessage = ""): void
{
    if ($logMessage !== "") {
        error_log("CineMax signup: " . $logMessage);
    }

    header("Location: signup_page.html?error=" . urlencode($code));
    exit;
}

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
    signupFail("missing");
}

// Validate email
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    signupFail("invalid_email");
}

// Validate all five password requirements
$passwordValid =
    strlen($password) >= 8 &&
    preg_match('/[a-z]/', $password) &&
    preg_match('/[A-Z]/', $password) &&
    preg_match('/[0-9]/', $password) &&
    preg_match('/[!@#$%]/', $password);

if (!$passwordValid) {
    signupFail("weak_password");
}

// Confirm passwords match
if ($password !== $confirmPassword) {
    signupFail("mismatch");
}

// Check if JSON file exists
if (!file_exists($usersFile)) {
    signupFail("server", "users.json not found");
}

// Read JSON data
$jsonData = file_get_contents($usersFile);

if ($jsonData === false) {
    signupFail("server", "unable to read users.json");
}

$data = json_decode($jsonData, true);

// Validate JSON structure
if (
    !is_array($data) ||
    !isset($data["users"]) ||
    !is_array($data["users"])
) {
    signupFail("server", "users.json has an invalid structure");
}

// Check for existing username and email
foreach ($data["users"] as $user) {

    $existingUsername = $user["username"] ?? "";
    $existingEmail = $user["email"] ?? "";

    if (strtolower($existingUsername) === strtolower($username)) {
        signupFail("username_taken");
    }

    if (strtolower($existingEmail) === strtolower($email)) {
        signupFail("email_taken");
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
    signupFail("server", "json_encode failed");
}

// Save updated JSON data
if (file_put_contents($usersFile, $updatedData, LOCK_EX) === false) {
    signupFail("server", "unable to write users.json");
}

// Store pending signup information in session
$_SESSION["pending_signup_email"] = $email;
$_SESSION["pending_signup_username"] = $username;

// Redirect to subscription selection
header("Location: subscription_page.html?registered=success");
exit;

?>