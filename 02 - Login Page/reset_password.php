<?php

$usersFile = __DIR__ . '/../03 - Data/users.json';
$tokenInput = $_POST["token"] ?? $_GET["token"] ?? "";
$token = is_string($tokenInput) ? $tokenInput : "";
$errorMessage = "";
$success = false;
$tokenValid = false;

if ($token === "") {
    $errorMessage = "This reset link is invalid or has expired.";
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
        $userIndex = null;
        $tokenHash = hash("sha256", $token);

        foreach ($data["users"] as $index => $user) {
            if (
                is_array($user) &&
                isset($user["reset_token"], $user["reset_expires"]) &&
                is_string($user["reset_token"]) &&
                is_int($user["reset_expires"]) &&
                hash_equals($user["reset_token"], $tokenHash) &&
                $user["reset_expires"] > time()
            ) {
                $userIndex = $index;
                break;
            }
        }

        if ($userIndex === null) {
            $errorMessage = "This reset link is invalid or has expired.";
        } else {
            $tokenValid = true;
        }

        if ($tokenValid && $_SERVER["REQUEST_METHOD"] === "POST") {
            $passwordInput = $_POST["password"] ?? "";
            $confirmPasswordInput = $_POST["confirm_password"] ?? "";
            $password = is_string($passwordInput) ? $passwordInput : "";
            $confirmPassword = is_string($confirmPasswordInput) ? $confirmPasswordInput : "";

            if (strlen($password) < 8) {
                $errorMessage = "Password must be at least 8 characters long.";
            } elseif ($password !== $confirmPassword) {
                $errorMessage = "Passwords do not match.";
            } else {
                $data["users"][$userIndex]["password"] =
                    password_hash($password, PASSWORD_DEFAULT);
                unset($data["users"][$userIndex]["reset_token"]);
                unset($data["users"][$userIndex]["reset_expires"]);

                $updatedData = json_encode($data, JSON_PRETTY_PRINT);
                if ($updatedData === false || file_put_contents($usersFile, $updatedData, LOCK_EX) === false) {
                    http_response_code(500);
                    $errorMessage = "Unable to update your password.";
                } else {
                    $success = true;
                }
            }
        }
    }
}

?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Password | CineMax</title>
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
                    <?= $success ? "Password Updated" : "Reset Password" ?>
                </h1>

                <?php if ($success): ?>
                    <p class="recovery-message">Your password has been updated successfully.</p>
                    <a class="recovery-action" href="login_page.html">Go to Log In</a>
                <?php elseif ($errorMessage !== "" && !$tokenValid): ?>
                    <p class="recovery-message recovery-error">
                        <?= htmlspecialchars($errorMessage, ENT_QUOTES, "UTF-8") ?>
                    </p>
                    <a class="recovery-action" href="forgot_password.html">Request a New Link</a>
                <?php else: ?>
                    <?php if ($errorMessage !== ""): ?>
                        <p class="recovery-message recovery-error">
                            <?= htmlspecialchars($errorMessage, ENT_QUOTES, "UTF-8") ?>
                        </p>
                    <?php endif; ?>
                    <p>Enter your new password below.</p>

                    <form action="reset_password.php" method="POST">
                        <input
                            type="hidden"
                            name="token"
                            value="<?= htmlspecialchars($token, ENT_QUOTES, "UTF-8") ?>"
                        >

                        <label for="password">New password</label>
                        <input
                            type="password"
                            id="password"
                            name="password"
                            autocomplete="new-password"
                            minlength="8"
                            required
                        >

                        <label for="confirm_password">Confirm new password</label>
                        <input
                            type="password"
                            id="confirm_password"
                            name="confirm_password"
                            autocomplete="new-password"
                            minlength="8"
                            required
                        >

                        <button type="submit">Update Password</button>
                    </form>
                <?php endif; ?>

                <?php if (!$success): ?>
                    <p class="password-recovery-back">
                        <a href="login_page.html">Back to Log In</a>
                    </p>
                <?php endif; ?>
            </section>
        </main>

        <footer class="login-footer">
            <p>&copy; 2026 CineMax. All rights reserved.</p>
        </footer>
    </div>
</body>
</html>
