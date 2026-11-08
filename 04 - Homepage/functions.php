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
    return htmlspecialchars(
        $value,
        ENT_QUOTES | ENT_SUBSTITUTE,
        "UTF-8"
    );
}

function first_letter(string $name): string
{
    return strtoupper(substr(trim($name) ?: "U", 0, 1));
}

function render_homepage(): void
{
    render_page("homepage.html");
}

function render_page(string $filename): void
{
    $file = __DIR__ . "/" . $filename;

    if (!is_file($file) || !is_readable($file)) {
        http_response_code(404);
        exit("Page not found.");
    }

    $html = file_get_contents($file);

    if ($html === false) {
        http_response_code(500);
        exit("Unable to load page.");
    }

    $name = current_user_name();

    $html = str_replace(
        [
            "{{profile_name}}",
            "{{profile_initial}}",
            "{{current_year}}"
        ],
        [
            e($name),
            e(first_letter($name)),
            date("Y")
        ],
        $html
    );

    echo $html;
}