<?php
session_start();

// 1. CHECK LOGIN

if (
    !isset($_SESSION["logged_in"]) ||
    $_SESSION["logged_in"] !== true ||
    empty($_SESSION["email"])
) {
    header("Location: login_page.html");
    exit;
}

// 2. ONLY ACCEPT FORM SUBMISSIONS

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    header("Location: subscription_page.html");
    exit;
}

// 3. GET SELECTED PLAN AND BILLING PERIOD

$plan = $_SESSION["pending_plan"] ?? "";
$billingPeriod = $_SESSION["pending_billing_period"] ?? "";

$allowedPlans = [
    "CinePlus",
    "CineMax Ultimate"
];

$allowedPeriods = [
    "monthly",
    "yearly"
];

if (
    !in_array($plan, $allowedPlans, true) ||
    !in_array($billingPeriod, $allowedPeriods, true)
) {
    header("Location: subscription_page.html");
    exit;
}

// 4. VALIDATE SIMULATED PAYMENT DETAILS

$paymentMethod = $_POST["payment_method"] ?? "";
$customerName = trim($_POST["customer_name"] ?? "");
$paymentReference = trim($_POST["payment_reference"] ?? "");

$allowedMethods = [
    "Card",
    "GCash",
    "Maya"
];

if (
    !in_array($paymentMethod, $allowedMethods, true) ||
    $customerName === "" ||
    $paymentReference === "" ||
    strlen($customerName) > 100 ||
    strlen($paymentReference) > 50
) {
    showError("Please provide valid payment details.");
}

// 5. LOAD USERS JSON

$usersFile = __DIR__ . '/../03 - Data/users.json';

if (!file_exists($usersFile)) {
    showError("The user data file could not be found.");
}

$jsonData = file_get_contents($usersFile);

if ($jsonData === false) {
    showError("Unable to read user data.");
}

$data = json_decode($jsonData, true);

if (
    !is_array($data) ||
    !isset($data["users"]) ||
    !is_array($data["users"])
) {
    showError("The user data file contains invalid information.");
}

// 6. FIND THE LOGGED-IN USER

$loggedInEmail = strtolower(trim($_SESSION["email"]));
$userFound = false;

foreach ($data["users"] as &$user) {

    if (
        isset($user["email"]) &&
        strtolower(trim($user["email"])) === $loggedInEmail
    ) {

        // 7. SAVE SUBSCRIPTION TO USER ACCOUNT

        $user["subscription_plan"] = $plan;
        $user["billing_period"] = $billingPeriod;
        $user["subscription_status"] = "active";

        $userFound = true;
        break;
    }
}

unset($user);

if (!$userFound) {
    showError("Your account could not be found.");
}

// 8. SAVE UPDATED JSON

$updatedJson = json_encode(
    $data,
    JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE
);

if ($updatedJson === false) {
    showError("Unable to prepare subscription data.");
}

if (file_put_contents($usersFile, $updatedJson, LOCK_EX) === false) {
    showError("Unable to save your subscription.");
}


// 9. UPDATE PHP SESSION

$_SESSION["subscription_plan"] = $plan;
$_SESSION["billing_period"] = $billingPeriod;
$_SESSION["subscription_status"] = "active";

// Clear pending checkout information
unset($_SESSION["pending_plan"]);
unset($_SESSION["pending_billing_period"]);


// 10. REDIRECT TO HOMEPAGE

header("Location: ../04 - Homepage/homepage.php");
exit;



// ERROR DISPLAY

function showError($message) {

    http_response_code(400);

    $safeMessage = htmlspecialchars(
        $message,
        ENT_QUOTES,
        "UTF-8"
    );

    echo "<!DOCTYPE html>";
    echo "<html lang='en'>";
    echo "<head>";
    echo "<meta charset='UTF-8'>";
    echo "<meta name='viewport' content='width=device-width, initial-scale=1.0'>";
    echo "<title>Checkout Error | CineMax</title>";
    echo "</head>";

    echo "<body style='background:#050a14;color:#d6e9f5;font-family:Arial,sans-serif;padding:60px 20px;text-align:center;'>";

    echo "<h1>Something went wrong</h1>";
    echo "<p>{$safeMessage}</p>";
    echo "<a href='billing_page.php' style='color:#5cc3dc;'>Return to Checkout</a>";

    echo "</body>";
    echo "</html>";

    exit;
}
?>