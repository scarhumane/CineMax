<?php

require_once __DIR__ . "/functions.php";

start_session();

if (
    !isset($_SESSION["logged_in"]) ||
    $_SESSION["logged_in"] !== true
) {
    header("Location: ../02 - Login Page/login_page.html");
    exit;
}

echo render_homepage();