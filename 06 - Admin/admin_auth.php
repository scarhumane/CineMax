<?php

function current_user_is_admin(): bool
{
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }

    return ($_SESSION["role"] ?? "") === "admin";
}

function admin_csrf_token(): string
{
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }

    if (!isset($_SESSION["admin_csrf_token"])) {
        $_SESSION["admin_csrf_token"] = bin2hex(random_bytes(32));
    }

    return $_SESSION["admin_csrf_token"];
}
