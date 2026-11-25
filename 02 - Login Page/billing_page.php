<?php
session_start();

// Make sure the user is logged in
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

// Get selected plan and billing period
$plan = $_SESSION["pending_plan"] ?? "";
$billingPeriod = $_SESSION["pending_billing_period"] ?? "";

// Available subscription plans
$prices = [
    "CineMax Basic" => [
        "monthly" => "₱0",
        "yearly" => "₱0",
        "forever" => "₱0"
    ],

    "CineMax Plus" => [
        "monthly" => "₱199",
        "yearly" => "₱990"
    ],

    "CineMax Ultimate" => [
        "monthly" => "₱249",
        "yearly" => "₱1,490"
    ]
];

// Validate selected plan and billing period
if (
    !isset($prices[$plan]) ||
    !isset($prices[$plan][$billingPeriod])
) {
    header("Location: subscription_page.html");
    exit;
}

// Get selected price
$price = $prices[$plan][$billingPeriod];

// Check whether the selected plan is free
$isFreePlan = ($plan === "CineMax Basic");

// Assign a theme class
$planClass = "basic-plan";

if ($plan === "CineMax Plus") {
    $planClass = "plus-plan";
} elseif ($plan === "CineMax Ultimate") {
    $planClass = "ultimate-plan";
}

// Format values safely for HTML
$safePlan = htmlspecialchars($plan, ENT_QUOTES, "UTF-8");
$safePrice = htmlspecialchars($price, ENT_QUOTES, "UTF-8");

$safePeriod = $isFreePlan
    ? "Forever"
    : ucfirst($billingPeriod);
?>

<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <title>Checkout | CineMax</title>

    <link rel="stylesheet" href="login_page.css">
</head>

