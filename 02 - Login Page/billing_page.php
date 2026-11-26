<?php

session_start();

// CHECK USER SESSION
// Supports new signups and existing logged-in users

$email = $_SESSION["pending_signup_email"] ?? "";

if (
    $email === "" &&
    isset($_SESSION["logged_in"]) &&
    $_SESSION["logged_in"] === true
) {
    $email = $_SESSION["email"] ?? "";
}

// GET SELECTED PLAN AND BILLING PERIOD
$plan = $_SESSION["pending_plan"] ?? "";
$billingPeriod = $_SESSION["pending_billing_period"] ?? "";

// VERIFY REQUIRED INFORMATION
if ($email === "" || $plan === "" || $billingPeriod === "") {
    if (isset($_SESSION["logged_in"]) && $_SESSION["logged_in"] === true) {
        header("Location: subscription_page.html?error=session_expired");
    } else {
        header("Location: signup_page.html?error=session_expired");
    }
    exit;
}

// AVAILABLE SUBSCRIPTION PLANS AND PRICES
$prices = [
    "CineMax Basic" => [
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

// VALIDATE SELECTED PLAN AND BILLING PERIOD
if (
    !isset($prices[$plan]) ||
    !isset($prices[$plan][$billingPeriod])
) {
    header("Location: subscription_page.html?error=invalid_plan");
    exit;
}

// GET SELECTED PRICE
$price = $prices[$plan][$billingPeriod];

// CHECK WHETHER THE SELECTED PLAN IS FREE
$isFreePlan = ($plan === "CineMax Basic");

// ASSIGN PLAN THEME
$planClass = "basic-plan";

if ($plan === "CineMax Plus") {
    $planClass = "plus-plan";
} elseif ($plan === "CineMax Ultimate") {
    $planClass = "ultimate-plan";
}

// FORMAT VALUES SAFELY
$safePlan = htmlspecialchars($plan, ENT_QUOTES, "UTF-8");
$safePrice = htmlspecialchars($price, ENT_QUOTES, "UTF-8");

$safePeriod = $isFreePlan
    ? "Forever"
    : ucfirst($billingPeriod);

// EXTRA VALUES FOR THE CHECKOUT PAGE
$safeEmail = htmlspecialchars($email, ENT_QUOTES, "UTF-8");

$renewText = $billingPeriod === "yearly"
    ? "Renews every year"
    : "Renews every month";

$periodWord = $billingPeriod === "yearly" ? "year" : "month";

?>

<!DOCTYPE html>
<html lang="en">

<head>

    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <title>Checkout | CineMax</title>

    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Hanken+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">

    <link rel="stylesheet" href="login_page.css">

</head>

<body class="checkout-page <?php echo $planClass; ?>">

    <div class="checkout-shell">

        <!-- HEADER -->
        <header class="checkout-header">

            <a href="landing_page.html" class="checkout-logo">CINEMAX</a>

            <span class="secure-note">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="10" width="16" height="11" rx="2"></rect><path d="M8 10V7a4 4 0 0 1 8 0v3"></path></svg>
                <span>Secure checkout</span>
            </span>

        </header>


        <!-- PROGRESS -->
        <nav class="checkout-steps" aria-label="Checkout progress">
            <span class="checkout-step done"><span class="step-dot">&#10003;</span><span class="step-name">Choose plan</span></span>
            <span class="step-line"></span>
            <span class="checkout-step current"><span class="step-dot">2</span><span class="step-name">Payment</span></span>
            <span class="step-line"></span>
            <span class="checkout-step"><span class="step-dot">3</span><span class="step-name">Confirmation</span></span>
        </nav>


        <main class="checkout-layout">

            <!-- LEFT: PAYMENT -->
            <section>

                <h1 class="checkout-title">
                    <?php echo $isFreePlan ? "Activate your membership" : "Complete your payment"; ?>
                </h1>

                <p class="checkout-subtitle">
                    <?php echo $isFreePlan
                        ? "No payment is needed for the free plan."
                        : "You're one step away from your CineMax membership."; ?>
                </p>

                <div class="card-panel">

                    <form
                        id="checkout-form"
                        action="confirm_payment.php"
                        method="POST"
                        data-free="<?php echo $isFreePlan ? '1' : '0'; ?>"
                        novalidate
                    >

                        <p class="block-label">Account</p>

                        <div class="account-row">
                            <span>Signed up as</span>
                            <strong><?php echo $safeEmail; ?></strong>
                        </div>

                        <?php if ($isFreePlan): ?>

                            <input type="hidden" name="payment_method" value="Free">

                            <div class="free-box">
                                Your CineMax Basic membership is free forever. Activate it to start
                                exploring the movie collection.
                            </div>

                            <button type="submit" class="pay-button" id="pay-button">
                                Activate free plan
                            </button>

                        <?php else: ?>

                            <p class="block-label">Payment method</p>

                            <div class="method-tabs" role="radiogroup" aria-label="Payment method">

                                <label class="method-tab">
                                    <input type="radio" name="payment_method" value="Card" checked>
                                    <span class="method-face">
                                        <span class="method-icon">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2.5" y="5" width="19" height="14" rx="2"></rect><path d="M2.5 10h19M6 15h3"></path></svg>
                                        </span>
                                        Card
                                    </span>
                                </label>

                                <label class="method-tab">
                                    <input type="radio" name="payment_method" value="GCash">
                                    <span class="method-face">
                                        <span class="brand-badge brand-gcash">GCash</span>
                                        GCash
                                    </span>
                                </label>

                                <label class="method-tab">
                                    <input type="radio" name="payment_method" value="Maya">
                                    <span class="method-face">
                                        <span class="brand-badge brand-maya">maya</span>
                                        Maya
                                    </span>
                                </label>

                            </div>


                            <!-- CARD -->
                            <div class="method-panel active" data-panel="Card">

                                <div class="field">
                                    <label for="card-number">Card number</label>
                                    <div class="field-input card-number-wrap">
                                        <input
                                            type="text"
                                            id="card-number"
                                            inputmode="numeric"
                                            autocomplete="cc-number"
                                            placeholder="1234 5678 9012 3456"
                                            maxlength="23"
                                        >
                                        <span class="card-brand-slot" aria-hidden="true">
                                            <span class="mini-card visa" id="brand-visa">VISA</span>
                                            <span class="mini-card mc" id="brand-mc"><i></i><i></i></span>
                                        </span>
                                    </div>
                                    <p class="field-error" id="err-card-number"></p>
                                </div>

                                <div class="field-row">
                                    <div class="field">
                                        <label for="card-expiry">Expiry date</label>
                                        <input
                                            type="text"
                                            id="card-expiry"
                                            inputmode="numeric"
                                            autocomplete="cc-exp"
                                            placeholder="MM / YY"
                                            maxlength="7"
                                        >
                                        <p class="field-error" id="err-card-expiry"></p>
                                    </div>

                                    <div class="field">
                                        <label for="card-cvc">Security code</label>
                                        <input
                                            type="text"
                                            id="card-cvc"
                                            inputmode="numeric"
                                            autocomplete="cc-csc"
                                            placeholder="CVC"
                                            maxlength="4"
                                        >
                                        <p class="field-error" id="err-card-cvc"></p>
                                    </div>
                                </div>

                                <div class="field">
                                    <label for="card-name">Name on card</label>
                                    <input
                                        type="text"
                                        id="card-name"
                                        autocomplete="cc-name"
                                        placeholder="Full name as shown on the card"
                                        maxlength="100"
                                    >
                                    <p class="field-error" id="err-card-name"></p>
                                </div>

                            </div>


                            <!-- GCASH / MAYA -->
                            <div class="method-panel" data-panel="Wallet">

                                <div class="wallet-note">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="6" y="2.5" width="12" height="19" rx="2.5"></rect><path d="M11 18h2"></path></svg>
                                    <span id="wallet-note-text">
                                        Enter your mobile number. You'll get a notification in your app to
                                        approve the payment.
                                    </span>
                                </div>

                                <div class="field">
                                    <label for="wallet-name">Account name</label>
                                    <input
                                        type="text"
                                        id="wallet-name"
                                        autocomplete="name"
                                        placeholder="Name registered to your account"
                                        maxlength="100"
                                    >
                                    <p class="field-error" id="err-wallet-name"></p>
                                </div>

                                <div class="field">
                                    <label for="wallet-mobile">Mobile number</label>
                                    <input
                                        type="text"
                                        id="wallet-mobile"
                                        inputmode="tel"
                                        autocomplete="tel-national"
                                        placeholder="0917 123 4567"
                                    >
                                    <p class="field-error" id="err-wallet-mobile"></p>
                                </div>

                            </div>


                            <!-- values posted to confirm_payment.php (only these leave the browser) -->
                            <input type="hidden" name="customer_name" id="customer_name" value="">
                            <input type="hidden" name="payment_reference" id="payment_reference" value="">

                            <button type="submit" class="pay-button" id="pay-button">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="10" width="16" height="11" rx="2"></rect><path d="M8 10V7a4 4 0 0 1 8 0v3"></path></svg>
                                Pay <?php echo $safePrice; ?>
                            </button>

                            <p class="pay-fineprint">
                                Your plan renews automatically every <?php echo $periodWord; ?> at
                                <?php echo $safePrice; ?>. You can cancel anytime.
                            </p>

                        <?php endif; ?>

                    </form>

                    <div class="trust-row">
                        <span>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l8 3v6c0 4.5-3.2 8-8 9-4.8-1-8-4.5-8-9V6z"></path><path d="M9 12l2 2 4-4"></path></svg>
                            Encrypted payment
                        </span>
                        <span>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 12a8 8 0 1 1-3-6.2"></path><path d="M20 4v5h-5"></path></svg>
                            Instant activation
                        </span>
                    </div>

                </div>

                <p class="back-link">
                    <a href="subscription_page.html">&larr; Back to subscription plans</a>
                </p>

            </section>


            <!-- RIGHT: ORDER SUMMARY -->
            <aside class="summary" aria-label="Order summary">

                <h2>Order summary</h2>

                <div class="summary-item">
                    <div>
                        <p class="summary-name"><?php echo $safePlan; ?></p>
                        <p class="summary-meta">
                            <?php echo $isFreePlan ? "Free membership" : "Billed " . htmlspecialchars($billingPeriod, ENT_QUOTES, "UTF-8"); ?>
                        </p>
                    </div>
                    <span class="summary-price"><?php echo $safePrice; ?></span>
                </div>

                <ul class="summary-perks">
                    <?php if ($plan === "CineMax Plus"): ?>
                        <li>Enhanced streaming experience</li>
                        <li>More movies and discovery features</li>
                        <li>More personalized features</li>
                    <?php elseif ($plan === "CineMax Ultimate"): ?>
                        <li>Everything included in CineMax Plus</li>
                        <li>Enhanced movie discovery experience</li>
                        <li>Exclusive Ultimate membership benefits</li>
                    <?php else: ?>
                        <li>Explore the CineMax movie collection</li>
                        <li>Enjoy your free membership</li>
                    <?php endif; ?>
                </ul>

                <div class="summary-lines">
                    <div class="summary-line">
                        <span>Subtotal</span>
                        <span><?php echo $safePrice; ?></span>
                    </div>
                    <div class="summary-line">
                        <span>Discount</span>
                        <span>&minus;&#8369;0</span>
                    </div>
                </div>

                <div class="summary-total">
                    <span>Total due today</span>
                    <strong><?php echo $safePrice; ?></strong>
                </div>

                <?php if (!$isFreePlan): ?>
                    <p class="summary-renew"><?php echo $renewText; ?> &middot; Cancel anytime</p>
                <?php endif; ?>

            </aside>

        </main>


        <footer class="checkout-footer">
            <p>&copy; 2026 CineMax. All rights reserved.</p>
        </footer>

    </div>


    <!-- PROCESSING OVERLAY -->
    <div class="processing" id="processing" role="status" aria-live="polite">
        <div class="spinner"></div>
        <strong id="processing-title">Processing your payment</strong>
        <p id="processing-text">Please don't close or refresh this page.</p>
    </div>


    <script>
    (function () {
        var form = document.getElementById("checkout-form");

        if (!form) return;

        var isFree = form.dataset.free === "1";
        var payButton = document.getElementById("pay-button");
        var overlay = document.getElementById("processing");
        var overlayTitle = document.getElementById("processing-title");
        var overlayText = document.getElementById("processing-text");

        function showProcessing(method) {
            overlayTitle.textContent = isFree
                ? "Activating your membership"
                : (method === "Card" ? "Processing your payment" : "Waiting for approval");

            overlayText.textContent = isFree || method === "Card"
                ? "Please don't close or refresh this page."
                : "Confirming your " + method + " payment. Please don't close this page.";

            overlay.classList.add("show");
            payButton.disabled = true;

            setTimeout(function () { form.submit(); }, 1800);
        }

        // Back button: the page can come back from cache with the overlay showing
        window.addEventListener("pageshow", function (event) {
            if (!event.persisted) return;

            overlay.classList.remove("show");
            payButton.disabled = false;
        });

        if (isFree) {
            form.addEventListener("submit", function (event) {
                event.preventDefault();
                showProcessing("Free");
            });

            return;
        }

        var radios = form.querySelectorAll('input[name="payment_method"]');
        var panels = form.querySelectorAll(".method-panel");

        var el = {
            number: document.getElementById("card-number"),
            expiry: document.getElementById("card-expiry"),
            cvc: document.getElementById("card-cvc"),
            cardName: document.getElementById("card-name"),
            walletName: document.getElementById("wallet-name"),
            mobile: document.getElementById("wallet-mobile"),
            name: document.getElementById("customer_name"),
            reference: document.getElementById("payment_reference")
        };

        var brandVisa = document.getElementById("brand-visa");
        var brandMc = document.getElementById("brand-mc");
        var walletNote = document.getElementById("wallet-note-text");

        function currentMethod() {
            var checked = form.querySelector('input[name="payment_method"]:checked');
            return checked ? checked.value : "Card";
        }

        function showMethod() {
            var method = currentMethod();
            var panelKey = method === "Card" ? "Card" : "Wallet";

            panels.forEach(function (panel) {
                panel.classList.toggle("active", panel.dataset.panel === panelKey);
            });

            if (method !== "Card") {
                walletNote.textContent =
                    "Enter your " + method + " mobile number. You'll get a notification in the " +
                    method + " app to approve the payment.";
            }
        }

        radios.forEach(function (radio) {
            radio.addEventListener("change", showMethod);
        });

        // ---------- helpers ----------
        function digitsOnly(value) {
            return value.replace(/\D/g, "");
        }

        function setError(input, errorId, message) {
            var error = document.getElementById(errorId);

            error.textContent = message || "";
            input.classList.toggle("invalid", Boolean(message));

            return !message;
        }

        function cardBrand(number) {
            if (/^4/.test(number)) return "Visa";
            if (/^(5[1-5]|2(2[2-9]|[3-6]\d|7[01]|720))/.test(number)) return "Mastercard";
            if (/^3[47]/.test(number)) return "Amex";
            return "Card";
        }

        function luhn(number) {
            var sum = 0;
            var alt = false;

            for (var i = number.length - 1; i >= 0; i--) {
                var n = parseInt(number.charAt(i), 10);

                if (alt) {
                    n *= 2;
                    if (n > 9) n -= 9;
                }

                sum += n;
                alt = !alt;
            }

            return sum % 10 === 0;
        }

        // ---------- card number ----------
        el.number.addEventListener("input", function () {
            var digits = digitsOnly(el.number.value);
            var brand = cardBrand(digits);
            var max = brand === "Amex" ? 15 : 16;

            digits = digits.slice(0, max);

            var groups = brand === "Amex"
                ? [digits.slice(0, 4), digits.slice(4, 10), digits.slice(10, 15)]
                : digits.match(/.{1,4}/g) || [];

            el.number.value = groups.filter(Boolean).join(" ");

            brandVisa.classList.toggle("on", brand === "Visa");
            brandMc.classList.toggle("on", brand === "Mastercard");

            if (el.number.classList.contains("invalid")) validateNumber();
        });

        function validateNumber() {
            var digits = digitsOnly(el.number.value);
            var brand = cardBrand(digits);
            var length = brand === "Amex" ? 15 : 16;

            if (digits.length === 0) {
                return setError(el.number, "err-card-number", "Enter your card number.");
            }

            if (digits.length < length || !luhn(digits)) {
                return setError(el.number, "err-card-number", "Your card number is invalid.");
            }

            return setError(el.number, "err-card-number", "");
        }

        // ---------- expiry ----------
        el.expiry.addEventListener("input", function (event) {
            var digits = digitsOnly(el.expiry.value).slice(0, 4);

            if (digits.length === 1 && Number(digits) > 1) {
                digits = "0" + digits;
            }

            if (event.inputType === "deleteContentBackward" && digits.length <= 2) {
                el.expiry.value = digits;
            } else {
                el.expiry.value = digits.length >= 2
                    ? digits.slice(0, 2) + " / " + digits.slice(2)
                    : digits;
            }

            if (el.expiry.classList.contains("invalid")) validateExpiry();
        });

        function validateExpiry() {
            var digits = digitsOnly(el.expiry.value);

            if (digits.length === 0) {
                return setError(el.expiry, "err-card-expiry", "Enter the expiry date.");
            }

            if (digits.length < 4) {
                return setError(el.expiry, "err-card-expiry", "Use the format MM / YY.");
            }

            var month = Number(digits.slice(0, 2));
            var year = 2000 + Number(digits.slice(2));
            var now = new Date();

            if (month < 1 || month > 12) {
                return setError(el.expiry, "err-card-expiry", "That month is not valid.");
            }

            if (year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth() + 1)) {
                return setError(el.expiry, "err-card-expiry", "Your card has expired.");
            }

            if (year > now.getFullYear() + 20) {
                return setError(el.expiry, "err-card-expiry", "That year is not valid.");
            }

            return setError(el.expiry, "err-card-expiry", "");
        }

        // ---------- CVC ----------
        el.cvc.addEventListener("input", function () {
            el.cvc.value = digitsOnly(el.cvc.value).slice(0, 4);

            if (el.cvc.classList.contains("invalid")) validateCvc();
        });

        function validateCvc() {
            var brand = cardBrand(digitsOnly(el.number.value));
            var length = brand === "Amex" ? 4 : 3;
            var value = el.cvc.value;

            if (value.length === 0) {
                return setError(el.cvc, "err-card-cvc", "Enter the security code.");
            }

            if (value.length < length) {
                return setError(el.cvc, "err-card-cvc", "Enter the " + length + "-digit code.");
            }

            return setError(el.cvc, "err-card-cvc", "");
        }

        // ---------- names ----------
        function validateName(input, errorId) {
            return input.value.trim().length < 2
                ? setError(input, errorId, "Enter your full name.")
                : setError(input, errorId, "");
        }

        // ---------- mobile (PH) ----------
        el.mobile.addEventListener("input", function () {
            var digits = digitsOnly(el.mobile.value);

            if (digits.indexOf("63") === 0 && digits.length > 10) {
                digits = "0" + digits.slice(2);
            }

            digits = digits.slice(0, 11);

            el.mobile.value = [digits.slice(0, 4), digits.slice(4, 7), digits.slice(7, 11)]
                .filter(Boolean)
                .join(" ");

            if (el.mobile.classList.contains("invalid")) validateMobile();
        });

        function validateMobile() {
            var digits = digitsOnly(el.mobile.value);

            if (digits.length === 0) {
                return setError(el.mobile, "err-wallet-mobile", "Enter your mobile number.");
            }

            if (!/^09\d{9}$/.test(digits)) {
                return setError(el.mobile, "err-wallet-mobile", "Enter a valid number, e.g. 0917 123 4567.");
            }

            return setError(el.mobile, "err-wallet-mobile", "");
        }

        // validate a field when the user leaves it
        el.number.addEventListener("blur", validateNumber);
        el.expiry.addEventListener("blur", validateExpiry);
        el.cvc.addEventListener("blur", validateCvc);
        el.cardName.addEventListener("blur", function () { validateName(el.cardName, "err-card-name"); });
        el.walletName.addEventListener("blur", function () { validateName(el.walletName, "err-wallet-name"); });
        el.mobile.addEventListener("blur", validateMobile);

        // ---------- submit ----------
        form.addEventListener("submit", function (event) {
            event.preventDefault();

            var method = currentMethod();
            var valid;

            if (method === "Card") {
                // run every check so all problems show at once
                var results = [
                    validateNumber(),
                    validateExpiry(),
                    validateCvc(),
                    validateName(el.cardName, "err-card-name")
                ];

                valid = results.every(Boolean);

                if (!valid) {
                    var firstBad = form.querySelector(".method-panel.active .invalid");
                    if (firstBad) firstBad.focus();
                    return;
                }

                // Only the card holder name and the last 4 digits are sent.
                // The full card number, expiry and security code never leave this page.
                var digits = digitsOnly(el.number.value);

                el.name.value = el.cardName.value.trim();
                el.reference.value = cardBrand(digits) + " ending " + digits.slice(-4);
            } else {
                var walletResults = [
                    validateName(el.walletName, "err-wallet-name"),
                    validateMobile()
                ];

                valid = walletResults.every(Boolean);

                if (!valid) {
                    var firstWalletBad = form.querySelector(".method-panel.active .invalid");
                    if (firstWalletBad) firstWalletBad.focus();
                    return;
                }

                var mobile = digitsOnly(el.mobile.value);

                el.name.value = el.walletName.value.trim();
                el.reference.value = method + " " + mobile.slice(0, 4) + "\u2022\u2022\u2022" + mobile.slice(-4);
            }

            showProcessing(method);
        });

        showMethod();
    })();
    </script>

</body>

</html>