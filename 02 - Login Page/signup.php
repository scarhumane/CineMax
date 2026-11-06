<?php
$usersFile = __DIR__ . '/../03 - Data/users.json';

// Only accept form submissions
if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    header("Location: signup.html");
    exit;
}

// Get form information
$username = trim($_POST["username"] ?? "");
$email = trim($_POST["email"] ?? "");
$password = $_POST["password"] ?? "";
$confirmPassword = $_POST["confirm_password"] ?? "";

// Validate fields
if ($username === "" || $email === "" ||
    $password === "" || $confirmPassword === "") {
    exit("Please complete all fields.");
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    exit("Please enter a valid email address.");
}

if (strlen($password) < 8) {
    exit("Password must be at least 8 characters long.");
}

if ($password !== $confirmPassword) {
    exit("Passwords do not match.");
}

// Read existing users
if (!file_exists($usersFile)) {
    exit("User data file not found.");
}

$jsonData = file_get_contents($usersFile);
$data = json_decode($jsonData, true);

if (!is_array($data) || !isset($data["users"]) ||
    !is_array($data["users"])) {
    exit("Unable to read user data.");
}

// Check for existing username or email
foreach ($data["users"] as $user) {
    if (strtolower($user["username"]) === strtolower($username)) {
        exit("Username already exists.");
    }

    if (strtolower($user["email"]) === strtolower($email)) {
        exit("Email is already registered.");
    }
}

// Hash password before saving
$hashedPassword = password_hash($password, PASSWORD_DEFAULT);

// Create new account
$newUser = [
    "username" => $username,
    "email" => $email,
    "password" => $hashedPassword,
    "role" => "user"
];

// Add account to JSON
$data["users"][] = $newUser;

$updatedData = json_encode($data, JSON_PRETTY_PRINT);

if (file_put_contents($usersFile, $updatedData, LOCK_EX) === false) {
    exit("Unable to save your account.");
}

echo "Account created successfully!";
echo '<p><a href="login_page.html">Go to Log In</a></p>';
?>