<body class="homepage-page subscription-page billing-page">

    <div class="login-container">

        <header class="homepage-header">
            <a href="landing_page.html" class="website-logo">
                CINEMAX
            </a>
        </header>

        <main class="subscription-container">

            <section class="pricing-heading">

                <p class="section-label">
                    CINEMAX MEMBERSHIP
                </p>

                <h1>Activate Your Plan</h1>

                <p class="heading-description">
                    <?php echo $isFreePlan
                        ? "Start enjoying CineMax with your free membership."
                        : "You're one step closer to enjoying CineMax."; ?>
                </p>

            </section>

            <section class="plan-card <?php echo $planClass; ?>">

                <div class="selected-plan-heading">
                    <span class="section-label">YOUR SELECTED PLAN</span>
                    <span class="selected-plan-line"></span>
                </div>

                <div class="selected-plan-summary <?php echo $planClass; ?>">

                    <!-- PRICE -->
                    <div class="plan-price">

                        <span class="price-amount">
                            <?php echo $safePrice; ?>
                        </span>

                        <span class="price-period">
                            / <?php echo htmlspecialchars(
                                $safePeriod,
                                ENT_QUOTES,
                                "UTF-8"
                            ); ?>
                        </span>

                    </div>

                    <!-- PLAN INFORMATION -->
                    <div class="selected-plan-top">

                        <div class="selected-plan-info">

                            <span class="selected-plan-category">
                                CINEMAX MEMBERSHIP
                            </span>

                            <h2><?php echo $safePlan; ?></h2>

                        </div>

                        <?php if ($plan === "CineMax Plus"): ?>

                            <span class="membership-badge plus-badge">
                                PLUS MEMBERSHIP
                            </span>

                        <?php elseif ($plan === "CineMax Ultimate"): ?>

                            <span class="membership-badge ultimate-badge">
                                ULTIMATE MEMBERSHIP
                            </span>

                        <?php else: ?>

                            <span class="membership-badge basic-badge">
                                BASIC MEMBERSHIP
                            </span>

                        <?php endif; ?>

                    </div>

                    <!-- MEMBERSHIP BENEFITS -->
                    <div class="membership-benefits">

                        <?php if ($plan === "CineMax Plus"): ?>

                            <div class="benefit-item">
                                <span class="benefit-check">✓</span>
                                <span>Enhanced streaming experience</span>
                            </div>

                            <div class="benefit-item">
                                <span class="benefit-check">✓</span>
                                <span>Access to more movies and series</span>
                            </div>

                            <div class="benefit-item">
                                <span class="benefit-check">✓</span>
                                <span>Access to more personalized features</span>
                            </div>

                        <?php elseif ($plan === "CineMax Ultimate"): ?>

                            <div class="benefit-item">
                                <span class="benefit-check">✓</span>
                                <span>Everything included in CineMax Plus</span>
                            </div>

                            <div class="benefit-item">
                                <span class="benefit-check">✓</span>
                                <span>Premium movie and series access</span>
                            </div>

                            <div class="benefit-item">
                                <span class="benefit-check">✓</span>
                                <span>Exclusive Ultimate membership benefits</span>
                            </div>

                        <?php else: ?>

                            <div class="benefit-item">
                                <span class="benefit-check">✓</span>
                                <span>Explore the CineMax movie collection</span>
                            </div>

                            <div class="benefit-item">
                                <span class="benefit-check">✓</span>
                                <span>Enjoy your free membership</span>
                            </div>

                        <?php endif; ?>

                    </div>

                </div>

                <div class="plan-divider"></div>

                <form action="confirm_payment.php" method="POST">

                    <?php if (!$isFreePlan): ?>

                        <h3>Payment Method</h3>

                        <div class="payment-methods">

                            <!-- CARD -->
                            <label class="payment-option card-option">

                                <input
                                    type="radio"
                                    name="payment_method"
                                    value="Card"
                                    required
                                >

                                <span class="payment-brand">

                                    <span class="payment-logo card-logo">

                                        <svg
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            stroke-width="1.8"
                                            stroke-linecap="round"
                                            stroke-linejoin="round"
                                            aria-hidden="true"
                                            focusable="false"
                                        >
                                            <rect x="2.5" y="5" width="19" height="14" rx="2"></rect>
                                            <path d="M2.5 10h19M6 15h3"></path>
                                        </svg>

                                    </span>

                                    <span class="payment-text">
                                        <strong>Credit / Debit Card</strong>

                                        <span class="card-network-logos">

                                            <img
                                                src="https://cdn.simpleicons.org/visa/1A1F71"
                                                alt="Visa"
                                            >

                                            <img
                                                src="https://cdn.simpleicons.org/mastercard/EB001B"
                                                alt="Mastercard"
                                            >

                                        </span>
                                    </span>

                                </span>

                                <span class="payment-check">✓</span>

                            </label>

                            <!-- GCASH -->
                            <label class="payment-option gcash-option">

                                <input
                                    type="radio"
                                    name="payment_method"
                                    value="GCash"
                                >

                                <span class="payment-brand">

                                    <span class="payment-logo gcash-logo">
                                        <img
                                            src="https://commons.wikimedia.org/wiki/Special:FilePath/GCash_logo.svg"
                                            alt="GCash"
                                        >
                                    </span>

                                    <span class="payment-text">
                                        <strong>GCash</strong>
                                        <small>Pay using GCash</small>
                                    </span>

                                </span>

                                <span class="payment-check">✓</span>

                            </label>

                            <!-- MAYA -->
                            <label class="payment-option maya-option">

                                <input
                                    type="radio"
                                    name="payment_method"
                                    value="Maya"
                                >

                                <span class="payment-brand">

                                    <span class="payment-logo maya-logo">
                                        <img
                                            src="https://commons.wikimedia.org/wiki/Special:FilePath/Maya_logo.svg"
                                            alt="Maya"
                                        >
                                    </span>

                                    <span class="payment-text">
                                        <strong>Maya</strong>
                                        <small>Pay using Maya</small>
                                    </span>

                                </span>

                                <span class="payment-check">✓</span>

                            </label>

                        </div>

                        <div class="plan-divider"></div>

                        <h3>Payment Details</h3>

                        <div class="payment-fields">

                            <label for="customer_name">
                                Account Name
                            </label>

                            <input
                                type="text"
                                id="customer_name"
                                name="customer_name"
                                placeholder="Enter your account name"
                                maxlength="100"
                                required
                            >

                            <label for="payment_reference">
                                Payment Reference
                            </label>

                            <input
                                type="text"
                                id="payment_reference"
                                name="payment_reference"
                                placeholder="Enter payment reference"
                                maxlength="50"
                                required
                            >

                        </div>

                        <p class="plan-message">
                            Your membership will be activated once your payment
                            has been successfully verified. Thank you for choosing CineMax!
                        </p>

                        <button
                            type="submit"
                            class="select-plan-button featured-button"
                        >
                            Confirm Payment
                        </button>

                    <?php else: ?>

                        <input
                            type="hidden"
                            name="payment_method"
                            value="Free"
                        >

                        <p class="plan-message">
                            No payment is required.
                            Activate your free CineMax Basic membership
                            to get started.
                        </p>

                        <button
                            type="submit"
                            class="select-plan-button featured-button"
                        >
                            Activate Free Plan
                        </button>

                    <?php endif; ?>

                </form>

                <p class="billing-back-link">
                    <a href="subscription_page.html">
                        Back to subscription plans
                    </a>
                </p>

            </section>

        </main>

        <footer class="login-footer subscription-footer">
            <p>© 2026 CineMax. All rights reserved.</p>
        </footer>

    </div>

</body>
</html>
