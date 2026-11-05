<?php
session_start();

$usersFile = __DIR__ . '/../data/users.json';


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

            $_SESSION["username"] = $user["username"];
            $_SESSION["email"] = $user["email"];

            echo "Log In successful! Welcome, "
                 . htmlspecialchars($user["username"]) . "!";

            exit;

        } else {
            break;
        }
    }
}

exit("Incorrect username/email or password.");
?>