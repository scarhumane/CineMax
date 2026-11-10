
<?php

session_start();

$usersFile = __DIR__ . '/../03 - Data/users.json';


if (
    !isset($_SESSION["logged_in"]) ||
    $_SESSION["logged_in"] !== true
) {
    header("Location: login_page.html");
    exit;
}


if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    header("Location: subscription_page.html");
    exit;
}

$selectedPlan = trim($_POST["plan"] ?? "");
$billingPeriod = trim($_POST["billing_period"] ?? "");

$allowedPlans = [
    "CineMax Basic",
    "CinePlus",
    "CineMax Ultimate"
];

if (!in_array($selectedPlan, $allowedPlans, true)) {
    exit("Invalid subscription plan.");
}

if (!in_array($billingPeriod, ["monthly", "yearly"], true)) {
    exit("Invalid billing period.");
}

if ($selectedPlan === "CineMax Basic") {
    $billingPeriod = "forever";
}

$email = $_SESSION["email"] ?? "";

if ($email === "") {
    exit("Unable to identify your account. Please log in again.");
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


$userFound = false;

foreach ($data["users"] as &$user) {

    $existingEmail = $user["email"] ?? "";

    if (strtolower($existingEmail) === strtolower($email)) {

        $userFound = true;

       
        $user["subscription_plan"] = $selectedPlan;
        $user["billing_period"] = $billingPeriod;

        break;
    }
}

unset($user);

//acount exist
if (!$userFound) {
    exit("Account not found.");
}

// basic is free, so activate it immediately
if ($selectedPlan === "CineMax Basic") {

    $updatedJson = json_encode(
        $data,
        JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE
    );

    if (
        $updatedJson === false ||
        file_put_contents($usersFile, $updatedJson, LOCK_EX) === false
    ) {
        exit("Unable to save your subscription.");
    }

    $_SESSION["subscription_plan"] = $selectedPlan;
    $_SESSION["billing_period"] = "forever";
    $_SESSION["has_subscription"] = true;

    header("Location: basic_welcome.php");
    exit;
}

// store paid plan temporarily in the session
$_SESSION["pending_plan"] = $selectedPlan;
$_SESSION["pending_billing_period"] = $billingPeriod;

// proceed to billing
header("Location: billing_page.php");
exit;