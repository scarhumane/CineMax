<?php

function start_session(): void
{
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
}

function current_user_name(): string
{
    foreach (["username", "first_name", "name"] as $key) {
        $name = $_SESSION[$key] ?? null;

        if (is_string($name) && trim($name) !== "") {
            return trim($name);
        }
    }

    return "User";
}

function e(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, "UTF-8");
}

function first_letter(string $name): string
{
    return strtoupper(substr(trim($name) ?: "U", 0, 1));
}

function render_homepage(): string
{
    $file = __DIR__ . "/homepage.html";

    if (!is_file($file) || !is_readable($file)) {
        http_response_code(500);
        error_log("Homepage template is missing or unreadable: " . $file);
        return "The homepage is temporarily unavailable.";
    }

    $html = file_get_contents($file);

    if ($html === false) {
        http_response_code(500);
        error_log("Unable to read homepage template: " . $file);
        return "The homepage is temporarily unavailable.";
    }

    $name = current_user_name();

    return strtr($html, [
        "{{profile_name}}" => e($name),
        "{{profile_initial}}" => e(first_letter($name)),
        "{{current_year}}" => date("Y")
    ]);
}