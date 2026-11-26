<?php

session_start();

// USER DATA FILE
$usersFile = __DIR__ . '/../03 - Data/users.json';

// ONLY ACCEPT POST REQUESTS
if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    header("Location: subscription_page.html");
    exit;
}

// IDENTIFY THE USER
// Supports both new signups and existing logged-in users
$email = $_SESSION["pending_signup_email"] ?? "";

if ($email === "" && isset($_SESSION["logged_in"]) && $_SESSION["logged_in"] === true) {
    $email = $_SESSION["email"] ?? "";
}

if ($email === "") {
    header("Location: login_page.html?error=session_expired");
    exit;
}

// GET SELECTED PLAN AND BILLING PERIOD
$selectedPlan = trim($_POST["plan"] ?? "");
$billingPeriod = trim($_POST["billing_period"] ?? "");

// VALIDATE SUBSCRIPTION PLAN
$allowedPlans = [
    "CineMax Basic",
    "CineMax Plus",
    "CineMax Ultimate"
];

if (!in_array($selectedPlan, $allowedPlans, true)) {
    exit("Invalid subscription plan.");
}

// BASIC IS FREE, SO IT HAS NO MONTHLY/YEARLY CHOICE
// PAID PLANS MUST BE MONTHLY OR YEARLY
if ($selectedPlan === "CineMax Basic") {
    $billingPeriod = "forever";
} elseif (!in_array($billingPeriod, ["monthly", "yearly"], true)) {
    exit("Invalid billing period.");
}

// CHECK USER DATA FILE
if (!file_exists($usersFile)) {
    exit("User data file not found.");
}

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

// VERIFY REGISTERED ACCOUNT
$userFound = false;

foreach ($data["users"] as $user) {

    $existingEmail = $user["email"] ?? "";

    if (strtolower($existingEmail) === strtolower($email)) {
        $userFound = true;
        break;
    }
}

if (!$userFound) {
    exit("Account not found. Please check your account.");
}

// SAVE PENDING SUBSCRIPTION
$_SESSION["pending_plan"] = $selectedPlan;
$_SESSION["pending_billing_period"] = $billingPeriod;

// KEEP THE USER EMAIL AVAILABLE FOR CHECKOUT
$_SESSION["pending_signup_email"] = $email;

// REDIRECT TO BILLING PAGE
header("Location: billing_page.php");
exit;