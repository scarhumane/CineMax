```php
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

if (
    !is_array($data) ||
    !isset($data["users"]) ||
    !is_array($data["users"])
) {
    exit("Unable to read user data.");
}

$accountFound = false;

foreach ($data["users"] as $user) {

    $existingUsername = $user["username"] ?? "";
    $existingEmail = $user["email"] ?? "";
    $hashedPassword = $user["password"] ?? "";

  
    if (
        strtolower($existingUsername) === strtolower($login) ||
        strtolower($existingEmail) === strtolower($login)
    ) {

      
        if (password_verify($password, $hashedPassword)) {
            $accountFound = true;

        
            session_regenerate_id(true);
            unset(
            $_SESSION["has_subscription"],
            $_SESSION["subscription_plan"]
            );

            $_SESSION["logged_in"] = true;
            $_SESSION["username"] = $existingUsername;
            $_SESSION["email"] = $existingEmail;

            $subscriptionPlan = $user["subscription_plan"] ?? null;

            if (empty($subscriptionPlan)) {
                $_SESSION["has_subscription"] = false;

                header("Location: subscription_page.html");
                exit;
            }

            $_SESSION["has_subscription"] = true;
            $_SESSION["subscription_plan"] = $subscriptionPlan;

            header("Location: ../04 - Homepage/homepage.php");
            exit;
        }

        break;
    }
}


header("Location: login_page.html?error=invalid");
exit;

?>
```