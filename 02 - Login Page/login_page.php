<?php
session_start();

$usersFile = __DIR__ . '/../03 - Data/users.json';

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    header("Location: login_page.html");
    exit;
}

$login = trim($_POST["login"] ?? "");
$password = $_POST["password"] ?? "";

if ($login === "" || $password === "") {
    exit("Please enter your username/email and password.");
}

if (!file_exists($usersFile)) {
    exit("User data file not found.");
}

$jsonData = file_get_contents($usersFile);
$data = json_decode($jsonData, true);

if (!is_array($data) || !isset($data["users"]) || !is_array($data["users"])) {
    exit("Unable to read user data.");
}

$accountFound = false;

foreach ($data["users"] as $user) {

    if (
        strtolower($user["username"]) === strtolower($login) ||
        strtolower($user["email"]) === strtolower($login)
    ) {

        $accountFound = true;

        if (password_verify($password, $user["password"])) {

            // Generate a new session ID
            session_regenerate_id(true);

            // Store authenticated user information
            $_SESSION["logged_in"] = true;
            $_SESSION["username"] = $user["username"];
            $_SESSION["email"] = $user["email"];

            // Redirect to dashboard
            header("Location: ../04%20-%20Dashboard/dashboard.php");
            exit;

        } else {
            break;
        }
    }
}

exit("Incorrect username/email or password.");
?>