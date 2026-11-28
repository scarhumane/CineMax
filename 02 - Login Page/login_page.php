<?php

session_start();

// USER DATA FILE
$usersFile = __DIR__ . '/../03 - Data/users.json';

// ONLY ACCEPT POST REQUESTS
if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    header("Location: login_page.html");
    exit;
}

// GET LOGIN DETAILS
$login = trim($_POST["login"] ?? "");
$password = $_POST["password"] ?? "";

// CHECK REQUIRED FIELDS
if ($login === "" || $password === "") {
    exit("Please enter your username/email and password.");
}

// CHECK USER DATA FILE
if (!file_exists($usersFile)) {
    exit("User data file not found.");
}

// READ JSON DATA
$jsonData = file_get_contents($usersFile);

if ($jsonData === false) {
    exit("Unable to access user data.");
}

$data = json_decode($jsonData, true);

// VALIDATE JSON STRUCTURE
if (
    !is_array($data) ||
    !isset($data["users"]) ||
    !is_array($data["users"])
) {
    exit("Unable to read user data.");
}

// FIND USER ACCOUNT
foreach ($data["users"] as $user) {

    $existingUsername = $user["username"] ?? "";
    $existingEmail = $user["email"] ?? "";
    $hashedPassword = $user["password"] ?? "";

    // MATCH USERNAME OR EMAIL
    if (
        strtolower($existingUsername) === strtolower($login) ||
        strtolower($existingEmail) === strtolower($login)
    ) {

        // VERIFY PASSWORD
        if (password_verify($password, $hashedPassword)) {

            // REGENERATE SESSION ID
            session_regenerate_id(true);

            // CLEAR OLD SUBSCRIPTION AND PENDING DATA
            unset(
                $_SESSION["has_subscription"],
                $_SESSION["subscription_plan"],
                $_SESSION["billing_period"],
                $_SESSION["subscription_status"],
                $_SESSION["pending_plan"],
                $_SESSION["pending_billing_period"],
                $_SESSION["pending_signup_email"],
                $_SESSION["pending_signup_username"]
            );

            // SAVE LOGIN INFORMATION
            $_SESSION["logged_in"] = true;
            $_SESSION["username"] = $existingUsername;
            $_SESSION["email"] = $existingEmail;

            $subscriptionPlan = $user["subscription_plan"] ?? null;

            // CHECK IF USER HAS SELECTED A PLAN
            if (empty($subscriptionPlan)) {

                // USER HAS AN ACCOUNT BUT NO SUBSCRIPTION
                $_SESSION["has_subscription"] = false;

                // KEEP ACCOUNT INFORMATION FOR PLAN SELECTION
                $_SESSION["pending_signup_email"] = $existingEmail;
                $_SESSION["pending_signup_username"] = $existingUsername;

                // REDIRECT TO SUBSCRIPTION SELECTION
                header("Location: subscription_page.html?status=choose_plan");
                exit;
            }

            // USER ALREADY HAS A SUBSCRIPTION
            $_SESSION["has_subscription"] = true;
            $_SESSION["subscription_plan"] = $subscriptionPlan;
            $_SESSION["billing_period"] = $billingPeriod ?? "forever";
            $_SESSION["subscription_status"] = $subscriptionStatus ?? "active";

            // REDIRECT TO HOMEPAGE
            header("Location: ../04 - Homepage/homepage.php");
            exit;
        }

        // PASSWORD DOES NOT MATCH
        break;
    }
}

// INVALID LOGIN DETAILS
header("Location: login_page.html?error=invalid");
exit;

?>