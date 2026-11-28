<?php

require_once __DIR__ . "/profile_menu.php";
require_once __DIR__ . "/../06 - Admin/admin_auth.php";


function start_session(): void
{
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
}


function current_user_name(): string
{
    start_session();

    foreach (["username", "first_name", "name"] as $key) {
        $name = $_SESSION[$key] ?? null;

        if (is_string($name) && trim($name) !== "") {
            return trim($name);
        }
    }

    return "User";
}

function current_user_plan(): string
{
    start_session();

    $plan = $_SESSION["subscription_plan"] ?? "";

    if (!is_string($plan) || trim($plan) === "") {
        return "No Active Plan";
    }

    $plan = strtolower(trim($plan));
    $plan = preg_replace('/[^a-z]/', '', $plan);

    switch ($plan) {
        case "basic":
        case "cinemaxbasic":
            return "CineMax Basic";

        case "plus":
        case "cineplus":
        case "cinemaxplus":
            return "CineMax Plus";

        case "ultimate":
        case "cinemaxultimate":
            return "CineMax Ultimate";

        default:
            return "No Active Plan";
    }
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


/* the visitor must be logged in AND have chosen a plan.*/
function require_subscription(): void
{
    start_session();

    if (($_SESSION["logged_in"] ?? false) !== true) {
        header("Location: ../02 - Login Page/login_page.html");
        exit;
    }

    $plan = $_SESSION["subscription_plan"] ?? "";

    if (!is_string($plan) || trim($plan) === "") {
        header("Location: ../02 - Login Page/subscription_page.html");
        exit;
    }
}


function render_homepage(): void
{
    render_page("homepage.html");
}

function render_movie_navigation(string $currentPage = "movies"): string
{
    if (current_user_is_admin()) {
        return '<a href="../06 - Admin/admin_movies.php">Manage Movies</a>';
    }

    $hasCollection = false;
    $collectionFile = dirname(__DIR__) . DIRECTORY_SEPARATOR . "03 - Data" . DIRECTORY_SEPARATOR . "admin_movies.json";
    if (is_readable($collectionFile)) {
        $collection = json_decode((string) file_get_contents($collectionFile), true);
        $hasCollection = is_array($collection["movies"] ?? null) && count($collection["movies"]) > 0;
    }

    return ($hasCollection ? '<a href="movies.php"' . ($currentPage === "movies" ? ' class="active"' : '') . '>Movies</a>' : '')
        . ($hasCollection ? '<a href="genres.php"' . ($currentPage === "genres" ? ' class="active"' : '') . '>Genres</a>' : '')
        . ($hasCollection ? '<a href="people.php"' . ($currentPage === "people" ? ' class="active"' : '') . '>People</a>' : '');
}


function render_page(string $filename): void
{
    start_session();

    if (
        current_user_is_admin()
        && $filename !== "admin_movies.html"
    ) {
        header("Location: ../06 - Admin/admin_movies.php");
        exit;
    }

    $file = $filename === "admin_movies.html"
        ? __DIR__ . "/../06 - Admin/admin_movies.html"
        : __DIR__ . "/" . $filename;

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
            "{{profile_plan}}",
            "{{profile_menu}}",
            "{{admin_csrf_token}}",
            "{{admin_mode}}",
            "{{movie_navigation}}",
            "{{current_year}}"
        ],
        [
            e($name),
            e(first_letter($name)),
            e(current_user_plan()),
            render_profile_menu(),
            e(admin_csrf_token()),
            current_user_is_admin() ? "true" : "false",
            render_movie_navigation($filename === "people.html" ? "people" : "movies"),
            date("Y")
        ],
        $html
    );

    echo $html;
}

