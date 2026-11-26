<?php

session_start();

// FILE LOCATION

$usersFile = __DIR__ . '/../03 - Data/users.json';

// GET SESSION DETAILS

$email = $_SESSION["pending_signup_email"] ?? "";

if ($email === "" && !empty($_SESSION["email"])) {
    $email = $_SESSION["email"];
}

$plan = $_SESSION["pending_plan"] ?? "";
$billingPeriod = $_SESSION["pending_billing_period"] ?? "";

$wasLoggedIn = isset($_SESSION["logged_in"]) &&
               $_SESSION["logged_in"] === true;

$errorMessage = "";

// ERROR DISPLAY

function showError($message)
{
    $safeMessage = htmlspecialchars($message, ENT_QUOTES, 'UTF-8');
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Subscription Error | CineMax</title>
    <link rel="stylesheet" href="login_page.css">
</head>

<body class="cinema-login-page payment-error-page">

    <div class="cinema-login-background"></div>
    <div class="cinema-login-overlay"></div>
    <div class="cinema-login-light"></div>
    <div class="cinema-login-grain"></div>

    <div class="cinema-login-container">

        <header class="cinema-login-header">
            <a href="landing_page.html" class="cinema-login-logo">CINEMAX</a>

            <nav class="cinema-login-nav">
                <a href="landing_page.html">Home</a>
                <a href="signup_page.html">Sign Up</a>
                <a href="subscription_page.html" class="cinema-login-subscribe">Subscribe &#8599;</a>
            </nav>
        </header>

        <main class="cinema-login-main">
            <section class="cinema-login-card">

                <div class="cinema-login-ticket-line"></div>

                <div class="cinema-login-admit">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4z"></path><path d="M13 6v12" stroke-dasharray="2 3"></path></svg>
                    SUBSCRIPTION
                </div>

                <div class="cinema-login-heading">
                    <h1>Subscription<br><em>error.</em></h1>
                    <p>We couldn't finish setting up your membership.</p>
                </div>

                <p class="login-error"><?php echo $safeMessage; ?></p>

                <a href="subscription_page.html" class="cinema-login-button">Return to Subscription Plans</a>

                <div class="cinema-login-divider">
                    <span></span>
                    <p>YOUR NEXT FILM AWAITS</p>
                    <span></span>
                </div>

                <p class="cinema-login-signup">Need to sign in again?<a href="login_page.html">Log In</a></p>

            </section>
        </main>

        <footer class="cinema-login-footer">
            <p>&copy; 2026 CineMax. All rights reserved.</p>
        </footer>

    </div>

</body>
</html>
<?php
    exit;
}

// VALIDATE SUBSCRIPTION DETAILS

if ($email === "" || $plan === "" || $billingPeriod === "") {
    showError(
        "Your subscription information could not be retrieved. " .
        "Please return to the subscription page and select your plan again. " .
        "Make sure you use the same browser address throughout the checkout process."
    );
}

// ACCEPT POST REQUESTS ONLY

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    showError("Invalid payment request.");
}

// VALIDATE PLAN

// select_plan.php and billing_page.php store the full "CineMax ..." names.
// Older short names are accepted and converted so both always work.
if (in_array($plan, ["Basic", "Plus", "Ultimate"], true)) {
    $plan = "CineMax " . $plan;
}

$validPlans = ["CineMax Basic", "CineMax Plus", "CineMax Ultimate"];

if (!in_array($plan, $validPlans, true)) {
    showError("Invalid subscription plan.");
}

// VALIDATE BILLING PERIOD

$validBillingPeriods = ["monthly", "yearly", "forever"];

if (!in_array($billingPeriod, $validBillingPeriods, true)) {
    showError("Invalid billing period.");
}

// Basic plan is always free
if ($plan === "CineMax Basic") {
    $billingPeriod = "forever";
}

// Paid plans must be billed monthly or yearly
if ($plan !== "CineMax Basic" && $billingPeriod === "forever") {
    showError("Invalid billing period for this plan.");
}

// GET PAYMENT DETAILS

$paymentMethod = trim($_POST["payment_method"] ?? "");
$customerName = trim($_POST["customer_name"] ?? "");
$paymentReference = trim($_POST["payment_reference"] ?? "");

// VALIDATE PAYMENT DETAILS

if ($plan !== "CineMax Basic") {

    $validPaymentMethods = ["Card", "GCash", "Maya"];

    if (!in_array($paymentMethod, $validPaymentMethods, true)) {
        showError("Please select a valid payment method.");
    }

    if ($customerName === "") {
        showError("Please enter the account holder's name.");
    }

    if ($paymentReference === "") {
        showError("Please enter your payment reference.");
    }
}

// READ USERS JSON

if (!file_exists($usersFile)) {
    showError("The user data file could not be found.");
}

$jsonData = file_get_contents($usersFile);

if ($jsonData === false) {
    showError("Unable to read user data.");
}

$data = json_decode($jsonData, true);

if (!is_array($data) || !isset($data["users"]) || !is_array($data["users"])) {
    showError("The user data file contains invalid information.");
}

// FIND USER ACCOUNT

$userIndex = null;

foreach ($data["users"] as $index => $user) {

    if (
        isset($user["email"]) &&
        strtolower(trim($user["email"])) === strtolower(trim($email))
    ) {
        $userIndex = $index;
        break;
    }
}

if ($userIndex === null) {
    showError("Your account could not be found. Please log in and try again.");
}

// SAVE SUBSCRIPTION DETAILS

$data["users"][$userIndex]["subscription_plan"] = $plan;
$data["users"][$userIndex]["billing_period"] = $billingPeriod;
$data["users"][$userIndex]["subscription_status"] = "active";

// Save payment information for paid plans
if ($plan !== "CineMax Basic") {

    $data["users"][$userIndex]["payment_method"] = $paymentMethod;
    $data["users"][$userIndex]["customer_name"] = $customerName;
    $data["users"][$userIndex]["payment_reference"] = $paymentReference;

} else {

    unset($data["users"][$userIndex]["payment_method"]);
    unset($data["users"][$userIndex]["customer_name"]);
    unset($data["users"][$userIndex]["payment_reference"]);
}

// WRITE UPDATED USER DATA

$updatedJson = json_encode(
    $data,
    JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES
);

if ($updatedJson === false) {
    showError("Unable to process your subscription information.");
}

if (file_put_contents($usersFile, $updatedJson, LOCK_EX) === false) {
    showError("Unable to save your subscription. Please try again.");
}

// UPDATE SESSION

$_SESSION["has_subscription"] = true;
$_SESSION["subscription_plan"] = $plan;
$_SESSION["billing_period"] = $billingPeriod;
$_SESSION["subscription_status"] = "active";

// Keep the user's email available for login/session checks
$_SESSION["email"] = $email;

// CLEAR TEMPORARY SUBSCRIPTION DATA

unset($_SESSION["pending_plan"]);
unset($_SESSION["pending_billing_period"]);
unset($_SESSION["pending_signup_email"]);
unset($_SESSION["pending_signup_username"]);

// REDIRECT AFTER SUCCESSFUL ACTIVATION

if ($wasLoggedIn) {

    // Existing logged-in account
    header("Location: ../04 - Homepage/homepage.php");
    exit;

} else {

    // Newly registered account
    header("Location: login_page.html?subscription=success");
    exit;
}