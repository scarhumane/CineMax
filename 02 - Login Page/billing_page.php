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

// Get selected plan and billing period
$plan = $_SESSION["pending_plan"] ?? "";
$billingPeriod = $_SESSION["pending_billing_period"] ?? "";

$prices = [
    "CinePlus" => [
        "monthly" => "₱199",
        "yearly" => "₱990"
    ],
    "CineMax Ultimate" => [
        "monthly" => "₱249",
        "yearly" => "₱1,490"
    ]
];

// Validate selected plan
if (
    !isset($prices[$plan]) ||
    !isset($prices[$plan][$billingPeriod])
) {
    header("Location: subscription_page.html");
    exit;
}

$price = $prices[$plan][$billingPeriod];

$safePlan = htmlspecialchars($plan, ENT_QUOTES, "UTF-8");
$safePeriod = htmlspecialchars(ucfirst($billingPeriod), ENT_QUOTES, "UTF-8");
$safePrice = htmlspecialchars($price, ENT_QUOTES, "UTF-8");

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

                <h1>Complete Your Order</h1>

                <p class="heading-description">
                    You're one step closer to enjoying CineMax.
                </p>

            </section>

            <section class="plan-card">

                <div class="plan-header">

                    <h2>Your Selected Plan</h2>

                    <p><?php echo $safePlan; ?></p>

                </div>

                <div class="plan-price">

                    <span class="price-amount">
                        <?php echo $safePrice; ?>
                    </span>

                    <span class="price-period">
                        / <?php echo $safePeriod; ?>
                    </span>

                </div>

                <div class="plan-divider"></div>

                <form action="confirm_payment.php" method="POST">

                    <h3>Payment Method</h3>

                    <div class="payment-methods">

                        <label class="payment-option">

                            <input
                                type="radio"
                                name="payment_method"
                                value="Card"
                                required
                            >

                            <span>Credit / Debit Card</span>

                        </label>

                        <label class="payment-option">

                            <input
                                type="radio"
                                name="payment_method"
                                value="GCash"
                            >

                            <span>GCash</span>

                        </label>

                        <label class="payment-option">

                            <input
                                type="radio"
                                name="payment_method"
                                value="Maya"
                            >

                            <span>Maya</span>

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
                        Your subscription will be activated after your
                        payment details have been confirmed.
                    </p>

                    <button
                        type="submit"
                        class="select-plan-button featured-button"
                    >
                        Confirm Payment
                    </button>

                </form>

                <p>
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