<?php

$usersFile = __DIR__ . '/../03 - Data/users.json';

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    header("Location: forgot_password.html");
    exit;
}

header("Content-Type: text/html; charset=UTF-8");

$emailInput = $_POST["email"] ?? "";
$email = is_string($emailInput) ? strtolower(trim($emailInput)) : "";
$errorMessage = "";
$resetLink = null;
$requestMessage = "If an account exists with that email, a reset link is ready.";

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    $errorMessage = "Please enter a valid email address.";
} elseif (!is_file($usersFile)) {
    http_response_code(500);
    $errorMessage = "User data file not found.";
} else {
    $usersJson = file_get_contents($usersFile);
    $data = $usersJson === false ? null : json_decode($usersJson, true);

    if (!is_array($data) || !isset($data["users"]) || !is_array($data["users"])) {
        http_response_code(500);
        $errorMessage = "Unable to read user data.";
    } else {
        foreach ($data["users"] as $index => $user) {
            if (
                !is_array($user) ||
                !isset($user["email"]) ||
                !is_string($user["email"]) ||
                strtolower($user["email"]) !== $email
            ) {
                continue;
            }

            $token = bin2hex(random_bytes(32));
            $data["users"][$index]["reset_token"] = hash("sha256", $token);
            $data["users"][$index]["reset_expires"] = time() + 1800;

            $updatedData = json_encode($data, JSON_PRETTY_PRINT);
            if ($updatedData === false || file_put_contents($usersFile, $updatedData, LOCK_EX) === false) {
                http_response_code(500);
                $errorMessage = "Unable to save reset information.";
            } else {
                $resetLink = "reset_password.php?token=" . urlencode($token);
            }
            break;
        }
    }
}

?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Reset Request | CineMax</title>
    <link rel="stylesheet" href="login_page.css">
</head>
<body class="password-recovery-page">
    <div class="login-container">
        <header class="homepage-header">
            <a href="landing_page.html" class="website-logo">CINEMAX</a>
        </header>

        <main class="password-recovery-content">
            <section class="password-recovery-card" aria-labelledby="recovery-title">
                <h1 id="recovery-title">
                    <?= $errorMessage === "" ? "Password Reset Request" : "Request Unavailable" ?>
                </h1>

                <?php if ($errorMessage !== ""): ?>
                    <p class="recovery-message recovery-error">
                        <?= htmlspecialchars($errorMessage, ENT_QUOTES, "UTF-8") ?>
                    </p>
                    <a class="recovery-action" href="forgot_password.html">Try Again</a>
                <?php else: ?>
                    <p class="recovery-message">
                        <?= htmlspecialchars($requestMessage, ENT_QUOTES, "UTF-8") ?>
                    </p>

                    <?php if ($resetLink !== null): ?>
                        <a class="recovery-action" href="<?= htmlspecialchars($resetLink, ENT_QUOTES, "UTF-8") ?>">
                            Reset My Password
                        </a>
                        <p class="recovery-message">This local reset link expires in 30 minutes.</p>
                    <?php endif; ?>
                <?php endif; ?>

                <p class="password-recovery-back">
                    <a href="login_page.html">Back to Log In</a>
                </p>
            </section>
        </main>

        <footer class="login-footer">
            <p>&copy; 2026 CineMax. All rights reserved.</p>
        </footer>
    </div>
</body>
</html>
