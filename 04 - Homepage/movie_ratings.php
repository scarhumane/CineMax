<?php

session_start();

header("Content-Type: application/json; charset=utf-8");
header("Cache-Control: no-store, no-cache, must-revalidate");

function movie_ratings_respond(array $payload, int $status = 200): void
{
    http_response_code($status);
    echo json_encode(
        $payload,
        JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE
    );
    exit;
}

if (($_SESSION["logged_in"] ?? false) !== true) {
    movie_ratings_respond(["error" => "Please sign in first."], 401);
}

if (($_SESSION["role"] ?? "") === "admin") {
    movie_ratings_respond(["error" => "Administrator accounts cannot rate movies."], 403);
}

$username = $_SESSION["username"] ?? "";
if (!is_string($username) || $username === "") {
    movie_ratings_respond(["error" => "Your account could not be identified."], 401);
}

require_once __DIR__ . "/movie_ratings_store.php";

$method = $_SERVER["REQUEST_METHOD"] ?? "GET";
if (!in_array($method, ["GET", "POST"], true)) {
    header("Allow: GET, POST");
    movie_ratings_respond(["error" => "Unsupported request method."], 405);
}

try {
    if ($method === "GET") {
        movie_ratings_respond([
            "success" => true,
            "ratings" => cinemax_get_user_movie_ratings($username)
        ]);
    }

    $providedToken = $_SERVER["HTTP_X_CSRF_TOKEN"] ?? "";
    $sessionToken = $_SESSION["admin_csrf_token"] ?? "";
    if (
        !is_string($providedToken)
        || !is_string($sessionToken)
        || $sessionToken === ""
        || !hash_equals($sessionToken, $providedToken)
    ) {
        movie_ratings_respond(["error" => "Your session expired. Reload the page and try again."], 403);
    }

    $input = json_decode(file_get_contents("php://input"), true);
    $newRatings = is_array($input) && isset($input["ratings"]) && is_array($input["ratings"])
        ? $input["ratings"]
        : null;
    if ($newRatings === null || count($newRatings) > 500) {
        movie_ratings_respond(["error" => "Invalid rating data."], 400);
    }

    foreach ($newRatings as $movieId => $rating) {
        if (
            !is_string($movieId)
            || !preg_match('/^[A-Za-z0-9_-]{1,80}$/', $movieId)
            || !is_numeric($rating)
            || !is_finite((float) $rating)
            || (float) $rating < 1
            || (float) $rating > 5
            || floor((float) $rating) !== (float) $rating
        ) {
            movie_ratings_respond(["error" => "Each movie rating must be from 1 to 5 stars."], 400);
        }

        $newRatings[$movieId] = (int) $rating;
    }

    movie_ratings_respond([
        "success" => true,
        "ratings" => cinemax_save_user_movie_ratings($username, $newRatings)
    ]);
} catch (RuntimeException $error) {
    error_log("Movie ratings request failed: " . $error->getMessage());
    movie_ratings_respond(["error" => "Unable to access saved movie ratings."], 500);
}
