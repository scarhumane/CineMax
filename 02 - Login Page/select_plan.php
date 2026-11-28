<?php

session_start();

// User data file
$usersFile = __DIR__ . '/../03 - Data/users.json';

// Check login
if (
    !isset($_SESSION["logged_in"]) ||
    $_SESSION["logged_in"] !== true
) {
    header("Location: login_page.html");
    exit;
}

if (($_SESSION["role"] ?? "") === "admin") {
    http_response_code(403);
    exit("Administrator accounts do not have subscriptions.");
}

// Only accept POST requests
if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    header("Location: subscription_page.html");
    exit;
}

// Get selected plan and billing period
$selectedPlan = trim($_POST["plan"] ?? "");
$billingPeriod = trim($_POST["billing_period"] ?? "");

// Allowed subscription plans
$allowedPlans = [
    "CineMax Basic",
    "CineMax Plus",
    "CineMax Ultimate"
];

// Validate plan
if (!in_array($selectedPlan, $allowedPlans, true)) {
    exit("Invalid subscription plan.");
}

// Validate billing period
if (!in_array($billingPeriod, ["monthly", "yearly"], true)) {
    exit("Invalid billing period.");
}

// Basic is free
if ($selectedPlan === "CineMax Basic") {
    $billingPeriod = "forever";
}

// Verify account email
$email = $_SESSION["email"] ?? "";

if ($email === "") {
    exit("Unable to identify your account. Please log in again.");
}

// Verify user data file
if (!file_exists($usersFile)) {
    exit("User data file not found.");
}

// Read user data
$jsonData = file_get_contents($usersFile);
$data = json_decode($jsonData, true);

if (
    !is_array($data) ||
    !isset($data["users"]) ||
    !is_array($data["users"])
) {
    exit("Unable to read user data.");
}

// Check whether account exists
$userFound = false;

foreach ($data["users"] as $user) {
    $existingEmail = $user["email"] ?? "";

    if (strtolower($existingEmail) === strtolower($email)) {
        $userFound = true;
        break;
    }
}

if (!$userFound) {
    exit("Account not found.");
}

// Store selected plan temporarily
$_SESSION["pending_plan"] = $selectedPlan;
$_SESSION["pending_billing_period"] = $billingPeriod;

// Proceed to billing page
header("Location: billing_page.php");
exit;
