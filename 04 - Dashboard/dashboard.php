<?php
session_start();

if (!isset($_SESSION["logged_in"]) || $_SESSION["logged_in"] !== true) {
    header("Location: ../02%20-%20Login%20Page/login_page.html");
    exit;
}
?>